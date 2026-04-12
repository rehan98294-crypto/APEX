import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";

export type DateFilter = "all" | "today" | "week";

export interface ReferralInfo {
  referralCode:     string;
  referralLink:     string;
  position:         string | null;
  referredByUserId: string | null;
}

export interface TreeStats {
  totalMembers: number;
  validMembers: number;
  A: { total: number; valid: number };
  B: { total: number; valid: number };
  C: { total: number; valid: number };
}

const EMPTY_STATS: TreeStats = {
  totalMembers: 0, validMembers: 0,
  A: { total: 0, valid: 0 },
  B: { total: 0, valid: 0 },
  C: { total: 0, valid: 0 },
};

export function useReferral() {
  const { token } = useAuth();

  const [info,        setInfo]        = useState<ReferralInfo | null>(null);
  const [stats,       setStats]       = useState<TreeStats>(EMPTY_STATS);
  const [filter,      setFilter]      = useState<DateFilter>("all");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingStat, setLoadingStat] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoadingInfo(true);
    try {
      const data = await authApi.tree.getReferralInfo(token);
      setInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referral info.");
    } finally {
      setLoadingInfo(false);
    }
  }, [token]);

  const fetchStats = useCallback(async (f: DateFilter) => {
    if (!token) return;
    setLoadingStat(true);
    try {
      const data = await authApi.tree.getStats(token, f);
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team stats.");
    } finally {
      setLoadingStat(false);
    }
  }, [token]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  useEffect(() => { fetchStats(filter); }, [fetchStats, filter]);

  const changeFilter = (f: DateFilter) => {
    setFilter(f);
  };

  const refresh = () => {
    fetchInfo();
    fetchStats(filter);
  };

  return {
    info, stats, filter, changeFilter,
    loadingInfo, loadingStat, error, refresh,
  };
}
