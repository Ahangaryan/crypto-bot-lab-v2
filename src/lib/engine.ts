import type {
  Bot,
  BotRuntimeState,
  GridConfig,
  DCAConfig,
  MeanReversionConfig,
  ArbitrageConfig,
  MarketMakingConfig,
  MomentumConfig,
  RiskConfig,
  StrategyType,
} from '../types';

export const TRADING_FEES = {
  makerFeePct: 0.1,
  takerFeePct: 0.1,
  slippagePct: 0.05,
};

export interface SimTrade {
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  value: number;
  pnl: number | null;
  fee: number;
  slippageCost: number;
  reason: string;
  timestamp: number;
}

function computeFee(tradeValue: number, isMaker: boolean): number {
  const feePct = isMaker ? TRADING_FEES.makerFeePct : TRADING_FEES.takerFeePct;
  return tradeValue * (feePct / 100);
}

function computeSlippage(tradeValue: number): number {
  return tradeValue * (TRADING_FEES.slippagePct / 100);
}

export function createInitialState(initialCapital: number, _config?: any): BotRuntimeState {
  return {
    position: 0,
    avgEntryPrice: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    lastTradePrice: 0,
    gridOrders: [],
    dcaBuyCount: 0,
    dcaTotalCost: 0,
    priceHistory: [],
    startTime: Date.now(),
    dayStartCapital: initialCapital,
    dayStart: Date.now(),
    peakCapital: initialCapital,
    exchangePrices: [],
    lastSignalPrice: 0,
    totalFees: 0,
    totalSlippage: 0,
  };
}

export function initGridOrders(state: BotRuntimeState, config: GridConfig, currentPrice: number) {
  const { upperPrice, lowerPrice, gridLevels } = config;
  const step = (upperPrice - lowerPrice) / gridLevels;
  const orders: { price: number; side: 'buy' | 'sell'; filled: boolean }[] = [];
  for (let i = 0; i <= gridLevels; i++) {
    const price = lowerPrice + step * i;
    if (price < currentPrice) {
      orders.push({ price, side: 'buy', filled: false });
    } else if (price > currentPrice) {
      orders.push({ price, side: 'sell', filled: false });
    }
  }
  state.gridOrders = orders;
}

function checkRiskLimits(
  state: BotRuntimeState,
  risk: RiskConfig,
  tradeValue: number,
  initialCapital: number,
): boolean {
  const maxPositionValue = (risk.maxPositionSizePct / 100) * initialCapital;
  if (tradeValue > maxPositionValue) return false;

  const dailyPnl = initialCapital + state.realizedPnl - state.dayStartCapital;
  const dailyDrawdownPct = (dailyPnl / state.dayStartCapital) * 100;
  if (dailyDrawdownPct < -risk.dailyDrawdownLimitPct) return false;

  return true;
}

function runGrid(
  state: BotRuntimeState,
  config: GridConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  for (const order of state.gridOrders) {
    if (order.filled) continue;
    const tradeValue = order.price * config.quantityPerGrid;

    if (order.side === 'buy' && price <= order.price) {
      if (!checkRiskLimits(state, risk, tradeValue, currentCapital)) continue;
      order.filled = true;
      const fee = computeFee(tradeValue, true);
      const slippageCost = computeSlippage(tradeValue);
      const effectivePrice = order.price * (1 + TRADING_FEES.slippagePct / 100);
      state.position += config.quantityPerGrid;
      state.avgEntryPrice =
        (state.avgEntryPrice * (state.position - config.quantityPerGrid) +
          effectivePrice * config.quantityPerGrid) /
        state.position;
      state.lastTradePrice = effectivePrice;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      trades.push({
        side: 'buy',
        price: effectivePrice,
        quantity: config.quantityPerGrid,
        value: tradeValue,
        pnl: null,
        fee,
        slippageCost,
        reason: `Grid buy @ ${order.price.toFixed(2)} (fee: $${fee.toFixed(2)})`,
        timestamp: Date.now(),
      });
      state.gridOrders.push({
        price: order.price + (config.upperPrice - config.lowerPrice) / config.gridLevels,
        side: 'sell',
        filled: false,
      });
    } else if (order.side === 'sell' && price >= order.price && state.position >= config.quantityPerGrid) {
      order.filled = true;
      const fee = computeFee(tradeValue, true);
      const slippageCost = computeSlippage(tradeValue);
      const effectivePrice = order.price * (1 - TRADING_FEES.slippagePct / 100);
      const grossPnl = (effectivePrice - state.avgEntryPrice) * config.quantityPerGrid;
      const netPnl = grossPnl - fee - slippageCost;
      state.position -= config.quantityPerGrid;
      state.realizedPnl += netPnl;
      state.lastTradePrice = effectivePrice;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      trades.push({
        side: 'sell',
        price: effectivePrice,
        quantity: config.quantityPerGrid,
        value: tradeValue,
        pnl: netPnl,
        fee,
        slippageCost,
        reason: `Grid sell @ ${order.price.toFixed(2)} (PnL: ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}, fee: $${fee.toFixed(2)})`,
        timestamp: Date.now(),
      });
      state.gridOrders.push({
        price: order.price - (config.upperPrice - config.lowerPrice) / config.gridLevels,
        side: 'buy',
        filled: false,
      });
    }
  }
  return trades;
}

function runDCA(
  state: BotRuntimeState,
  config: DCAConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
  elapsedMs: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  const expectedBuys = Math.floor(elapsedMs / (config.intervalSeconds * 1000));

  while (state.dcaBuyCount < expectedBuys && state.dcaBuyCount < config.maxBuys) {
    if (!checkRiskLimits(state, risk, config.buyAmount, currentCapital)) break;
    const fee = computeFee(config.buyAmount, false);
    const slippageCost = computeSlippage(config.buyAmount);
    const effectivePrice = price * (1 + TRADING_FEES.slippagePct / 100);
    const quantity = config.buyAmount / effectivePrice;
    const totalCost = config.buyAmount + fee + slippageCost;
    state.dcaTotalCost += totalCost;
    state.position += quantity;
    state.avgEntryPrice = state.dcaTotalCost / state.position;
    state.dcaBuyCount++;
    state.lastTradePrice = effectivePrice;
    state.totalFees += fee;
    state.totalSlippage += slippageCost;
    trades.push({
      side: 'buy',
      price: effectivePrice,
      quantity,
      value: config.buyAmount,
      pnl: null,
      fee,
      slippageCost,
      reason: `DCA buy #${state.dcaBuyCount} @ ${effectivePrice.toFixed(2)} (fee: $${fee.toFixed(2)})`,
      timestamp: Date.now(),
    });

    if (state.position > 0 && effectivePrice >= state.avgEntryPrice * (1 + config.takeProfitPct / 100)) {
      const sellValue = state.position * effectivePrice;
      const sellFee = computeFee(sellValue, false);
      const sellSlippage = computeSlippage(sellValue);
      const sellEffectivePrice = effectivePrice * (1 - TRADING_FEES.slippagePct / 100);
      const actualSellValue = state.position * sellEffectivePrice;
      const pnl = actualSellValue - state.dcaTotalCost - sellFee - sellSlippage;
      state.totalFees += sellFee;
      state.totalSlippage += sellSlippage;
      trades.push({
        side: 'sell',
        price: sellEffectivePrice,
        quantity: state.position,
        value: actualSellValue,
        pnl,
        fee: sellFee,
        slippageCost: sellSlippage,
        reason: `DCA take-profit @ ${sellEffectivePrice.toFixed(2)} (PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}, fee: $${sellFee.toFixed(2)})`,
        timestamp: Date.now(),
      });
      state.realizedPnl += pnl;
      state.position = 0;
      state.avgEntryPrice = 0;
      state.dcaTotalCost = 0;
      state.dcaBuyCount = 0;
      state.lastTradePrice = sellEffectivePrice;
      break;
    }
  }
  return trades;
}

function runMeanReversion(
  state: BotRuntimeState,
  config: MeanReversionConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  state.priceHistory.push(price);
  if (state.priceHistory.length > config.lookbackPeriod) {
    state.priceHistory.shift();
  }
  if (state.priceHistory.length < config.lookbackPeriod) return trades;

  const sma = state.priceHistory.reduce((a, b) => a + b, 0) / state.priceHistory.length;
  const deviation = ((price - sma) / sma) * 100;

  if (deviation < -config.deviationThreshold && state.position === 0) {
    const tradeValue = config.buyAmount;
    if (!checkRiskLimits(state, risk, tradeValue, currentCapital)) return trades;
    const fee = computeFee(tradeValue, false);
    const slippageCost = computeSlippage(tradeValue);
    const effectivePrice = price * (1 + TRADING_FEES.slippagePct / 100);
    const quantity = config.buyAmount / effectivePrice;
    state.position = quantity;
    state.avgEntryPrice = effectivePrice;
    state.lastSignalPrice = price;
    state.lastTradePrice = effectivePrice;
    state.totalFees += fee;
    state.totalSlippage += slippageCost;
    trades.push({
      side: 'buy',
      price: effectivePrice,
      quantity,
      value: tradeValue,
      pnl: null,
      fee,
      slippageCost,
      reason: `Mean reversion buy (deviation ${deviation.toFixed(1)}% below SMA, fee: $${fee.toFixed(2)})`,
      timestamp: Date.now(),
    });
  } else if (state.position > 0 && (price >= state.avgEntryPrice * (1 + config.takeProfitPct / 100) || deviation >= 0)) {
    const sellValue = state.position * price;
    const fee = computeFee(sellValue, false);
    const slippageCost = computeSlippage(sellValue);
    const effectivePrice = price * (1 - TRADING_FEES.slippagePct / 100);
    const actualSellValue = state.position * effectivePrice;
    const pnl = actualSellValue - state.position * state.avgEntryPrice - fee - slippageCost;
    state.totalFees += fee;
    state.totalSlippage += slippageCost;
    trades.push({
      side: 'sell',
      price: effectivePrice,
      quantity: state.position,
      value: actualSellValue,
      pnl,
      fee,
      slippageCost,
      reason: `Mean reversion sell — revert to mean (PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}, fee: $${fee.toFixed(2)})`,
      timestamp: Date.now(),
    });
    state.realizedPnl += pnl;
    state.position = 0;
    state.avgEntryPrice = 0;
    state.lastTradePrice = effectivePrice;
  }
  return trades;
}

function runArbitrage(
  state: BotRuntimeState,
  config: ArbitrageConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
  tick: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  const count = config.exchangeCount || 3;
  if (state.exchangePrices.length !== count) {
    state.exchangePrices = Array.from({ length: count }, () => price);
  }
  for (let i = 0; i < count; i++) {
    state.exchangePrices[i] = price * (1 + (Math.sin(tick * 0.5 + i * 2) * 0.004 + (Math.random() - 0.5) * 0.006));
  }

  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 1; i < count; i++) {
    if (state.exchangePrices[i] < state.exchangePrices[minIdx]) minIdx = i;
    if (state.exchangePrices[i] > state.exchangePrices[maxIdx]) maxIdx = i;
  }
  const spreadPct =
    ((state.exchangePrices[maxIdx] - state.exchangePrices[minIdx]) / state.exchangePrices[minIdx]) * 100;

  if (spreadPct >= config.spreadThresholdPct && minIdx !== maxIdx) {
    const tradeValue = config.tradeAmount;
    if (!checkRiskLimits(state, risk, tradeValue, currentCapital)) return trades;
    const buyPrice = state.exchangePrices[minIdx];
    const sellPrice = state.exchangePrices[maxIdx];
    const quantity = config.tradeAmount / buyPrice;
    const buyFee = computeFee(tradeValue, false);
    const sellFee = computeFee(quantity * sellPrice, false);
    const buySlippage = computeSlippage(tradeValue);
    const sellSlippage = computeSlippage(quantity * sellPrice);
    const totalFees = buyFee + sellFee;
    const totalSlippage = buySlippage + sellSlippage;
    const grossPnl = (sellPrice - buyPrice) * quantity;
    const netPnl = grossPnl - totalFees - totalSlippage;
    state.realizedPnl += netPnl;
    state.lastTradePrice = sellPrice;
    state.totalFees += totalFees;
    state.totalSlippage += totalSlippage;
    trades.push({
      side: 'buy',
      price: buyPrice,
      quantity,
      value: tradeValue,
      pnl: null,
      fee: buyFee,
      slippageCost: buySlippage,
      reason: `Arb buy on Exchange ${minIdx + 1} @ ${buyPrice.toFixed(2)} (fee: $${buyFee.toFixed(2)})`,
      timestamp: Date.now(),
    });
    trades.push({
      side: 'sell',
      price: sellPrice,
      quantity,
      value: quantity * sellPrice,
      pnl: netPnl,
      fee: sellFee,
      slippageCost: sellSlippage,
      reason: `Arb sell on Exchange ${maxIdx + 1} @ ${sellPrice.toFixed(2)} (spread ${spreadPct.toFixed(2)}%, net PnL: ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}, fees: $${totalFees.toFixed(2)})`,
      timestamp: Date.now(),
    });
  }
  return trades;
}

function runMarketMaking(
  state: BotRuntimeState,
  config: MarketMakingConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
  tick: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  const halfSpread = (config.spreadPct / 100) / 2;
  const bidPrice = price * (1 - halfSpread);
  const askPrice = price * (1 + halfSpread);
  const interval = config.refreshIntervalSeconds || 3;

  if (tick % interval === 0) {
    const tradeValue = config.orderQuantity * price;
    if (!checkRiskLimits(state, risk, tradeValue, currentCapital)) return trades;

    if (Math.random() > 0.15) {
      const quantity = config.orderQuantity;
      const fee = computeFee(bidPrice * quantity, true);
      const slippageCost = computeSlippage(bidPrice * quantity);
      const effectiveBid = bidPrice * (1 + TRADING_FEES.slippagePct / 100);
      state.position += quantity;
      state.avgEntryPrice =
        (state.avgEntryPrice * (state.position - quantity) + effectiveBid * quantity) / state.position;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      trades.push({
        side: 'buy',
        price: effectiveBid,
        quantity,
        value: bidPrice * quantity,
        pnl: null,
        fee,
        slippageCost,
        reason: `MM bid filled @ ${bidPrice.toFixed(2)} (fee: $${fee.toFixed(2)})`,
        timestamp: Date.now(),
      });
    }
    if (state.position >= config.orderQuantity && Math.random() > 0.15) {
      const quantity = config.orderQuantity;
      const fee = computeFee(askPrice * quantity, true);
      const slippageCost = computeSlippage(askPrice * quantity);
      const effectiveAsk = askPrice * (1 - TRADING_FEES.slippagePct / 100);
      const grossPnl = (effectiveAsk - state.avgEntryPrice) * quantity;
      const netPnl = grossPnl - fee - slippageCost;
      state.position -= quantity;
      state.realizedPnl += netPnl;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      trades.push({
        side: 'sell',
        price: effectiveAsk,
        quantity,
        value: askPrice * quantity,
        pnl: netPnl,
        fee,
        slippageCost,
        reason: `MM ask filled @ ${askPrice.toFixed(2)} (PnL: ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}, fee: $${fee.toFixed(2)})`,
        timestamp: Date.now(),
      });
    }
    state.lastTradePrice = price;
  }
  return trades;
}

function runMomentum(
  state: BotRuntimeState,
  config: MomentumConfig,
  risk: RiskConfig,
  price: number,
  currentCapital: number,
): SimTrade[] {
  const trades: SimTrade[] = [];
  state.priceHistory.push(price);
  if (state.priceHistory.length > config.lookbackPeriod) {
    state.priceHistory.shift();
  }
  if (state.priceHistory.length < config.lookbackPeriod) return trades;

  const oldPrice = state.priceHistory[0];
  const momentumPct = ((price - oldPrice) / oldPrice) * 100;

  if (state.position === 0 && Math.abs(momentumPct) >= config.momentumThresholdPct) {
    const tradeValue = config.positionSize;
    if (!checkRiskLimits(state, risk, tradeValue, currentCapital)) return trades;

    if (momentumPct > 0) {
      const fee = computeFee(tradeValue, false);
      const slippageCost = computeSlippage(tradeValue);
      const effectivePrice = price * (1 + TRADING_FEES.slippagePct / 100);
      const quantity = config.positionSize / effectivePrice;
      state.position = quantity;
      state.avgEntryPrice = effectivePrice;
      state.lastTradePrice = effectivePrice;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      trades.push({
        side: 'buy',
        price: effectivePrice,
        quantity,
        value: tradeValue,
        pnl: null,
        fee,
        slippageCost,
        reason: `Momentum buy (+${momentumPct.toFixed(1)}% over ${config.lookbackPeriod} ticks, fee: $${fee.toFixed(2)})`,
        timestamp: Date.now(),
      });
    }
  } else if (state.position > 0) {
    const pnlPct = ((price - state.avgEntryPrice) / state.avgEntryPrice) * 100;
    if (pnlPct >= config.takeProfitPct || pnlPct <= -config.stopLossPct) {
      const sellValue = state.position * price;
      const fee = computeFee(sellValue, false);
      const slippageCost = computeSlippage(sellValue);
      const effectivePrice = price * (1 - TRADING_FEES.slippagePct / 100);
      const actualSellValue = state.position * effectivePrice;
      const pnl = actualSellValue - state.position * state.avgEntryPrice - fee - slippageCost;
      state.totalFees += fee;
      state.totalSlippage += slippageCost;
      const reason = pnlPct >= config.takeProfitPct
        ? `Momentum take-profit (+${pnlPct.toFixed(1)}%, PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}, fee: $${fee.toFixed(2)})`
        : `Momentum stop-loss (${pnlPct.toFixed(1)}%, PnL: ${pnl.toFixed(2)}, fee: $${fee.toFixed(2)})`;
      trades.push({
        side: 'sell',
        price: effectivePrice,
        quantity: state.position,
        value: actualSellValue,
        pnl,
        fee,
        slippageCost,
        reason,
        timestamp: Date.now(),
      });
      state.realizedPnl += pnl;
      state.position = 0;
      state.avgEntryPrice = 0;
      state.lastTradePrice = effectivePrice;
    }
  }
  return trades;
}

export function runStrategy(
  bot: Bot,
  state: BotRuntimeState,
  price: number,
  tick: number,
): SimTrade[] {
  const risk = bot.risk_config as RiskConfig;
  const config = bot.config as any;
  switch (bot.strategy as StrategyType) {
    case 'grid':
      return runGrid(state, config, risk, price, bot.initial_capital);
    case 'dca': {
      const elapsed = Date.now() - state.startTime;
      return runDCA(state, config, risk, price, bot.initial_capital, elapsed);
    }
    case 'mean_reversion':
      return runMeanReversion(state, config, risk, price, bot.initial_capital);
    case 'arbitrage':
      return runArbitrage(state, config, risk, price, bot.initial_capital, tick);
    case 'market_making':
      return runMarketMaking(state, config, risk, price, bot.initial_capital, tick);
    case 'momentum':
      return runMomentum(state, config, risk, price, bot.initial_capital);
    default:
      return [];
  }
}

export function calculateUnrealizedPnl(state: BotRuntimeState, currentPrice: number): number {
  if (state.position <= 0) return 0;
  return (currentPrice - state.avgEntryPrice) * state.position;
}

export function calculateMaxDrawdown(history: number[]): number {
  if (history.length === 0) return 0;
  let peak = history[0];
  let maxDD = 0;
  for (const v of history) {
    if (v > peak) peak = v;
    const dd = ((peak - v) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export const STRATEGY_META: Record<
  StrategyType,
  { label: string; description: string; icon: string; color: string }
> = {
  grid: {
    label: 'Grid Trading',
    description: 'Places buy/sell orders at evenly spaced price levels. Profits from price oscillation in a range.',
    icon: 'grid',
    color: '#14b8a6',
  },
  dca: {
    label: 'Dollar-Cost Averaging',
    description: 'Buys fixed amounts at regular intervals. Reduces impact of volatility over time.',
    icon: 'dca',
    color: '#f59e0b',
  },
  mean_reversion: {
    label: 'Mean Reversion',
    description: 'Buys when price deviates below the moving average, sells when it reverts back.',
    icon: 'revert',
    color: '#8b5cf6',
  },
  arbitrage: {
    label: 'Triangular Arbitrage',
    description: 'Exploits price differences across simulated exchanges for risk-free spread profit.',
    icon: 'arb',
    color: '#22c55e',
  },
  market_making: {
    label: 'Market Making',
    description: 'Places bid/ask orders on both sides of the order book to capture the spread.',
    icon: 'mm',
    color: '#3b82f6',
  },
  momentum: {
    label: 'Momentum Trading',
    description: 'Follows strong directional moves. Buys into uptrends with take-profit and stop-loss.',
    icon: 'momentum',
    color: '#ef4444',
  },
};

export const DEFAULT_CONFIGS: Record<StrategyType, any> = {
  grid: { upperPrice: 68000, lowerPrice: 62000, gridLevels: 8, quantityPerGrid: 0.03 },
  dca: { intervalSeconds: 3, buyAmount: 300, takeProfitPct: 3, maxBuys: 15 },
  mean_reversion: { lookbackPeriod: 10, deviationThreshold: 1.5, buyAmount: 800, takeProfitPct: 2 },
  arbitrage: { spreadThresholdPct: 0.15, tradeAmount: 1500, exchangeCount: 3 },
  market_making: { spreadPct: 0.3, orderQuantity: 0.05, refreshIntervalSeconds: 2 },
  momentum: { lookbackPeriod: 8, momentumThresholdPct: 1.5, positionSize: 1000, takeProfitPct: 3, stopLossPct: 2 },
};

export const DEFAULT_RISK: RiskConfig = {
  maxPositionSizePct: 30,
  stopLossPct: 10,
  dailyDrawdownLimitPct: 8,
  maxTotalExposurePct: 50,
  perTradeRiskPct: 3,
};
