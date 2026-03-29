import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Transaction {
  id: string;
  type: "earn" | "stake" | "unstake" | "reward" | "reserve";
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
  stakedTotal: number;
  earnedTotal: number;
  transactions: Transaction[];
  stakes: StakePosition[];
  reservations: Reservation[];
  stakeTokens: (amount: number, lockDays: number, apy: number) => boolean;
  unstakeTokens: (stakeId: string) => boolean;
  earnReward: (amount: number, description: string) => void;
  spendBalance: (amount: number, description: string) => boolean;
  creditBalance: (amount: number, description: string) => void;
  addReservation: (r: Omit<Reservation, "id" | "reserveDate">) => boolean;
  cancelReservation: (id: string) => void;
}

const BalanceContext = createContext<BalanceContextType>({
  balance: 1000,
  stakedTotal: 0,
  earnedTotal: 0,
  transactions: [],
  stakes: [],
  reservations: [],
  stakeTokens: () => false,
  unstakeTokens: () => false,
  earnReward: () => {},
  spendBalance: () => false,
  creditBalance: () => {},
  addReservation: () => false,
  cancelReservation: () => {},
});

const STORAGE_KEY = "treasurefun_balance_v2";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(1000);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setBalance(parsed.balance ?? 1000);
          setEarnedTotal(parsed.earnedTotal ?? 0);
          setTransactions(parsed.transactions ?? []);
          setStakes(parsed.stakes ?? []);
          setReservations(parsed.reservations ?? []);
        } catch {}
      }
    });
  }, []);

  const persist = (
    b: number,
    et: number,
    tx: Transaction[],
    sk: StakePosition[],
    rv: Reservation[]
  ) => {
    setBalance(b);
    setEarnedTotal(et);
    setTransactions(tx);
    setStakes(sk);
    setReservations(rv);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ balance: b, earnedTotal: et, transactions: tx, stakes: sk, reservations: rv })
    );
  };

  const stakedTotal = stakes
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.amount, 0);

  const stakeTokens = (amount: number, lockDays: number, apy: number): boolean => {
    if (amount > balance || amount <= 0) return false;
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
    persist(
      balance - amount,
      earnedTotal,
      [tx, ...transactions].slice(0, 50),
      [newStake, ...stakes],
      reservations
    );
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
    persist(
      balance + totalReturn,
      earnedTotal + rewardEarned,
      [tx, ...transactions].slice(0, 50),
      updatedStakes,
      reservations
    );
    return true;
  };

  const earnReward = (amount: number, description: string) => {
    const tx: Transaction = {
      id: genId(),
      type: "earn",
      amount,
      description,
      timestamp: Date.now(),
    };
    persist(
      balance + amount,
      earnedTotal + amount,
      [tx, ...transactions].slice(0, 50),
      stakes,
      reservations
    );
  };

  const spendBalance = (amount: number, description: string): boolean => {
    if (amount > balance || amount <= 0) return false;
    const tx: Transaction = {
      id: genId(),
      type: "reserve",
      amount,
      description,
      timestamp: Date.now(),
    };
    persist(balance - amount, earnedTotal, [tx, ...transactions].slice(0, 50), stakes, reservations);
    return true;
  };

  const creditBalance = (amount: number, description: string): void => {
    const tx: Transaction = {
      id: genId(),
      type: "earn",
      amount,
      description,
      timestamp: Date.now(),
    };
    persist(balance + amount, earnedTotal, [tx, ...transactions].slice(0, 50), stakes, reservations);
  };

  const addReservation = (r: Omit<Reservation, "id" | "reserveDate">): boolean => {
    if (r.reservePrice > balance) return false;
    const reservation: Reservation = {
      ...r,
      id: genId(),
      reserveDate: Date.now(),
    };
    const tx: Transaction = {
      id: genId(),
      type: "reserve",
      amount: r.reservePrice,
      description: `Reserved ${r.nftName}`,
      timestamp: Date.now(),
    };
    persist(
      balance - r.reservePrice,
      earnedTotal,
      [tx, ...transactions].slice(0, 50),
      stakes,
      [reservation, ...reservations]
    );
    return true;
  };

  const cancelReservation = (id: string) => {
    const reservation = reservations.find((r) => r.id === id);
    if (!reservation) return;
    const updatedReservations = reservations.map((r) =>
      r.id === id ? { ...r, status: "expired" as const } : r
    );
    persist(
      balance + reservation.reservePrice,
      earnedTotal,
      transactions,
      stakes,
      updatedReservations
    );
  };

  return (
    <BalanceContext.Provider
      value={{
        balance,
        stakedTotal,
        earnedTotal,
        transactions,
        stakes,
        reservations,
        stakeTokens,
        unstakeTokens,
        earnReward,
        spendBalance,
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
