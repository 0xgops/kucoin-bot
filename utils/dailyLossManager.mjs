import fs from 'fs';
import path from 'path';

const BOT_NAME = process.env.BOT_NAME || 'default';
const filePath = path.join('logs', `daily-loss-${BOT_NAME}.json`);
const MAX_DAILY_LOSS = parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5');

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function loadLossFile() {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw || '{}');
}

function saveLossFile(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function recordLoss(pnlPercent) {
  const allData = loadLossFile();
  const today = getTodayKey();

  if (!allData[today]) allData[today] = 0;
  allData[today] += pnlPercent;

  saveLossFile(allData);
}

export function checkDailyLossExceeded() {
  const allData = loadLossFile();
  const today = getTodayKey();

  const todayLoss = allData[today] || 0;
  return todayLoss <= -MAX_DAILY_LOSS;
}