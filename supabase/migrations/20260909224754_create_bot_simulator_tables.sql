/*
# Create CryptoBot Lab simulation tables (single-tenant, no auth)

1. New Tables

- `bots`: Stores trading bot configurations created by the user.
  - `id` (uuid, primary key)
  - `name` (text, name of the bot)
  - `strategy` (text, strategy type: grid, dca, mean_reversion, arbitrage, market_making, momentum)
  - `symbol` (text, trading pair e.g. BTC/USDT)
  - `config` (jsonb, strategy-specific parameters like grid levels, DCA interval, etc.)
  - `risk_config` (jsonb, risk management settings like max position size, stop loss, daily drawdown limit)
  - `status` (text, running/stopped/paused)
  - `initial_capital` (numeric, starting capital in USDT)
  - `current_capital` (numeric, current capital after simulated trades)
  - `total_pnl` (numeric, total profit/loss)
  - `total_trades` (integer, number of trades executed)
  - `win_rate` (numeric, percentage of winning trades)
  - `created_at` (timestamptz)

- `trades`: Stores individual simulated trades executed by bots.
  - `id` (uuid, primary key)
  - `bot_id` (uuid, foreign key to bots)
  - `side` (text, buy/sell)
  - `price` (numeric, execution price)
  - `quantity` (numeric, amount traded)
  - `value` (numeric, price * quantity)
  - `pnl` (numeric, profit/loss for this trade — null for buys)
  - `reason` (text, why the trade was triggered)
  - `timestamp` (timestamptz)

- `price_history`: Stores simulated price snapshots for charting.
  - `id` (uuid, primary key)
  - `symbol` (text, trading pair)
  - `price` (numeric)
  - `timestamp` (timestamptz)

2. Security
- Enable RLS on all tables.
- Single-tenant app (no sign-in): allow anon + authenticated full CRUD on all tables.
- `USING (true)` is acceptable here because all data is intentionally public/shared in this simulation app.
- Foreign key on trades.bot_id → bots.id with CASCADE delete.
*/

CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  strategy text NOT NULL DEFAULT 'grid',
  symbol text NOT NULL DEFAULT 'BTC/USDT',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'stopped',
  initial_capital numeric NOT NULL DEFAULT 10000,
  current_capital numeric NOT NULL DEFAULT 10000,
  total_pnl numeric NOT NULL DEFAULT 0,
  total_trades integer NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  winning_trades integer NOT NULL DEFAULT 0,
  losing_trades integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  side text NOT NULL DEFAULT 'buy',
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  value numeric NOT NULL,
  pnl numeric,
  reason text NOT NULL DEFAULT '',
  timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL DEFAULT 'BTC/USDT',
  price numeric NOT NULL,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- bots policies
DROP POLICY IF EXISTS "anon_select_bots" ON bots;
CREATE POLICY "anon_select_bots" ON bots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bots" ON bots;
CREATE POLICY "anon_insert_bots" ON bots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bots" ON bots;
CREATE POLICY "anon_update_bots" ON bots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bots" ON bots;
CREATE POLICY "anon_delete_bots" ON bots FOR DELETE
  TO anon, authenticated USING (true);

-- trades policies
DROP POLICY IF EXISTS "anon_select_trades" ON trades;
CREATE POLICY "anon_select_trades" ON trades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trades" ON trades;
CREATE POLICY "anon_insert_trades" ON trades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trades" ON trades;
CREATE POLICY "anon_update_trades" ON trades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trades" ON trades;
CREATE POLICY "anon_delete_trades" ON trades FOR DELETE
  TO anon, authenticated USING (true);

-- price_history policies
DROP POLICY IF EXISTS "anon_select_prices" ON price_history;
CREATE POLICY "anon_select_prices" ON price_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_prices" ON price_history;
CREATE POLICY "anon_insert_prices" ON price_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_prices" ON price_history;
CREATE POLICY "anon_delete_prices" ON price_history FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
