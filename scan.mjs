// scan.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchVolatilityTopMovers } from './services/volatilityScanner.mjs';
import { sendDiscordMessage } from './config/discord.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '.env');

(async () => {
  const top = await fetchVolatilityTopMovers(5);
  const best = top[0];
  if (!best) {
    console.log('⚠️ No coins found');
    return;
  }

  // 🛠 Update .env with top volatile coin
  console.log(`🛠 Updating .env → SYMBOL=${best.id}`);
  let env = fs.readFileSync(ENV_PATH, 'utf-8');

  if (!env.includes('SYMBOL=')) {
    env += `\nSYMBOL=${best.id}\n`;
  } else {
    env = env.replace(/SYMBOL=.*/g, `SYMBOL=${best.id}`);
  }

  if (!env.includes('TRADE_MODE=')) {
    env += `\nTRADE_MODE=fallback\n`;
  } else {
    env = env.replace(/TRADE_MODE=.*/g, `TRADE_MODE=fallback`);
  }

  fs.writeFileSync(ENV_PATH, env);
  console.log(`✅ .env updated with top mover: ${best.name} (${best.symbol.toUpperCase()})`);

  // 🕘 Optional: append to scan history log
  const timestamp = new Date().toISOString();
  fs.appendFileSync('./logs/scan-history.log', `[${timestamp}] Set SYMBOL=${best.id} (${best.name})\n`);

  // 📢 Send top 5 to Discord
  const discordMsg = [
    '📊 **Top 5 Most Volatile Coins (24h)**',
    '',
    ...top.map((coin, i) =>
      `${i + 1}. **${coin.name}** (${coin.symbol.toUpperCase()}) — ${coin.change24h.toFixed(2)}% @ $${coin.price}`
    )
  ].join('\n');

  await sendDiscordMessage(discordMsg);
})();