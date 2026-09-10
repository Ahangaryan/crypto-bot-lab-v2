import { Bot, TrendingUp, Plus } from 'lucide-react';
import type { Bot as BotType } from '../types';
import { STRATEGY_META } from '../lib/engine';

interface SidebarProps {
  bots: BotType[];
  selectedBotId: string | null;
  onSelectBot: (id: string) => void;
  onNewBot: () => void;
  currentPrice: number;
  selectedSymbol: string;
}

export function Sidebar({ bots, selectedBotId, onSelectBot, onNewBot }: SidebarProps) {
  return (
    <aside className="w-64 bg-ink-900 border-r border-ink-700 flex flex-col overflow-hidden shrink-0">
      <div className="p-5 border-b border-ink-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <Bot size={20} className="text-ink-950" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink-100 leading-tight">CryptoBot Lab</h1>
            <p className="text-xs text-ink-400">Strategy Simulator</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={onNewBot}
        >
          <Plus size={16} />
          New Bot
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 pb-4">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-wider px-2 mb-2">
          Active Bots ({bots.length})
        </div>
        <div className="space-y-1">
          {bots.map((bot) => {
            const meta = STRATEGY_META[bot.strategy];
            const isActive = selectedBotId === bot.id;
            return (
              <button
                key={bot.id}
                onClick={() => onSelectBot(bot.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
                  isActive
                    ? 'bg-ink-700 border border-ink-600'
                    : 'hover:bg-ink-800 border border-transparent'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-all"
                  style={{
                    backgroundColor: bot.status === 'running' ? meta.color : '#4a5568',
                    boxShadow: bot.status === 'running' ? `0 0 8px ${meta.color}` : 'none',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-100 truncate">{bot.name}</div>
                  <div className="text-xs text-ink-400 truncate">{meta.label}</div>
                </div>
                {bot.status === 'running' && (
                  <TrendingUp size={14} className="text-success-500 shrink-0" />
                )}
              </button>
            );
          })}
          {bots.length === 0 && (
            <div className="text-xs text-ink-500 px-3 py-4">No bots created yet</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-ink-700">
        <div className="text-xs text-ink-500 leading-relaxed">
          Simulated trading environment. No real funds are used. Educational purposes only.
        </div>
      </div>
    </aside>
  );
}
