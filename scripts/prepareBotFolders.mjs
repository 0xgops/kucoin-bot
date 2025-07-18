// prepareBots.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bots = [
  { name: 'TURBO', symbol: 'TURBO-USDT' },
  { name: 'SUI', symbol: 'SUI-USDT' },
  { name: 'ALGO', symbol: 'ALGO-USDT' },
];

const baseDir = path.resolve(__dirname, '../temp_envs');
const filesToCopy = ['index.js']; // Add more shared files if needed

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

bots.forEach((bot, i) => {
  const botDir = path.join(baseDir, `bot${i + 1}`);
  if (!fs.existsSync(botDir)) fs.mkdirSync(botDir);

  // Inject .env
  const envContents = `SYMBOL=${bot.symbol}\n`;
  fs.writeFileSync(path.join(botDir, '.env'), envContents);

  // Copy shared files
  filesToCopy.forEach(file => {
    fs.copyFileSync(path.resolve(__dirname, `../${file}`), path.join(botDir, file));
  });

  // Reset holdings
  const initialHoldings = {
    balanceUSD: 1000,
    position: null,
  };
  fs.writeFileSync(path.join(botDir, 'holdings.json'), JSON.stringify(initialHoldings, null, 2));
});