
# 🧠 KuCoin Volatility Bot

A modular crypto trading bot built for KuCoin.  
Runs multiple bots in parallel, rotates to top volatile coins hourly, and executes trades using RSI + SMA + Momentum crossover signals.

---

## ⚙️ Features

- ✅ Multi-bot parallel strategy launcher  
- 🔁 Hourly volatility rotation (top 3 coins auto-assigned)
- 📉 Custom strategy support (RSI-only or combo)
- 💸 Paper trading mode with risk-managed execution  
- 🔐 .env-protected keys per bot  
- 🔔 Optional Discord trade alerts  
- 📊 Full trade logs and PnL tracking

---

## 🧪 Strategy

Default: `SMART_MODE = true`  
Uses:
- RSI thresholds (custom per bot)
- SMA positioning
- Momentum shifts

Custom strategy can be toggled in each bot's `.env`:
```env
STRATEGY=rsi
RSI_BUY=48
RSI_SELL=52
```

---

## 📂 Folder Structure

```
kucoin-bot/
├── bots/             # Active per-bot .env files
├── config/           # API keys, Discord webhook
├── logic/            # Trading strategy logic (SMA, RSI, momentum)
├── services/         # KuCoin API calls, trade execution
├── utils/            # Risk management, profit tracking
├── logs/             # Trade logs, error logs
└── rotateVolatileCoins.js  # Auto-volatility scanner + bot updater
```

---

## 🚀 Future Ideas

- [ ] Real-time WebSocket execution  
- [ ] Multi-strategy signal validation  
- [ ] Live trading with margin / leverage support  
- [ ] Dashboard log viewer  
- [ ] Cloud deploy w/ restart-on-failure  

---

## 🧠 Credits

Built by an average joe with some ✨ AI superpowers.  
Still paper mode. Watching. Learning. Growing.
