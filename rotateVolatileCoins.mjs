// rotateVolatileCoins.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';

import { getVolatility } from './services/volatilityScanner.mjs';
import { detectBeachBreakout, fetchCandles } from './services/beachScanner.mjs';

const BOT_FOLDER = './bots';
const TOP_N = 3;
const ROTATION_INTERVAL_MS = 30 * 60 * 1000;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// STEP 1: Get top volatile coins + breakout confirmation
async function fetchTopVolatile(idMap) {
  const breakoutHits = [];
  const volatilityOnly = [];

  for (const symbol of Object.keys(idMap)) {
    const volatility = await getVolatility(symbol, 5);
    if (!volatility) continue;

    const candles = await fetchCandles(symbol);
    if (!candles || candles.length < 6) continue;

    const breakout = detectBeachBreakout(candles, symbol);
    const entry = { symbol, volatility };

    if (breakout) breakoutHits.push(entry);
    else console.log(`❌ Rejected: ${symbol} | breakout=${breakout}`);

    volatilityOnly.push(entry);
  }

  breakoutHits.sort((a, b) => b.volatility - a.volatility);
  volatilityOnly.sort((a, b) => b.volatility - a.volatility);

  const results = breakoutHits.length > 0 ? breakoutHits : volatilityOnly;
  console.log(`\n📊 Selected Top Coins (${breakoutHits.length > 0 ? 'with breakout' : 'fallback only'}):`);
  results.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.symbol} → ${c.volatility.toFixed(2)}%`);
  });

  return results.slice(0, TOP_N);
}

// STEP 2: Update .env for bots
function updateBotEnv(botIndex, symbol, coingeckoId) {
  const botDir = path.join(BOT_FOLDER, `bot${botIndex + 1}`);
  const envPath = path.join(botDir, '.env');
  const holdingsPath = path.join(botDir, `logs/holdings-${symbol.split('-')[0]}.json`);

  if (!fs.existsSync(envPath)) return console.warn(`⚠️ Missing .env for bot ${botIndex + 1}`);
  if (fs.existsSync(holdingsPath)) {
    const holdings = JSON.parse(fs.readFileSync(holdingsPath, 'utf-8'));
    if (holdings?.position) {
      return console.log(`🛑 Bot ${botIndex + 1} still in trade (${symbol}) — skipping.`);
    }
  }

  let env = fs.readFileSync(envPath, 'utf-8');
  env = env.replace(/SYMBOL=.*/g, `SYMBOL=${symbol}`);
  env = env.replace(/COINGECKO_ID=.*/g, `COINGECKO_ID=${coingeckoId}`);
  env = env.replace(/BOT_NAME=.*/g, `BOT_NAME=${symbol.split('-')[0]}`);

  fs.writeFileSync(envPath, env);
  console.log(`✅ Updated bot ${botIndex + 1} → ${symbol}`);
}

// STEP 3: Relaunch all bots
function relaunchBots() {
  console.log(`\n♻️ Relaunching all bots...\n`);
  const proc = spawn('node', ['launchBots.mjs'], {
    stdio: 'inherit',
    env: process.env
  });

  proc.on('close', (code) => {
    if (code !== 0) console.error(`❌ Relaunch failed with exit code ${code}`);
  });
}

// STEP 4: Send Discord summary
async function sendDiscordSummary(coins) {
  if (!DISCORD_WEBHOOK) return;

  const msg = [
    `🔄 **Bot Rotation @ ${new Date().toLocaleTimeString()}**`,
    ...coins.map((c, i) => `→ Bot ${i + 1}: \`${c.symbol}\` (${c.volatility.toFixed(2)}%)`)
  ].join('\n');

  try {
    await axios.post(DISCORD_WEBHOOK, { content: msg });
    console.log(`✅ Discord summary sent.`);
  } catch (err) {
    console.error(`❌ Failed to send Discord update:`, err.message);
  }
}

// MAIN ROTATION LOOP
async function main() {
  const raw = await fs.promises.readFile('./idMap-kucoin-expanded.json', 'utf-8');
  const idMap = JSON.parse(raw);

  const topCoins = await fetchTopVolatile(idMap);
  if (topCoins.length === 0) return console.log('⚠️ No coins selected. Skipping rotation.');

  topCoins.forEach((coin, i) => {
    const coingeckoId = idMap[coin.symbol];
    updateBotEnv(i, coin.symbol, coingeckoId);
  });

  await sendDiscordSummary(topCoins);
  relaunchBots();

  console.log(`\n⏳ Next rotation in ${(ROTATION_INTERVAL_MS / 60000)} minutes...\n`);
}

main();
setInterval(main, ROTATION_INTERVAL_MS);