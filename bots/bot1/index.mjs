// bots/bot1/index.mjs
import '../../registerRoot.mjs';
import 'dotenv/config';
import { simulateTrade } from '../../services/tradeHandler.mjs';
import { getCurrentPrice } from '../../services/kucoin.mjs';
import { evaluateStrategy } from '../../logic/strategy.mjs'; // or strategy-rsi.mjs
import { addProfit, getProfit } from '../../utils/profitTracker.mjs';
import { isVolatileEnough } from '../../utils/volatilityFilter.mjs';
import { fetchLastHourPrices } from '../../services/priceHistory.mjs';

const SYMBOL = process.env.SYMBOL;
const INTERVAL = parseInt(process.env.CHECK_INTERVAL || '30000');

let seeded = false;
let lastVolatility = 0;

async function tick() {
  try {
    const price = await getCurrentPrice(SYMBOL);

    if (!seeded) {
      const history = await fetchLastHourPrices(SYMBOL);
      history.forEach(p => isVolatileEnough(p)); // warm up
      seeded = true;
    }

    let volatile = true;
    let skipReason = 'CALM';

    if (process.env.SKIP_VOLATILITY !== 'true') {
      volatile = isVolatileEnough(price);
      lastVolatility = isVolatileEnough(price, true); // % only
      if (!volatile) {
        skipReason = 'CALM';
        console.log(`[${SYMBOL}] ⏸ Not volatile enough`);
      } else {
        skipReason = 'READY';
      }
    }

    const signal = evaluateStrategy(price, SYMBOL);
    await simulateTrade({ symbol: SYMBOL, signal, price, rsi: null, mode: 'live' });

    // 💰 Summary line (always show, even if volatile filter skips)
    const profit = getProfit();
    console.log(
      `💰 Total Profit: $${profit.toFixed(2)} | Volatility: ${lastVolatility.toFixed(2)}% | Skip: ${skipReason}`
    );

  } catch (err) {
    console.error(`💥 Bot error:`, err.message);
  }
}

console.log(`🤖 Starting bot for ${SYMBOL} every ${INTERVAL / 1000}s`);
setInterval(tick, INTERVAL);