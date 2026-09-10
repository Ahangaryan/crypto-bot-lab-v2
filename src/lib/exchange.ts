export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BINANCE_API = 'https://api.binance.com/api/v3';

const SYMBOL_MAP: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'BNB/USDT': 'BNBUSDT',
  'XRP/USDT': 'XRPUSDT',
  'ADA/USDT': 'ADAUSDT',
  'DOGE/USDT': 'DOGEUSDT',
  'AVAX/USDT': 'AVAXUSDT',
};

const REVERSE_MAP: Record<string, string> = Object.entries(SYMBOL_MAP).reduce(
  (acc, [k, v]) => { acc[v] = k; return acc; },
  {} as Record<string, string>,
);

export function toBinanceSymbol(symbol: string): string {
  return SYMBOL_MAP[symbol] || symbol.replace('/', '');
}

export function fromBinanceSymbol(binanceSymbol: string): string {
  return REVERSE_MAP[binanceSymbol] || binanceSymbol;
}

export async function fetchTicker(symbol: string): Promise<Ticker24h | null> {
  const binanceSymbol = toBinanceSymbol(symbol);
  try {
    const resp = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${binanceSymbol}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      symbol,
      lastPrice: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  } catch {
    return null;
  }
}

export async function fetchMultipleTickers(symbols: string[]): Promise<Map<string, Ticker24h>> {
  const results = new Map<string, Ticker24h>();
  const binanceSymbols = symbols.map(toBinanceSymbol);
  try {
    const symbolsParam = JSON.stringify(binanceSymbols);
    const resp = await fetch(`${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`);
    if (!resp.ok) {
      for (const s of symbols) {
        const t = await fetchTicker(s);
        if (t) results.set(s, t);
      }
      return results;
    }
    const data = await resp.json();
    for (const item of data) {
      const sym = fromBinanceSymbol(item.symbol);
      results.set(sym, {
        symbol: sym,
        lastPrice: parseFloat(item.lastPrice),
        priceChangePercent: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
        volume: parseFloat(item.volume),
        quoteVolume: parseFloat(item.quoteVolume),
      });
    }
  } catch {
    for (const s of symbols) {
      const t = await fetchTicker(s);
      if (t) results.set(s, t);
    }
  }
  return results;
}

export async function fetchKlines(symbol: string, interval: string = '15m', limit: number = 100): Promise<Candle[]> {
  const binanceSymbol = toBinanceSymbol(symbol);
  try {
    const resp = await fetch(`${BINANCE_API}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch {
    return [];
  }
}
