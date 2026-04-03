import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/authApi";

export interface StakeRecord {
  id: string;
  user_id: string;
  amount: number;
  status: "active" | "completed";
  start_time: string;
  profit: number;
}

export interface StakeSummary {
  stakes: StakeRecord[];
  active: StakeRecord[];
  completed: StakeRecord[];
  totalStaked: number;
  totalProfit: number;
}

export interface UseStakeApi {
  summary: StakeSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  startStake: (params: {
    user_id: string;
    amount: number;
  }) => Promise<{ success: boolean; error?: string }>;
}

const EMPTY: StakeSummary = {
  stakes: [],
  active: [],
  completed: [],
  totalStaked: 0,
  totalProfit: 0,
};

export function useStakeApi(userId: string | null | undefined): UseStakeApi {
  const [summary, setSummary] = useState<StakeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSummary(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/stake/user?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StakeSummary = await res.json();
      if (mounted.current) {
        setSummary(json);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load stakes");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [userId]);

  const startStake = useCallback(
    async (params: {
      user_id: string;
      amount: number;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/stake/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error ?? "Stake failed" };
        }
        // Refresh after a short delay to pick up the new record
        setTimeout(() => refresh(), 600);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  return { summary, loading, error, refresh, startStake };
}
