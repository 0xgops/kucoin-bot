// tools/scanVol5.mjs
import { getVolatility } from '../services/volatilityScanner.mjs';
import { idMap } from '../config/idMap-kucoin-expanded.mjs';

const symbols = Object.keys(idMap);
const LOOKBACK_MINUTES = 5;

console.log(`\n📈 Top 5-min Volatile Coins (no bot update)\n`);

const run = async () => {
  const results = [];

  for (const symbol of symbols) {
    const volatility = await getVolatility(symbol, LOOKBACK_MINUTES);
    results.push({ symbol, volatility });
  }

  const sorted = results
    .filter(c => c.volatility > 0)
    .sort((a, b) => b.volatility - a.volatility)
    .slice(0, 15);

  sorted.forEach((c, i) => {
    console.log(`${i + 1}. ${c.symbol} → ${c.volatility.toFixed(2)}%`);
  });
};

run();