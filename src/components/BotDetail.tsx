import { ArrowLeft, Play, Pause, Square, Trash2, TrendingUp, TrendingDown, Activity, Target, Percent } from 'lucide-react';
import type { Bot, BotRuntimeState } from '../types';
import { STRATEGY_META } from '../lib/engine';
import { calculateUnrealizedPnl } from '../lib/engine';

interface BotDetailProps {
  bot: Bot;
  runtimeState: BotRuntimeState | undefined;
  currentPrice: number;
  onToggle: () => void;
  onDelete: () => void;
  onStop: () => void;
  onBack: () => void;
}

export function BotDetail({ bot, runtimeState, currentPrice, onToggle, onDelete, onStop, onBack }: BotDetailProps) {
  const meta = STRATEGY_META[bot.strategy];
  const pnlPositive = bot.total_pnl >= 0;
  const pnlPct = bot.initial_capital > 0 ? (bot.total_pnl / bot.initial_capital) * 100 : 0;
  const isRunning = bot.status === 'running';
  const unrealized = runtimeState ? calculateUnrealizedPnl(runtimeState, currentPrice) : 0;
  const realizedPnl = runtimeState ? runtimeState.realizedPnl : 0;
  const position = runtimeState ? runtimeState.position : 0;
  const avgEntry = runtimeState ? runtimeState.avgEntryPrice : 0;
  const risk = bot.risk_config as any;
  const config = bot.config as any;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn btn-secondary px-3">
            <ArrowLeft size={16} />
          </button>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
          >
            {meta.label.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-100">{bot.name}</h2>
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <span>{meta.label}</span>
              <span>•</span>
              <span>{bot.symbol}</span>
              <span>•</span>
              <span
                className={`badge ${
                  isRunning
                    ? 'bg-success-500/15 text-success-400'
                    : bot.status === 'paused'
                      ? 'bg-warning-500/15 text-warning-400'
                      : 'bg-ink-700 text-ink-400'
                }`}
              >
                {bot.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn flex items-center gap-1.5 ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onToggle}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          {isRunning && (
            <button className="btn btn-secondary flex items-center gap-1.5" onClick={onStop}>
              <Square size={14} />
              Stop
            </button>
          )}
          <button className="btn btn-danger flex items-center gap-1.5" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={`${pnlPositive ? '+' : ''}$${bot.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${pnlPositive ? '+' : ''}${pnlPct.toFixed(2)}%`}
          icon={pnlPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          color={pnlPositive ? 'success' : 'danger'}
        />
        <StatCard
          label="Current Capital"
          value={`$${bot.current_capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`Initial: $${bot.initial_capital.toLocaleString()}`}
          icon={<Activity size={16} />}
          color="brand"
        />
        <StatCard
          label="Total Trades"
          value={bot.total_trades.toString()}
          sub={`${bot.winning_trades}W / ${bot.losing_trades}L`}
          icon={<Target size={16} />}
          color="accent"
        />
        <StatCard
          label="Win Rate"
          value={`${bot.win_rate.toFixed(1)}%`}
          sub={bot.win_rate >= 50 ? 'Profitable' : 'Below 50%'}
          icon={<Percent size={16} />}
          color={bot.win_rate >= 50 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ink-400 mb-1">Total Fees Paid</div>
          <div className="font-mono text-lg font-bold text-danger-400">-${(bot.total_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-ink-500">0.1% per trade + slippage</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-400 mb-1">Net P&L (after fees)</div>
          <div className={`font-mono text-lg font-bold ${(bot.total_pnl - (bot.total_fees || 0)) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {(bot.total_pnl - (bot.total_fees || 0)) >= 0 ? '+' : ''}${(bot.total_pnl - (bot.total_fees || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-ink-500">Gross: ${bot.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-400 mb-1">Fee Impact</div>
          <div className="font-mono text-lg font-bold text-warning-400">
            {bot.total_pnl > 0 ? ((bot.total_fees || 0) / Math.abs(bot.total_pnl) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="text-xs text-ink-500">of gross P&L eaten by fees</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Position Details</h3>
          <div className="space-y-3">
            <DetailRow label="Current Position" value={`${position.toFixed(6)} ${bot.symbol.split('/')[0]}`} />
            <DetailRow label="Avg Entry Price" value={`$${avgEntry.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <DetailRow label="Current Price" value={`$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <DetailRow
              label="Unrealized P&L"
              value={`${unrealized >= 0 ? '+' : ''}$${unrealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              valueClass={unrealized >= 0 ? 'text-success-400' : 'text-danger-400'}
            />
            <DetailRow
              label="Realized P&L"
              value={`${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              valueClass={realizedPnl >= 0 ? 'text-success-400' : 'text-danger-400'}
            />
            {bot.strategy === 'grid' && runtimeState && (
              <DetailRow label="Active Grid Orders" value={`${runtimeState.gridOrders.filter((o) => !o.filled).length} pending`} />
            )}
            {bot.strategy === 'dca' && runtimeState && (
              <DetailRow label="DCA Buys" value={`${runtimeState.dcaBuyCount} / ${config.maxBuys}`} />
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-100 mb-4">Strategy Configuration</h3>
          <div className="space-y-3">
            {Object.entries(config).map(([key, value]) => (
              <DetailRow
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                value={typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(value)}
              />
            ))}
          </div>

          <div className="pt-4 mt-4 border-t border-ink-700">
            <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Risk Settings</h4>
            <div className="space-y-3">
              <DetailRow label="Max Position Size" value={`${risk.maxPositionSizePct}% of capital`} />
              <DetailRow label="Per-Trade Risk" value={`${risk.perTradeRiskPct}% of capital`} />
              <DetailRow label="Daily Drawdown Limit" value={`${risk.dailyDrawdownLimitPct}%`} />
              <DetailRow label="Max Total Exposure" value={`${risk.maxTotalExposurePct}%`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: 'success' | 'danger' | 'brand' | 'accent' | 'warning';
}) {
  const colorMap = {
    success: 'text-success-400',
    danger: 'text-danger-400',
    brand: 'text-brand-400',
    accent: 'text-accent-400',
    warning: 'text-warning-400',
  };
  return (
    <div className="card p-4">
      <div className={`mb-2 ${colorMap[color]}`}>{icon}</div>
      <div className="text-xs text-ink-400">{label}</div>
      <div className={`font-mono text-lg font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-ink-500">{sub}</div>
    </div>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-400">{label}</span>
      <span className={`text-sm font-mono font-medium ${valueClass || 'text-ink-100'}`}>{value}</span>
    </div>
  );
}
