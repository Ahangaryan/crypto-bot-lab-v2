import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import {
  createInitialState,
  runStrategy,
  calculateUnrealizedPnl,
  calculateMaxDrawdown,
  initGridOrders,
  type SimTrade,
} from './lib/engine';
import { getSymbolConfig, generateNextPrice } from './lib/market';
import { fetchTicker, fetchKlines, type Ticker24h, type Candle } from './lib/exchange';
import { AlertTriangle } from 'lucide-react';
import type { Bot, BotRuntimeState, PricePoint, StrategyType, RiskConfig, Trade } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PriceChart } from './components/PriceChart';
import { BotCard } from './components/BotCard';
import { CreateBotModal } from './components/CreateBotModal';
import { TradeFeed } from './components/TradeFeed';
import { RiskPanel } from './components/RiskPanel';
import { PerformancePanel } from './components/PerformancePanel';
import { BotDetail } from './components/BotDetail';

export default function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(65000);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [tick, setTick] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [capitalHistory, setCapitalHistory] = useState<number[]>([]);
  const [ticker24h, setTicker24h] = useState<Ticker24h | null>(null);
  const [isLive, setIsLive] = useState(false);

  const runtimeStates = useRef<Map<string, BotRuntimeState>>(new Map());
  const tickRef = useRef(0);
  const livePriceRef = useRef<number | null>(null);
  const lastFetchRef = useRef(0);

  const loadBots = useCallback(async () => {
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load bots:', error);
      return;
    }
    if (data) {
      const loadedBots = data as unknown as Bot[];
      setBots(loadedBots);
      const symConfig = getSymbolConfig(selectedSymbol);
      const startPrice = livePriceRef.current || symConfig.basePrice;
      for (const bot of loadedBots) {
        if (!runtimeStates.current.has(bot.id)) {
          const state = createInitialState(bot.initial_capital, bot.config);
          if (bot.strategy === 'grid') {
            initGridOrders(state, bot.config as any, startPrice);
          }
          runtimeStates.current.set(bot.id, state);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  useEffect(() => {
    let cancelled = false;

    async function initSymbol() {
      const symConfig = getSymbolConfig(selectedSymbol);
      let price = symConfig.basePrice;

      const ticker = await fetchTicker(selectedSymbol);
      if (cancelled) return;

      if (ticker && ticker.lastPrice > 0) {
        price = ticker.lastPrice;
        livePriceRef.current = price;
        setIsLive(true);
        setTicker24h(ticker);
      } else {
        livePriceRef.current = null;
        setIsLive(false);
        setTicker24h(null);
      }

      setCurrentPrice(price);

      const klines = await fetchKlines(selectedSymbol, '15m', 100);
      if (cancelled) return;

      if (klines.length > 0) {
        setPriceHistory(klines.map((k: Candle) => ({ price: k.close, timestamp: k.time })));
        price = klines[klines.length - 1].close;
        livePriceRef.current = price;
        setCurrentPrice(price);
      } else {
        setPriceHistory([{ price, timestamp: Date.now() }]);
      }

      setCapitalHistory([]);
    }

    initSymbol();

    return () => { cancelled = true; };
  }, [selectedSymbol]);

  useEffect(() => {
    const symbolConfig = getSymbolConfig(selectedSymbol);

    const interval = setInterval(async () => {
      tickRef.current++;
      const t = tickRef.current;
      setTick(t);

      let price: number;
      const now = Date.now();
      const shouldFetch = now - lastFetchRef.current > 5000;

      if (shouldFetch) {
        lastFetchRef.current = now;
        const ticker = await fetchTicker(selectedSymbol);
        if (ticker && ticker.lastPrice > 0) {
          price = ticker.lastPrice;
          livePriceRef.current = price;
          setIsLive(true);
          setTicker24h(ticker);
        } else {
          price = livePriceRef.current || generateNextPrice(currentPrice, symbolConfig, t);
          if (!livePriceRef.current) setIsLive(false);
        }
      } else {
        price = generateNextPrice(livePriceRef.current || currentPrice, symbolConfig, t);
      }

      setCurrentPrice(price);
      setPriceHistory((prev) => [...prev.slice(-200), { price, timestamp: Date.now() }]);
      const priceForTick = price;

      setBots((prevBots) => {
        let allNewTrades: SimTrade[] = [];
        let totalCapital = 0;

        const updated = prevBots.map((bot) => {
          if (bot.status !== 'running') {
            totalCapital += bot.current_capital;
            return bot;
          }
          const state = runtimeStates.current.get(bot.id);
          if (!state) {
            totalCapital += bot.current_capital;
            return bot;
          }

          if (bot.strategy === 'grid' && state.gridOrders.length === 0) {
            initGridOrders(state, bot.config as any, priceForTick);
          }

          const newTrades = runStrategy(bot, state, priceForTick, t);
          allNewTrades = allNewTrades.concat(newTrades);

          const unrealized = calculateUnrealizedPnl(state, priceForTick);
          const newCapital = bot.initial_capital + state.realizedPnl + unrealized;
          const winning = newTrades.filter((tr) => tr.pnl !== null && tr.pnl > 0).length;
          const losing = newTrades.filter((tr) => tr.pnl !== null && tr.pnl < 0).length;
          const totalTrades = bot.total_trades + newTrades.length;
          const totalWinning = bot.winning_trades + winning;
          const totalLosing = bot.losing_trades + losing;
          const winRate = totalTrades > 0 ? (totalWinning / totalTrades) * 100 : 0;
          const totalFees = (bot.total_fees || 0) + newTrades.reduce((sum, tr) => sum + tr.fee, 0);

          if (newCapital > state.peakCapital) state.peakCapital = newCapital;

          if (newTrades.length > 0) {
            persistTrades(bot.id, newTrades);
          }

          if (t % 10 === 0) {
            persistBotStats(bot.id, {
              current_capital: newCapital,
              total_pnl: newCapital - bot.initial_capital,
              total_trades: totalTrades,
              win_rate: winRate,
              winning_trades: totalWinning,
              losing_trades: totalLosing,
              total_fees: totalFees,
            });
          }

          totalCapital += newCapital;

          return {
            ...bot,
            current_capital: newCapital,
            total_pnl: newCapital - bot.initial_capital,
            total_trades: totalTrades,
            winning_trades: totalWinning,
            losing_trades: totalLosing,
            win_rate: winRate,
            total_fees: totalFees,
          };
        });

        if (allNewTrades.length > 0) {
          setRecentTrades((prev) =>
            [
              ...allNewTrades.map((t) => ({
                id: `${Date.now()}-${Math.random()}`,
                bot_id: updated.find((b) => b.status === 'running')?.id || '',
                side: t.side,
                price: t.price,
                quantity: t.quantity,
                value: t.value,
                pnl: t.pnl,
                fee: t.fee,
                slippage_cost: t.slippageCost,
                reason: t.reason,
                timestamp: new Date(t.timestamp).toISOString(),
              })),
              ...prev,
            ].slice(0, 100),
          );
        }

        setCapitalHistory((prev) => [...prev.slice(-200), totalCapital]);

        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedSymbol, currentPrice]);

  const persistTrades = async (botId: string, trades: SimTrade[]) => {
    try {
      const rows = trades.map((t) => ({
        bot_id: botId,
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        value: t.value,
        pnl: t.pnl,
        fee: t.fee,
        slippage_cost: t.slippageCost,
        reason: t.reason,
      }));
      await supabase.from('trades').insert(rows);
    } catch {
      // non-critical for simulation
    }
  };

  const persistBotStats = async (botId: string, stats: { current_capital: number; total_pnl: number; total_trades: number; win_rate: number; winning_trades: number; losing_trades: number; total_fees: number }) => {
    try {
      await supabase.from('bots').update({
        current_capital: stats.current_capital,
        total_pnl: stats.total_pnl,
        total_trades: stats.total_trades,
        win_rate: stats.win_rate,
        winning_trades: stats.winning_trades,
        losing_trades: stats.losing_trades,
        total_fees: stats.total_fees,
      }).eq('id', botId);
    } catch {
      // non-critical
    }
  };

  const handleCreateBot = async (config: {
    name: string;
    strategy: StrategyType;
    symbol: string;
    strategyConfig: any;
    riskConfig: RiskConfig;
    initialCapital: number;
  }) => {
    const { data, error } = await supabase
      .from('bots')
      .insert({
        name: config.name,
        strategy: config.strategy,
        symbol: config.symbol,
        config: config.strategyConfig,
        risk_config: config.riskConfig,
        status: 'running',
        initial_capital: config.initialCapital,
        current_capital: config.initialCapital,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create bot:', error);
      return;
    }

    const newBot = data as unknown as Bot;
    const state = createInitialState(config.initialCapital, config.strategyConfig);
    if (config.strategy === 'grid') {
      initGridOrders(state, config.strategyConfig, currentPrice);
    }
    runtimeStates.current.set(newBot.id, state);
    setBots((prev) => [newBot, ...prev]);
    setShowCreateModal(false);
  };

  const handleToggleBot = async (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) return;
    const newStatus = bot.status === 'running' ? 'paused' : 'running';
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, status: newStatus } : b)));
    await supabase.from('bots').update({ status: newStatus }).eq('id', botId);
  };

  const handleDeleteBot = async (botId: string) => {
    await supabase.from('trades').delete().eq('bot_id', botId);
    await supabase.from('bots').delete().eq('id', botId);
    runtimeStates.current.delete(botId);
    setBots((prev) => prev.filter((b) => b.id !== botId));
    if (selectedBotId === botId) setSelectedBotId(null);
  };

  const handleStopBot = async (botId: string) => {
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, status: 'stopped' } : b)));
    await supabase.from('bots').update({ status: 'stopped' }).eq('id', botId);
  };

  const runningBots = bots.filter((b) => b.status === 'running');
  const totalCapital = bots.reduce((sum, b) => sum + b.current_capital, 0);
  const totalPnl = bots.reduce((sum, b) => sum + b.total_pnl, 0);
  const totalTrades = bots.reduce((sum, b) => sum + b.total_trades, 0);
  const avgWinRate = bots.length > 0 ? bots.reduce((sum, b) => sum + b.win_rate, 0) / bots.length : 0;
  const totalFees = bots.reduce((sum, b) => sum + (b.total_fees || 0), 0);
  const maxDrawdown = calculateMaxDrawdown(capitalHistory);

  const selectedBot = bots.find((b) => b.id === selectedBotId);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <Sidebar
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBot={setSelectedBotId}
        onNewBot={() => setShowCreateModal(true)}
        currentPrice={currentPrice}
        selectedSymbol={selectedSymbol}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          currentPrice={currentPrice}
          totalCapital={totalCapital}
          totalPnl={totalPnl}
          runningCount={runningBots.length}
          tick={tick}
          isLive={isLive}
          ticker24h={ticker24h}
        />

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20">
            <AlertTriangle size={18} className="text-warning-400 shrink-0 mt-0.5" />
            <div className="text-xs text-ink-300 leading-relaxed">
              <span className="font-semibold text-warning-400">Simulation Only — Not Real Trading.</span>{' '}
              This dashboard uses real Binance price data but executes simulated (paper) trades. No real orders are placed.
              Trading fees (0.1% per trade) and slippage (0.05%) are now included to show realistic performance.
              Never risk real capital based on these results alone — real markets have additional risks including
              order rejection, liquidity gaps, and exchange downtime.
            </div>
          </div>
          {selectedBot ? (
            <BotDetail
              bot={selectedBot}
              runtimeState={runtimeStates.current.get(selectedBot.id)!}
              currentPrice={currentPrice}
              onToggle={() => handleToggleBot(selectedBot.id)}
              onDelete={() => handleDeleteBot(selectedBot.id)}
              onStop={() => handleStopBot(selectedBot.id)}
              onBack={() => setSelectedBotId(null)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PriceChart
                    priceHistory={priceHistory}
                    selectedSymbol={selectedSymbol}
                    capitalHistory={capitalHistory}
                    isLive={isLive}
                  />
                </div>
                <div className="space-y-6">
                  <PerformancePanel
                    totalCapital={totalCapital}
                    totalPnl={totalPnl}
                    totalTrades={totalTrades}
                    avgWinRate={avgWinRate}
                    maxDrawdown={maxDrawdown}
                    runningCount={runningBots.length}
                    botCount={bots.length}
                    totalFees={totalFees}
                  />
                  <RiskPanel bots={bots} />
                </div>
              </div>

              {bots.length === 0 ? (
                <div className="card p-12 text-center animate-fade-in">
                  <div className="text-6xl mb-4 opacity-20">🤖</div>
                  <h3 className="text-xl font-semibold text-ink-100 mb-2">No bots yet</h3>
                  <p className="text-ink-400 mb-6 max-w-md mx-auto">
                    Create your first trading bot to start simulating strategies like Grid Trading,
                    DCA, Mean Reversion, Arbitrage, Market Making, and Momentum.
                  </p>
                  <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    Create Your First Bot
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bots.map((bot) => (
                    <BotCard
                      key={bot.id}
                      bot={bot}
                      currentPrice={currentPrice}
                      onToggle={() => handleToggleBot(bot.id)}
                      onDelete={() => handleDeleteBot(bot.id)}
                      onSelect={() => setSelectedBotId(bot.id)}
                    />
                  ))}
                </div>
              )}

              <TradeFeed trades={recentTrades} />
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateBotModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateBot}
          currentPrice={currentPrice}
        />
      )}
    </div>
  );
}
