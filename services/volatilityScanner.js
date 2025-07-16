const axios = require('axios');

async function fetchVolatilityTopMovers(limit = 5) {
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=1&price_change_percentage=24h';

  try {
    const response = await axios.get(url);
    const coins = response.data;

    // Sort coins by absolute % change (volatility)
    const sorted = coins
      .map(c => ({
        name: c.name,
        symbol: c.symbol,
        id: c.id,
        price: c.current_price,
        change24h: c.price_change_percentage_24h
      }))
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

    return sorted.slice(0, limit);
  } catch (err) {
    console.error('Error fetching volatility data:', err.message);
    return [];
  }
}

module.exports = { fetchVolatilityTopMovers };