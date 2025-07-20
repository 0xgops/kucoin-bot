import axios from 'axios';
import chalk from 'chalk';
import { idMap } from '../config/idMap-kucoin-expanded.mjs';

const symbols = Object.keys(idMap);
const CANDLES = 15;

const THRESHOLDS = {
  ef: parseFloat(process.env.EF_THRESHOLD || '1.5'),
  volX: parseFloat(process.env.VOL_MULTIPLIER || '1.3'),
  debug: true,
};

async function fetchCandles(symbol) {
  const end = Math.floor(Date.now() / 1000);
  const url = `https://api.kucoin.com/api/v1/market/candles?type=1min&symbol=${symbol}&endAt=${end}`;

  try {
    const { data } = await axios.get(url);

    if (!Array.isArray(data?.data) || data.data.length < CANDLES) {
      console.warn(`⚠️ ${symbol}: Insufficient or invalid candle data`);
      return [];
    }

    return data.data.slice(0, CANDLES); // newest first
  } catch (err) {
    console.warn(`❌ Failed to fetch candles for ${symbol}: ${err.message}`);
    return [];
  }
}

function confirmGreenBreakout(candles) {
  const recent = candles.slice(0, 3);
  const green = recent.filter(c => parseFloat(c[2]) > parseFloat(c[1]));

  const avgVol = candles
    .slice(3, 13)
    .reduce((sum, c) => sum + parseFloat(c[5]), 0) / 10;

  const volumeSurge = green.every(c => parseFloat(c[5]) > avgVol * THRESHOLDS.volX);
  const momentum = green.length >= 2;

  return momentum && volumeSurge;
}

function detectBeachBreakout(candles, symbol) {
  try {
    const reds = candles.slice(1, 6).filter(c => parseFloat(c[2]) < parseFloat(c[1]));
    if (reds.length < 2) return false;

    const avgRedBody = reds
      .map(c => Math.abs(parseFloat(c[2]) - parseFloat(c[1])))
      .reduce((a, b) => a + b, 0) / reds.length;

    const [_, open, close, high, low, volume] = candles[0].map(Number);
    const body = Math.abs(close - open);
    const expansionFactor = body / (avgRedBody || 1);

    const volumeAvg = candles
      .slice(1, 6)
      .reduce((sum, c) => sum + parseFloat(c[5]), 0) / 5;

    const volX = volume / (volumeAvg || 1);

    const passed =
      close > open &&
      expansionFactor > THRESHOLDS.ef &&
      volX > THRESHOLDS.volX &&
      confirmGreenBreakout(candles);

    if (THRESHOLDS.debug) {
      const status = passed ? chalk.green('✅') : chalk.red('❌');
      console.log(
        `${chalk.cyan(symbol)} | Pullback: ${reds.length} red | EF: ${expansionFactor.toFixed(2)} | ` +
        `Vol x: ${volX.toFixed(2)} | Thresholds: EF>${THRESHOLDS.ef}, VOL>${THRESHOLDS.volX} ${status}`
      );
    }

    return passed;
  } catch (err) {
    console.warn(`❌ Error analyzing ${symbol}: ${err.message}`);
    return false;
  }
}

async function scan() {
  console.log(`\n🌊 ${chalk.bold('BEACH SCANNER')} — Looking for pullback → breakout setups\n`);

  for (const symbol of symbols) {
    const candles = await fetchCandles(symbol);
    if (candles.length < 6) continue;

    if (detectBeachBreakout(candles, symbol)) {
      console.log(`${chalk.blue('🌊')} ${chalk.yellow(symbol)} — breakout pattern forming`);
    }
  }
}

scan();

export { detectBeachBreakout, fetchCandles };