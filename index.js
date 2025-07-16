const { getVolatility } = require('./services/volatilityScanner');
const fs = require('fs');
const chalk = require('chalk').default;

const { fetchPrice } = require('./services/kucoin');
const { fetchLastHourPrices } = require('./services/priceHistory');
const { simulateTrade } = require('./services/trade');
const { sendDiscordMessage } = require('./config/discord');
const { isVolatileEnough, seedHistory } = require('./utils/volatilityFilter');
const { getProfit } = require('./utils/profitTracker');

// 🧠 Config pulled from ENV
const SYMBOL = process.env.SYMBOL || 'BTC-USDT';
const INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 30000;
const STRATEGY = process.env.STRATEGY || 'sma';
const BOT_NAME = process.env.BOT_NAME || SYMBOL.split('-')[0];

let evaluateStrategy;
let getLatestRSI = () => null;

// 🧠 Load strategy
if (STRATEGY === 'rsi') {
  const rsiModule = require('./logic/strategy-rsi');
  evaluateStrategy = rsiModule.evaluateStrategy;
  getLatestRSI = rsiModule.getLatestRSI;
} else {
  evaluateStrategy = require('./logic/strategy').evaluateStrategy;
}

const holdingsPath = `./logs/holdings-${BOT_NAME}.json`;
let holdings = { balanceUSD: 1000, position: null };

// 🧾 Load holdings
if (fs.existsSync(holdingsPath)) {
  const raw = fs.readFileSync(holdingsPath);
  holdings = JSON.parse(raw);
}

// 🔁 Main trading loop
async function main() {
  const price = await fetchPrice(SYMBOL);
  if (!price || isNaN(price)) {
    console.log(chalk.red(`⚠️ Invalid price: ${price} — skipping.`));
    return;
  }

  const SKIP_VOLATILITY = process.env.SKIP_VOLATILITY === 'true';

  if (!SKIP_VOLATILITY) {
  const isVolatile = isVolatileEnough(price, 0.1);
  if (!isVolatile) {
    console.log(chalk.gray(`[${BOT_NAME}] Market too flat, skipping.`));
    return;
  }
  }

  const signal = evaluateStrategy(price);
  const timestamp = new Date().toISOString();
  const rsi = getLatestRSI();
  const rsiString = rsi ? chalk.magenta(`(RSI: ${rsi.toFixed(2)})`) : '';

  const inPosition = holdings.position ? '📦 IN TRADE' : '💤 OUT';
  const colorSignal = signal === 'BUY' ? chalk.green.bold(signal)
                    : signal === 'SELL' ? chalk.red.bold(signal)
                    : chalk.gray(signal);

  console.log(`${chalk.blue(`[${timestamp}]`)} [${BOT_NAME}] $${price} | Signal: ${colorSignal} ${rsiString} ${chalk.gray(inPosition)}`);
  console.log(`💰 Total Profit: $${getProfit().toFixed(2)}\n`);

  // 🚨 Alert
  if (['BUY', 'SELL'].includes(signal)) {
    await sendDiscordMessage(`[${BOT_NAME}] ${signal} @ $${price} ${rsiString}`);
  }

  // 💡 Update volatility filter before simulating trade
const symbol = process.env.SYMBOL; // <-- Add this line
const volatility = await getVolatility(symbol); // 30-min window
holdings.volatility = volatility;

  // 🧠 Simulate trade + save state
  holdings = simulateTrade(signal, price, holdings);
  fs.writeFileSync(holdingsPath, JSON.stringify(holdings, null, 2));
  fs.appendFileSync(`./logs/trades-${BOT_NAME}.log`, `${timestamp} - ${signal} @ $${price}\n`);
}

// ⏳ Init with historical prices
(async () => {
  const history = await fetchLastHourPrices(SYMBOL);
  seedHistory(history);
  console.log(`🕘 [${BOT_NAME}] Seeded memory with ${history.length} prices.`);
  setInterval(main, INTERVAL);
})();