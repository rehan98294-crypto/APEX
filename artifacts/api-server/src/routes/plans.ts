import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

// ─── Existing DB columns for plans ────────────────────────────────────────────
// plans: id, name, price, daily_rate, duration_days, total_return, created_at
// user_plans: id, user_id, plan_id, invested_amount, daily_profit, start_time, end_time, status

// Static slug ordering (maps plan name → slug key used in SubscriptionContext)
const NAME_TO_SLUG: Record<string, string> = {
  Basic:    "basic",
  Advance:  "advance",
  Pro:      "pro",
  Elite:    "elite",
  Ultimate: "ultimate",
};

const SORT_ORDER: Record<string, number> = {
  Basic: 1, Advance: 2, Pro: 3, Elite: 4, Ultimate: 5,
};

// ─── GET /api/plans ───────────────────────────────────────────────────────────
router.get("/plans", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, price, daily_rate, duration_days, total_return, created_at");

    if (error) {
      console.error("[Plans] fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // Sort by known order, fallback to created_at
    const sorted = (data ?? []).sort((a, b) => {
      const oa = SORT_ORDER[a.name] ?? 99;
      const ob = SORT_ORDER[b.name] ?? 99;
      return oa - ob;
    });

    // Enrich each plan with its slug derived from name
    const enriched = sorted.map((p) => ({
      ...p,
      slug: NAME_TO_SLUG[p.name] ?? p.name.toLowerCase(),
    }));

    return res.json({ plans: enriched });
  } catch (err: any) {
    console.error("[Plans] GET /plans error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/plans ──────────────────────────────────────────────────────────
// Create or update a plan (only columns that exist in DB)
router.post("/plans", async (req, res) => {
  try {
    const body = req.body ?? {};
    const { name, price, daily_rate, duration_days, total_return } = body;

    if (!name || price == null) {
      return res.status(400).json({ error: "name and price are required." });
    }

    const payload = {
      name,
      price: parseFloat(price),
      daily_rate: parseFloat(daily_rate ?? 0),
      duration_days: parseInt(duration_days ?? 30),
      total_return: parseFloat(total_return ?? 0),
    };

    const { data, error } = await supabase
      .from("plans")
      .insert([payload])
      .select("id, name, price, daily_rate, duration_days, total_return")
      .single();

    if (error || !data) {
      console.error("[Plans] insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to save plan." });
    }

    console.log(`[Plans] Created plan: ${data.name}`);
    return res.json({ success: true, plan: { ...data, slug: NAME_TO_SLUG[data.name] ?? data.name.toLowerCase() } });
  } catch (err: any) {
    console.error("[Plans] POST /plans error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/plans/seed ─────────────────────────────────────────────────────
// Seeds the 5 default plans if the table is empty
router.post("/plans/seed", async (_req, res) => {
  try {
    const { data: existing } = await supabase.from("plans").select("id").limit(1);
    if (existing && existing.length > 0) {
      return res.json({ message: "Plans already seeded.", count: existing.length });
    }

    const seeds = [
      { name: "Basic",    price: 99,   daily_rate: 0.5, duration_days: 30, total_return: 114  },
      { name: "Advance",  price: 499,  daily_rate: 0.8, duration_days: 30, total_return: 574  },
      { name: "Pro",      price: 1099, daily_rate: 1.2, duration_days: 30, total_return: 1263 },
      { name: "Elite",    price: 2099, daily_rate: 1.8, duration_days: 30, total_return: 2414 },
      { name: "Ultimate", price: 5099, daily_rate: 3.0, duration_days: 30, total_return: 5864 },
    ];

    const { data, error } = await supabase
      .from("plans")
      .insert(seeds)
      .select("id, name, price");

    if (error) {
      console.error("[Plans] seed error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Plans] Seeded ${data?.length ?? 0} plans`);
    return res.json({ success: true, seeded: data?.length ?? 0 });
  } catch (err: any) {
    console.error("[Plans] POST /plans/seed error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/user-plans?userId=xxx ──────────────────────────────────────────
router.get("/user-plans", async (req, res) => {
  try {
    const user_id = String(req.query.userId ?? req.query.user_id ?? "").trim();
    if (!user_id) {
      return res.status(400).json({ error: "userId is required." });
    }

    const { data, error } = await supabase
      .from("user_plans")
      .select("id, user_id, plan_id, invested_amount, daily_profit, start_time, end_time, status")
      .eq("user_id", user_id)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("[Plans] user-plans fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with plan details
    const planIds = [...new Set((data ?? []).map((up) => up.plan_id))];
    let planMap: Record<string, any> = {};
    if (planIds.length > 0) {
      const { data: plans } = await supabase
        .from("plans")
        .select("id, name, price, daily_rate, duration_days, total_return")
        .in("id", planIds);
      (plans ?? []).forEach((p) => {
        planMap[p.id] = { ...p, slug: NAME_TO_SLUG[p.name] ?? p.name.toLowerCase() };
      });
    }

    const enriched = (data ?? []).map((up) => ({
      ...up,
      plan: planMap[up.plan_id] ?? null,
      plan_slug: planMap[up.plan_id]?.slug ?? null,
    }));

    return res.json({ userPlans: enriched });
  } catch (err: any) {
    console.error("[Plans] GET /user-plans error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/user-plans ─────────────────────────────────────────────────────
// Body: { user_id, plan_id, invested_amount }
router.post("/user-plans", async (req, res) => {
  try {
    const body = req.body ?? {};
    const user_id   = String(body.user_id ?? body.userId ?? "").trim();
    const plan_id   = String(body.plan_id ?? "").trim();
    const invested  = parseFloat(String(body.invested_amount ?? body.investedAmount ?? 0));

    if (!user_id || !plan_id) {
      return res.status(400).json({ error: "user_id and plan_id are required." });
    }

    // Fetch plan for daily_rate & duration
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("daily_rate, duration_days, price, name")
      .eq("id", plan_id)
      .single();

    if (planErr || !plan) {
      return res.status(404).json({ error: "Plan not found." });
    }

    const amount       = invested > 0 ? invested : plan.price;
    const daily_profit = (amount * plan.daily_rate) / 100;
    const start_time   = new Date().toISOString();
    const end_time     = new Date(Date.now() + plan.duration_days * 86400000).toISOString();

    // Cancel any existing active plan for this user
    await supabase
      .from("user_plans")
      .update({ status: "cancelled" })
      .eq("user_id", user_id)
      .eq("status", "active");

    // Insert the new active plan (only existing columns)
    const { data, error } = await supabase
      .from("user_plans")
      .insert([{
        user_id,
        plan_id,
        invested_amount: amount,
        daily_profit,
        start_time,
        end_time,
        status: "active",
      }])
      .select("id, user_id, plan_id, invested_amount, daily_profit, start_time, end_time, status")
      .single();

    if (error || !data) {
      console.error("[Plans] user-plans insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to activate plan." });
    }

    const slug = NAME_TO_SLUG[plan.name] ?? plan.name.toLowerCase();
    console.log(`[Plans] User ${user_id} activated plan ${plan.name} (${slug})`);
    return res.json({
      success: true,
      userPlan: {
        ...data,
        plan_slug: slug,
        plan: { id: plan_id, ...plan, slug },
      },
    });
  } catch (err: any) {
    console.error("[Plans] POST /user-plans error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
