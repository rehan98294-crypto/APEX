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

// GET /api/user/profile — returns { balance, totalDeposited, trial_balance, trial_expires_at }
router.get("/user/profile", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    // Select core balance first (always present)
    const { data: user, error } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    if (error || !user) return res.status(404).json({ error: "User not found." });

    let currentBalance = parseFloat(String(user.balance ?? 0));
    let trialBalance   = 0;
    let trialExpires: string | null = null;

    // Trial columns — gracefully absent until migration runs
    try {
      const { data: trialData } = await supabase
        .from("users")
        .select("trial_balance, trial_expires_at")
        .eq("id", userId)
        .single();

      if (trialData) {
        trialBalance  = parseFloat(String(trialData.trial_balance ?? 0));
        trialExpires  = trialData.trial_expires_at ?? null;
      }
    } catch { /* columns don't exist yet */ }

    // ── Trial expiry check ─────────────────────────────────────────────────────
    if (trialBalance > 0 && trialExpires && new Date(trialExpires) <= new Date()) {
      const deduction  = Math.min(trialBalance, currentBalance);
      currentBalance   = parseFloat(Math.max(0, currentBalance - deduction).toFixed(2));
      trialBalance     = 0;
      try {
        await supabase
          .from("users")
          .update({ balance: currentBalance, trial_balance: 0 })
          .eq("id", userId);
      } catch { /* non-fatal */ }
      console.log(`[UserProfile] Trial expired for user ${userId}, deducted ${deduction} USDT`);
    }

    const { data: deposits } = await supabase
      .from("deposits")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "success");

    const totalDeposited = parseFloat(
      ((deposits ?? []).reduce((s: number, d: any) => s + parseFloat(String(d.amount)), 0)).toFixed(2)
    );

    console.log(`[UserProfile] user=${userId} balance=${currentBalance} trial=${trialBalance} deposited=${totalDeposited}`);
    return res.json({
      balance: currentBalance,
      totalDeposited,
      trial_balance: trialBalance,
      trial_expires_at: trialExpires ?? null,
    });
  } catch (err) {
    console.error("[UserProfile] error:", err);
    return res.status(500).json({ error: "Failed to load profile." });
  }
});

// POST /api/user/balance-sync — sync local balance to DB
router.post("/user/balance-sync", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { balance } = req.body as { balance?: number };

  if (typeof balance !== "number" || isNaN(balance) || balance < 0) {
    return res.status(400).json({ error: "Invalid balance value." });
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({ balance: parseFloat(balance.toFixed(2)) })
      .eq("id", userId);

    if (error) throw error;
    console.log(`[UserBalance] Synced user=${userId} balance=${balance}`);
    return res.json({ success: true, balance: parseFloat(balance.toFixed(2)) });
  } catch (err) {
    console.error("[UserBalance] sync error:", err);
    return res.status(500).json({ error: "Failed to sync balance." });
  }
});

export default router;
