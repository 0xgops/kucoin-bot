const fs = require('fs');
const path = require('path');

const BOT_NAME = process.env.BOT_NAME || 'default';
const profitPath = path.join(__dirname, `../logs/profit-${BOT_NAME}.json`);

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

function addProfit(amount) {
  const current = loadProfit();
  const updated = current + amount;
  saveProfit(updated);
}

function getProfit() {
  return loadProfit();
}

module.exports = { addProfit, getProfit };