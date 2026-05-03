import { Router, Request, Response, NextFunction } from "express";
import supabase from "../lib/supabase.js";

const router = Router();

const ADMIN_SECRET_ENV = process.env["ADMIN_SECRET"];
if (!ADMIN_SECRET_ENV) {
  console.warn("[Admin] WARNING: ADMIN_SECRET is not set — using insecure default 'apex-admin-2025'. Set ADMIN_SECRET env var.");
}
const ADMIN_SECRET = ADMIN_SECRET_ENV ?? "apex-admin-2025";

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const secret = auth?.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-admin-secret"] as string);
  if (!secret || secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Admin access denied." });
    return;
  }
  next();
}

function getIp(req: Request): string {
  return String(
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  ).split(",")[0].trim();
}

async function logAction(action: string, targetId: string, note: string, ip: string) {
  await supabase.from("admin_action_log").insert({ action, target_id: targetId, target_type: "withdrawal", note, ip_address: ip });
}

// GET /api/admin/withdrawals?status=pending|approved|rejected|all
router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  const status = (req.query["status"] as string) || "all";
  try {
    let query = supabase
      .from("withdrawals")
      .select("id, user_id, amount, wallet_address, network, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: withdrawals, error } = await query;
    if (error) {
      console.error("[Admin] Supabase withdrawals error:", JSON.stringify(error));
      throw error;
    }

    if (!withdrawals || withdrawals.length === 0) {
      return res.json({ withdrawals: [] });
    }

    // Fetch user info separately and merge
    const userIds = [...new Set(withdrawals.map((w: any) => w.user_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email")
      .in("id", userIds);

    const userMap: Record<string, { username: string; email: string }> = {};
    for (const u of (users ?? [])) {
      userMap[u.id] = { username: u.username, email: u.email };
    }

    const FEE_RATE = 0.05;
    const enriched = withdrawals.map((w: any) => {
      const fee = parseFloat((parseFloat(w.amount) * FEE_RATE).toFixed(2));
      return {
        ...w,
        fee,
        users: userMap[w.user_id] ?? { username: "Unknown", email: "" },
      };
    });

    return res.json({ withdrawals: enriched });
  } catch (err) {
    console.error("[Admin] list withdrawals error:", err);
    return res.status(500).json({ error: "Failed to load withdrawals." });
  }
});

// POST /api/admin/withdrawals/:id/approve
router.post("/admin/withdrawals/:id/approve", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const ip = getIp(req);

  try {
    const { data: w, error: fetchErr } = await supabase
      .from("withdrawals")
      .select("id, status, user_id, amount")
      .eq("id", id)
      .single();

    if (fetchErr || !w) return res.status(404).json({ error: "Withdrawal not found." });
    if (w.status !== "pending") return res.status(400).json({ error: `Already ${w.status}.` });

    const { error: updErr } = await supabase
      .from("withdrawals")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) throw updErr;

    await logAction("approve_withdrawal", id, `Approved $${w.amount} for user ${w.user_id}`, ip);

    return res.json({ success: true, status: "approved" });
  } catch (err) {
    console.error("[Admin] approve error:", err);
    return res.status(500).json({ error: "Failed to approve." });
  }
});

// POST /api/admin/withdrawals/:id/reject
router.post("/admin/withdrawals/:id/reject", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const ip = getIp(req);

  try {
    const { data: w, error: fetchErr } = await supabase
      .from("withdrawals")
      .select("id, status, user_id, amount")
      .eq("id", id)
      .single();

    if (fetchErr || !w) return res.status(404).json({ error: "Withdrawal not found." });
    if (w.status !== "pending") return res.status(400).json({ error: `Already ${w.status}.` });

    // Update status to rejected
    const { error: updErr } = await supabase
      .from("withdrawals")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) throw updErr;

    // Refund user balance
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", w.user_id)
      .single();

    const currentBalance = parseFloat(String(user?.balance ?? 0));
    await supabase
      .from("users")
      .update({ balance: parseFloat((currentBalance + w.amount).toFixed(2)) })
      .eq("id", w.user_id);

    await logAction(
      "reject_withdrawal",
      id,
      `Rejected $${w.amount} for user ${w.user_id}. Reason: ${reason ?? "none"}`,
      ip
    );

    return res.json({ success: true, status: "rejected", refunded: w.amount });
  } catch (err) {
    console.error("[Admin] reject error:", err);
    return res.status(500).json({ error: "Failed to reject." });
  }
});

// GET /api/admin/action-log
router.get("/admin/action-log", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("admin_action_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return res.json({ logs: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load logs." });
  }
});

// GET /api/admin/stats — withdrawals + user counts + balance totals
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [
      { data: pending },
      { data: approved },
      { data: rejected },
      { data: users },
      { data: deposits },
    ] = await Promise.all([
      supabase.from("withdrawals").select("id, amount").eq("status", "pending"),
      supabase.from("withdrawals").select("id, amount").eq("status", "approved"),
      supabase.from("withdrawals").select("id, amount").eq("status", "rejected"),
      supabase.from("users").select("id, balance, has_deposited, created_at"),
      supabase.from("deposits").select("amount").in("status", ["success", "confirmed"]),
    ]);

    const sum = (arr: any[]) => arr?.reduce((s: number, r: any) => s + parseFloat(String(r.amount)), 0) ?? 0;

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      withdrawals: {
        pending:  { count: pending?.length ?? 0,  total: parseFloat(sum(pending ?? []).toFixed(2)) },
        approved: { count: approved?.length ?? 0, total: parseFloat(sum(approved ?? []).toFixed(2)) },
        rejected: { count: rejected?.length ?? 0, total: parseFloat(sum(rejected ?? []).toFixed(2)) },
      },
      users: {
        total:        users?.length ?? 0,
        active:       users?.filter((u: any) => u.has_deposited).length ?? 0,
        new_30d:      users?.filter((u: any) => u.created_at >= last30).length ?? 0,
        total_balance: parseFloat(((users ?? []).reduce((s: number, u: any) => s + parseFloat(String(u.balance ?? 0)), 0)).toFixed(2)),
      },
      deposits: {
        total: parseFloat(sum(deposits ?? []).toFixed(2)),
        count: deposits?.length ?? 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load stats." });
  }
});

// GET /api/admin/users?page=1&limit=50&search=
router.get("/admin/users", requireAdmin, async (req, res) => {
  const page  = Math.max(1, parseInt(String(req.query["page"]  ?? "1")));
  const limit = Math.min(100, parseInt(String(req.query["limit"] ?? "50")));
  const search = (req.query["search"] as string ?? "").trim();
  const from   = (page - 1) * limit;

  try {
    let query = supabase
      .from("users")
      .select("id, username, email, balance, has_deposited, referral_code, created_at, twofa_enabled", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ users: data ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load users." });
  }
});

// GET /api/admin/users/:id — single user detail
router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, balance, has_deposited, referral_code, referred_by, created_at, twofa_enabled")
      .eq("id", id)
      .single();
    if (error || !user) return res.status(404).json({ error: "User not found." });

    const { data: deposits } = await supabase.from("deposits").select("amount, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
    const { data: withdrawals } = await supabase.from("withdrawals").select("amount, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10);

    return res.json({ user, deposits: deposits ?? [], withdrawals: withdrawals ?? [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load user." });
  }
});

// PUT /api/admin/users/:id — edit balance or other fields
router.put("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const ip = getIp(req);
  const { balance, username, email } = req.body as { balance?: number; username?: string; email?: string };

  const updates: Record<string, any> = {};
  if (typeof balance === "number" && balance >= 0) updates["balance"] = parseFloat(balance.toFixed(2));
  if (username?.trim()) updates["username"] = username.trim();
  if (email?.trim())    updates["email"]    = email.trim().toLowerCase();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  try {
    const { error } = await supabase.from("users").update(updates).eq("id", id);
    if (error) throw error;
    await logAction("edit_user", id, `Updated fields: ${JSON.stringify(updates)}`, ip);
    return res.json({ success: true, updated: updates });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update user." });
  }
});

// DELETE /api/admin/users/:id
router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const ip = getIp(req);
  try {
    const { data: user } = await supabase.from("users").select("username, email").eq("id", id).single();
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
    await logAction("delete_user", id, `Deleted user ${user?.username ?? ""} (${user?.email ?? ""})`, ip);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete user." });
  }
});

// POST /api/admin/users/:id/adjust-balance
router.post("/admin/users/:id/adjust-balance", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const ip = getIp(req);
  const { delta, note } = req.body as { delta: number; note?: string };

  if (typeof delta !== "number") return res.status(400).json({ error: "delta required." });

  try {
    const { data: user } = await supabase.from("users").select("balance").eq("id", id).single();
    if (!user) return res.status(404).json({ error: "User not found." });

    const newBalance = Math.max(0, parseFloat((parseFloat(String(user.balance)) + delta).toFixed(2)));
    await supabase.from("users").update({ balance: newBalance }).eq("id", id);
    await logAction("adjust_balance", id, `${delta >= 0 ? "+" : ""}${delta} USDT — ${note ?? "no note"}. New: ${newBalance}`, ip);

    return res.json({ success: true, new_balance: newBalance });
  } catch (err) {
    return res.status(500).json({ error: "Failed to adjust balance." });
  }
});

// POST /api/admin/test-withdrawal — insert a fake pending withdrawal for UI testing
router.post("/admin/test-withdrawal", requireAdmin, async (req, res) => {
  const ip = getIp(req);
  const NETWORKS = ["TRC20", "BEP20", "ERC20", "SOL"];

  try {
    // Resolve user_id: use body value or fall back to any existing user
    let userId: string | null = req.body?.user_id ?? null;

    if (!userId) {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .single();
      userId = (users as any)?.id ?? null;
    }

    if (!userId) {
      return res.status(400).json({ error: "No user found in the database. Create a user first or pass user_id in the body." });
    }

    const amount   = parseFloat((Math.random() * 190 + 10).toFixed(2)); // 10–200
    const network  = NETWORKS[Math.floor(Math.random() * NETWORKS.length)];
    const address  = `TTestAddress${Math.floor(Math.random() * 900000 + 100000)}`;

    const { data: row, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id:        userId,
        amount,
        network,
        wallet_address: address,
        status:         "pending",
        created_at:     new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    await logAction("test_withdrawal", userId, `Test withdrawal inserted: ${amount} USDT via ${network}`, ip);

    console.log(`[Admin] Test withdrawal created — user=${userId} amount=${amount} network=${network}`);
    return res.json({ success: true, withdrawal_id: (row as any).id, amount, network, wallet_address: address, user_id: userId });
  } catch (err: any) {
    console.error("[Admin] test-withdrawal error:", err);
    return res.status(500).json({ error: "Failed to insert test withdrawal.", detail: err?.message });
  }
});

export default router;
