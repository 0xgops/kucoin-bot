// utils/winLossTracker.mjs
import fs from 'fs';
import path from 'path';

const TRACKER_PATH = path.resolve(`logs/winLossTracker.json`);

function loadTracker() {
  if (!fs.existsSync(TRACKER_PATH)) return {};
  return JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf-8'));
}

function saveTracker(data) {
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(data, null, 2));
}

export function recordTradeResult({ symbol, result, pnl }) {
  const data = loadTracker();
  if (!data[symbol]) {
    data[symbol] = { wins: 0, losses: 0, totalPnL: 0 };
  }

  if (result === 'win') data[symbol].wins += 1;
  else data[symbol].losses += 1;

  data[symbol].totalPnL += pnl;
  saveTracker(data);
}

export function getStats(symbol) {
  const data = loadTracker();
  const stats = data[symbol] || { wins: 0, losses: 0, totalPnL: 0 };
  const total = stats.wins + stats.losses;
  const winRate = total ? ((stats.wins / total) * 100).toFixed(1) : '0.0';
  return { ...stats, winRate };
}