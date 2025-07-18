// services/trade.js
const axios = require('axios');
const { addProfit } = require('../utils/profitTracker');
const {
  FEE_RATE,
  STOP_LOSS_PERCENT,
  TAKE_PROFIT_PERCENT,
  MAX_TRADE_AMOUNT,
  RISK_PERCENT,
  REBUY_COOLDOWN_MS
} = require('../config/constants');

function simulateTrade(signal, price, originalHoldings) {
  const now = Date.now();
  const holdings = { ...originalHoldings }; // Clone to avoid mutation
  const MIN_VOLATILITY = 1.0;
  const tradeAmount = Math.min(holdings.balanceUSD * RISK_PERCENT, MAX_TRADE_AMOUNT);

  console.log(`🔍 simulateTrade ENTRY for [${process.env.BOT_NAME}] | signal: ${signal}, price: $${price} | inPosition: ${!!holdings.position}`);

  // --- 🧠 SELL Logic ---
  if (signal === 'SELL') {
    console.log(`🛠 simulateTrade() for [${process.env.BOT_NAME}] | signal: ${signal}, price: $${price}`);
    if (!holdings.position) {
      console.log(`⚠️ SELL signal received, but no position held. Skipping.`);
      return holdings;
    }

    const { entryPrice, amount } = holdings.position;
    const changePercent = ((price - entryPrice) / entryPrice) * 100;

    // Guard: Ignore weak SELLs
    if (changePercent < TAKE_PROFIT_PERCENT && changePercent > -STOP_LOSS_PERCENT) {
      console.log(`⛔ Ignoring SELL — profit (${changePercent.toFixed(2)}%) below threshold.`);
      return holdings;
    }

    const proceeds = amount * price * (1 - FEE_RATE);
    const cost = amount * entryPrice;
    const profit = proceeds - cost;

    holdings.balanceUSD += proceeds;
    holdings.position = null;
    holdings.lastSellTime = now;
    addProfit(profit);

    const emoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${emoji} SELLING at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`);

    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      const content = `${emoji} SELLING ${amount.toFixed(6)} units at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`;
      axios.post(DISCORD_WEBHOOK, { content }).catch(e => {
        console.warn('⚠️ Failed to send Discord alert:', e.message);
      });
    }

    return holdings;
  }

  // --- 💸 BUY Logic ---
  if (signal === 'BUY' && !holdings.position) {
    const volatility = holdings.volatility || 0;

    if (volatility < MIN_VOLATILITY) {
      console.log(`🧊 Skipping BUY — too calm (volatility = ${volatility.toFixed(2)}%)`);
      holdings._skipReason = 'CALM';
      return holdings;
    }

    if (holdings.lastSellTime && now - holdings.lastSellTime < REBUY_COOLDOWN_MS) {
      const secondsLeft = ((REBUY_COOLDOWN_MS - (now - holdings.lastSellTime)) / 1000).toFixed(1);
      console.log(`⏳ Skipping BUY — cooldown (${secondsLeft}s left)`);
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
    console.log(`[${process.env.BOT_NAME}] 🟢 BUYING at $${price.toFixed(6)} | Holding ${quantity.toFixed(6)} units...`);
  }

  return holdings;
}

module.exports = { simulateTrade };