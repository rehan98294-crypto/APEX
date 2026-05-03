import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/authApi";
import { PLANS, PlanConfig, PlanId } from "@/context/SubscriptionContext";

// ─── DB Plan shape (mirrors available DB columns) ─────────────────────────────
export interface DBPlan {
  id: string;       // UUID from DB
  slug: string;     // computed on API: 'basic' | 'advance' | 'pro' | 'elite' | 'ultimate'
  name: string;
  price: number;
  daily_rate: number;
  duration_days: number;
  total_return: number;
}

export interface DBUserPlan {
  id: string;
  user_id: string;
  plan_id: string;
  plan_slug: string | null;
  invested_amount: number;
  daily_profit: number;
  start_time: string;
  end_time: string;
  status: "active" | "completed" | "cancelled";
  plan?: DBPlan;
}

// ─── Merge DB plan (pricing/rate) with static config (colors/gradients/perks) ─
function mergeDBWithStatic(dbPlan: DBPlan): PlanConfig {
  const slug = dbPlan.slug as PlanId;
  const staticPlan = PLANS.find((p) => p.id === slug);
  if (staticPlan) {
    return {
      ...staticPlan,
      price: dbPlan.price,        // use DB price as source of truth
    };
  }
  // Fallback if slug doesn't match any static plan
  return {
    id: slug,
    name: dbPlan.name,
    price: dbPlan.price,
    color: "#5CBFFE",
    gradientColors: ["#5CBFFE", "#2BD9A8"],
    tickColor: "#5CBFFE",
    tickLabel: dbPlan.name,
    unlocksLevel: 2,
    deposit: 0,
    depositRange: "",
    incomeBoost: 0,
    stakeBoost: 0,
    membersOnly: 0,
    withdrawal: "",
    perks: [],
  };
}

// ─── usePlans ─────────────────────────────────────────────────────────────────
// Fetches plans from DB; falls back to static PLANS if unavailable.
export function usePlans() {
  const [plans, setPlans] = useState<PlanConfig[]>(PLANS);
  const [dbPlans, setDbPlans] = useState<DBPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/plans`);
      const json = await res.json() as { plans?: DBPlan[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Fetch failed");
      const fetched = json.plans ?? [];
      if (fetched.length > 0) {
        setDbPlans(fetched);
        setPlans(fetched.map(mergeDBWithStatic));
      }
      // If DB returned 0 plans, seed them (fire-and-forget)
      if (fetched.length === 0) {
        fetch(`${API_BASE}/plans/seed`, { method: "POST" })
          .then(() => {
            // Retry fetch after seed
            setTimeout(fetchPlans, 1000);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.warn("[usePlans] DB fetch failed, using static plans:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  return { plans, dbPlans, loading, error, refetch: fetchPlans };
}

// ─── useUserPlans ─────────────────────────────────────────────────────────────
// User ID comes from JWT token — pass token directly
export function useUserPlans(token: string | null | undefined) {
  const [userPlans, setUserPlans] = useState<DBUserPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchUserPlans = useCallback(async () => {
    if (!token) { setUserPlans([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/user-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { userPlans?: DBUserPlan[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Fetch failed");
      setUserPlans(json.userPlans ?? []);
    } catch (err: any) {
      console.warn("[useUserPlans] fetch error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUserPlans(); }, [fetchUserPlans]);

  const activatePlanInDB = useCallback(async (params: {
    planId: string;   // DB UUID
    planSlug: string;
    investedAmount: number;
  }): Promise<DBUserPlan | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/user-plans`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          plan_id: params.planId,
          invested_amount: params.investedAmount,
        }),
      });
      const json = await res.json() as { userPlan?: DBUserPlan; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Activation failed");
      if (json.userPlan) {
        setUserPlans((prev) => [
          json.userPlan!,
          ...prev.filter((p) => p.status !== "active"),
        ]);
        return json.userPlan;
      }
    } catch (err: any) {
      console.warn("[useUserPlans] activatePlanInDB error:", err.message);
    }
    return null;
  }, [token]);

  const activeUserPlan = userPlans.find((p) => p.status === "active") ?? null;

  return { userPlans, activeUserPlan, loading, error, refetch: fetchUserPlans, activatePlanInDB };
}
