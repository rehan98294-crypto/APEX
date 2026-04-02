-- ─────────────────────────────────────────────────────────────────────────────
-- TreasureFun Auth Tables
-- Run in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guards)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT        NOT NULL DEFAULT '',
  password_hash TEXT        NOT NULL,
  referral_code TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns if table already existed without them
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone         TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert users"  ON users;
DROP POLICY IF EXISTS "Allow anon select users"  ON users;
DROP POLICY IF EXISTS "Allow anon update users"  ON users;

CREATE POLICY "Allow anon insert users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update users" ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 2. otps ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all otps" ON otps;
CREATE POLICY "Allow anon all otps" ON otps FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 3. orders ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
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

DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;
DROP POLICY IF EXISTS "Allow anon update orders" ON orders;
DROP POLICY IF EXISTS "Allow anon select orders" ON orders;

CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select orders" ON orders FOR SELECT TO anon USING (true);

-- ── Done ─────────────────────────────────────────────────────────────────────
SELECT 'Tables ready: users, otps, orders' AS status;
