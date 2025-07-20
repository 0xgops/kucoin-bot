// services/volatilityScanner.mjs
import axios from 'axios';
import { idMap } from '../config/idMap-kucoin-expanded.mjs';

// 📈 Get volatility over a given time window (default: 30 minutes)
export async function getVolatility(symbol, minutes = 30) {
  const end = Date.now();
  const start = end - minutes * 60 * 1000;

  const url = `https://api.kucoin.com/api/v1/market/candles?type=1min&symbol=${symbol}&startAt=${Math.floor(start / 1000)}&endAt=${Math.floor(end / 1000)}`;

  try {
    const { data } = await axios.get(url);
    if (!data?.data?.length) return 0;

    const closes = data.data.map(c => parseFloat(c[2]));
    const min = Math.min(...closes);
    const max = Math.max(...closes);

    return ((max - min) / min) * 100;
  } catch (e) {
    console.error(`❌ Error fetching volatility for ${symbol}:`, e.message);
    return 0;
  }
}

// 🔍 Scan and return top N most volatile coins
export async function fetchVolatilityTopMovers(limit = 10, minutes = 30) {
  const results = [];

  for (const [symbol, id] of Object.entries(idMap)) {
    const volatility = await getVolatility(symbol, minutes);
    results.push({ symbol, id, volatility });
  }

  return results
    .sort((a, b) => b.volatility - a.volatility)
    .slice(0, limit)
    .map(entry => ({
      id: entry.id,
      name: entry.symbol,
      change24h: entry.volatility,
      price: 0 // placeholder for price (can be fetched later)
    }));
}