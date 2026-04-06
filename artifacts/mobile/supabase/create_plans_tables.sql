-- ─────────────────────────────────────────────────────────────────────────────
-- Plans & User Plans Migration
-- NOTE: The plans and user_plans tables already exist in Supabase.
-- Existing columns: plans(id, name, price, daily_rate, duration_days, total_return)
--                   user_plans(id, user_id, plan_id, invested_amount, daily_profit, start_time, end_time, status)
-- This file documents the expected schema and provides the seed INSERT.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Seed plans (skip if already seeded) ──────────────────────────────────────
INSERT INTO plans (name, price, daily_rate, duration_days, total_return)
VALUES
  ('Basic',    99,   0.5, 30, 114),
  ('Advance',  499,  0.8, 30, 574),
  ('Pro',      1099, 1.2, 30, 1263),
  ('Elite',    2099, 1.8, 30, 2414),
  ('Ultimate', 5099, 3.0, 30, 5864)
ON CONFLICT DO NOTHING;

-- ── RLS policies (run if not already set) ─────────────────────────────────────
-- ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read plans" ON plans FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow anon insert plans" ON plans FOR INSERT TO anon WITH CHECK (true);

-- ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon all user_plans" ON user_plans FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── One active plan per user (partial unique index) ───────────────────────────
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_one_active ON user_plans (user_id) WHERE status = 'active';
