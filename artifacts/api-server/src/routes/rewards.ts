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

// POST /api/rewards/reserve-profit
// Records a reserve profit for the user and distributes team rewards to upline:
//   A-line (direct referrer)    → 20%
//   B-line (referrer's referrer) → 15%
//   C-line (3 levels up)        → 10%
router.post("/rewards/reserve-profit", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { profit } = req.body as { profit?: number };

  if (!profit || profit <= 0) {
    return res.status(400).json({ error: "Invalid profit amount." });
  }

  try {
    // Idempotency guard: reject duplicate submissions within a 5-minute window
    // to prevent double-credit on network retries.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("reserve_profits")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", fiveMinutesAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      console.warn(`[Rewards] Duplicate reserve-profit rejected for user=${userId} profit=${profit}`);
      return res.status(409).json({ error: "Profit already recorded. Please wait before submitting again." });
    }

    // 1. Record the user's own profit
    await supabase.from("reserve_profits").insert({ user_id: userId, profit });

    // 2. Walk up the referral tree (max 3 levels)
    const RATES = [
      { line: "A", pct: 0.20 },
      { line: "B", pct: 0.15 },
      { line: "C", pct: 0.10 },
    ];

    let currentId: string | null = userId;
    const rewardRows: Array<{
      user_id: string;
      from_user_id: string;
      profit: number;
      line: string;
      reward: number;
    }> = [];

    for (const { line, pct } of RATES) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("referred_by")
        .eq("id", currentId!)
        .single();

      if (!currentUser?.referred_by) break;

      const uplineId = currentUser.referred_by as string;
      const reward = parseFloat((profit * pct).toFixed(4));

      rewardRows.push({
        user_id: uplineId,
        from_user_id: userId,
        profit,
        line,
        reward,
      });

      // Credit the upline's backend balance
      const { data: uplineUser } = await supabase
        .from("users")
        .select("balance")
        .eq("id", uplineId)
        .single();

      const currentBalance = parseFloat(String(uplineUser?.balance ?? 0));
      await supabase
        .from("users")
        .update({ balance: currentBalance + reward })
        .eq("id", uplineId);

      currentId = uplineId;
    }

    if (rewardRows.length > 0) {
      await supabase.from("team_rewards").insert(rewardRows);
    }

    return res.json({ success: true, rewardsDistributed: rewardRows.length });
  } catch (err) {
    console.error("[Rewards] reserve-profit error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

// GET /api/rewards/team
// Returns the current user's accumulated team rewards (earned as an upline)
router.get("/rewards/team", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  try {
    const { data: rewards } = await supabase
      .from("team_rewards")
      .select("reward, line, created_at")
      .eq("user_id", userId);

    if (!rewards || rewards.length === 0) {
      return res.json({ totalReward: 0, todayReward: 0, byLine: { A: 0, B: 0, C: 0 } });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let totalReward = 0;
    let todayReward = 0;
    const byLine: Record<string, number> = { A: 0, B: 0, C: 0 };

    for (const r of rewards) {
      const amount = parseFloat(String(r.reward));
      totalReward += amount;
      if (new Date(r.created_at) >= todayStart) todayReward += amount;
      if (r.line in byLine) byLine[r.line] += amount;
    }

    return res.json({
      totalReward: parseFloat(totalReward.toFixed(4)),
      todayReward: parseFloat(todayReward.toFixed(4)),
      byLine: {
        A: parseFloat(byLine.A.toFixed(4)),
        B: parseFloat(byLine.B.toFixed(4)),
        C: parseFloat(byLine.C.toFixed(4)),
      },
    });
  } catch (err) {
    console.error("[Rewards] team error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

// GET /api/rewards/reserve-total
// Returns the user's own total reserve profit from the DB
router.get("/rewards/reserve-total", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: profits } = await supabase
      .from("reserve_profits")
      .select("profit, created_at")
      .eq("user_id", userId);

    if (!profits || profits.length === 0) {
      return res.json({ totalProfit: 0, todayProfit: 0 });
    }

    let totalProfit = 0;
    let todayProfit = 0;
    for (const p of profits) {
      const amount = parseFloat(String(p.profit));
      totalProfit += amount;
      if (new Date(p.created_at) >= todayStart) todayProfit += amount;
    }

    return res.json({
      totalProfit: parseFloat(totalProfit.toFixed(4)),
      todayProfit: parseFloat(todayProfit.toFixed(4)),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

export default router;
