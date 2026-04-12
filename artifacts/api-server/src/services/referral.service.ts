import supabase from "../lib/supabase.js";

// ── App URL helper ────────────────────────────────────────────────────────────
const DEV_DOMAIN = process.env["REPLIT_DEV_DOMAIN"] ?? "";
const APP_URL = DEV_DOMAIN
  ? `https://${DEV_DOMAIN}`
  : "https://app.apexmeta.io";

// ── Referral code generation ──────────────────────────────────────────────────
// Charset: digits 0-9 + uppercase A-Z, excluding I and O (visually ambiguous)
const CODE_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LEN = 6;

export function generateCodeCandidate(): string {
  let result = "";
  for (let i = 0; i < CODE_LEN; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCodeCandidate();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code)
      .limit(1);
    if (!data || data.length === 0) return code;
  }
  // Fallback: 8-char code
  let fallback = "";
  for (let i = 0; i < 8; i++) fallback += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return fallback;
}

// ── A/B/C position assignment ─────────────────────────────────────────────────
type Position = "A" | "B" | "C";

async function assignNextPosition(parentId: string): Promise<Position | null> {
  const { data } = await supabase
    .from("users")
    .select("position")
    .eq("referred_by", parentId)
    .not("position", "is", null);

  const used = new Set((data ?? []).map((r: any) => r.position as string));
  const order: Position[] = ["A", "B", "C"];
  return order.find((p) => !used.has(p)) ?? null;
}

/**
 * Given an incoming referral code, look up the parent user and assign a position.
 * Returns null if the code is invalid or all 3 slots are taken.
 */
export async function resolveIncomingReferral(
  referralCode: string
): Promise<{ parentId: string; position: Position } | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("referral_code", referralCode.toUpperCase().trim())
    .limit(1)
    .single();

  if (!data) return null;

  const parentId = data.id as string;
  const position = await assignNextPosition(parentId);
  if (!position) return null; // all 3 slots full

  return { parentId, position };
}

// ── Get referral info for a user ──────────────────────────────────────────────
export async function getUserReferralInfo(userId: string): Promise<{
  referralCode: string;
  referralLink: string;
  position: string | null;
  referredByUserId: string | null;
}> {
  const { data, error } = await supabase
    .from("users")
    .select("referral_code, position, referred_by")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("User not found.");

  let code = (data as any).referral_code as string | null;

  // Auto-generate and persist a code for existing users who don't have one
  if (!code) {
    code = await generateUniqueReferralCode();
    await supabase
      .from("users")
      .update({ referral_code: code })
      .eq("id", userId);
  }

  return {
    referralCode:     code,
    referralLink:     `${APP_URL}/auth/register?ref=${code}`,
    position:         (data as any).position ?? null,
    referredByUserId: (data as any).referred_by ?? null,
  };
}

// ── Tree stats ────────────────────────────────────────────────────────────────
export type DateFilter = "all" | "today" | "week";

function dateFilterSince(filter: DateFilter): string | null {
  const now = new Date();
  if (filter === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (filter === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return null;
}

export interface TreeStats {
  totalMembers: number;
  validMembers: number;
  A: { total: number; valid: number };
  B: { total: number; valid: number };
  C: { total: number; valid: number };
}

export async function getTreeStats(
  userId: string,
  filter: DateFilter = "all"
): Promise<TreeStats> {
  let query = supabase
    .from("users")
    .select("position, has_deposited")
    .eq("referred_by", userId);

  const since = dateFilterSince(filter);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;

  const empty: TreeStats = {
    totalMembers: 0, validMembers: 0,
    A: { total: 0, valid: 0 },
    B: { total: 0, valid: 0 },
    C: { total: 0, valid: 0 },
  };

  if (error) return empty; // graceful if columns missing

  const rows = (data ?? []) as Array<{ position: string | null; has_deposited: boolean }>;

  const stats: TreeStats = { ...empty };
  stats.totalMembers = rows.length;
  stats.validMembers = rows.filter((r) => r.has_deposited).length;

  for (const row of rows) {
    const pos = row.position as Position | null;
    if (!pos || !["A", "B", "C"].includes(pos)) continue;
    stats[pos].total++;
    if (row.has_deposited) stats[pos].valid++;
  }

  return stats;
}

// ── Record deposit and activate user ─────────────────────────────────────────
export async function recordDeposit(
  userId: string,
  amount: number,
  status: "pending" | "success" = "pending"
): Promise<void> {
  const { error: insertErr } = await supabase.from("deposits").insert([{
    user_id: userId,
    amount,
    status,
  }]);

  if (insertErr) console.warn("[Deposit] insert error:", insertErr.message);

  if (status === "success") {
    await supabase
      .from("users")
      .update({ has_deposited: true })
      .eq("id", userId);
  }
}
