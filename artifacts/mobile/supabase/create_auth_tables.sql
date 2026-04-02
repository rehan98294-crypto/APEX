-- ─────────────────────────────────────────────────────────────────────────────
-- TreasureFun Auth Tables  — CLEAN SLATE VERSION
-- Run in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- WARNING: Drops and recreates users, otps, orders tables.
-- Any existing data in those tables will be lost.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Drop existing tables (order matters: otps/orders first, then users) ───────
DROP TABLE IF EXISTS otps   CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users  CASCADE;

-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT        NOT NULL DEFAULT '',
  password_hash TEXT        NOT NULL DEFAULT '',
  referral_code TEXT,
  balance       NUMERIC(18,4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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
  order_id   TEXT        PRIMARY KEY,
  user_id    TEXT        NOT NULL DEFAULT 'anonymous',
  nft_id     TEXT        NOT NULL DEFAULT '',
  status     TEXT        NOT NULL CHECK (status IN ('processing', 'bought', 'sold')),
  profit     NUMERIC(18,4) NOT NULL DEFAULT 0,
  price      NUMERIC(18,4) NOT NULL DEFAULT 0,
  level      INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select orders" ON orders FOR SELECT TO anon USING (true);

-- ── Done ──────────────────────────────────────────────────────────────────────
SELECT 'Tables ready: users, otps, orders' AS status;
