-- ─────────────────────────────────────────────────────────────────────────────
-- APEX Auth Tables  — CLEAN SLATE VERSION
-- Run in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- WARNING: Drops and recreates all tables. Existing data will be lost.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Drop existing tables (dependencies first) ─────────────────────────────────
DROP TABLE IF EXISTS stakes  CASCADE;
DROP TABLE IF EXISTS otps    CASCADE;
DROP TABLE IF EXISTS orders  CASCADE;
DROP TABLE IF EXISTS users   CASCADE;

-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT          NOT NULL UNIQUE,
  email         TEXT          NOT NULL UNIQUE,
  phone         TEXT          NOT NULL DEFAULT '',
  password_hash TEXT          NOT NULL DEFAULT '',
  referral_code TEXT,
  balance       NUMERIC(18,4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert users"  ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select users"  ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update users"  ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 2. otps ───────────────────────────────────────────────────────────────────
CREATE TABLE otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all otps" ON otps FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 3. orders ─────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  order_id   TEXT          PRIMARY KEY,
  user_id    TEXT          NOT NULL DEFAULT 'anonymous',
  nft_id     TEXT          NOT NULL DEFAULT '',
  status     TEXT          NOT NULL CHECK (status IN ('processing', 'bought', 'sold')),
  profit     NUMERIC(18,4) NOT NULL DEFAULT 0,
  price      NUMERIC(18,4) NOT NULL DEFAULT 0,
  level      INTEGER       NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select orders" ON orders FOR SELECT TO anon USING (true);

-- ── 4. stakes ─────────────────────────────────────────────────────────────────
CREATE TABLE stakes (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT          NOT NULL,
  amount           NUMERIC(18,4) NOT NULL,
  zone_title       TEXT          NOT NULL DEFAULT '',
  apr              NUMERIC(6,4)  NOT NULL DEFAULT 1.0,
  duration_minutes INTEGER       NOT NULL DEFAULT 10,
  start_time       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  end_time         TIMESTAMPTZ   NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  profit           NUMERIC(18,6) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert stakes" ON stakes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select stakes" ON stakes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update stakes" ON stakes FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 5. nfts (keep existing or recreate) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS nfts (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT          NOT NULL,
  image_url  TEXT          NOT NULL UNIQUE,
  level      INTEGER       NOT NULL DEFAULT 1,
  min_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read nfts"   ON nfts;
DROP POLICY IF EXISTS "Allow anon insert nfts" ON nfts;
CREATE POLICY "Allow anon read nfts"   ON nfts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert nfts" ON nfts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update nfts" ON nfts FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── Done ──────────────────────────────────────────────────────────────────────
SELECT 'Tables ready: users, otps, orders, stakes, nfts' AS status;
