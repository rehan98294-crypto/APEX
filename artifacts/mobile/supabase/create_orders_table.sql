-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- Dashboard → SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS orders (
  order_id    TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'anonymous',
  nft_id      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('processing', 'bought', 'sold')),
  profit      NUMERIC(18, 4) NOT NULL DEFAULT 0,
  price       NUMERIC(18, 4) NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow anonymous reads and writes (open RLS for now)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update"
  ON orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon select"
  ON orders FOR SELECT
  TO anon
  USING (true);
