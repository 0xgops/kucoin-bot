import chalk from 'chalk';

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

function getSMA(period = 10) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function getMomentum(window = 3) {
  if (prices.length < window + 1) return null;
  const recent = prices.slice(-window - 1);
  return recent[recent.length - 1] - recent[0];
}

function detectPattern() {
  if (prices.length < 4) return null;

  const o3 = prices[prices.length - 4];
  const o2 = prices[prices.length - 3];
  const o1 = prices[prices.length - 2];
  const o0 = prices[prices.length - 1];

  const candle1 = o1 - o2;
  const candle2 = o0 - o1;

  const isBullishEngulfing = candle1 < 0 && candle2 > Math.abs(candle1);
  const isHammer = candle2 > 0 && (o0 - Math.min(o1, o2, o3)) > 2 * (o0 - o1);

  if (isBullishEngulfing) return 'bullish-engulfing';
  if (isHammer) return 'hammer';

  return null;
}

export function evaluateStrategy(price) {
  updateHistory(price);

  const rsi = getRSI();
  const rsiSlope = getRSISlope();
  const sma = getSMA();
  const momentum = getMomentum();
  const pattern = detectPattern();

  const RSI_BUY = parseFloat(process.env.RSI_BUY) || 30;
  const RSI_SELL = parseFloat(process.env.RSI_SELL) || 70;

  const bullish = price > sma && momentum > 0 && rsiSlope > 0 && (pattern === 'bullish-engulfing' || pattern === 'hammer');
  const bearish = price < sma && momentum < 0 && rsiSlope < 0;

  console.log(
    `${chalk.cyan(`[${process.env.BOT_NAME}]`)} ` +
    `Price: ${chalk.yellow(`$${price.toFixed(6)}`)} | ` +
    `RSI: ${chalk.magenta(rsi?.toFixed(2) || '...')} | ` +
    `Slope: ${chalk.gray(rsiSlope?.toFixed(3) || '...')} | ` +
    `SMA: ${chalk.green(sma?.toFixed(4) || '...')} | ` +
    `Momentum: ${chalk.blue(momentum?.toFixed(6) || '...')} | ` +
    `Pattern: ${chalk.white(pattern || '—')}`
  );

  if (rsi !== null && sma !== null && rsiSlope !== null) {
    if (rsi < RSI_BUY && bullish) return 'BUY';
    if (rsi > RSI_SELL && bearish) return 'SELL';
  }

  return 'HOLD';
}

export function getLatestRSI() {
  return getRSI();
}