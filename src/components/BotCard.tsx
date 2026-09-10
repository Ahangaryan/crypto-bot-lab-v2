import { Play, Pause, Trash2, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { Bot as BotType } from '../types';
import { STRATEGY_META } from '../lib/engine';

interface BotCardProps {
  bot: BotType;
  currentPrice: number;
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

export function BotCard({ bot, currentPrice, onToggle, onDelete, onSelect }: BotCardProps) {
  const meta = STRATEGY_META[bot.strategy];
  const pnlPositive = bot.total_pnl >= 0;
  const pnlPct = bot.initial_capital > 0 ? (bot.total_pnl / bot.initial_capital) * 100 : 0;
  const isRunning = bot.status === 'running';

  return (
    <div
      className="card p-5 hover:border-ink-600 transition-all duration-200 cursor-pointer group animate-fade-in"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
          >
            {meta.label.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-100 leading-tight">{bot.name}</h4>
            <p className="text-xs text-ink-400">{meta.label}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-ink-500 group-hover:text-ink-300 transition-colors" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="badge bg-ink-800 text-ink-300">{bot.symbol}</span>
        <span
          className={`badge ${
            isRunning
              ? 'bg-success-500/15 text-success-400'
              : bot.status === 'paused'
                ? 'bg-warning-500/15 text-warning-400'
                : 'bg-ink-700 text-ink-400'
          }`}
        >
          {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-glow" />}
          {bot.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-ink-800 rounded-lg p-2.5">
          <div className="text-xs text-ink-400">P&L</div>
          <div
            className={`font-mono text-sm font-semibold flex items-center gap-1 ${
              pnlPositive ? 'text-success-400' : 'text-danger-400'
            }`}
          >
            {pnlPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {pnlPositive ? '+' : ''}${bot.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-xs ${pnlPositive ? 'text-success-400' : 'text-danger-400'}`}>
            {pnlPositive ? '+' : ''}{pnlPct.toFixed(2)}%
          </div>
        </div>
        <div className="bg-ink-800 rounded-lg p-2.5">
          <div className="text-xs text-ink-400">Trades</div>
          <div className="font-mono text-sm font-semibold text-ink-100">{bot.total_trades}</div>
          <div className="text-xs text-ink-400">Win rate: {bot.win_rate.toFixed(1)}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-ink-400">
          Capital: <span className="font-mono text-ink-200">${bot.current_capital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className="text-xs text-ink-400 font-mono">
          @ ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>

      {bot.total_fees > 0 && (
        <div className="flex items-center justify-between mb-3 px-2.5 py-1.5 bg-danger-500/5 rounded-lg">
          <span className="text-xs text-ink-400">Total Fees Paid</span>
          <span className="text-xs font-mono font-semibold text-danger-400">-${(bot.total_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          className={`btn flex-1 flex items-center justify-center gap-1.5 ${
            isRunning ? 'btn-secondary' : 'btn-primary'
          }`}
          onClick={onToggle}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          {isRunning ? 'Pause' : bot.status === 'paused' ? 'Resume' : 'Start'}
        </button>
        <button
          className="btn btn-secondary px-3"
          onClick={onDelete}
          title="Delete bot"
        >
          <Trash2 size={14} className="text-danger-400" />
        </button>
      </div>
    </div>
  );
}
