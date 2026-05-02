import { Router, Request, Response, NextFunction } from "express";
import supabase from "../lib/supabase.js";

const router = Router();

const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "apex-admin-2025";

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

// GET /api/admin/stats
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const { data: pending } = await supabase.from("withdrawals").select("id, amount").eq("status", "pending");
    const { data: approved } = await supabase.from("withdrawals").select("id, amount").eq("status", "approved");
    const { data: rejected } = await supabase.from("withdrawals").select("id, amount").eq("status", "rejected");

    const sum = (arr: any[]) => arr?.reduce((s, r) => s + parseFloat(String(r.amount)), 0) ?? 0;

    return res.json({
      pending:  { count: pending?.length ?? 0,  total: parseFloat(sum(pending ?? []).toFixed(2)) },
      approved: { count: approved?.length ?? 0, total: parseFloat(sum(approved ?? []).toFixed(2)) },
      rejected: { count: rejected?.length ?? 0, total: parseFloat(sum(rejected ?? []).toFixed(2)) },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load stats." });
  }
});

export default router;
