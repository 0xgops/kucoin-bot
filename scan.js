const fs = require('fs');
const path = require('path');
const { fetchVolatilityTopMovers } = require('./services/volatilityScanner');
const { sendDiscordMessage } = require('./config/discord');

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
  env = env.replace(/SYMBOL=.*/g, `SYMBOL=${best.id}`);
  fs.writeFileSync(ENV_PATH, env);
  console.log(`✅ .env updated with top mover: ${best.name} (${best.symbol.toUpperCase()})`);

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