const SYMBOLS = [
  { symbol: 'BTC/USDT', basePrice: 65000, volatility: 0.025 },
  { symbol: 'ETH/USDT', basePrice: 3200, volatility: 0.03 },
  { symbol: 'SOL/USDT', basePrice: 145, volatility: 0.035 },
  { symbol: 'BNB/USDT', basePrice: 580, volatility: 0.028 },
  { symbol: 'XRP/USDT', basePrice: 0.52, volatility: 0.032 },
  { symbol: 'ADA/USDT', basePrice: 0.45, volatility: 0.034 },
  { symbol: 'DOGE/USDT', basePrice: 0.12, volatility: 0.04 },
  { symbol: 'AVAX/USDT', basePrice: 28, volatility: 0.036 },
];

export interface SymbolConfig {
  symbol: string;
  basePrice: number;
  volatility: number;
}

export function getSymbols(): SymbolConfig[] {
  return SYMBOLS;
}

export function getSymbolConfig(symbol: string): SymbolConfig {
  return SYMBOLS.find((s) => s.symbol === symbol) || SYMBOLS[0];
}

export function generateNextPrice(
  currentPrice: number,
  symbolConfig: SymbolConfig,
  tick: number,
): number {
  const { volatility } = symbolConfig;
  const trend = Math.sin(tick * 0.03) * 0.0008;
  const noise = (Math.random() - 0.5) * 2 * volatility;
  const meanReversionPull = (symbolConfig.basePrice - currentPrice) / symbolConfig.basePrice * 0.002;
  const change = trend + noise + meanReversionPull;
  const newPrice = currentPrice * (1 + change);
  return Math.max(newPrice, symbolConfig.basePrice * 0.3);
}
