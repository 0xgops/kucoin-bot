const chalk = require('chalk').default;

let prices = [];

function updateHistory(price) {
  prices.push(price);
  if (prices.length > 100) prices.shift();
}

function getRSI(period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function getSMA(period = 10) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function getMomentum(window = 3) {
  if (prices.length < window + 1) return 0;
  const recent = prices.slice(-window - 1);
  return recent[recent.length - 1] - recent[0];
}

function evaluateStrategy(price) {
  updateHistory(price);
  const rsi = getRSI();
  const sma = getSMA();
  const momentum = getMomentum();

  if (!rsi || !sma) return 'HOLD';

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 30;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 70;
  const bullish = price > sma && momentum > 0;
  const bearish = price < sma && momentum < 0;

  // 🧪 Debug printout
  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
    `RSI: ${chalk.magenta(`${rsi.toFixed(2)}`)} | ` +
    `SMA: ${chalk.green(`${sma.toFixed(4)}`)} | ` +
    `Momentum: ${chalk.blue(`${momentum.toFixed(6)}`)}`
  );

  if (rsi < RSI_BUY && bullish) return 'BUY';
  if (rsi > RSI_SELL && bearish) return 'SELL';
  return 'HOLD';
}

function getLatestRSI() {
  return getRSI();
}

module.exports = { evaluateStrategy, getLatestRSI };