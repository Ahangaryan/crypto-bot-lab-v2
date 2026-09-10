import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import type { Trade } from '../types';

interface TradeFeedProps {
  trades: Trade[];
}

export function TradeFeed({ trades }: TradeFeedProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-brand-400" />
        <h3 className="text-sm font-semibold text-ink-100">Live Trade Feed</h3>
        {trades.length > 0 && (
          <span className="badge bg-brand-500/15 text-brand-400 ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-glow" />
            {trades.length} recent
          </span>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-ink-500 text-sm">
          No trades executed yet. Start a bot to see live trades here.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-auto">
          {trades.map((trade) => {
            const isBuy = trade.side === 'buy';
            const pnlPositive = trade.pnl !== null && trade.pnl >= 0;
            return (
              <div
                key={trade.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-ink-800/50 hover:bg-ink-800 transition-colors animate-slide-up"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isBuy ? 'bg-success-500/15' : 'bg-danger-500/15'
                  }`}
                >
                  {isBuy ? (
                    <ArrowUpRight size={14} className="text-success-400" />
                  ) : (
                    <ArrowDownRight size={14} className="text-danger-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold uppercase ${isBuy ? 'text-success-400' : 'text-danger-400'}`}
                    >
                      {trade.side}
                    </span>
                    <span className="text-xs font-mono text-ink-300">
                      {trade.quantity.toFixed(4)} @ ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 truncate">{trade.reason}</div>
                </div>
                <div className="text-right shrink-0">
                  {trade.pnl !== null && (
                    <div
                      className={`text-xs font-mono font-semibold ${
                        pnlPositive ? 'text-success-400' : 'text-danger-400'
                      }`}
                    >
                      {pnlPositive ? '+' : ''}${trade.pnl.toFixed(2)}
                    </div>
                  )}
                  {trade.fee > 0 && (
                    <div className="text-[10px] font-mono text-danger-400/70">
                      fee: -${trade.fee.toFixed(2)}
                    </div>
                  )}
                  <div className="text-[11px] text-ink-500 font-mono">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
