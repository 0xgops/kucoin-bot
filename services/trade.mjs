// services/trade.mjs
import chalk from 'chalk';
import axios from 'axios';
import { addProfit } from '../utils/profitTracker.mjs';
import { logResult as logTradeOutcome } from '../utils/resultLogger.mjs';
import { FEE_RATE } from '../config/constants.mjs';

const tradeState = {}; // Keeps track of each symbol's trade status

function simulateTrade(signal, price, holdings, symbol, rsi = null, mode = 'unknown') {
  const now = Date.now();
  const label = chalk.cyan(`[${symbol}]`);

  // === ENV CONFIG ===
  const RISK_PERCENT = parseFloat(process.env.RISK_PERCENT) || 0.01;
  const MAX_TRADE_AMOUNT = parseFloat(process.env.MAX_TRADE_AMOUNT) || 25;
  const TAKE_PROFIT_PERCENT = parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.75;
  const STOP_LOSS_PERCENT = parseFloat(process.env.STOP_LOSS_PERCENT) || 0.25;
  const REBUY_COOLDOWN_MS = parseInt(process.env.REBUY_COOLDOWN_MS || 60000);
  const MIN_VOLATILITY = 1.0;

  const state = tradeState[symbol] || {
    inPosition: false,
    entryPrice: 0,
    entryTime: '',
    amount: 0,
    lastSellTime: 0
  };

  const tradeAmount = Math.min(holdings.balanceUSD * RISK_PERCENT, MAX_TRADE_AMOUNT);

  console.log(`🔍 simulateTrade ENTRY for [${symbol}] | signal: ${signal}, price: $${price} | inPosition: ${state.inPosition}`);

  // === SELL LOGIC ===
  if (signal === 'SELL') {
    if (!state.inPosition) {
      console.log(`${label} ⚠️ SELL signal received, but no position held. Skipping.`);
      return holdings;
    }

    const changePercent = ((price - state.entryPrice) / state.entryPrice) * 100;
    const totalFees = FEE_RATE * 2 * 100;
    const effectiveProfit = changePercent - totalFees;

    if (effectiveProfit < TAKE_PROFIT_PERCENT && changePercent > -STOP_LOSS_PERCENT) {
      console.log(`${label} ⛔ Ignoring SELL — net profit (${effectiveProfit.toFixed(2)}%) below threshold (target: ${TAKE_PROFIT_PERCENT}%)`);
      return holdings;
    }

    const proceeds = state.amount * price * (1 - FEE_RATE);
    const cost = state.amount * state.entryPrice;
    const profit = proceeds - cost;

    holdings.balanceUSD += proceeds;
    holdings._lastProfit = profit;

    state.inPosition = false;
    state.lastSellTime = now;

    addProfit(profit);
    logTradeOutcome({
      symbol,
      entryTime: state.entryTime,
      exitTime: new Date().toISOString(),
      entryPrice: state.entryPrice,
      exitPrice: price,
      pnlPercent: changePercent,
      mode
    });

    const emoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${emoji} SELLING ${symbol} at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`);

    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      axios.post(DISCORD_WEBHOOK, {
        content: `${emoji} SELL ${symbol} @ $${price.toFixed(6)} | PnL: $${profit.toFixed(2)}`
      }).catch(e => {
        console.warn(`${label} ⚠️ Discord alert failed: ${e.message}`);
      });
    }

    tradeState[symbol] = state;
    return holdings;
  }

  // === BUY LOGIC ===
  if (signal === 'BUY' && !state.inPosition) {
    const volatility = holdings.volatility || 0;

    if (volatility < MIN_VOLATILITY) {
      console.log(`${label} 🧊 Skipping BUY — too calm (vol = ${volatility.toFixed(2)}%)`);
      return holdings;
    }

    if (state.lastSellTime && now - state.lastSellTime < REBUY_COOLDOWN_MS) {
      const secondsLeft = ((REBUY_COOLDOWN_MS - (now - state.lastSellTime)) / 1000).toFixed(1);
      console.log(`${label} ⏳ Skipping BUY — cooldown (${secondsLeft}s left)`);
      return holdings;
    }

    const quantity = (tradeAmount / price) * (1 - FEE_RATE);
    const feePaid = (tradeAmount / price) * FEE_RATE;

    holdings.balanceUSD -= tradeAmount;

    state.inPosition = true;
    state.entryPrice = price;
    state.entryTime = new Date().toISOString();
    state.amount = quantity;

    console.log(`💸 KuCoin fee on BUY: ${feePaid.toFixed(6)} units`);
    console.log(`${label} 🟢 BUYING ${symbol} @ $${price.toFixed(6)} | Qty: ${quantity.toFixed(6)}`);

    tradeState[symbol] = state;
  }

  return holdings;
}

export { simulateTrade as executeTrade };