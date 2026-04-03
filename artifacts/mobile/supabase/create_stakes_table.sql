-- ─────────────────────────────────────────────────────────────────────────────
-- Stakes table — run in Supabase SQL Editor to create or fix the stakes table
-- This does a clean DROP + CREATE to fix any column type mismatches
-- (e.g. user_id UUID → TEXT so any string user ID is accepted)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS stakes CASCADE;

CREATE TABLE stakes (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT          NOT NULL,
  amount      NUMERIC(18,4) NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_time  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  profit      NUMERIC(18,6) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert stakes" ON stakes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select stakes" ON stakes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update stakes" ON stakes FOR UPDATE TO anon USING (true) WITH CHECK (true);

SELECT 'stakes table ready — user_id TEXT, columns: id, user_id, amount, status, start_time, profit' AS status;
