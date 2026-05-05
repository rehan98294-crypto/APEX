import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/authApi";

export interface Transaction {
  id: string;
  type: "earn" | "stake" | "unstake" | "reward" | "reserve" | "reserve_profit" | "stake_reward" | "team_reward";
  amount: number;
  description: string;
  timestamp: number;
}

export interface StakePosition {
  id: string;
  amount: number;
  startDate: number;
  lockDays: number;
  apy: number;
  status: "active" | "unlocked";
}

export interface Reservation {
  id: string;
  nftId: string;
  nftName: string;
  nftImage: any;
  collection: string;
  reservePrice: number;
  reserveDate: number;
  expiresAt: number;
  status: "pending" | "confirmed" | "expired";
}

interface BalanceContextType {
  balance: number;
  trialBalance: number;
  availableBalance: number;
  totalDeposited: number;
  stakedTotal: number;
  earnedTotal: number;
  reserveProfit: number;
  todayReserveProfit: number;
  stakeEarned: number;
  todayStakeEarned: number;
  transactions: Transaction[];
  stakes: StakePosition[];
  reservations: Reservation[];
  dataLoaded: boolean;
  stakeTokens: (amount: number, lockDays: number, apy: number) => boolean;
  unstakeTokens: (stakeId: string) => boolean;
  earnReward: (amount: number, description: string) => void;
  earnReserveProfit: (profit: number, price: number, description: string) => void;
  earnStakeReward: (amount: number, description: string) => void;
  spendBalance: (amount: number, description: string) => boolean;
  spendRealBalance: (amount: number, description: string) => boolean;
  creditBalance: (amount: number, description: string) => void;
  addReservation: (r: Omit<Reservation, "id" | "reserveDate">) => boolean;
  cancelReservation: (id: string) => void;
}

const BalanceContext = createContext<BalanceContextType>({
  balance: 0,
  trialBalance: 0,
  availableBalance: 0,
  totalDeposited: 0,
  stakedTotal: 0,
  earnedTotal: 0,
  reserveProfit: 0,
  todayReserveProfit: 0,
  stakeEarned: 0,
  todayStakeEarned: 0,
  transactions: [],
  stakes: [],
  reservations: [],
  dataLoaded: false,
  stakeTokens: () => false,
  unstakeTokens: () => false,
  earnReward: () => {},
  earnReserveProfit: () => {},
  earnStakeReward: () => {},
  spendBalance: () => false,
  spendRealBalance: () => false,
  creditBalance: () => {},
  addReservation: () => false,
  cancelReservation: () => {},
});

// NOTE: storage key is now built per-user inside BalanceProvider to prevent data leaking between accounts

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

function todayTimestamp(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { token, user, loading: authLoading } = useAuth();

  // Per-user storage key — prevents data leaking between accounts on the same device
  const storageKey = user?.id ? `apex_balance_v5_${user.id}` : null;

  const [balance, setBalance] = useState(0);
  const [trialBalance, setTrialBalance] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string | null>(null);

  const syncKey = (b: number, tb: number) => `${b.toFixed(2)}:${tb.toFixed(2)}`;

  // Debounced DB balance sync — sends both real balance and trial_balance
  const syncToAPI = useCallback(
    (newBalance: number, newTrialBalance: number) => {
      if (!token) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const key = syncKey(newBalance, newTrialBalance);
        if (lastSyncedRef.current === key) return;
        authApi.user
          .syncBalance(token, newBalance, newTrialBalance)
          .then(() => {
            lastSyncedRef.current = key;
            console.log("[Balance] DB sync ✓ balance=", newBalance, "trial=", newTrialBalance);
          })
          .catch((e) => console.warn("[Balance] DB sync failed:", e));
      }, 800);
    },
    [token]
  );

  // Load from DB (primary) + AsyncStorage (fallback/migration) when auth resolves
  useEffect(() => {
    if (authLoading) return;

    if (!token || !storageKey) {
      setBalance(0);
      setTrialBalance(0);
      setTotalDeposited(0);
      setEarnedTotal(0);
      setTransactions([]);
      setStakes([]);
      setReservations([]);
      setDataLoaded(true);
      lastSyncedRef.current = null;
      return;
    }

    setDataLoaded(false);

    Promise.all([
      authApi.user.getProfile(token).catch(() => null),
      AsyncStorage.getItem(storageKey).catch(() => null),
    ]).then(([profile, savedData]) => {
      let finalBalance = 0;
      let finalTrialBalance = 0;
      let finalDeposited = 0;
      let finalEarned = 0;
      let finalTx: Transaction[] = [];
      let finalStakes: StakePosition[] = [];
      let finalReservations: Reservation[] = [];

      // Always restore non-balance data from AsyncStorage
      if (savedData) {
        try {
          const p = JSON.parse(savedData);
          finalEarned = p.earnedTotal ?? 0;
          finalTx = p.transactions ?? [];
          finalStakes = p.stakes ?? [];
          finalReservations = p.reservations ?? [];
        } catch {}
      }

      if (profile) {
        finalDeposited = profile.totalDeposited;
        finalTrialBalance = profile.trial_balance ?? 0;

        if (profile.balance > 0) {
          finalBalance = profile.balance;
          console.log("[Balance] Loaded from DB: balance=", finalBalance, "trial=", finalTrialBalance);
        } else {
          // DB balance is 0 — check AsyncStorage for a one-time migration
          try {
            const p = savedData ? JSON.parse(savedData) : null;
            if (p && p.balance > 0) {
              finalBalance = p.balance;
              console.log("[Balance] Migrating local storage to DB:", finalBalance);
              authApi.user.syncBalance(token, finalBalance, finalTrialBalance).catch(() => {});
              lastSyncedRef.current = syncKey(finalBalance, finalTrialBalance);
            }
          } catch {}
        }
      } else if (savedData) {
        // Network error — fall back entirely to AsyncStorage
        try {
          const p = JSON.parse(savedData);
          finalBalance = p.balance ?? 0;
          finalDeposited = p.totalDeposited ?? 0;
          console.log("[Balance] Network error, using local storage:", finalBalance);
        } catch {}
      }

      setBalance(finalBalance);
      setTrialBalance(finalTrialBalance);
      setTotalDeposited(finalDeposited);
      setEarnedTotal(finalEarned);
      setTransactions(finalTx);
      setStakes(finalStakes);
      setReservations(finalReservations);
      setDataLoaded(true);
      if (lastSyncedRef.current === null) {
        lastSyncedRef.current = syncKey(finalBalance, finalTrialBalance);
      }
    });
  }, [token, storageKey, authLoading]);

  const persist = (
    b: number,
    tb: number,
    td: number,
    et: number,
    tx: Transaction[],
    sk: StakePosition[],
    rv: Reservation[]
  ) => {
    setBalance(b);
    setTrialBalance(tb);
    setTotalDeposited(td);
    setEarnedTotal(et);
    setTransactions(tx);
    setStakes(sk);
    setReservations(rv);
    // Only write to storage if we have a valid user-scoped key
    if (storageKey) {
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ balance: b, trialBalance: tb, totalDeposited: td, earnedTotal: et, transactions: tx, stakes: sk, reservations: rv })
      );
    }
    syncToAPI(b, tb);
  };

  // Helper: deduct amount from trial first, then real balance
  function deductFromAvailable(amount: number, curBalance: number, curTrial: number): { newBalance: number; newTrial: number } {
    const trialSpent = Math.min(curTrial, amount);
    const realSpent = amount - trialSpent;
    return { newBalance: curBalance - realSpent, newTrial: curTrial - trialSpent };
  }

  const stakedTotal = stakes
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.amount, 0);

  const todayTs = todayTimestamp();

  const reserveProfit = transactions
    .filter((t) => t.type === "reserve_profit")
    .reduce((s, t) => s + t.amount, 0);

  const todayReserveProfit = transactions
    .filter((t) => t.type === "reserve_profit" && t.timestamp >= todayTs)
    .reduce((s, t) => s + t.amount, 0);

  const stakeEarned = transactions
    .filter((t) => t.type === "stake_reward")
    .reduce((s, t) => s + t.amount, 0);

  const todayStakeEarned = transactions
    .filter((t) => t.type === "stake_reward" && t.timestamp >= todayTs)
    .reduce((s, t) => s + t.amount, 0);

  const availableBalance = balance + trialBalance;

  const stakeTokens = (amount: number, lockDays: number, apy: number): boolean => {
    if (amount > availableBalance || amount <= 0) return false;
    const { newBalance, newTrial } = deductFromAvailable(amount, balance, trialBalance);
    const newStake: StakePosition = {
      id: genId(),
      amount,
      startDate: Date.now(),
      lockDays,
      apy,
      status: "active",
    };
    const tx: Transaction = {
      id: genId(),
      type: "stake",
      amount,
      description: `Staked ${amount} TFT for ${lockDays} days at ${apy}% APY`,
      timestamp: Date.now(),
    };
    persist(newBalance, newTrial, totalDeposited, earnedTotal, [tx, ...transactions].slice(0, 100), [newStake, ...stakes], reservations);
    return true;
  };

  const unstakeTokens = (stakeId: string): boolean => {
    const stake = stakes.find((s) => s.id === stakeId);
    if (!stake || stake.status !== "active") return false;
    const daysElapsed = (Date.now() - stake.startDate) / (1000 * 60 * 60 * 24);
    const rewardEarned = parseFloat(
      ((stake.amount * stake.apy * Math.min(daysElapsed, stake.lockDays)) / 36500).toFixed(2)
    );
    const totalReturn = stake.amount + rewardEarned;
    const updatedStakes = stakes.map((s) =>
      s.id === stakeId ? { ...s, status: "unlocked" as const } : s
    );
    const tx: Transaction = {
      id: genId(),
      type: "unstake",
      amount: totalReturn,
      description: `Unstaked ${stake.amount} TFT + ${rewardEarned} reward`,
      timestamp: Date.now(),
    };
    // Unstake returns to real balance
    persist(balance + totalReturn, trialBalance, totalDeposited, earnedTotal + rewardEarned, [tx, ...transactions].slice(0, 100), updatedStakes, reservations);
    return true;
  };

  const earnReward = (amount: number, description: string) => {
    const tx: Transaction = { id: genId(), type: "earn", amount, description, timestamp: Date.now() };
    persist(balance + amount, trialBalance, totalDeposited, earnedTotal + amount, [tx, ...transactions].slice(0, 100), stakes, reservations);
  };

  const earnReserveProfit = (profit: number, price: number, description: string) => {
    const tx: Transaction = { id: genId(), type: "reserve_profit", amount: profit, description, timestamp: Date.now() };
    persist(balance + price + profit, trialBalance, totalDeposited, earnedTotal + profit, [tx, ...transactions].slice(0, 100), stakes, reservations);
  };

  const earnStakeReward = (amount: number, description: string) => {
    const tx: Transaction = { id: genId(), type: "stake_reward", amount, description, timestamp: Date.now() };
    persist(balance + amount, trialBalance, totalDeposited, earnedTotal + amount, [tx, ...transactions].slice(0, 100), stakes, reservations);
  };

  const spendBalance = (amount: number, description: string): boolean => {
    if (amount > availableBalance || amount <= 0) return false;
    const { newBalance, newTrial } = deductFromAvailable(amount, balance, trialBalance);
    const tx: Transaction = { id: genId(), type: "reserve", amount, description, timestamp: Date.now() };
    persist(newBalance, newTrial, totalDeposited, earnedTotal, [tx, ...transactions].slice(0, 100), stakes, reservations);
    return true;
  };

  // Deducts only from real balance — used for withdrawals (trial balance is never withdrawable)
  const spendRealBalance = (amount: number, description: string): boolean => {
    if (amount > balance || amount <= 0) return false;
    const tx: Transaction = { id: genId(), type: "reserve", amount, description, timestamp: Date.now() };
    persist(balance - amount, trialBalance, totalDeposited, earnedTotal, [tx, ...transactions].slice(0, 100), stakes, reservations);
    return true;
  };

  // creditBalance counts as a real deposit — increments totalDeposited
  const creditBalance = (amount: number, description: string): void => {
    const tx: Transaction = { id: genId(), type: "earn", amount, description, timestamp: Date.now() };
    persist(balance + amount, trialBalance, totalDeposited + amount, earnedTotal, [tx, ...transactions].slice(0, 100), stakes, reservations);
  };

  const addReservation = (r: Omit<Reservation, "id" | "reserveDate">): boolean => {
    if (r.reservePrice > availableBalance) return false;
    const { newBalance, newTrial } = deductFromAvailable(r.reservePrice, balance, trialBalance);
    const reservation: Reservation = { ...r, id: genId(), reserveDate: Date.now() };
    const tx: Transaction = { id: genId(), type: "reserve", amount: r.reservePrice, description: `Reserved ${r.nftName}`, timestamp: Date.now() };
    persist(newBalance, newTrial, totalDeposited, earnedTotal, [tx, ...transactions].slice(0, 100), stakes, [reservation, ...reservations]);
    return true;
  };

  const cancelReservation = (id: string) => {
    const reservation = reservations.find((r) => r.id === id);
    if (!reservation) return;
    const updatedReservations = reservations.map((r) =>
      r.id === id ? { ...r, status: "expired" as const } : r
    );
    // Return funds to real balance
    persist(balance + reservation.reservePrice, trialBalance, totalDeposited, earnedTotal, transactions, stakes, updatedReservations);
  };

  return (
    <BalanceContext.Provider
      value={{
        balance,
        trialBalance,
        availableBalance,
        totalDeposited,
        stakedTotal,
        earnedTotal,
        reserveProfit,
        todayReserveProfit,
        stakeEarned,
        todayStakeEarned,
        transactions,
        stakes,
        reservations,
        dataLoaded,
        stakeTokens,
        unstakeTokens,
        earnReward,
        earnReserveProfit,
        earnStakeReward,
        spendBalance,
        spendRealBalance,
        creditBalance,
        addReservation,
        cancelReservation,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
