// logic/strategy.mjs
import chalk from 'chalk';

let prices = [];

// 🧠 Core history update
function updateHistory(price) {
  prices.push(price);
  if (prices.length > 200) prices.shift();
}

// 📈 RSI Calculator
function getRSI(period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// 📐 RSI Slope
function getRSISlope(window = 3) {
  if (prices.length < 14 + window) return null;

  const diffs = [];
  for (let i = 0; i < window; i++) {
    const slice = prices.slice(prices.length - 15 - i, prices.length - i);
    const rsiNow = calcRSIFromSlice(slice);
    const rsiPrev = calcRSIFromSlice(slice.slice(0, -1));
    if (rsiNow && rsiPrev) diffs.push(rsiNow - rsiPrev);
  }

  return diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
}

function calcRSIFromSlice(slice) {
  if (slice.length < 15) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const delta = slice[i] - slice[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// 🔄 Momentum
function getMomentum(window = 3) {
  if (prices.length < window + 1) return null;
  const recent = prices.slice(-window - 1);
  return recent.at(-1) - recent[0];
}

// 🧮 Simple Moving Average
function getSMA(period = 10) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// 🔍 Pattern detection
function detectPattern() {
  if (prices.length < 4) return null;
  const [o3, o2, o1, o0] = prices.slice(-4);

  const c1 = o1 - o2;
  const c2 = o0 - o1;

  const engulfing = c1 < 0 && c2 > Math.abs(c1);
  const hammer = c2 > 0 && (o0 - Math.min(o1, o2, o3)) > 2 * (o0 - o1);

  if (engulfing) return 'bullish-engulfing';
  if (hammer) return 'hammer';
  return null;
}

// 🧠 STRATEGY DECISION ENGINE
export function evaluateStrategy(price) {
  updateHistory(price);

  const rsi = getRSI();
  const slope = getRSISlope();
  const sma = getSMA();
  const momentum = getMomentum();
  const pattern = detectPattern();

  const RSI_BUY = parseFloat(process.env.RSI_BUY || '30');
  const RSI_SELL = parseFloat(process.env.RSI_SELL || '70');

  const valid = rsi !== null && sma !== null && slope !== null && momentum !== null;
  if (!valid) return 'HOLD';

  const bullish = price > sma && slope > 0 && momentum > 0;
  const bearish = price < sma && slope < 0 && momentum < 0;

  const patternValid = pattern === 'bullish-engulfing' || pattern === 'hammer';

  const isBuy = rsi < RSI_BUY && (bullish || patternValid);
  const isSell = rsi > RSI_SELL && bearish;

  // 📢 Debug Print
  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `💰 $${price.toFixed(6)} | ` +
    `RSI: ${chalk.magenta(rsi.toFixed(2))} | ` +
    `Slope: ${chalk.gray(slope?.toFixed(3) || '—')} | ` +
    `SMA: ${chalk.green(sma.toFixed(4))} | ` +
    `Momentum: ${chalk.blue(momentum.toFixed(6))} | ` +
    `Pattern: ${chalk.white(pattern || '—')}`
  );

  if (isBuy) return 'BUY';
  if (isSell) return 'SELL';
  return 'HOLD';
}

// Optional accessor
export function getLatestRSI() {
  return getRSI();
}