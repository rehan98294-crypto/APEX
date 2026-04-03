import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

// ─── POST /api/stake/start ────────────────────────────────────────────────────
// Body: { user_id, amount }
// Inserts a new stake row with status="active" and profit=0
router.post("/stake/start", async (req, res) => {
  try {
    const body = req.body ?? {};

    // Accept both snake_case and camelCase from the client
    const user_id: string = String(body.user_id ?? body.userId ?? "").trim();
    const amount: number = parseFloat(String(body.amount ?? 0));

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required." });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number." });
    }

    const start_time = new Date().toISOString();

    const { data, error } = await supabase
      .from("stakes")
      .insert([
        {
          user_id,
          amount,
          status: "active",
          start_time,
          profit: 0,
        },
      ])
      .select("id, user_id, amount, status, start_time, profit")
      .single();

    if (error || !data) {
      console.error("[Stake] Insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to create stake." });
    }

    console.log(`[Stake] Created stake ${data.id} for user=${user_id} amount=${amount}`);
    return res.json({ success: true, stake: data });
  } catch (err: any) {
    console.error("[Stake] POST /stake/start error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stake/user?userId=xxx ──────────────────────────────────────────
// Returns all stakes for a user, sorted newest first
// Adds computed field: currentProfit (grows over time for active stakes)
router.get("/stake/user", async (req, res) => {
  try {
    const user_id = String(req.query.userId ?? req.query.user_id ?? "").trim();
    if (!user_id) {
      return res.status(400).json({ error: "userId is required." });
    }

    const { data, error } = await supabase
      .from("stakes")
      .select("id, user_id, amount, status, start_time, profit")
      .eq("user_id", user_id)
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

    console.log(`[Stake] GET user=${user_id} — active=${active.length} completed=${completed.length}`);

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
