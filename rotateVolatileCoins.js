// rotateVolatileCoins.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

const BOT_FOLDER = './bots';
const TOP_N = 3; // Number of bots to rotate/update
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Map KuCoin symbols to CoinGecko IDs (manually extend as needed)
const idMap = require('./idMap-kucoin-expanded.json');


// 🔥 STEP 1: Fetch top volatile symbols from KuCoin
async function fetchTopVolatile() {
  try {
    const { data } = await axios.get('https://api.kucoin.com/api/v1/market/allTickers');
    const tickers = data.data.ticker;

    const usdtPairs = tickers.filter(t => t.symbol.endsWith('USDT'));
    const withChange = usdtPairs.map(t => ({
      symbol: t.symbol,
      full: t.symbol,
      changePercent: parseFloat(t.changeRate) * 100,
    }));

    const sorted = withChange
      .filter(t => idMap[t.full]) // Only keep mapped ones
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    console.log(`Fetched ${sorted.length} mapped tickers.`);
    console.log('\n🔍 Top Mapped Volatile Coins:');
    sorted.slice(0, 10).forEach((coin, i) => {
    console.log(`${i + 1}. ${coin.full} | ${coin.changePercent.toFixed(2)}%`);
    });

return sorted.slice(0, TOP_N);
  } catch (err) {
    console.error('❌ Failed to fetch volatility:', err.message);
    return [];
  }
}

// 🛠 STEP 2: Update each bot folder's .env
function updateBotEnv(botIndex, symbol, coingeckoId) {
  const botDir = path.join(BOT_FOLDER, `bot${botIndex + 1}`);
  const envPath = path.join(botDir, '.env');

  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Skipping bot${botIndex + 1}, .env not found.`);
    return;
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
  const proc = spawn('node', ['launchBots.js'], {
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
  const msg = coins.map((c, i) => `Bot ${i + 1}: **${c.full}** (${c.changePercent.toFixed(2)}%)`).join('\n');
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
  const topCoins = await fetchTopVolatile();

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