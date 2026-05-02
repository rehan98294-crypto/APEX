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

/** Returns true when both timestamps fall in the same 12-hour UTC window.
 *  Window 1: 00:00–11:59 UTC   Window 2: 12:00–23:59 UTC */
function isSame12HrWindow(a: Date, b: Date): boolean {
  const sameDay =
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth()    &&
    a.getUTCDate()     === b.getUTCDate();
  if (!sameDay) return false;
  return (a.getUTCHours() < 12) === (b.getUTCHours() < 12);
}

// GET /api/reserve/today — check if user has already reserved today (UTC day)
router.get("/reserve/today", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    // last_reserved_at column may not exist yet — return false gracefully
    const { data: user, error } = await (supabase as any)
      .from("users")
      .select("last_reserved_at")
      .eq("id", userId)
      .single();

    if (error) {
      // Column missing or user not found — default to not reserved
      return res.json({ reserved_today: false, last_reserved_at: null });
    }

    const lastAt    = user?.last_reserved_at ?? null;
    const reserved  = lastAt ? isSame12HrWindow(new Date(lastAt), new Date()) : false;

    return res.json({ reserved_today: reserved, last_reserved_at: lastAt });
  } catch {
    return res.json({ reserved_today: false, last_reserved_at: null });
  }
});

// POST /api/reserve/record — mark today's reservation as done
router.post("/reserve/record", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { data: user, error: fetchErr } = await (supabase as any)
      .from("users")
      .select("last_reserved_at")
      .eq("id", userId)
      .single();

    if (!fetchErr && user?.last_reserved_at && isSame12HrWindow(new Date(user.last_reserved_at), new Date())) {
      return res.status(400).json({
        error: "You have already reserved in this 12-hour window. Next window opens at 12:00 AM or 12:00 PM UTC.",
        reserved_today: true,
      });
    }

    const now = new Date().toISOString();
    // update may fail silently if column doesn't exist yet
    try {
      await supabase.from("users").update({ last_reserved_at: now } as any).eq("id", userId);
    } catch { /* non-fatal */ }

    return res.json({ success: true, last_reserved_at: now });
  } catch {
    // Non-fatal — reservation proceeds even if tracking fails
    return res.json({ success: true, last_reserved_at: new Date().toISOString() });
  }
});

export default router;
