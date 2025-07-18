// utils/volatilityFilter.js
const priceHistory = [];

export function seedHistory(prices = []) {
  priceHistory.length = 0;
  priceHistory.push(...prices);
}

export function isVolatileEnough(currentPrice, threshold = 0.1, window = 10) {
  priceHistory.push(currentPrice);
  if (priceHistory.length > 200) priceHistory.shift();

  if (priceHistory.length < window) return false;

  const recent = priceHistory.slice(-window);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const rangePercent = ((max - min) / min) * 100;

  // 👇 Live volatility logging
  console.log(`[VOLATILITY CHECK] Range: ${rangePercent.toFixed(2)}% (min: $${min}, max: $${max})`);

  return rangePercent >= threshold;
}