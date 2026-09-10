export type StrategyType =
  | 'grid'
  | 'dca'
  | 'mean_reversion'
  | 'arbitrage'
  | 'market_making'
  | 'momentum';

export type BotStatus = 'running' | 'stopped' | 'paused';

export type TradeSide = 'buy' | 'sell';

export interface RiskConfig {
  maxPositionSizePct: number;
  stopLossPct: number;
  dailyDrawdownLimitPct: number;
  maxTotalExposurePct: number;
  perTradeRiskPct: number;
}

export interface GridConfig {
  upperPrice: number;
  lowerPrice: number;
  gridLevels: number;
  quantityPerGrid: number;
}

export interface DCAConfig {
  intervalSeconds: number;
  buyAmount: number;
  takeProfitPct: number;
  maxBuys: number;
}

export interface MeanReversionConfig {
  lookbackPeriod: number;
  deviationThreshold: number;
  buyAmount: number;
  takeProfitPct: number;
}

export interface ArbitrageConfig {
  spreadThresholdPct: number;
  tradeAmount: number;
  exchangeCount: number;
}

export interface MarketMakingConfig {
  spreadPct: number;
  orderQuantity: number;
  refreshIntervalSeconds: number;
}

export interface MomentumConfig {
  lookbackPeriod: number;
  momentumThresholdPct: number;
  positionSize: number;
  takeProfitPct: number;
  stopLossPct: number;
}

export type StrategyConfig =
  | GridConfig
  | DCAConfig
  | MeanReversionConfig
  | ArbitrageConfig
  | MarketMakingConfig
  | MomentumConfig;

export interface Bot {
  id: string;
  name: string;
  strategy: StrategyType;
  symbol: string;
  config: StrategyConfig;
  risk_config: RiskConfig;
  status: BotStatus;
  initial_capital: number;
  current_capital: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  winning_trades: number;
  losing_trades: number;
  total_fees: number;
  created_at: string;
}

export interface Trade {
  id: string;
  bot_id: string;
  side: TradeSide;
  price: number;
  quantity: number;
  value: number;
  pnl: number | null;
  fee: number;
  slippage_cost: number;
  reason: string;
  timestamp: string;
}

export interface PricePoint {
  price: number;
  timestamp: number;
}

export interface BotRuntimeState {
  position: number;
  avgEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  lastTradePrice: number;
  gridOrders: { price: number; side: TradeSide; filled: boolean }[];
  dcaBuyCount: number;
  dcaTotalCost: number;
  priceHistory: number[];
  startTime: number;
  dayStartCapital: number;
  dayStart: number;
  peakCapital: number;
  exchangePrices: number[];
  lastSignalPrice: number;
  totalFees: number;
  totalSlippage: number;
}
