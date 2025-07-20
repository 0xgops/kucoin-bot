import chalk from 'chalk';

let prices = [];
let lastRSI = null;

function updateHistory(price) {
  prices.push(price);
  if (prices.length > 100) prices.shift();
}

function getRSI(period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function getRSISlope(window = 3) {
  if (prices.length < 14 + window) return null;
  const slopes = [];

  for (let i = 0; i < window; i++) {
    const slice = prices.slice(prices.length - 15 - i, prices.length - i);
    const rsiA = getRSIFromSlice(slice);
    const rsiB = getRSIFromSlice(slice.slice(0, -1));
    if (rsiA !== null && rsiB !== null) {
      slopes.push(rsiA - rsiB);
    }
  }

  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  return avgSlope;
}

function getRSIFromSlice(slice) {
  if (slice.length < 15) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function evaluateStrategy(price) {
  updateHistory(price);
  const rsi = getRSI();
  const slope = getRSISlope();
  lastRSI = rsi;

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 45;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 55;

  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
    `RSI: ${chalk.magenta(rsi?.toFixed(2) || '...')} | ` +
    `Slope: ${chalk.gray(slope?.toFixed(3) || '...')}`
  );

  if (rsi !== null && slope !== null) {
    if (rsi < RSI_BUY && slope > 0) return 'BUY';
    if (rsi > RSI_SELL && slope < 0) return 'SELL';
  }

  return 'HOLD';
}

function getLatestRSI() {
  return lastRSI;
}

export { evaluateStrategy, getLatestRSI };