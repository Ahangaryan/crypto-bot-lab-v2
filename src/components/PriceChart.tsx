import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import type { PricePoint } from '../types';
import { TrendingUp, Wifi, WifiOff } from 'lucide-react';

interface PriceChartProps {
  priceHistory: PricePoint[];
  selectedSymbol: string;
  capitalHistory: number[];
  isLive: boolean;
}

export function PriceChart({ priceHistory, selectedSymbol, capitalHistory, isLive }: PriceChartProps) {
  const chartData = priceHistory.map((p, i) => ({
    index: i,
    price: p.price,
    time: new Date(p.timestamp).toLocaleTimeString(),
  }));

  const capitalData = capitalHistory.map((c, i) => ({
    index: i,
    capital: c,
  }));

  const prices = priceHistory.map((p) => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const padding = (maxPrice - minPrice) * 0.1 || 1;

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-ink-100">{selectedSymbol} Price Chart</h3>
          <span
            className={`flex items-center gap-1 ml-2 text-xs font-medium ${
              isLive ? 'text-success-400' : 'text-ink-400'
            }`}
          >
            {isLive ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isLive ? 'Real Binance Data' : 'Simulated'}
          </span>
        </div>
        {priceHistory.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-ink-400">
              H: <span className="font-mono text-success-400">${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </span>
            <span className="text-ink-400">
              L: <span className="font-mono text-danger-400">${minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isLive ? '#14b8a6' : '#f59e0b'} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isLive ? '#14b8a6' : '#f59e0b'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252d40" vertical={false} />
            <XAxis dataKey="index" tick={false} stroke="#4a5568" />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tickFormatter={(v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              stroke="#4a5568"
              fontSize={11}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#141a28',
                border: '1px solid #252d40',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ba5bc' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.time || ''}
              formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Price']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isLive ? '#14b8a6' : '#f59e0b'}
              strokeWidth={2}
              fill="url(#priceGradient)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {capitalData.length > 1 && (
        <div className="mt-4 pt-4 border-t border-ink-700">
          <div className="text-xs text-ink-400 mb-2">Portfolio Capital Over Time</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={capitalData} margin={{ top: 5, right: 5, bottom: 0, left: 50 }}>
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  stroke="#4a5568"
                  fontSize={10}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141a28',
                    border: '1px solid #252d40',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Capital']}
                />
                <Line
                  type="monotone"
                  dataKey="capital"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
