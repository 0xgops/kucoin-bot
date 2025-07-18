// utils/profitTracker.js
import fs from 'fs';
import path from 'path';

const BOT_NAME = process.env.BOT_NAME || 'default';
const __dirname = path.resolve(); // Required for top-level path construction
const profitPath = path.join(__dirname, 'logs', `profit-${BOT_NAME}.json`);

function loadProfit() {
  if (fs.existsSync(profitPath)) {
    const raw = fs.readFileSync(profitPath);
    return parseFloat(raw.toString());
  }
  return 0;
}

function saveProfit(value) {
  fs.writeFileSync(profitPath, value.toFixed(2));
}

export function addProfit(amount) {
  const current = loadProfit();
  const updated = current + amount;
  saveProfit(updated);
}

export function getProfit() {
  return loadProfit();
}

export function resetProfit() {
  saveProfit(0);
  console.log(`🔁 Profit reset for bot [${BOT_NAME}]`);
}