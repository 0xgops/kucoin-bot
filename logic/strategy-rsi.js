const { RSI } = require('technicalindicators');
const chalk = require('chalk').default;

const inputRSI = {
  values: [],
  period: 14,
};

let lastRSI = null;

function updateHistory(price) {
  inputRSI.values.push(price);
  if (inputRSI.values.length > inputRSI.period + 1) {
    inputRSI.values.shift();
  }
}

function getRSI() {
  if (inputRSI.values.length < inputRSI.period) return null;
  const result = RSI.calculate(inputRSI);
  lastRSI = result[result.length - 1];
  return lastRSI;
}

function getLatestRSI() {
  return lastRSI;
}

function evaluateStrategy(price) {
  updateHistory(price);

  const rsi = getRSI();
  if (!rsi) return 'HOLD';

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 45;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 55;

  // 🧪 Debug printout
  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
    `RSI: ${chalk.magenta(`${rsi.toFixed(2)}`)}`
  );

  if (rsi < RSI_BUY) return 'BUY';
  if (rsi > RSI_SELL) return 'SELL';
  return 'HOLD';
}

module.exports = { evaluateStrategy, getLatestRSI };