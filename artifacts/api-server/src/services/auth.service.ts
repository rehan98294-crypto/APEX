import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { sendEmail, buildOtpEmail } from "./email.js";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "treasurefun_jwt_secret_2024";
const OTP_TTL_SECONDS = 120;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function sendOtp(email: string, action: "verify" | "reset"): Promise<boolean> {
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
  // Always log OTP in dev so it can be used even without email
  console.log(`[Auth][DEV] OTP for ${email}: ${otp}`);

  const subject =
    action === "verify"
      ? "TreasureFun – Email Verification"
      : "TreasureFun – Password Reset";

  let emailDelivered = false;
  try {
    await sendEmail(email, subject, buildOtpEmail(otp, action));
    emailDelivered = true;
    console.log(`[Auth] OTP email dispatched to ${email}`);
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.warn(`[Auth] Email delivery failed (OTP still valid): ${msg}`);
    console.warn(`[Auth] Use the OTP logged above to test without email.`);
  }

  return emailDelivered;
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
  referralCode?: string;
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

  const { data: newUser, error } = await supabase
    .from("users")
    .insert([
      {
        username: params.username,
        email: params.email,
        phone: params.phone,
        password_hash: passwordHash,
        referral_code: params.referralCode ?? null,
      },
    ])
    .select("id, username, email, phone, created_at")
    .single();

  if (error || !newUser) {
    throw new Error("Failed to create account: " + (error?.message ?? "unknown"));
  }

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, user: newUser };
}

export async function loginUser(params: {
  identifier: string;
  password: string;
}): Promise<{ token: string; user: Record<string, unknown> }> {
  const isEmail = params.identifier.includes("@");

  const query = supabase
    .from("users")
    .select("id, username, email, phone, password_hash, created_at");

  const { data, error } = isEmail
    ? await query.eq("email", params.identifier).limit(1)
    : await query.eq("username", params.identifier).limit(1);

  if (error || !data || data.length === 0) {
    throw new Error("Invalid credentials.");
  }

  const user = data[0];
  const match = await bcrypt.compare(params.password, user.password_hash);
  if (!match) throw new Error("Invalid credentials.");

  const { password_hash: _, ...safeUser } = user;

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return { token, user: safeUser };
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
