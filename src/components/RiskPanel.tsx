import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Bot } from '../types';


interface RiskPanelProps {
  bots: Bot[];
}

export function RiskPanel({ bots }: RiskPanelProps) {
  const runningBots = bots.filter((b) => b.status === 'running');
  const totalExposure = runningBots.reduce((sum, b) => {
    const config = b.config as any;
    let exposure = 0;
    if (b.strategy === 'grid') {
      exposure = (config.quantityPerGrid || 0) * (config.gridLevels || 0) * b.current_capital / b.initial_capital * 100;
    } else if (b.strategy === 'dca') {
      exposure = (config.buyAmount || 0) * (config.maxBuys || 0) / b.initial_capital * 100;
    } else if (b.strategy === 'arbitrage') {
      exposure = (config.tradeAmount || 0) / b.initial_capital * 100;
    } else {
      exposure = 15;
    }
    return sum + Math.min(exposure, 100);
  }, 0);

  const dailyPnl = runningBots.reduce((sum, b) => sum + b.total_pnl, 0);
  const dailyPnlPct = runningBots.length > 0
    ? (dailyPnl / runningBots.reduce((s, b) => s + b.initial_capital, 0)) * 100
    : 0;

  const maxDrawdownLimit = runningBots.length > 0
    ? Math.min(...runningBots.map((b) => (b.risk_config as any).dailyDrawdownLimitPct || 4))
    : 4;

  const exposureWarning = totalExposure > 80;
  const drawdownWarning = dailyPnlPct < -maxDrawdownLimit * 0.5;
  const drawdownCritical = dailyPnlPct < -maxDrawdownLimit;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-warning-400" />
        <h3 className="text-sm font-semibold text-ink-100">Risk Management</h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-400">Total Exposure</span>
            <span className={`text-xs font-mono font-semibold ${exposureWarning ? 'text-danger-400' : 'text-ink-200'}`}>
              {totalExposure.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                exposureWarning ? 'bg-danger-500' : 'bg-warning-400'
              }`}
              style={{ width: `${Math.min(totalExposure, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-400">Daily P&L</span>
            <span
              className={`text-xs font-mono font-semibold ${
                dailyPnlPct >= 0 ? 'text-success-400' : drawdownCritical ? 'text-danger-400' : 'text-warning-400'
              }`}
            >
              {dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%
            </span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-px h-full bg-ink-600" style={{ marginLeft: '50%' }} />
            </div>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dailyPnlPct >= 0 ? 'bg-success-500' : 'bg-danger-500'
              }`}
              style={{
                width: `${Math.min(Math.abs(dailyPnlPct) * 5, 50)}%`,
                marginLeft: dailyPnlPct >= 0 ? '50%' : 'auto',
                marginRight: dailyPnlPct < 0 ? '50%' : 'auto',
              }}
            />
          </div>
          <div className="text-[11px] text-ink-500 mt-1">
            Drawdown limit: -{maxDrawdownLimit}% (auto-pause)
          </div>
        </div>

        <div className="pt-3 border-t border-ink-700 space-y-2">
          {drawdownCritical ? (
            <RiskStatusItem
              icon={<AlertTriangle size={14} className="text-danger-400" />}
              label="Daily drawdown limit reached"
              status="critical"
            />
          ) : drawdownWarning ? (
            <RiskStatusItem
              icon={<AlertTriangle size={14} className="text-warning-400" />}
              label="Approaching drawdown limit"
              status="warning"
            />
          ) : (
            <RiskStatusItem
              icon={<CheckCircle size={14} className="text-success-400" />}
              label="Within risk parameters"
              status="ok"
            />
          )}

          {exposureWarning && (
            <RiskStatusItem
              icon={<AlertTriangle size={14} className="text-danger-400" />}
              label="High total exposure"
              status="warning"
            />
          )}

          <div className="text-[11px] text-ink-500 pt-1">
            Per-trade risk cap: {runningBots[0] ? (runningBots[0].risk_config as any).perTradeRiskPct : 1.5}%
            {' • '}
            Max position: {runningBots[0] ? (runningBots[0].risk_config as any).maxPositionSizePct : 15}%
          </div>
        </div>

        {runningBots.length > 0 && (
          <div className="pt-2 border-t border-ink-700">
            <div className="text-xs text-ink-400 mb-2">Active Risk Limits</div>
            <div className="space-y-1">
              {runningBots.map((bot) => {
                const risk = bot.risk_config as any;
                return (
                  <div key={bot.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-300 truncate">{bot.name}</span>
                    <span className="font-mono text-ink-400 shrink-0 ml-2">
                      {risk.perTradeRiskPct}% / {risk.dailyDrawdownLimitPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskStatusItem({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: 'ok' | 'warning' | 'critical';
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={`text-xs ${
          status === 'ok' ? 'text-success-400' : status === 'warning' ? 'text-warning-400' : 'text-danger-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
