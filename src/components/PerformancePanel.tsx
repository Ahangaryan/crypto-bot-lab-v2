import { Wallet, TrendingUp, BarChart3, Target, AlertCircle, Bot as BotIcon } from 'lucide-react';

interface PerformancePanelProps {
  totalCapital: number;
  totalPnl: number;
  totalTrades: number;
  avgWinRate: number;
  maxDrawdown: number;
  runningCount: number;
  botCount: number;
  totalFees: number;
}

export function PerformancePanel({
  totalCapital,
  totalPnl,
  totalTrades,
  avgWinRate,
  maxDrawdown,
  runningCount,
  botCount,
  totalFees,
}: PerformancePanelProps) {
  const pnlPositive = totalPnl >= 0;
  const pnlPct = totalCapital > 0 ? (totalPnl / (totalCapital - totalPnl)) * 100 : 0;
  const netPnl = totalPnl - totalFees;
  const feeImpactPct = totalPnl > 0 ? (totalFees / Math.abs(totalPnl)) * 100 : 0;

  const stats = [
    {
      label: 'Portfolio Value',
      value: `$${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <Wallet size={16} className="text-brand-400" />,
      sub: `${botCount} bot${botCount !== 1 ? 's' : ''} • ${runningCount} running`,
    },
    {
      label: 'Total P&L',
      value: `${pnlPositive ? '+' : ''}$${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <TrendingUp size={16} className={pnlPositive ? 'text-success-400' : 'text-danger-400'} />,
      sub: `${pnlPositive ? '+' : ''}${pnlPct.toFixed(2)}% return`,
      valueClass: pnlPositive ? 'text-success-400' : 'text-danger-400',
    },
    {
      label: 'Total Trades',
      value: totalTrades.toLocaleString(),
      icon: <BarChart3 size={16} className="text-accent-400" />,
      sub: 'across all bots',
    },
    {
      label: 'Avg Win Rate',
      value: `${avgWinRate.toFixed(1)}%`,
      icon: <Target size={16} className="text-brand-400" />,
      sub: avgWinRate >= 50 ? 'above 50%' : 'below 50%',
      valueClass: avgWinRate >= 50 ? 'text-success-400' : 'text-warning-400',
    },
    {
      label: 'Max Drawdown',
      value: `${maxDrawdown.toFixed(2)}%`,
      icon: <AlertCircle size={16} className="text-warning-400" />,
      sub: 'peak to trough',
      valueClass: maxDrawdown > 5 ? 'text-danger-400' : 'text-ink-100',
    },
    {
      label: 'Active Bots',
      value: `${runningCount}/${botCount}`,
      icon: <BotIcon size={16} className="text-brand-400" />,
      sub: runningCount > 0 ? 'simulating' : 'all idle',
    },
    {
      label: 'Total Fees Paid',
      value: `-${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <AlertCircle size={16} className="text-danger-400" />,
      sub: `${feeImpactPct.toFixed(1)}% of gross P&L`,
      valueClass: 'text-danger-400',
    },
    {
      label: 'Net P&L (after fees)',
      value: `${netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <TrendingUp size={16} className={netPnl >= 0 ? 'text-success-400' : 'text-danger-400'} />,
      sub: 'what you actually keep',
      valueClass: netPnl >= 0 ? 'text-success-400' : 'text-danger-400',
    },
  ];

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-ink-100 mb-4">Performance Overview</h3>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ink-800 flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-ink-400">{stat.label}</div>
              <div className={`font-mono text-sm font-semibold ${stat.valueClass || 'text-ink-100'}`}>
                {stat.value}
              </div>
            </div>
            <div className="text-[11px] text-ink-500 text-right shrink-0">{stat.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
