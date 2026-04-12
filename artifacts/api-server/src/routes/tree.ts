import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";
import {
  getUserReferralInfo,
  getTreeStats,
  recordDeposit,
  type DateFilter,
} from "../services/referral.service.js";

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
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
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

/** GET /api/tree/referral-info — referral code, link, position */
router.get("/tree/referral-info", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const info = await getUserReferralInfo(userId);
    return res.json(info);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

/** GET /api/tree/stats?filter=all|today|week — team member counts */
router.get("/tree/stats", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const raw    = (req.query["filter"] as string | undefined) ?? "all";
    const filter: DateFilter = ["all", "today", "week"].includes(raw)
      ? (raw as DateFilter)
      : "all";

    const stats = await getTreeStats(userId, filter);
    return res.json(stats);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

/** POST /api/deposits — record a deposit (amount, status) */
router.post("/deposits", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { amount, status } = req.body as { amount?: number; status?: string };
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "A valid positive amount is required." });
    }
    const st = status === "success" ? "success" : "pending";
    await recordDeposit(userId, amount, st);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

export default router;
