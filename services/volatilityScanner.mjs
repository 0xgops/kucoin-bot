// services/volatilityScanner.js
import axios from 'axios';

const CANDLE_INTERVAL = 1; // 1-minute candles
const LOOKBACK_MINUTES = 30;

export async function getVolatility(symbol) {
  const end = Date.now();
  const start = end - LOOKBACK_MINUTES * 60 * 1000;

  const url = `https://api.kucoin.com/api/v1/market/candles?type=${CANDLE_INTERVAL}min&symbol=${symbol}&startAt=${Math.floor(start / 1000)}&endAt=${Math.floor(end / 1000)}`;

  try {
    const { data } = await axios.get(url);
    if (!data?.data?.length) return 0;

    const closes = data.data.map(candle => parseFloat(candle[2]));
    const min = Math.min(...closes);
    const max = Math.max(...closes);

    return ((max - min) / min) * 100;
  } catch (e) {
    console.error(`❌ Error fetching volatility for ${symbol}:`, e.message);
    return 0;
  }
}