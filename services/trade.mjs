import chalk from 'chalk';
import axios from 'axios';
import { addProfit } from '../utils/profitTracker.mjs';
import { FEE_RATE } from '../config/constants.mjs';

function simulateTrade(signal, price, originalHoldings) {
  const now = Date.now();
  const holdings = { ...originalHoldings }; // Clone to avoid mutation
  const MIN_VOLATILITY = 1.0;

  // ✅ Safe fallback defaults if env is missing
  const RISK_PERCENT = parseFloat(process.env.RISK_PERCENT) || 0.01;
  const MAX_TRADE_AMOUNT = parseFloat(process.env.MAX_TRADE_AMOUNT) || 25;
  const TAKE_PROFIT_PERCENT = parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.75;
  const STOP_LOSS_PERCENT = parseFloat(process.env.STOP_LOSS_PERCENT) || 0.25;
  const REBUY_COOLDOWN_MS = parseInt(process.env.REBUY_COOLDOWN_MS) || 60000;

  const tradeAmount = Math.min(holdings.balanceUSD * RISK_PERCENT, MAX_TRADE_AMOUNT);
  const symbol = process.env.BOT_NAME || '???';
  const label = chalk.cyan(`[${symbol}]`);

  console.log(`🔍 simulateTrade ENTRY for [${symbol}] | signal: ${signal}, price: $${price} | inPosition: ${!!holdings.position}`);

  // --- 🧠 SELL Logic ---
  if (signal === 'SELL') {
    console.log(`🛠 simulateTrade() for [${symbol}] | signal: ${signal}, price: $${price}`);
    if (!holdings.position) {
      console.log(`${label} ⚠️ SELL signal received, but no position held. Skipping.`);
      return holdings;
    }

    const { entryPrice, amount } = holdings.position;
    const changePercent = ((price - entryPrice) / entryPrice) * 100;
    const totalFees = FEE_RATE * 2 * 100; // round-trip
    const effectiveProfit = changePercent - totalFees;

    if (effectiveProfit < TAKE_PROFIT_PERCENT && changePercent > -STOP_LOSS_PERCENT) {
      console.log(`${label} ⛔ Ignoring SELL — net profit (${effectiveProfit.toFixed(2)}%) below threshold (target: ${TAKE_PROFIT_PERCENT}%).`);
      return holdings;
    }

    const proceeds = amount * price * (1 - FEE_RATE);
    const cost = amount * entryPrice;
    const profit = proceeds - cost;

    holdings.balanceUSD += proceeds;
    holdings.position = null;
    holdings.lastSellTime = now;
    holdings._lastProfit = profit;
    addProfit(profit);

    const emoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${emoji} SELLING at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`);

    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      const content = `${emoji} SELLING ${amount.toFixed(6)} units at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`;
      axios.post(DISCORD_WEBHOOK, { content }).catch(e => {
        console.warn(`${label} ⚠️ Failed to send Discord alert: ${e.message}`);
      });
    }

    return holdings;
  }

  // --- 💸 BUY Logic ---
  if (signal === 'BUY' && !holdings.position) {
    const volatility = holdings.volatility || 0;

    if (volatility < MIN_VOLATILITY) {
      console.log(`${label} 🧊 Skipping BUY — too calm (volatility = ${volatility.toFixed(2)}%)`);
      holdings._skipReason = 'CALM';
      return holdings;
    }

    if (holdings.lastSellTime && now - holdings.lastSellTime < REBUY_COOLDOWN_MS) {
      const secondsLeft = ((REBUY_COOLDOWN_MS - (now - holdings.lastSellTime)) / 1000).toFixed(1);
      console.log(`${label} ⏳ Skipping BUY — cooldown (${secondsLeft}s left)`);
      holdings._skipReason = 'COOLDOWN';
      return holdings;
    }

    const quantity = (tradeAmount / price) * (1 - FEE_RATE);
    const feePaid = (tradeAmount / price) * FEE_RATE;

    holdings.balanceUSD -= tradeAmount;
    holdings.position = {
      entryPrice: price,
      amount: quantity,
      highestPrice: price
    };

    console.log(`💸 KuCoin fee on BUY: ${feePaid.toFixed(6)} units`);
    console.log(`${label} 🟢 BUYING at $${price.toFixed(6)} | Holding ${quantity.toFixed(6)} units...`);
  }

  return holdings;
}
export { simulateTrade };