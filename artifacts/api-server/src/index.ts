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

// ── DB Migration: add 2FA columns if missing ──────────────────────────────────
async function runMigration() {
  const MIGRATION_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT false;
  `.trim();

  try {
    const { error } = await supabase.from("users").select("twofa_enabled").limit(1);
    if (!error) {
      console.log("[Migration] ✓ 2FA columns present.");
      return;
    }
    if (!error.message.includes("twofa_enabled")) {
      console.warn("[Migration] Unexpected error:", error.message);
      return;
    }
  } catch {
    // ignore
  }

  console.log("─── DB Migration Required ───────────────────────");
  console.log("[Migration] ⚠️  twofa columns missing from users table.");
  console.log("[Migration] Run this SQL in your Supabase SQL Editor:");
  console.log("");
  console.log(MIGRATION_SQL);
  console.log("");
  console.log("────────────────────────────────────────────────");
}

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await runMigration();
});
