const { RSI } = require('technicalindicators');
const chalk = require('chalk').default;

const inputRSI = {
  values: [],
  period: 14,
};

let lastRSI = null;

function getLatestRSI() {
  return lastRSI;
}

function evaluateStrategy(price) {
  inputRSI.values.push(price);
  const rsiValues = RSI.calculate(inputRSI);

  if (rsiValues.length > 0) {
    lastRSI = rsiValues[rsiValues.length - 1];
  }

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 45;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 55;

  // 🧪 Debug printout
  if (lastRSI) {
    console.log(
      `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
      `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
      `RSI: ${chalk.magenta(`${lastRSI.toFixed(2)}`)}`
    );
  }

  if (lastRSI < RSI_BUY) return 'BUY';
  if (lastRSI > RSI_SELL) return 'SELL';
  return 'HOLD';
}

module.exports = { evaluateStrategy, getLatestRSI };