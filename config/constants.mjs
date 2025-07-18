export const FEE_RATE = parseFloat(process.env.FEE_RATE) || 0.001;
export const STOP_LOSS_PERCENT = parseFloat(process.env.STOP_LOSS_PERCENT) || 1;
export const TAKE_PROFIT_PERCENT = parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.75;
export const MAX_TRADE_AMOUNT = parseFloat(process.env.MAX_TRADE_AMOUNT) || 25;
export const RISK_PERCENT = parseFloat(process.env.RISK_PERCENT) || 0.01;
export const REBUY_COOLDOWN_MS = parseInt(process.env.REBUY_COOLDOWN_MS) || 15 * 1000;