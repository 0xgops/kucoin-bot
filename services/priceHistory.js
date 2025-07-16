const axios = require('axios');

async function fetchLastHourPrices(symbol = 'BTC-USDT') {
  try {
    const res = await axios.get(`https://api.kucoin.com/api/v1/market/candles`, {
      params: {
        type: '1min',
        symbol,
      }
    });

    // API returns: [time, open, close, high, low, volume, turnover]
    const candles = res.data.data;

    const closingPrices = candles
      .slice(-60) // last 60 minutes
      .map(candle => parseFloat(candle[2])) // close price is at index 2

    return closingPrices.reverse(); // reverse to get oldest → newest
  } catch (err) {
    console.error('❌ Failed to fetch historical prices from KuCoin:', err.message);
    return [];
  }
}

module.exports = { fetchLastHourPrices };