import '../registerRoot.mjs';
import 'dotenv/config';

import { getCurrentPrice } from '@services/kucoin.mjs';
import { evaluateStrategy } from '@logic/strategy.mjs'; // or @logic/strategy-rsi.mjs
import { executeTrade } from '@services/trade.mjs';
import { addProfit } from '@utils/profitTracker.mjs';
import { isVolatileEnough } from '@utils/volatilityFilter.mjs';
import { fetchLastHourPrices } from '@services/priceHistory.mjs';

const SYMBOL = process.env.SYMBOL;
const INTERVAL = parseInt(process.env.CHECK_INTERVAL || '30000');

let seeded = false;

async function tick() {
  try {
    const price = await getCurrentPrice(SYMBOL);

    if (!seeded) {
      const history = await fetchLastHourPrices(SYMBOL);
      history.forEach(p => isVolatileEnough(p));
      seeded = true;
    }

    if (process.env.SKIP_VOLATILITY !== 'true') {
      const volatile = isVolatileEnough(price);
      if (!volatile) {
        console.log(`[${SYMBOL}] ⏸ Not volatile enough`);
        return;
      }
    }

    const signal = evaluateStrategy(price);
    await executeTrade(signal, price, SYMBOL);
  } catch (err) {
    console.error(`💥 Bot error:`, err.message);
  }
}

console.log(`🤖 Starting bot for ${SYMBOL} every ${INTERVAL / 1000}s`);
setInterval(tick, INTERVAL);