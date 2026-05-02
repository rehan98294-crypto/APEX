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

const FEE_RATE = 0.05;
const MIN_AMOUNT = 10;

// POST /api/withdraw/create
router.post("/withdraw/create", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { amount, wallet_address, network = "TRC20" } = req.body as {
    amount?: number;
    wallet_address?: string;
    network?: string;
  };

  if (!amount || amount < MIN_AMOUNT) {
    return res.status(400).json({ error: `Minimum withdrawal is ${MIN_AMOUNT} USDT.` });
  }
  if (!wallet_address || wallet_address.trim().length < 10) {
    return res.status(400).json({ error: "Invalid wallet address." });
  }

  try {
    // Check user balance in DB
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: "User not found." });
    }

    const currentBalance = parseFloat(String(user.balance ?? 0));
    if (currentBalance < amount) {
      return res.status(400).json({ error: `Insufficient balance. Available: ${currentBalance.toFixed(2)} USDT.` });
    }

    const fee = parseFloat((amount * FEE_RATE).toFixed(2));

    // Deduct balance immediately
    const { error: balErr } = await supabase
      .from("users")
      .update({ balance: parseFloat((currentBalance - amount).toFixed(2)) })
      .eq("id", userId);

    if (balErr) throw balErr;

    // Create withdrawal record — try with fee column first, fall back without it
    let withdrawal: any = null;
    let wErr: any = null;

    ({ data: withdrawal, error: wErr } = await supabase
      .from("withdrawals")
      .insert({ user_id: userId, amount, fee, wallet_address: wallet_address.trim(), network, status: "pending" })
      .select()
      .single());

    if (wErr && (wErr.code === "42703" || wErr.message?.includes("fee"))) {
      // fee column doesn't exist yet — insert without it
      ({ data: withdrawal, error: wErr } = await supabase
        .from("withdrawals")
        .insert({ user_id: userId, amount, wallet_address: wallet_address.trim(), network, status: "pending" })
        .select()
        .single());
    }

    if (wErr) {
      // Rollback balance
      await supabase
        .from("users")
        .update({ balance: currentBalance })
        .eq("id", userId);
      throw wErr;
    }

    return res.json({
      success: true,
      withdrawal_id: withdrawal.id,
      amount,
      fee,
      receive: parseFloat((amount - fee).toFixed(2)),
      status: "pending",
    });
  } catch (err) {
    console.error("[Withdraw] create error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

// GET /api/withdraw/history
router.get("/withdraw/history", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("id, amount, fee, wallet_address, network, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({ withdrawals: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load history." });
  }
});

export default router;
