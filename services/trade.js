function simulateTrade(signal, price, holdings) {
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

  const now = Date.now();
  const tradeAmount = Math.min(holdings.balanceUSD * RISK_PERCENT, MAX_TRADE_AMOUNT);
  const MIN_VOLATILITY = 1; // % threshold to block low-action trades

  // 🛑 Exit position if stop-loss or take-profit hit
  if (holdings.position) {
    const { entryPrice, amount, highestPrice } = holdings.position;
    const currentHigh = Math.max(highestPrice || 0, price);
    const changePercent = ((price - entryPrice) / entryPrice) * 100;
    holdings.position.highestPrice = currentHigh;

    if (changePercent >= TAKE_PROFIT_PERCENT) {
      const proceeds = amount * price * (1 - FEE_RATE);
      const gain = proceeds - amount * entryPrice;
      holdings.balanceUSD += proceeds;
      holdings.position = null;
      holdings.lastSellTime = now;
      addProfit(gain);
      console.log(`🎯 TAKE PROFIT at $${price.toFixed(6)} | Gain: $${gain.toFixed(2)}`);
      return holdings;
    }

    if (changePercent <= -STOP_LOSS_PERCENT) {
      const proceeds = amount * price * (1 - FEE_RATE);
      const loss = proceeds - amount * entryPrice;
      holdings.balanceUSD += proceeds;
      holdings.position = null;
      holdings.lastSellTime = now;
      addProfit(loss);
      console.log(`🔻 STOP LOSS at $${price.toFixed(6)} | Loss: $${loss.toFixed(2)}`);
      return holdings;
    }
  }

  // ❄️ Volatility filter
  if (signal === 'BUY' && !holdings.position) {
    const volatility = holdings.volatility || 0;
    if (volatility < MIN_VOLATILITY) {
      console.log(`🧊 Skipping BUY on ${process.env.SYMBOL} — too calm (volatility = ${volatility.toFixed(2)}%)`);
      return holdings;
    }

    // ⏳ Cooldown check
    if (holdings.lastSellTime && now - holdings.lastSellTime < REBUY_COOLDOWN_MS) {
      console.log(`⏳ BUY blocked during cooldown (${((REBUY_COOLDOWN_MS - (now - holdings.lastSellTime)) / 1000).toFixed(1)}s left)`);
      return holdings;
    }

    // ✅ Enter position
    const quantity = (tradeAmount / price) * (1 - FEE_RATE);
    const feePaid = (tradeAmount / price) * FEE_RATE;

    holdings.balanceUSD -= tradeAmount;
    holdings.position = {
      entryPrice: price,
      amount: quantity,
      highestPrice: price
    };

    console.log(`💸 KuCoin fee on BUY: ${feePaid.toFixed(6)} units`);
    console.log(`🟢 BUYING at $${price.toFixed(6)} | Holding ${quantity.toFixed(6)} units (risking $${tradeAmount.toFixed(2)})`);
  }

  // 🔴 Manual SELL
  if (signal === 'SELL') {
    if (!holdings.position) {
      console.log(`⚠️ SELL signal received, but no position held. Skipping.`);
      return holdings;
    }

    const proceeds = holdings.position.amount * price * (1 - FEE_RATE);
    const cost = holdings.position.amount * holdings.position.entryPrice;
    const profit = proceeds - cost;
    holdings.balanceUSD += proceeds;
    holdings.position = null;
    holdings.lastSellTime = now;
    addProfit(profit);

    const emoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${emoji} SELLING at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`);

    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    if (DISCORD_WEBHOOK) {
      const content = `${emoji} SELLING ${((cost / price) || 0).toFixed(6)} units at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`;
      axios.post(DISCORD_WEBHOOK, { content }).catch(e => {
        console.warn('⚠️ Failed to send Discord alert:', e.message);
      });
    }
  }

  return holdings;
}

module.exports = { simulateTrade };