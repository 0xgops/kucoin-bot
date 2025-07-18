// services/kucoin.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function fetchPrice(symbol = 'BTC-USDT') {
  try {
    const res = await axios.get(`https://api.kucoin.com/api/v1/market/orderbook/level1`, {
      params: { symbol }
    });

    const price = parseFloat(res.data.data.price);
    return price;
  } catch (err) {
    console.error('⚠️ KuCoin price fetch error:', err.message);
    return null;
  }
}