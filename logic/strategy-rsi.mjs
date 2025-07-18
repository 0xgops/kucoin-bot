// logic/strategy-rsi.js
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

function evaluateStrategy(price) {
  updateHistory(price);
  const rsi = getRSI();

  if (!rsi) return 'HOLD';

  lastRSI = rsi;

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 45;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 55;

  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
    `RSI: ${chalk.magenta(`${rsi.toFixed(2)}`)}`
  );

  if (rsi < RSI_BUY) return 'BUY';
  if (rsi > RSI_SELL) return 'SELL';
  return 'HOLD';
}

function getLatestRSI() {
  return lastRSI;
}

export { evaluateStrategy, getLatestRSI };