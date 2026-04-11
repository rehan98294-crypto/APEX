import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import supabase from "../lib/supabase.js";

// ── Rate limiter (in-memory, per userId) ─────────────────────────────────────
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

// ── Verify TOTP (±1 window tolerance) ────────────────────────────────────────
function verifyToken(token: string, secret: string): boolean {
  return verifySync({ secret, token, strategy: "totp", epochTolerance: 1 });
}

// ── Get 2FA status ────────────────────────────────────────────────────────────
export async function get2FAStatus(userId: string): Promise<{ enabled: boolean }> {
  const { data, error } = await supabase
    .from("users")
    .select("twofa_enabled")
    .eq("id", userId)
    .single();
  if (error) throw new Error("Failed to fetch 2FA status.");
  return { enabled: Boolean(data?.twofa_enabled) };
}

// ── Setup: generate secret + QR code ─────────────────────────────────────────
export async function setup2FA(userId: string, email: string): Promise<{
  qrDataUri: string;
  manualKey: string;
}> {
  const { data, error } = await supabase
    .from("users")
    .select("twofa_enabled")
    .eq("id", userId)
    .single();

  if (error) throw new Error("User not found.");
  if (data?.twofa_enabled) throw new Error("2FA is already enabled.");

  const secret = generateSecret({ length: 20 });

  const otpauthUrl = generateURI({
    issuer:   "Apex",
    label:    email,
    secret,
    strategy: "totp",
  });

  await supabase.from("users").update({ twofa_secret: secret }).eq("id", userId);

  const qrDataUri = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    width: 240,
    margin: 2,
  });

  const formatted = (secret.match(/.{1,4}/g) ?? []).join(" ");

  return { qrDataUri, manualKey: formatted };
}

// ── Enable 2FA after successful verification ──────────────────────────────────
export async function enable2FA(userId: string, token: string): Promise<void> {
  checkRateLimit(userId);

  const { data, error } = await supabase
    .from("users")
    .select("twofa_secret, twofa_enabled")
    .eq("id", userId)
    .single();

  if (error || !data?.twofa_secret) throw new Error("Setup 2FA first.");
  if (data.twofa_enabled) throw new Error("2FA is already enabled.");

  const isValid = verifyToken(token, data.twofa_secret);
  if (!isValid) throw new Error("Invalid code. Try again.");

  await supabase.from("users").update({ twofa_enabled: true }).eq("id", userId);

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

  if (error || !data) throw new Error("User not found.");
  if (!data.twofa_enabled) throw new Error("2FA is not enabled.");
  if (!data.twofa_secret) throw new Error("2FA misconfigured.");

  const isValid = verifyToken(token, data.twofa_secret);
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

  const { data, error } = await supabase
    .from("users")
    .select("password_hash, twofa_secret, twofa_enabled")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("User not found.");
  if (!data.twofa_enabled) throw new Error("2FA is not enabled.");

  const passwordOk = await bcrypt.compare(password, data.password_hash);
  if (!passwordOk) throw new Error("Incorrect password.");

  const codeOk = verifyToken(token, data.twofa_secret);
  if (!codeOk) throw new Error("Invalid authenticator code.");

  await supabase
    .from("users")
    .update({ twofa_enabled: false, twofa_secret: null })
    .eq("id", userId);

  resetRateLimit(userId);
}
