import { useState } from 'react';
import { X, Settings2, Shield } from 'lucide-react';
import type { StrategyType, RiskConfig } from '../types';
import { STRATEGY_META, DEFAULT_CONFIGS, DEFAULT_RISK } from '../lib/engine';
import { getSymbols } from '../lib/market';

interface CreateBotModalProps {
  onClose: () => void;
  onCreate: (config: {
    name: string;
    strategy: StrategyType;
    symbol: string;
    strategyConfig: any;
    riskConfig: RiskConfig;
    initialCapital: number;
  }) => void;
  currentPrice: number;
}

const STRATEGY_TYPES: StrategyType[] = [
  'grid',
  'dca',
  'mean_reversion',
  'arbitrage',
  'market_making',
  'momentum',
];

export function CreateBotModal({ onClose, onCreate, currentPrice }: CreateBotModalProps) {
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<StrategyType>('grid');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [config, setConfig] = useState<any>(DEFAULT_CONFIGS['grid']);
  const [risk, setRisk] = useState<RiskConfig>(DEFAULT_RISK);
  const [step, setStep] = useState<1 | 2>(1);

  const symbols = getSymbols();

  const handleStrategyChange = (s: StrategyType) => {
    setStrategy(s);
    const newConfig = { ...DEFAULT_CONFIGS[s] };
    if (s === 'grid' && currentPrice > 0) {
      newConfig.upperPrice = Math.round(currentPrice * 1.05);
      newConfig.lowerPrice = Math.round(currentPrice * 0.95);
    }
    setConfig(newConfig);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      strategy,
      symbol,
      strategyConfig: config,
      riskConfig: risk,
      initialCapital,
    });
  };

  const updateConfig = (key: string, value: number) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateRisk = (key: keyof RiskConfig, value: number) => {
    setRisk((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="text-lg font-semibold text-ink-100">Create New Trading Bot</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">
                  Strategy Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {STRATEGY_TYPES.map((s) => {
                    const meta = STRATEGY_META[s];
                    const isActive = strategy === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStrategyChange(s)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isActive
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-ink-700 bg-ink-800 hover:border-ink-600'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-2"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                        >
                          {meta.label.charAt(0)}
                        </div>
                        <div className="text-xs font-semibold text-ink-100">{meta.label}</div>
                        <div className="text-[11px] text-ink-400 mt-1 leading-snug">
                          {meta.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">
                    Bot Name
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. BTC Grid Master"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">
                    Trading Pair
                  </label>
                  <select
                    className="input"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  >
                    {symbols.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 block">
                  Initial Capital (USDT)
                </label>
                <input
                  type="number"
                  className="input"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  min={100}
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="text-xs text-ink-400">
                  Current {symbol} price: <span className="font-mono text-ink-200">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                >
                  <Settings2 size={16} />
                  Configure Strategy
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${STRATEGY_META[strategy].color}20`, color: STRATEGY_META[strategy].color }}
                >
                  {STRATEGY_META[strategy].label.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-100">{STRATEGY_META[strategy].label}</div>
                  <div className="text-xs text-ink-400">{name} • {symbol}</div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                  Strategy Parameters
                </label>
                {strategy === 'grid' && (
                  <>
                    <ParamInput label="Upper Price" value={config.upperPrice} onChange={(v) => updateConfig('upperPrice', v)} />
                    <ParamInput label="Lower Price" value={config.lowerPrice} onChange={(v) => updateConfig('lowerPrice', v)} />
                    <ParamInput label="Grid Levels" value={config.gridLevels} onChange={(v) => updateConfig('gridLevels', v)} step={1} />
                    <ParamInput label="Quantity Per Grid" value={config.quantityPerGrid} onChange={(v) => updateConfig('quantityPerGrid', v)} step={0.01} />
                  </>
                )}
                {strategy === 'dca' && (
                  <>
                    <ParamInput label="Interval (seconds)" value={config.intervalSeconds} onChange={(v) => updateConfig('intervalSeconds', v)} step={1} />
                    <ParamInput label="Buy Amount (USDT)" value={config.buyAmount} onChange={(v) => updateConfig('buyAmount', v)} />
                    <ParamInput label="Take Profit (%)" value={config.takeProfitPct} onChange={(v) => updateConfig('takeProfitPct', v)} />
                    <ParamInput label="Max Buys" value={config.maxBuys} onChange={(v) => updateConfig('maxBuys', v)} step={1} />
                  </>
                )}
                {strategy === 'mean_reversion' && (
                  <>
                    <ParamInput label="Lookback Period (ticks)" value={config.lookbackPeriod} onChange={(v) => updateConfig('lookbackPeriod', v)} step={1} />
                    <ParamInput label="Deviation Threshold (%)" value={config.deviationThreshold} onChange={(v) => updateConfig('deviationThreshold', v)} />
                    <ParamInput label="Buy Amount (USDT)" value={config.buyAmount} onChange={(v) => updateConfig('buyAmount', v)} />
                    <ParamInput label="Take Profit (%)" value={config.takeProfitPct} onChange={(v) => updateConfig('takeProfitPct', v)} />
                  </>
                )}
                {strategy === 'arbitrage' && (
                  <>
                    <ParamInput label="Spread Threshold (%)" value={config.spreadThresholdPct} onChange={(v) => updateConfig('spreadThresholdPct', v)} step={0.1} />
                    <ParamInput label="Trade Amount (USDT)" value={config.tradeAmount} onChange={(v) => updateConfig('tradeAmount', v)} />
                    <ParamInput label="Simulated Exchanges" value={config.exchangeCount} onChange={(v) => updateConfig('exchangeCount', v)} step={1} />
                  </>
                )}
                {strategy === 'market_making' && (
                  <>
                    <ParamInput label="Spread (%)" value={config.spreadPct} onChange={(v) => updateConfig('spreadPct', v)} step={0.1} />
                    <ParamInput label="Order Quantity" value={config.orderQuantity} onChange={(v) => updateConfig('orderQuantity', v)} step={0.01} />
                    <ParamInput label="Refresh Interval (ticks)" value={config.refreshIntervalSeconds} onChange={(v) => updateConfig('refreshIntervalSeconds', v)} step={1} />
                  </>
                )}
                {strategy === 'momentum' && (
                  <>
                    <ParamInput label="Lookback Period (ticks)" value={config.lookbackPeriod} onChange={(v) => updateConfig('lookbackPeriod', v)} step={1} />
                    <ParamInput label="Momentum Threshold (%)" value={config.momentumThresholdPct} onChange={(v) => updateConfig('momentumThresholdPct', v)} />
                    <ParamInput label="Position Size (USDT)" value={config.positionSize} onChange={(v) => updateConfig('positionSize', v)} />
                    <ParamInput label="Take Profit (%)" value={config.takeProfitPct} onChange={(v) => updateConfig('takeProfitPct', v)} />
                    <ParamInput label="Stop Loss (%)" value={config.stopLossPct} onChange={(v) => updateConfig('stopLossPct', v)} />
                  </>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-ink-700">
                <label className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} />
                  Risk Management
                </label>
                <ParamInput label="Max Position Size (% of capital)" value={risk.maxPositionSizePct} onChange={(v) => updateRisk('maxPositionSizePct', v)} />
                <ParamInput label="Per-Trade Risk (% of capital)" value={risk.perTradeRiskPct} onChange={(v) => updateRisk('perTradeRiskPct', v)} step={0.5} />
                <ParamInput label="Daily Drawdown Limit (%)" value={risk.dailyDrawdownLimitPct} onChange={(v) => updateRisk('dailyDrawdownLimitPct', v)} step={0.5} />
                <ParamInput label="Max Total Exposure (%)" value={risk.maxTotalExposurePct} onChange={(v) => updateRisk('maxTotalExposurePct', v)} step={5} />
              </div>

              <div className="flex items-center justify-between pt-3">
                <button className="btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
                  Launch Bot
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ParamInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-ink-300">{label}</label>
      <input
        type="number"
        className="input w-32 text-right font-mono"
        value={value}
        step={step || 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
