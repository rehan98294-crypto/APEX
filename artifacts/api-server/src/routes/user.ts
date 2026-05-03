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
    // Only zero out trial_balance — real balance is NEVER touched
    if (trialBalance > 0 && trialExpires && new Date(trialExpires) <= new Date()) {
      trialBalance = 0;
      try {
        await supabase
          .from("users")
          .update({ trial_balance: 0 })
          .eq("id", userId);
      } catch { /* non-fatal */ }
      console.log(`[UserProfile] Trial expired for user ${userId} — trial_balance zeroed, balance untouched`);
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

// POST /api/user/balance-sync — sync local balance (and optionally trial_balance) to DB
router.post("/user/balance-sync", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { balance, trial_balance } = req.body as { balance?: number; trial_balance?: number };

  if (typeof balance !== "number" || isNaN(balance) || balance < 0) {
    return res.status(400).json({ error: "Invalid balance value." });
  }

  const updatePayload: Record<string, number> = { balance: parseFloat(balance.toFixed(2)) };
  if (typeof trial_balance === "number" && !isNaN(trial_balance) && trial_balance >= 0) {
    updatePayload.trial_balance = parseFloat(trial_balance.toFixed(2));
  }

  try {
    const { error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (error) throw error;
    console.log(`[UserBalance] Synced user=${userId} balance=${balance}${trial_balance !== undefined ? ` trial=${trial_balance}` : ""}`);
    return res.json({ success: true, balance: parseFloat(balance.toFixed(2)) });
  } catch (err) {
    console.error("[UserBalance] sync error:", err);
    return res.status(500).json({ error: "Failed to sync balance." });
  }
});

// POST /api/user/save-withdraw-address — upsert withdrawal addresses by user_id
router.post("/user/save-withdraw-address", async (req, res) => {
  const {
    user_id,
    trc20_address,
    bep20_address,
    erc20_address,
    sol_address,
  } = req.body as {
    user_id?: string;
    trc20_address?: string;
    bep20_address?: string;
    erc20_address?: string;
    sol_address?: string;
  };

  if (!user_id || typeof user_id !== "string" || user_id.trim().length === 0) {
    return res.status(400).json({ error: "user_id is required." });
  }

  const uid = user_id.trim();

  // Build list of networks to upsert (skip any that weren't provided)
  const entries: { network: string; address: string }[] = [];
  if (trc20_address?.trim()) entries.push({ network: "TRC20",   address: trc20_address.trim() });
  if (bep20_address?.trim()) entries.push({ network: "BEP20",   address: bep20_address.trim() });
  if (erc20_address?.trim()) entries.push({ network: "ERC20",   address: erc20_address.trim() });
  if (sol_address?.trim())   entries.push({ network: "SOL",     address: sol_address.trim()   });

  if (entries.length === 0) {
    return res.status(400).json({ error: "At least one address must be provided." });
  }

  try {
    const now = new Date().toISOString();

    const rows = entries.map(({ network, address }) => ({
      user_id:    uid,
      network,
      address,
      updated_at: now,
    }));

    const { error } = await supabase
      .from("withdrawal_addresses")
      .upsert(rows, { onConflict: "user_id,network" });

    if (error) throw error;

    console.log(`[SaveWithdrawAddr] Saved ${entries.length} address(es) for user=${uid}`);
    return res.json({
      success:  true,
      saved:    entries.map(e => e.network),
    });
  } catch (err) {
    console.error("[SaveWithdrawAddr] error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save addresses." });
  }
});

export default router;
