import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

// ─── POST /api/stake/start ────────────────────────────────────────────────────
router.post("/stake/start", async (req, res) => {
  try {
    const { userId, amount, zoneTitle, apr, durationMinutes } = req.body as {
      userId: string;
      amount: number;
      zoneTitle: string;
      apr: number;
      durationMinutes: number;
    };

    if (!userId || !amount || !durationMinutes) {
      return res.status(400).json({ error: "userId, amount, durationMinutes are required." });
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from("stakes")
      .insert([
        {
          user_id: userId,
          amount: parseFloat(String(amount)),
          zone_title: zoneTitle ?? "",
          apr: parseFloat(String(apr ?? 1.0)),
          duration_minutes: durationMinutes,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          status: "active",
          profit: 0,
        },
      ])
      .select("id, user_id, amount, zone_title, apr, duration_minutes, start_time, end_time, status")
      .single();

    if (error || !data) {
      console.error("[Stake] Insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to create stake." });
    }

    console.log(`[Stake] Created stake ${data.id} for user ${userId} — ${amount} TFT × ${durationMinutes}min @ ${apr}%`);

    return res.json({ success: true, stake: data });
  } catch (err: any) {
    console.error("[Stake] POST /stake/start error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stake/user?userId=xxx ──────────────────────────────────────────
router.get("/stake/user", async (req, res) => {
  try {
    const userId = String(req.query.userId ?? "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required." });

    const { data, error } = await supabase
      .from("stakes")
      .select("id, user_id, amount, zone_title, apr, duration_minutes, start_time, end_time, status, profit, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Stake] Fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const nowMs = Date.now();
    const stakes = (data ?? []).map((s) => {
      const startMs = new Date(s.start_time).getTime();
      const endMs = new Date(s.end_time).getTime();
      const totalMs = endMs - startMs;
      const elapsedMs = Math.min(nowMs - startMs, totalMs);
      const fullProfit = parseFloat(s.amount) * (parseFloat(s.apr) / 100) * (s.duration_minutes / 30);
      const currentProfit = totalMs > 0 ? parseFloat((fullProfit * (elapsedMs / totalMs)).toFixed(6)) : 0;
      const isComplete = nowMs >= endMs;

      return {
        ...s,
        currentProfit,
        isComplete,
        remainingMs: Math.max(0, endMs - nowMs),
        progressPct: Math.min(100, totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0),
      };
    });

    const active = stakes.filter((s) => !s.isComplete);
    const completed = stakes.filter((s) => s.isComplete);
    const totalProfit = stakes.reduce((sum, s) => sum + s.currentProfit, 0);

    // Auto-update completed stakes status in DB (fire-and-forget)
    const completedIds = completed.filter((s) => s.status === "active").map((s) => s.id);
    if (completedIds.length > 0) {
      supabase
        .from("stakes")
        .update({ status: "completed" })
        .in("id", completedIds)
        .then(({ error: e }) => { if (e) console.error("[Stake] Auto-complete error:", e.message); });
    }

    console.log(`[Stake] GET user=${userId} active=${active.length} completed=${completed.length} profit=${totalProfit.toFixed(4)}`);

    return res.json({
      active,
      completed,
      totalProfit: parseFloat(totalProfit.toFixed(6)),
      totalStaked: active.reduce((sum, s) => sum + parseFloat(s.amount), 0),
    });
  } catch (err: any) {
    console.error("[Stake] GET /stake/user error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
