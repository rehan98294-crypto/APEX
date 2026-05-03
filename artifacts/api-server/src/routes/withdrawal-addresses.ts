import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { verifyToken, verifyOtp } from "../services/auth.service.js";
import supabase from "../lib/supabase.js";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized." }); return; }
  try {
    const payload = verifyToken(auth.slice(7));
    (req as any).userId = payload.id;
    (req as any).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

const VALID_NETWORKS = ["TRC20", "BEP20", "POLYGON", "SOL"];

// GET /api/withdraw/addresses — returns saved addresses + cooldown status
router.get("/withdraw/addresses", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const [{ data: addrs }, { data: user }] = await Promise.all([
      supabase
        .from("withdrawal_addresses")
        .select("network, address, updated_at")
        .eq("user_id", userId),
      supabase
        .from("users")
        .select("withdrawal_disabled_until")
        .eq("id", userId)
        .single(),
    ]);
    return res.json({
      addresses: addrs ?? [],
      withdrawal_disabled_until: user?.withdrawal_disabled_until ?? null,
    });
  } catch (err) {
    console.error("[WithdrawalAddr] get error:", err);
    return res.status(500).json({ error: "Failed to load addresses." });
  }
});

// POST /api/withdraw/address — save/update a withdrawal address (requires password + email OTP + optional 2FA)
router.post("/withdraw/address", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const userEmail = (req as any).userEmail as string;

  const { network, address, password, email_code, twofa_code } = req.body as {
    network?: string;
    address?: string;
    password?: string;
    email_code?: string;
    twofa_code?: string;
  };

  if (!network || !VALID_NETWORKS.includes(network.toUpperCase())) {
    return res.status(400).json({ error: "Invalid network. Supported: TRC20, BEP20, POLYGON, SOL." });
  }
  if (!address || address.trim().length < 10) {
    return res.status(400).json({ error: "Invalid wallet address (too short)." });
  }
  if (!password) {
    return res.status(400).json({ error: "Login password is required." });
  }
  if (!email_code) {
    return res.status(400).json({ error: "Email verification code is required." });
  }

  try {
    // 1. Fetch user record
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("password_hash, twofa_enabled, twofa_secret")
      .eq("id", userId)
      .single();

    if (userErr || !user) return res.status(404).json({ error: "User not found." });

    // 2. Verify password
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) return res.status(401).json({ error: "Incorrect password." });

    // 3. Verify email OTP
    const otpValid = await verifyOtp(userEmail, email_code.trim());
    if (!otpValid) return res.status(400).json({ error: "Invalid or expired email code." });

    // 4. Verify 2FA if enabled
    if (user.twofa_enabled && user.twofa_secret) {
      if (!twofa_code || twofa_code.trim().length !== 6) {
        return res.status(400).json({ error: "Google Authenticator code is required (6 digits)." });
      }
      const { authenticator } = await import("otplib");
      authenticator.options = { window: 1 };
      const verified = authenticator.verify({
        token: twofa_code.trim(),
        secret: user.twofa_secret,
      });
      if (!verified) return res.status(401).json({ error: "Invalid 2FA code." });
    }

    // 5. Upsert the withdrawal address
    const { error: upsertErr } = await supabase
      .from("withdrawal_addresses")
      .upsert(
        { user_id: userId, network: network.toUpperCase(), address: address.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id,network" }
      );
    if (upsertErr) throw upsertErr;

    // 6. Set 72-hour withdrawal cooldown
    const disabledUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    await supabase.from("users").update({ withdrawal_disabled_until: disabledUntil }).eq("id", userId);

    console.log(`[WithdrawalAddr] Saved network=${network} for user=${userId}. Cooldown until ${disabledUntil}`);
    return res.json({ success: true, withdrawal_disabled_until: disabledUntil });
  } catch (err) {
    console.error("[WithdrawalAddr] save error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save address." });
  }
});

export default router;
