// tools/scanVolatility.mjs

import { fetchVolatilityTopMovers } from '../services/volatilityScanner.mjs';
import { idMap } from '../config/idMap-kucoin-expanded.mjs';

(async () => {
  try {
    const top = await fetchVolatilityTopMovers(10);

    if (!top || top.length === 0) {
      console.log('⚠️ No volatile coins found.');
      return;
    }

    console.log('\n📊 Top 10 Most Volatile Coins (24h):\n');

    top.forEach((coin, i) => {
      const mapped = Object.entries(idMap).find(([, id]) => id === coin.id);
      const kucoinSymbol = mapped ? mapped[0] : coin.symbol || '??';

      console.log(
        `${i + 1}. ${coin.name} (${kucoinSymbol}) → ${coin.change24h.toFixed(2)}% @ $${parseFloat(coin.price).toFixed(6)}`
      );
    });
  } catch (err) {
    console.error('💥 Error fetching volatility data:', err.message);
  }
})();