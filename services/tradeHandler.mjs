export async function simulateTrade({ symbol, signal, price, rsi = null, mode = 'unknown' }) {
  if (checkDailyLossExceeded()) {
    console.log(`⛔ Bot halted — daily loss exceeded for ${symbol}`);
    return;
  }

  const cooldownMinutes = parseInt(process.env.COOLDOWN_MINUTES || '10');
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const now = Date.now();

  const state = stateMap[symbol] || {
    inPosition: false,
    entryPrice: 0,
    entryTime: '',
    highestPrice: 0,
    lastLossTime: null
  };

  // ⏱️ Skip trade if cooling down
  if (state.lastLossTime && now - state.lastLossTime < cooldownMs) {
    const minutesLeft = ((cooldownMs - (now - state.lastLossTime)) / 60000).toFixed(1);
    console.log(`🕒 Cooldown active for ${symbol} — ${minutesLeft} min left`);
    return;
  }

  const timestamp = new Date().toISOString();
  const readablePrice = `$${price.toFixed(4)}`;

  console.log(`🔍 Pre-trade: ${state.inPosition ? chalk.green('IN TRADE') : chalk.gray('OUT')}`);
  console.log(`simulateTrade() for ${chalk.cyan(symbol)} | signal: ${signal} | price: ${readablePrice}`);

  if (signal === 'BUY' && !state.inPosition) {
    state.inPosition = true;
    state.entryPrice = price;
    state.entryTime = timestamp;
    state.highestPrice = price;
    console.log(`${chalk.green('🟢 BUY')} executed for ${symbol} @ ${readablePrice}`);
  }

  else if (state.inPosition) {
    if (price > state.highestPrice) {
      state.highestPrice = price;
    }

    const trailAmount = state.highestPrice * (TRAIL_PERCENT / 100);
    const stopPrice = state.highestPrice - trailAmount;
    const pnl = ((price - state.entryPrice) / state.entryPrice) * 100;
    const hitTrailingStop = price <= stopPrice;

    const shouldSell = (signal === 'SELL' || hitTrailingStop) && Math.abs(pnl) >= MIN_PNL_THRESHOLD;

    if (shouldSell) {
      console.log(`${chalk.red('🔴 SELL')} executed for ${symbol} @ ${readablePrice} | PnL: ${pnl.toFixed(2)}%`);
      if (hitTrailingStop) console.log(`⛔ Trailing Stop Triggered: ${price.toFixed(4)} <= ${stopPrice.toFixed(4)}`);

      logTradeOutcome({
        symbol,
        entryTime: state.entryTime,
        exitTime: timestamp,
        entryPrice: state.entryPrice,
        exitPrice: price,
        pnlPercent: pnl,
        mode
      });

      addProfit(pnl);
      const result = pnl > 0 ? 'win' : 'loss';
      recordTradeResult({ symbol, result, pnl });
      recordLoss(pnl);

      const stats = getStats(symbol);
      const emoji = result === 'win' ? '✅' : '❌';
      const summary = `${emoji} ${symbol} ${result.toUpperCase()} | PnL: ${pnl.toFixed(2)}%\n📊 Wins: ${stats.wins} | Losses: ${stats.losses} | WR: ${stats.winRate}% | PnL: ${stats.totalPnL.toFixed(2)}%`;

      await sendDiscordMessage(summary);

      if (pnl < 0) {
        state.lastLossTime = now;
        console.log(`🧊 Cooldown started for ${symbol} after loss`);
      }

      state.inPosition = false;
      state.entryPrice = 0;
      state.entryTime = '';
      state.highestPrice = 0;
    } else if (signal === 'SELL') {
      console.log(`⚠️ SELL ignored — PnL ${pnl.toFixed(2)}% < ${MIN_PNL_THRESHOLD}%`);
    }
  }

  else if (signal === 'SELL' && !state.inPosition) {
    console.log(`⚠️ SELL signal received for ${symbol}, but no position held. Skipping.`);
  }

  stateMap[symbol] = state;
}