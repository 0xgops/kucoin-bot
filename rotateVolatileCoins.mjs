import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';
import { getVolatility } from './services/volatilityScanner.mjs';

const BOT_FOLDER = './bots';
const TOP_N = 3;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// 🔥 STEP 1: Fetch top volatile symbols
async function fetchTopVolatile(idMap) {
  const volatilities = [];

  for (const symbol of Object.keys(idMap)) {
    const volatility = await getVolatility(symbol);
    volatilities.push({ symbol, full: symbol, volatility });
  }

  const sorted = volatilities
    .filter(c => c.volatility > 0)
    .sort((a, b) => b.volatility - a.volatility);

  console.log(`\n📊 Top Mapped Volatile Coins (30-min window):`);
  sorted.slice(0, 10).forEach((coin, i) => {
    console.log(`${i + 1}. ${coin.symbol} | ${coin.volatility.toFixed(2)}%`);
  });

  return sorted.slice(0, TOP_N);
}

// 🛠 STEP 2: Update each bot folder's .env
function updateBotEnv(botIndex, symbol, coingeckoId) {
  const botDir = path.join(BOT_FOLDER, `bot${botIndex + 1}`);
  const envPath = path.join(botDir, '.env');
  const holdingsPath = path.join(botDir, `logs/holdings-${symbol.split('-')[0]}.json`);

  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Skipping bot${botIndex + 1}, .env not found.`);
    return;
  }

  if (fs.existsSync(holdingsPath)) {
    const holdings = JSON.parse(fs.readFileSync(holdingsPath, 'utf-8'));
    if (holdings.position) {
      console.log(`🛑 Bot ${botIndex + 1} is still in trade (${symbol}). Skipping update.`);
      return;
    }
  }

  let envContent = fs.readFileSync(envPath, 'utf-8');
  envContent = envContent.replace(/SYMBOL=.*/g, `SYMBOL=${symbol}`);
  envContent = envContent.replace(/COINGECKO_ID=.*/g, `COINGECKO_ID=${coingeckoId}`);
  envContent = envContent.replace(/BOT_NAME=.*/g, `BOT_NAME=${symbol.split('-')[0]}`);

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated bot${botIndex + 1} → ${symbol}`);
}

// 🚀 STEP 3: Relaunch all bots
function relaunchBots() {
  console.log('\n♻️ Relaunching bots...\n');
  const proc = spawn('node', ['launchBots.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });

  proc.on('close', code => {
    if (code !== 0) {
      console.error(`❌ Relaunch failed with code ${code}`);
    }
  });
}

// 🔔 STEP 4: Optional Discord alert
async function sendDiscordSummary(coins) {
  if (!DISCORD_WEBHOOK) return;
  const msg = coins.map((c, i) => `Bot ${i + 1}: **${c.full}** (${c.volatility.toFixed(2)}%)`).join('\n');
  try {
    await axios.post(DISCORD_WEBHOOK, {
      content: `🔄 Rotated Bots to Top Volatile Coins:\n${msg}`,
    });
    console.log('✅ Sent Discord summary.');
  } catch (err) {
    console.error('❌ Failed to send Discord alert:', err.message);
  }
}

// 🧠 MAIN
(async () => {
  const raw = await fs.promises.readFile('./idMap-kucoin-expanded.json', 'utf-8');
  const idMap = JSON.parse(raw);

  const topCoins = await fetchTopVolatile(idMap);
  if (topCoins.length === 0) {
    console.log('⚠️ No coins fetched. Skipping rotation.');
    return;
  }

  topCoins.forEach((coin, i) => {
    const symbol = coin.full;
    const coingeckoId = idMap[symbol];
    updateBotEnv(i, symbol, coingeckoId);
  });

  await sendDiscordSummary(topCoins);
  relaunchBots();
})();