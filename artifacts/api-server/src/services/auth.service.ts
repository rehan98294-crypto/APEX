import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { sendEmail, buildOtpEmail } from "./email.js";
import {
  generateUniqueReferralCode,
  resolveIncomingReferral,
} from "./referral.service.js";

const JWT_SECRET_ENV = process.env["JWT_SECRET"];
if (!JWT_SECRET_ENV) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable must be set in production.");
  }
  console.warn("[Auth] WARNING: JWT_SECRET is not set — using insecure default. Set JWT_SECRET in production.");
}
const JWT_SECRET = JWT_SECRET_ENV ?? "treasurefun_jwt_secret_2024";
const OTP_TTL_SECONDS = 600;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function sendOtp(
  email: string,
  action: "verify" | "reset"
): Promise<{ emailDelivered: boolean; devOtp?: string }> {
  const { data: existing } = await supabase
    .from("otps")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const last = new Date(existing[0].created_at).getTime();
    const elapsed = (Date.now() - last) / 1000;
    if (elapsed < 30) {
      throw new Error("Please wait before requesting a new code.");
    }
  }

  const otp = generateOtp();
  const hashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  console.log(`[Auth] Generating OTP for ${email} (action: ${action})`);

  await supabase.from("otps").delete().eq("email", email);

  const { error } = await supabase
    .from("otps")
    .insert([{ email, code: hashed, expires_at: expiresAt, attempts: 0 }]);

  if (error) throw new Error("Failed to store OTP: " + error.message);

  console.log(`[Auth] OTP stored for ${email}, expires at ${expiresAt}`);
  console.log(`[Auth][DEV] OTP for ${email}: ${otp}`);

  const subject =
    action === "verify"
      ? "Apex – Email Verification"
      : "Apex – Password Reset";

  let emailDelivered = false;
  try {
    await sendEmail(email, subject, buildOtpEmail(otp, action));
    emailDelivered = true;
    console.log(`[Auth] OTP email dispatched to ${email}`);
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.warn(`[Auth] Email delivery failed (OTP still valid): ${msg}`);
  }

  const isDev = process.env["NODE_ENV"] !== "production";
  return {
    emailDelivered,
    devOtp: isDev && !emailDelivered ? otp : undefined,
  };
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("otps")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return false;

  const record = data[0];

  if (record.attempts >= 3) {
    await supabase.from("otps").delete().eq("email", email);
    throw new Error("Too many failed attempts. Request a new code.");
  }

  if (new Date(record.expires_at) < new Date()) {
    await supabase.from("otps").delete().eq("email", email);
    throw new Error("Code has expired. Request a new one.");
  }

  const hashed = hashOtp(code);
  if (hashed !== record.code) {
    await supabase.from("otps").update({ attempts: record.attempts + 1 }).eq("email", email);
    return false;
  }

  await supabase.from("otps").delete().eq("email", email);
  return true;
}

export async function registerUser(params: {
  username: string;
  email: string;
  phone: string;
  password: string;
  inviteCode?: string;  // parent's referral code entered by the new user
}): Promise<{ token: string; user: Record<string, unknown> }> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("An account with this email already exists.");
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", params.username)
    .limit(1);

  if (existingUser && existingUser.length > 0) {
    throw new Error("This username is already taken.");
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  // Generate a unique referral code for THIS new user
  let ownReferralCode: string | null = null;
  try {
    ownReferralCode = await generateUniqueReferralCode();
  } catch {
    // non-fatal — referral code columns may not exist yet
  }

  // Resolve the incoming referral (parent's code → assign A/B/C position)
  let referredBy: string | null = null;
  let position: string | null = null;
  if (params.inviteCode) {
    try {
      const resolved = await resolveIncomingReferral(params.inviteCode);
      if (resolved) {
        referredBy = resolved.parentId;
        position   = resolved.position;
      }
    } catch {
      // non-fatal — skip if referral columns missing
    }
  }

  const insertData: Record<string, unknown> = {
    username:      params.username,
    email:         params.email,
    phone:         params.phone,
    password_hash: passwordHash,
  };
  if (ownReferralCode) insertData["referral_code"] = ownReferralCode;
  if (referredBy)     insertData["referred_by"]    = referredBy;
  if (position)       insertData["position"]        = position;

  const { data: newUser, error } = await supabase
    .from("users")
    .insert([insertData])
    .select("id, username, email, phone, created_at")
    .single();

  if (error || !newUser) {
    throw new Error("Failed to create account: " + (error?.message ?? "unknown"));
  }

  // ── Registration gifts ───────────────────────────────────────────────────────
  // 5 USDT real balance + 150 USDT 3-day trial balance (separate, expires in 3 days)
  const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase
      .from("users")
      .update({
        balance:          5,     // real welcome gift — never removed
        trial_balance:    150,   // trial-only money — removed on expiry
        trial_expires_at: trialExpiresAt,
      })
      .eq("id", newUser.id);
    console.log(`[Auth] Registration gifts credited to user ${newUser.id} — balance=5, trial=150`);
  } catch {
    // non-fatal — columns may not exist yet in older DBs
  }

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, user: newUser };
}

export async function loginUser(params: {
  identifier: string;
  password: string;
}): Promise<
  | { token: string; user: Record<string, unknown> }
  | { requires2FA: true; tempToken: string }
> {
  const isEmail = params.identifier.includes("@");

  const query = supabase
    .from("users")
    .select("id, username, email, phone, password_hash, created_at, twofa_enabled");

  const { data, error } = isEmail
    ? await query.eq("email", params.identifier).limit(1)
    : await query.eq("username", params.identifier).limit(1);

  if (error || !data || data.length === 0) {
    throw new Error("Invalid credentials.");
  }

  const user = data[0];
  const match = await bcrypt.compare(params.password, user.password_hash);
  if (!match) throw new Error("Invalid credentials.");

  if (user.twofa_enabled) {
    const tempToken = jwt.sign(
      { id: user.id, email: user.email, purpose: "2fa" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );
    return { requires2FA: true, tempToken };
  }

  const { password_hash: _, twofa_enabled: __, ...safeUser } = user;

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, user: safeUser };
}

export async function completeTwoFALogin(tempToken: string): Promise<{
  token: string;
  user: Record<string, unknown>;
}> {
  let payload: { id: string; email: string; purpose: string };
  try {
    payload = jwt.verify(tempToken, JWT_SECRET) as typeof payload;
  } catch {
    throw new Error("Session expired. Please log in again.");
  }
  if (payload.purpose !== "2fa") throw new Error("Invalid token.");

  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, phone, created_at")
    .eq("id", payload.id)
    .single();

  if (error || !data) throw new Error("User not found.");

  const token = jwt.sign({ id: data.id, email: data.email }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, user: data };
}

export async function resetPassword(params: {
  email: string;
  newPassword: string;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(params.newPassword, 10);

  const { error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("email", params.email);

  if (error) throw new Error("Failed to reset password: " + error.message);
}

export function verifyToken(token: string): { id: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
}
