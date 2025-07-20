// tools/backtest.mjs
import 'dotenv/config';
import axios from 'axios';
import { detectBeachBreakout } from '../services/beachScanner.mjs';

const symbol = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!symbol || !startDate || !endDate) {
  console.log('❌ Usage: node tools/backtest.mjs SYMBOL START_DATE END_DATE');
  console.log('Example: node tools/backtest.mjs BTC-USDT 2024-12-01 2024-12-07');
  process.exit(1);
}

const CANDLE_LIMIT = 1500;
const WINDOW_SIZE = 15;
const HOLD_PERIOD = 5;

function isoToTimestamp(iso) {
  return Math.floor(new Date(iso).getTime() / 1000);
}

async function fetchHistoricalCandles(symbol, startTs, endTs) {
  const url = `https://api.kucoin.com/api/v1/market/candles?type=1min&symbol=${symbol}&startAt=${startTs}&endAt=${endTs}`;
  try {
    const res = await axios.get(url);
    return res.data.data.map(c => c.map(Number)).reverse();
  } catch (err) {
    console.error(`❌ Error fetching candles: ${err.message}`);
    return [];
  }
}

async function backtest() {
  const from = isoToTimestamp(startDate);
  const to = isoToTimestamp(endDate);
  const candles = await fetchHistoricalCandles(symbol, from, to);

  if (candles.length < WINDOW_SIZE + HOLD_PERIOD) {
    console.log('❌ Not enough candle data.');
    return;
  }

  let wins = 0;
  let losses = 0;
  const results = [];

  for (let i = 0; i <= candles.length - (WINDOW_SIZE + HOLD_PERIOD); i++) {
    const window = candles.slice(i, i + WINDOW_SIZE);
    const entryCandle = candles[i];
    const entryTime = new Date(entryCandle[0]).toISOString();
    const entryPrice = entryCandle[2];

    const breakout = detectBeachBreakout(window, symbol);
    if (!breakout) continue;

    const exitCandle = candles[i + HOLD_PERIOD];
    const exitPrice = exitCandle[2];
    const pnl = ((exitPrice - entryPrice) / entryPrice) * 100;

    results.push(pnl);
    pnl > 0 ? wins++ : losses++;

    console.log(`✅ Signal @ ${entryTime} | Entry: $${entryPrice} → Exit: $${exitPrice} | PnL: ${pnl.toFixed(2)}%`);
  }

  const total = wins + losses;
  const avg = results.length ? results.reduce((a, b) => a + b, 0) / results.length : 0;
  const winRate = total ? ((wins / total) * 100).toFixed(2) : '0.00';
  const best = results.length ? Math.max(...results).toFixed(2) : 'N/A';
  const worst = results.length ? Math.min(...results).toFixed(2) : 'N/A';

  console.log('\n📊 Backtest Summary');
  console.log(`Symbol: ${symbol}`);
  console.log(`Range: ${startDate} → ${endDate}`);
  console.log(`Signals Found: ${total}`);
  console.log(`Wins: ${wins} | Losses: ${losses}`);
  console.log(`Win Rate: ${winRate}%`);
  console.log(`Avg PnL: ${avg.toFixed(2)}%`);
  console.log(`Best: ${best}% | Worst: ${worst}%`);
}

backtest();