import axios from 'axios';
import chalk from 'chalk';
import { idMap } from '../config/idMap-kucoin-expanded.mjs';

const CANDLE_INTERVAL = '3min';
const LOOKBACK = 20;

const THRESHOLDS = {
  greenCandles: 4,
  smaShort: 7,
  smaLong: 25,
  rsiMin: 50,
  volSpikeMultiplier: 1.2,
  minScore: 3,
};

const fetchCandles = async (symbol) => {
  const url = `https://api.kucoin.com/api/v1/market/candles?type=${CANDLE_INTERVAL}&symbol=${symbol}`;
  try {
    const { data } = await axios.get(url);
    if (!Array.isArray(data?.data) || data.data.length < LOOKBACK) {
      console.warn(`⚠️ ${symbol}: Insufficient or invalid candle data`);
      return null;
    }
    return data.data.slice(0, LOOKBACK).reverse(); // newest last
  } catch (err) {
    console.warn(`❌ Failed to fetch candles for ${symbol}: ${err.message}`);
    return null;
  }
};

const calcSMA = (closes, length) => {
  if (closes.length < length) return 0;
  const slice = closes.slice(0, length);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / length;
};

const calcRSI = (closes, period = 14) => {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i - 1] - closes[i];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1); // avoid div by 0
  return 100 - 100 / (1 + rs);
};

const analyzeCoin = async (symbol) => {
  const candles = await fetchCandles(symbol);
  if (!candles) return null;

  const closes = candles.map(c => parseFloat(c[2]));
  const opens = candles.map(c => parseFloat(c[1]));
  const volumes = candles.map(c => parseFloat(c[5]));

  const greenCandles = candles.filter(c => parseFloat(c[2]) > parseFloat(c[1])).length;
  const smaShort = calcSMA(closes, THRESHOLDS.smaShort);
  const smaLong = calcSMA(closes, THRESHOLDS.smaLong);
  const rsi = calcRSI(closes, 14);
  const avgVolume = volumes.slice(1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
  const volSpike = volumes[0] > avgVolume * THRESHOLDS.volSpikeMultiplier;

  return {
    symbol,
    price: closes[0],
    greenCandles,
    smaTrend: smaShort > smaLong,
    rsi,
    rsiRising: rsi !== null && rsi > THRESHOLDS.rsiMin,
    volSpike,
    score: 0,
  };
};

const runScan = async () => {
  const results = [];

  for (const symbol of Object.keys(idMap)) {
    const res = await analyzeCoin(symbol);
    if (!res) continue;

    let score = 0;
    if (res.greenCandles >= THRESHOLDS.greenCandles) score += 1;
    if (res.smaTrend) score += 1;
    if (res.rsiRising) score += 1;
    if (res.volSpike) score += 1;

    if (score >= THRESHOLDS.minScore) {
      res.score = score;
      results.push(res);
    }
  }

  results.sort((a, b) => b.score - a.score);

  console.log('\n🚀 Pump Scanner Results:\n');
  if (results.length === 0) {
    console.log(chalk.gray('No strong momentum setups found.'));
    return;
  }

  results.forEach((r, i) => {
    console.log(
      `${i + 1}. ${chalk.cyan(r.symbol)} | ` +
      `Score: ${chalk.yellow(`${r.score}/4`)} | ` +
      `Price: $${chalk.green(r.price.toFixed(4))} | ` +
      `RSI: ${chalk.magenta(r.rsi?.toFixed(2) || 'N/A')}`
    );
  });
};

runScan();