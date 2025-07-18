import 'dotenv/config';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

import { fetchPrice } from './services/kucoin.mjs';
import { fetchLastHourPrices } from './services/priceHistory.mjs';
import { simulateTrade } from './services/trade.mjs';
import { getVolatility } from './services/volatilityScanner.mjs';
import { isVolatileEnough, seedHistory } from './utils/volatilityFilter.mjs';
import { getProfit } from './utils/profitTracker.mjs';

import * as rsiStrategy from './logic/strategy-rsi.mjs';
import * as smaStrategy from './logic/strategy.mjs';

// 🧠 Config pulled from ENV
const SYMBOL = process.env.SYMBOL || 'BTC-USDT';
const INTERVAL = parseInt(process.env.CHECK_INTERVAL, 10) || 30000;
const STRATEGY = process.env.STRATEGY || 'sma';
const BOT_NAME = process.env.BOT_NAME || SYMBOL.split('-')[0];
const VOLATILITY_THRESHOLD = parseFloat(process.env.VOLATILITY_THRESHOLD) || 0.1;
const SKIP_VOLATILITY = process.env.SKIP_VOLATILITY === 'true';
const HOLDINGS_PATH = `./logs/holdings-${BOT_NAME}.json`;
const TRADES_LOG_PATH = `./logs/trades-${BOT_NAME}.log`;

const strategyModule = STRATEGY === 'rsi' ? rsiStrategy : smaStrategy;
const evaluateStrategy = strategyModule.evaluateStrategy;
const getLatestRSI = strategyModule.getLatestRSI || (() => null);

// 🧾 Initialize holdings
let holdings = {
  balanceUSD: 1000,
  position: null,
  volatility: 0,
  lastSellTime: null,
  _skipReason: null
};

// 🛠 Load holdings from file
async function loadHoldings() {
  try {
    if (await fs.access(HOLDINGS_PATH).then(() => true).catch(() => false)) {
      const raw = await fs.readFile(HOLDINGS_PATH, 'utf8');
      holdings = { ...holdings, ...JSON.parse(raw) };

      if (holdings.position && !holdings.position.entryPrice) {
        holdings.position = null;
        console.log(chalk.yellow('⚠️ Cleared invalid position state.'));
      }

      console.log(chalk.green(`🧾 Loaded holdings: $${holdings.balanceUSD.toFixed(2)}`));
    } else {
      console.log(chalk.yellow(`🧾 No holdings file found, using defaults.`));
    }
  } catch (error) {
    console.error(chalk.red(`⚠️ Failed to load holdings: ${error.message}`));
  }
}

// 💾 Save holdings to file
async function saveHoldings() {
  try {
    await fs.writeFile(HOLDINGS_PATH, JSON.stringify(holdings, null, 2));
  } catch (error) {
    console.error(chalk.red(`⚠️ Failed to save holdings: ${error.message}`));
  }
}

// 📝 Log trade
async function logTrade(signal, price, rsi) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${signal} @ $${price.toFixed(6)} | Volatility: ${holdings.volatility.toFixed(2)}% | RSI: ${rsi ? rsi.toFixed(2) : 'N/A'} | Balance: $${holdings.balanceUSD.toFixed(2)}\n`;
    await fs.appendFile(TRADES_LOG_PATH, logEntry);
  } catch (error) {
    console.error(chalk.red(`⚠️ Failed to log trade: ${error.message}`));
  }
}

// 🔁 Main trading loop
async function main() {
  try {
    const price = await fetchPrice(SYMBOL);
    if (!price || isNaN(price)) {
      console.log(chalk.red(`⚠️ Invalid price: ${price} — skipping.`));
      return;
    }

    const volatility = await getVolatility(SYMBOL);
    holdings.volatility = volatility;

    if (!SKIP_VOLATILITY && !isVolatileEnough(price, VOLATILITY_THRESHOLD)) {
      console.log(chalk.gray(`[${BOT_NAME}] Market too flat (volatility: ${volatility.toFixed(2)}%), skipping.`));
      return;
    }

    const signal = evaluateStrategy(price);
    const rsi = getLatestRSI();
    const timestamp = new Date().toISOString();
    const rsiString = rsi ? chalk.magenta(`(RSI: ${rsi.toFixed(2)})`) : '';
    const inPosition = holdings.position && holdings.position.entryPrice ? '📦 IN TRADE' : '💤 OUT';
    const colorSignal = signal === 'BUY' ? chalk.green.bold(signal)
                      : signal === 'SELL' ? chalk.red.bold(signal)
                      : chalk.gray(signal);

    console.log(`${chalk.blue(`[${timestamp}]`)} [${BOT_NAME}] $${price.toFixed(6)} | Signal: ${colorSignal} ${rsiString} ${chalk.gray(inPosition)}`);
    console.log(`💰 Total Profit: $${getProfit().toFixed(2)} | Volatility: ${volatility.toFixed(2)}%${holdings._skipReason ? ` | Skip: ${holdings._skipReason}` : ''}\n`);

    if (['BUY', 'SELL'].includes(signal)) {
      console.log(`🔍 Pre-trade: ${holdings.position && holdings.position.entryPrice ? 'IN TRADE' : 'OUT'}`);
      holdings = simulateTrade(signal, price, holdings);
      await saveHoldings();
      await logTrade(signal, price, rsi);
    }
  } catch (error) {
    console.error(chalk.red(`⚠️ Error in trading loop: ${error.message}`));
  }
}

// ⏳ Initialize and start bot
(async () => {
  try {
    await loadHoldings();
    const history = await fetchLastHourPrices(SYMBOL);
    seedHistory(history);
    console.log(chalk.green(`🕘 [${BOT_NAME}] Seeded memory with ${history.length} prices.`));
    setInterval(main, INTERVAL);
  } catch (error) {
    console.error(chalk.red(`⚠️ Failed to initialize bot: ${error.message}`));
    process.exit(1);
  }
})();