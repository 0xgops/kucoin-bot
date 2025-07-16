// config/constants.js
module.exports = {
  FEE_RATE: parseFloat(process.env.FEE_RATE) || 0.001,         // KuCoin 0.1% default
  STOP_LOSS_PERCENT: parseFloat(process.env.STOP_LOSS_PERCENT) || 1,
  TAKE_PROFIT_PERCENT: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.75,
  MAX_TRADE_AMOUNT: parseFloat(process.env.MAX_TRADE_AMOUNT) || 25,
  RISK_PERCENT: parseFloat(process.env.RISK_PERCENT) || 0.01,
  REBUY_COOLDOWN_MS: parseInt(process.env.REBUY_COOLDOWN_MS) || 15 * 1000,
};