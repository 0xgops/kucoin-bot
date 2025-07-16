function simulateTrade(signal, price, holdings) {
  const { addProfit } = require('../utils/profitTracker');
  const STOP_LOSS_PERCENT = parseFloat(process.env.STOP_LOSS_PERCENT) || 2;
  const TAKE_PROFIT_PERCENT = parseFloat(process.env.TAKE_PROFIT_PERCENT) || 5;
  const RISK_PERCENT = parseFloat(process.env.RISK_PERCENT) || 0.01;
  const MAX_TRADE_AMOUNT = parseFloat(process.env.MAX_TRADE_AMOUNT) || 25;

  // 🧠 Calculate dynamic trade amount
  const tradeAmount = Math.min(holdings.balanceUSD * RISK_PERCENT, MAX_TRADE_AMOUNT);

  // 🎯 Trailing Stop + TP/SL
  if (holdings.position) {
    const { entryPrice, amount, highestPrice } = holdings.position;
    const currentHigh = Math.max(highestPrice || 0, price);
    const changePercent = ((price - entryPrice) / entryPrice) * 100;

    // Save updated high
    holdings.position.highestPrice = currentHigh;

    // Take profit logic
    if (changePercent >= TAKE_PROFIT_PERCENT) {
      const proceeds = amount * price;
      const gain = proceeds - amount * entryPrice;
      holdings.balanceUSD += proceeds;
      holdings.position = null;
      addProfit(gain);
      console.log(`🎯 TAKE PROFIT at $${price.toFixed(6)} | Gain: $${gain.toFixed(2)}`);
      return holdings;
    }

    // Stop loss logic
    if (changePercent <= -STOP_LOSS_PERCENT) {
      const proceeds = amount * price;
      const loss = proceeds - amount * entryPrice;
      holdings.balanceUSD += proceeds;
      holdings.position = null;
      addProfit(loss);
      console.log(`🔻 STOP LOSS at $${price.toFixed(6)} | Loss: $${loss.toFixed(2)}`);
      return holdings;
    }
  }

  // 🟢 Enter new position
  if (signal === 'BUY' && !holdings.position) {
    const quantity = tradeAmount / price;
    holdings.balanceUSD -= tradeAmount;
    holdings.position = {
      entryPrice: price,
      amount: quantity,
      highestPrice: price
    };
    console.log(`🟢 BUYING at $${price.toFixed(6)} | Holding ${quantity.toFixed(6)} units (risking $${tradeAmount.toFixed(2)})`);
  }

  // 🔴 Manual SELL signal
  if (signal === 'SELL') {
    if (!holdings.position) {
      console.log(`⚠️ SELL signal received, but no position held. Skipping.`);
      return holdings;
    }

    const proceeds = holdings.position.amount * price;
    const cost = holdings.position.amount * holdings.position.entryPrice;
    const profit = proceeds - cost;
    holdings.balanceUSD += proceeds;
    holdings.position = null;
    addProfit(profit);

    const emoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${emoji} SELLING at $${price.toFixed(6)} | P/L: $${profit.toFixed(2)}`);
  }

  return holdings;
}

module.exports = { simulateTrade };