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

/** Returns the UTC date string "YYYY-MM-DD" for a given Date (or now). */
function utcDateStr(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** True if the timestamp falls on today's UTC calendar date. */
function isToday(ts: string | null): boolean {
  if (!ts) return false;
  return utcDateStr(new Date(ts)) === utcDateStr();
}

// GET /api/reserve/today — check if user has already reserved today (UTC calendar day)
router.get("/reserve/today", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { data: user, error } = await (supabase as any)
      .from("users")
      .select("last_reserved_at")
      .eq("id", userId)
      .single();

    if (error) {
      return res.json({ reserved_today: false, last_reserved_at: null });
    }

    const lastAt       = user?.last_reserved_at ?? null;
    const reservedToday = isToday(lastAt);

    return res.json({ reserved_today: reservedToday, last_reserved_at: lastAt });
  } catch {
    return res.json({ reserved_today: false, last_reserved_at: null });
  }
});

// POST /api/reserve/record — mark today's reservation as done (once per UTC calendar day)
router.post("/reserve/record", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const { data: user, error: fetchErr } = await (supabase as any)
      .from("users")
      .select("last_reserved_at")
      .eq("id", userId)
      .single();

    if (!fetchErr && isToday(user?.last_reserved_at ?? null)) {
      return res.status(400).json({
        error: "You can reserve once per day. Come back tomorrow.",
        reserved_today: true,
      });
    }

    const now = new Date().toISOString();
    try {
      await supabase.from("users").update({ last_reserved_at: now } as any).eq("id", userId);
    } catch { /* non-fatal — column may not exist yet */ }

    console.log(`[Reserve] user=${userId} reserved at ${now} (UTC date: ${utcDateStr()})`);
    return res.json({ success: true, last_reserved_at: now });
  } catch {
    return res.json({ success: true, last_reserved_at: new Date().toISOString() });
  }
});

export default router;
