// utils/profitTracker.js
import fs from 'fs';
import path from 'path';

const BOT_NAME = process.env.BOT_NAME || 'default';
const __dirname = path.resolve(); // Ensures cross-platform compatibility
const profitPath = path.join(__dirname, 'logs', `profit-${BOT_NAME}.json`);

// 📦 Load profit from file (or return 0)
function loadProfit() {
  try {
    if (fs.existsSync(profitPath)) {
      const raw = fs.readFileSync(profitPath, 'utf-8');
      return parseFloat(raw) || 0;
    }
  } catch (err) {
    console.warn(`⚠️ Failed to load profit: ${err.message}`);
  }
  return 0;
}

// 💾 Save profit value to file
function saveProfit(value) {
  try {
    fs.writeFileSync(profitPath, value.toFixed(2));
  } catch (err) {
    console.error(`❌ Failed to save profit: ${err.message}`);
  }
}

// ➕ Add to total profit
export function addProfit(amount) {
  const current = loadProfit();
  const updated = current + amount;
  saveProfit(updated);
}

// 📤 Get current profit
export function getProfit() {
  return loadProfit();
}

// 🔁 Reset profit to zero
export function resetProfit() {
  saveProfit(0);
  console.log(`🔁 Profit reset for bot [${BOT_NAME}]`);
}