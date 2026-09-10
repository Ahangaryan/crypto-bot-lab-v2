import { Activity, DollarSign, Zap, Wifi, WifiOff } from 'lucide-react';
import { getSymbols } from '../lib/market';
import type { Ticker24h } from '../lib/exchange';

interface TopBarProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  currentPrice: number;
  totalCapital: number;
  totalPnl: number;
  runningCount: number;
  tick: number;
  isLive: boolean;
  ticker24h: Ticker24h | null;
}

export function TopBar({
  selectedSymbol,
  onSelectSymbol,
  currentPrice,
  totalCapital,
  totalPnl,
  runningCount,
  tick,
  isLive,
  ticker24h,
}: TopBarProps) {
  const symbols = getSymbols();
  const pnlPositive = totalPnl >= 0;
  const changePositive = ticker24h ? ticker24h.priceChangePercent >= 0 : true;

  return (
    <header className="bg-ink-900 border-b border-ink-700 px-6 py-3 flex items-center justify-between shrink-0 flex-wrap gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={selectedSymbol}
            onChange={(e) => onSelectSymbol(e.target.value)}
            className="input w-auto font-semibold"
          >
            {symbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold text-ink-100">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
          {ticker24h && (
            <span
              className={`text-sm font-mono font-semibold ${changePositive ? 'text-success-400' : 'text-danger-400'}`}
            >
              {changePositive ? '+' : ''}{ticker24h.priceChangePercent.toFixed(2)}%
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
            isLive
              ? 'bg-success-500/15 text-success-400'
              : 'bg-ink-800 text-ink-400'
          }`}
        >
          {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isLive ? 'LIVE' : 'SIM'}
        </div>

        {ticker24h && (
          <div className="hidden xl:flex items-center gap-3 text-xs">
            <span className="text-ink-400">
              24h H: <span className="font-mono text-success-400">${ticker24h.highPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </span>
            <span className="text-ink-400">
              24h L: <span className="font-mono text-danger-400">${ticker24h.lowPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </span>
            <span className="text-ink-400">
              Vol: <span className="font-mono text-ink-200">${(ticker24h.quoteVolume / 1e6).toFixed(1)}M</span>
            </span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-ink-800 rounded-lg">
          <Activity size={14} className="text-brand-400" />
          <span className="text-xs text-ink-300">Tick</span>
          <span className="font-mono text-xs font-semibold text-ink-100">{tick}</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden lg:flex items-center gap-2">
          <DollarSign size={16} className="text-ink-400" />
          <div>
            <div className="text-xs text-ink-400">Total Capital</div>
            <div className="font-mono text-sm font-semibold text-ink-100">
              ${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <div>
            <div className="text-xs text-ink-400">Total P&L</div>
            <div
              className={`font-mono text-sm font-semibold ${
                pnlPositive ? 'text-success-400' : 'text-danger-400'
              }`}
            >
              {pnlPositive ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-ink-800 rounded-lg">
          <Zap size={14} className={runningCount > 0 ? 'text-warning-400' : 'text-ink-500'} />
          <span className="text-xs text-ink-300">Running</span>
          <span className="font-mono text-xs font-semibold text-ink-100">{runningCount}</span>
        </div>
      </div>
    </header>
  );
}
