import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import supabase from "../lib/supabase.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Supabase/PostgREST error code for "column does not exist" */
function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  return (
    e["code"] === "42703" ||
    String(e["message"] ?? "").includes("does not exist") ||
    String(e["details"] ?? "").includes("does not exist")
  );
}

const MIGRATION_MSG =
  "2FA database columns are missing. Please run this SQL in your Supabase SQL Editor:\n\n" +
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_secret TEXT;\n" +
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT false;";

// ── Rate limiter ──────────────────────────────────────────────────────────────

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const rec = attempts.get(userId);
  if (!rec || now > rec.resetAt) {
    attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (rec.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((rec.resetAt - now) / 1000);
    throw new Error(`Too many attempts. Try again in ${wait}s.`);
  }
  rec.count++;
}

function resetRateLimit(userId: string): void {
  attempts.delete(userId);
}

// ── TOTP verify ───────────────────────────────────────────────────────────────

function totpVerify(token: string, secret: string): boolean {
  return verifySync({ secret, token, strategy: "totp", epochTolerance: 1 });
}

// ── Ensure user exists (uses columns that always exist) ───────────────────────

async function assertUserExists(userId: string): Promise<{ id: string; email: string }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("User not found. Please log in again.");
  return data as { id: string; email: string };
}

// ── Get 2FA status ────────────────────────────────────────────────────────────

export async function get2FAStatus(userId: string): Promise<{ enabled: boolean }> {
  await assertUserExists(userId);

  const { data, error } = await supabase
    .from("users")
    .select("twofa_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    if (isMissingColumnError(error)) return { enabled: false }; // columns not yet created → treat as not enabled
    throw new Error("Failed to fetch 2FA status.");
  }
  return { enabled: Boolean(data?.twofa_enabled) };
}

// ── Setup: generate secret + QR code ─────────────────────────────────────────

export async function setup2FA(
  userId: string,
  email: string
): Promise<{ qrDataUri: string; manualKey: string }> {
  const userRow = await assertUserExists(userId);
  const userEmail = email || userRow.email;

  // Check if 2FA columns exist and if already enabled
  const { data: row, error: fetchErr } = await supabase
    .from("users")
    .select("twofa_enabled")
    .eq("id", userId)
    .single();

  if (fetchErr) {
    if (isMissingColumnError(fetchErr)) {
      throw new Error(MIGRATION_MSG);
    }
    throw new Error("Failed to check 2FA status.");
  }

  if (row?.twofa_enabled) throw new Error("2FA is already enabled on your account.");

  // Generate TOTP secret
  const secret = generateSecret({ length: 20 });

  const otpauthUrl = generateURI({
    issuer:   "Apex",
    label:    userEmail,
    secret,
    strategy: "totp",
  });

  // Save secret (column must exist at this point)
  const { error: updateErr } = await supabase
    .from("users")
    .update({ twofa_secret: secret })
    .eq("id", userId);

  if (updateErr) {
    if (isMissingColumnError(updateErr)) throw new Error(MIGRATION_MSG);
    throw new Error("Failed to save 2FA secret.");
  }

  // Generate QR code
  const qrDataUri = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    width: 240,
    margin: 2,
  });

  // Format secret key with spaces every 4 chars for readability
  const manualKey = (secret.match(/.{1,4}/g) ?? []).join(" ");

  return { qrDataUri, manualKey };
}

// ── Enable 2FA after verification ─────────────────────────────────────────────

export async function enable2FA(userId: string, token: string): Promise<void> {
  checkRateLimit(userId);
  await assertUserExists(userId);

  const { data, error } = await supabase
    .from("users")
    .select("twofa_secret, twofa_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    if (isMissingColumnError(error)) throw new Error(MIGRATION_MSG);
    throw new Error("Failed to fetch 2FA data.");
  }

  if (!data?.twofa_secret) throw new Error("Please complete setup first — generate your QR code.");
  if (data.twofa_enabled) throw new Error("2FA is already enabled.");

  const isValid = totpVerify(token, data.twofa_secret);
  if (!isValid) throw new Error("Invalid code. Try again — codes refresh every 30 seconds.");

  const { error: updateErr } = await supabase
    .from("users")
    .update({ twofa_enabled: true })
    .eq("id", userId);

  if (updateErr) throw new Error("Failed to activate 2FA.");

  resetRateLimit(userId);
}

// ── Verify during login ───────────────────────────────────────────────────────

export async function verify2FA(userId: string, token: string): Promise<void> {
  checkRateLimit(userId);

  const { data, error } = await supabase
    .from("users")
    .select("twofa_secret, twofa_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    if (isMissingColumnError(error)) throw new Error("2FA is not configured.");
    throw new Error("User not found.");
  }

  if (!data) throw new Error("User not found.");
  if (!data.twofa_enabled) throw new Error("2FA is not enabled.");
  if (!data.twofa_secret) throw new Error("2FA is not configured.");

  const isValid = totpVerify(token, data.twofa_secret);
  if (!isValid) throw new Error("Invalid code. Please try again.");

  resetRateLimit(userId);
}

// ── Disable 2FA ───────────────────────────────────────────────────────────────

export async function disable2FA(
  userId: string,
  password: string,
  token: string
): Promise<void> {
  checkRateLimit(userId);
  await assertUserExists(userId);

  const { data, error } = await supabase
    .from("users")
    .select("password_hash, twofa_secret, twofa_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    if (isMissingColumnError(error)) throw new Error("2FA is not set up.");
    throw new Error("Failed to fetch account data.");
  }

  if (!data) throw new Error("User not found.");
  if (!data.twofa_enabled) throw new Error("2FA is not currently enabled.");

  const passwordOk = await bcrypt.compare(password, data.password_hash);
  if (!passwordOk) throw new Error("Incorrect password.");

  const codeOk = totpVerify(token, data.twofa_secret);
  if (!codeOk) throw new Error("Invalid authenticator code.");

  await supabase
    .from("users")
    .update({ twofa_enabled: false, twofa_secret: null })
    .eq("id", userId);

  resetRateLimit(userId);
}
