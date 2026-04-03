import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/authApi";

export interface StakeRecord {
  id: string;
  user_id: string;
  amount: number;
  zone_title: string;
  apr: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  status: "active" | "completed";
  profit: number;
  currentProfit: number;
  isComplete: boolean;
  remainingMs: number;
  progressPct: number;
  created_at: string;
}

export interface StakeSummary {
  active: StakeRecord[];
  completed: StakeRecord[];
  totalProfit: number;
  totalStaked: number;
}

export interface UseStakeApi {
  summary: StakeSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  startStake: (params: {
    userId: string;
    amount: number;
    zoneTitle: string;
    apr: number;
    durationMinutes: number;
  }) => Promise<{ success: boolean; error?: string }>;
}

const EMPTY: StakeSummary = { active: [], completed: [], totalProfit: 0, totalStaked: 0 };

export function useStakeApi(userId: string | null | undefined): UseStakeApi {
  const [summary, setSummary] = useState<StakeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!userId) { setSummary(EMPTY); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stake/user?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StakeSummary = await res.json();
      if (mounted.current) { setSummary(json); setError(null); }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Failed to load stakes");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  // Auto-refresh every 10 seconds while active stakes exist
  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = setInterval(() => {
      if (summary?.active && summary.active.length > 0) refresh();
    }, 10_000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [userId]);

  const startStake = useCallback(async (params: {
    userId: string;
    amount: number;
    zoneTitle: string;
    apr: number;
    durationMinutes: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/stake/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error ?? "Stake failed" };
      // Refresh summary after successful start
      setTimeout(() => refresh(), 500);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }, [refresh]);

  return { summary, loading, error, refresh, startStake };
}
