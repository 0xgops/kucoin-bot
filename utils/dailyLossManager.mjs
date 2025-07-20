import fs from 'fs';
import path from 'path';

const BOT_NAME = process.env.BOT_NAME || 'default';
const filePath = path.join('logs', `daily-loss-${BOT_NAME}.json`);
const MAX_DAILY_LOSS = parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5'); // % loss cap

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function loadLossFile() {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn('⚠️ Failed to load daily loss file:', e.message);
    return {};
  }
}

function saveLossFile(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function recordLoss(pnlPercent) {
  if (pnlPercent >= 0) return; // Only record losses

  const data = loadLossFile();
  const today = getTodayKey();

  if (!data[today]) data[today] = 0;
  data[today] += pnlPercent; // subtracts negative PnL

  saveLossFile(data);
}

export function checkDailyLossExceeded() {
  const data = loadLossFile();
  const today = getTodayKey();
  const totalLoss = data[today] || 0;

  const exceeded = Math.abs(totalLoss) >= MAX_DAILY_LOSS;
  if (exceeded) {
    console.log(`🚫 Max daily loss hit for ${BOT_NAME}: ${totalLoss.toFixed(2)}%`);
  }

  return exceeded;
}