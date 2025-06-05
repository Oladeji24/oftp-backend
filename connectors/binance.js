// Binance Spot Trading Connector
// Handles all Binance API spot trading operations in a modular way

const axios = require('axios');

// TODO: Add API key/secret management securely (do not hardcode)
// Use environment variables or Supabase secrets

const BASE_URL = 'https://api.binance.com';

const BinanceConnector = {
  async getTicker(symbol) {
    // Example: symbol = 'BTCUSDT'
    const res = await axios.get(`${BASE_URL}/api/v3/ticker/price`, { params: { symbol } });
    return res.data;
  },
  // Add more methods: placeOrder, getBalance, getOrderStatus, etc.
};

module.exports = BinanceConnector;
