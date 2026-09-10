/*
# Add fee tracking columns to bots and trades tables

1. Modified Tables
- `bots`: Added `total_fees` (numeric, default 0) — cumulative trading fees paid by this bot
- `trades`: Added `fee` (numeric, default 0) and `slippage_cost` (numeric, default 0) — per-trade fee and slippage cost

2. Security
- No RLS policy changes. Existing policies remain in place.

3. Notes
- All columns are additive (ALTER TABLE ADD COLUMN) — no data loss
- Defaults are 0 so existing rows are unaffected
*/

ALTER TABLE bots ADD COLUMN IF NOT EXISTS total_fees numeric DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS slippage_cost numeric DEFAULT 0;
