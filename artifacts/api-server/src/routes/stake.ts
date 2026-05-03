import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";
import supabase from "../lib/supabase.js";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  try {
    const payload = verifyToken(auth.slice(7));
    (req as any).userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

// ─── POST /api/stake/start ────────────────────────────────────────────────────
// User ID is taken from JWT token — client must NOT supply user_id
router.post("/stake/start", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const body = req.body ?? {};
    const amount: number = parseFloat(String(body.amount ?? 0));

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number." });
    }

    const start_time = new Date().toISOString();

    const { data, error } = await supabase
      .from("stakes")
      .insert([{ user_id: userId, amount, status: "active", start_time, profit: 0 }])
      .select("id, user_id, amount, status, start_time, profit")
      .single();

    if (error || !data) {
      console.error("[Stake] Insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to create stake." });
    }

    console.log(`[Stake] Created stake ${data.id} for user=${userId} amount=${amount}`);
    return res.json({ success: true, stake: data });
  } catch (err: any) {
    console.error("[Stake] POST /stake/start error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stake/user ──────────────────────────────────────────────────────
// User ID is taken from JWT token — no query param needed
router.get("/stake/user", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { data, error } = await supabase
      .from("stakes")
      .select("id, user_id, amount, status, start_time, profit")
      .eq("user_id", userId)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("[Stake] Fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const stakes = (data ?? []).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      amount: parseFloat(String(s.amount)),
      status: s.status,
      start_time: s.start_time,
      profit: parseFloat(String(s.profit ?? 0)),
    }));

    const active = stakes.filter((s) => s.status === "active");
    const completed = stakes.filter((s) => s.status === "completed");

    console.log(`[Stake] GET user=${userId} — active=${active.length} completed=${completed.length}`);

    return res.json({
      stakes,
      active,
      completed,
      totalStaked: active.reduce((sum, s) => sum + s.amount, 0),
      totalProfit: stakes.reduce((sum, s) => sum + s.profit, 0),
    });
  } catch (err: any) {
    console.error("[Stake] GET /stake/user error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
