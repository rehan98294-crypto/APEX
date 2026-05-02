import app from "./app";
import supabase from "./lib/supabase.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── SMTP diagnostics ──────────────────────────────────────────────────────────
const smtpUser = process.env["SMTP_USER"] ?? "";
const smtpPass = process.env["SMTP_PASS"] ?? "";
const smtpHost = process.env["SMTP_HOST"] ?? "smtp.gmail.com";
const smtpPort = process.env["SMTP_PORT"] ?? "587";

console.log("─── SMTP Config ────────────────────────────────");
console.log(`  Host : ${smtpHost}`);
console.log(`  Port : ${smtpPort}`);
console.log(`  User : ${smtpUser ? `${smtpUser.slice(0, 4)}****` : "NOT SET ⚠️"}`);
console.log(`  Pass : ${smtpPass ? "SET (hidden)" : "NOT SET ⚠️"}`);
console.log("────────────────────────────────────────────────");

// ── DB Migration check ────────────────────────────────────────────────────────
interface MigrationCheck {
  column: string;
  table: string;
  fullSql: string;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function runMigration() {
  const checks: MigrationCheck[] = [
    {
      column: "twofa_enabled", table: "users",
      fullSql: [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_secret TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT false;",
      ].join("\n"),
    },
    {
      column: "referral_code", table: "users",
      fullSql: [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS position CHAR(1);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS has_deposited BOOLEAN NOT NULL DEFAULT false;",
        "-- Update existing users with a referral code:",
        "UPDATE users SET referral_code = 'APX' || UPPER(SUBSTRING(MD5(id::TEXT), 1, 5)) WHERE referral_code IS NULL;",
        "-- Deposits table:",
        "CREATE TABLE IF NOT EXISTS deposits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), amount DECIMAL(18,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now());",
        "-- Indexes:",
        "CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);",
        "CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);",
        "CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);",
      ].join("\n"),
    },
    {
      column: "payment_id", table: "deposits",
      fullSql: [
        "-- NOWPayments deposit columns:",
        "ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);",
        "ALTER TABLE deposits ADD COLUMN IF NOT EXISTS pay_address TEXT;",
        "ALTER TABLE deposits ADD COLUMN IF NOT EXISTS network VARCHAR(20);",
        "ALTER TABLE deposits ADD COLUMN IF NOT EXISTS pay_amount DECIMAL(18,8);",
        "ALTER TABLE deposits ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'USDT';",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_payment_id ON deposits(payment_id) WHERE payment_id IS NOT NULL;",
      ].join("\n"),
    },
    {
      column: "balance", table: "users",
      fullSql: [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(18,2) NOT NULL DEFAULT 0;",
      ].join("\n"),
    },
    {
      column: "id", table: "reserve_profits",
      fullSql: [
        "CREATE TABLE IF NOT EXISTS reserve_profits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), profit DECIMAL(18,4) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());",
        "CREATE INDEX IF NOT EXISTS idx_reserve_profits_user_id ON reserve_profits(user_id);",
        "CREATE TABLE IF NOT EXISTS team_rewards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), from_user_id UUID NOT NULL REFERENCES users(id), profit DECIMAL(18,4) NOT NULL, line CHAR(1) NOT NULL, reward DECIMAL(18,4) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());",
        "CREATE INDEX IF NOT EXISTS idx_team_rewards_user_id ON team_rewards(user_id);",
      ].join("\n"),
    },
    {
      column: "wallet_address", table: "withdrawals",
      fullSql: [
        "CREATE TABLE IF NOT EXISTS withdrawals (",
        "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  user_id UUID NOT NULL REFERENCES users(id),",
        "  amount DECIMAL(18,2) NOT NULL,",
        "  fee DECIMAL(18,2) NOT NULL DEFAULT 0,",
        "  wallet_address TEXT NOT NULL,",
        "  network VARCHAR(20) NOT NULL DEFAULT 'TRC20',",
        "  status VARCHAR(20) NOT NULL DEFAULT 'pending',",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),",
        "  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
        ");",
        "CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);",
        "CREATE TABLE IF NOT EXISTS admin_action_log (",
        "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  action VARCHAR(50) NOT NULL,",
        "  target_id UUID,",
        "  target_type VARCHAR(50),",
        "  note TEXT,",
        "  ip_address TEXT,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
        ");",
      ].join("\n"),
    },
  ];

  let anyMissing = false;

  for (const chk of checks) {
    const ok = await columnExists(chk.table, chk.column);
    if (ok) {
      console.log(`[Migration] ✓ ${chk.table}.${chk.column} present.`);
    } else {
      anyMissing = true;
      console.log("─── DB Migration Required ───────────────────────");
      console.log(`[Migration] ⚠️  Column "${chk.column}" missing from "${chk.table}".`);
      console.log("[Migration] Run this SQL in your Supabase SQL Editor:\n");
      console.log(chk.fullSql);
      console.log("\n────────────────────────────────────────────────");
    }
  }

  if (!anyMissing) {
    console.log("[Migration] ✓ All DB columns up to date.");
  }
}

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await runMigration();
});
