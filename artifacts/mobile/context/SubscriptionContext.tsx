import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type PlanId = "basic" | "advance" | "pro" | "elite" | "ultimate";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  color: string;
  gradientColors: [string, string];
  tickColor: string;
  tickLabel: string;
  unlocksLevel: number;
  deposit: number;
  depositRange: string;
  incomeBoost: number;
  stakeBoost: number;
  membersOnly: number;
  withdrawal: string;
  perks: string[];
}

export const PLANS: PlanConfig[] = [
  {
    id: "basic",
    name: "Basic",
    price: 99,
    color: "#5CBFFE",
    gradientColors: ["#5CBFFE", "#3aaae8"],
    tickColor: "#5CBFFE",
    tickLabel: "Basic",
    unlocksLevel: 2,
    deposit: 380,
    depositRange: "500 ~ 2,200",
    incomeBoost: 0.1,
    stakeBoost: 0.1,
    membersOnly: 5,
    withdrawal: "2,200 TFT",
    perks: [
      "🔓 Unlock Level 2",
      "📈 +0.1% Income rate boost",
      "💎 +0.1% Stake earn boost",
      "🏦 Deposit range 500–2,200 TFT",
      "👥 Max 5 members",
      "💸 Withdrawal up to 2,200 TFT",
      "🗂 Free zone access only",
    ],
  },
  {
    id: "advance",
    name: "Advance",
    price: 499,
    color: "#2BD9A8",
    gradientColors: ["#2BD9A8", "#1db88b"],
    tickColor: "#2BD9A8",
    tickLabel: "Advance",
    unlocksLevel: 3,
    deposit: 1200,
    depositRange: "2,200 ~ 5,500",
    incomeBoost: 0.2,
    stakeBoost: 0.2,
    membersOnly: 14,
    withdrawal: "5,500 TFT",
    perks: [
      "🔓 Unlock Level 3",
      "📈 +0.2% Income rate boost",
      "💎 +0.2% Stake earn boost",
      "🏦 Deposit range 2,200–5,500 TFT",
      "👥 Max 14 members",
      "💸 Withdrawal up to 5,500 TFT",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1099,
    color: "#FF7A45",
    gradientColors: ["#FFB08A", "#FF7A45"],
    tickColor: "#FF4444",
    tickLabel: "Red Tick",
    unlocksLevel: 4,
    deposit: 4500,
    depositRange: "4,500+ TFT",
    incomeBoost: 0.3,
    stakeBoost: 0.3,
    membersOnly: 28,
    withdrawal: "Higher limits",
    perks: [
      "🔓 Unlock Level 4",
      "📈 +0.3% Income rate boost",
      "💎 +0.3% Stake earn boost",
      "🏦 Deposit only 4,500 TFT",
      "🏆 Access to higher achievements",
      "✅ Red verification tick (free)",
      "👥 Max 28 members",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 2099,
    color: "#7C3AED",
    gradientColors: ["#9B59B6", "#7C3AED"],
    tickColor: "#3B82F6",
    tickLabel: "Blue Tick",
    unlocksLevel: 5,
    deposit: 6500,
    depositRange: "8,000 ~ 13,000",
    incomeBoost: 0.5,
    stakeBoost: 0.5,
    membersOnly: 52,
    withdrawal: "Verified + Faster",
    perks: [
      "🔓 Unlock Level 5",
      "📈 +0.5% Income rate boost",
      "💎 +0.5% Stake earn boost",
      "🏦 Deposit only 6,500 TFT",
      "🔵 Blue verification tick",
      "🎁 Mystery box unlock",
      "👥 Max 52 members",
      "⚡ Verified + faster withdrawal",
      "💸 Range 8,000–13,000 TFT",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: 5099,
    color: "#F59E0B",
    gradientColors: ["#FFD700", "#F59E0B"],
    tickColor: "#F59E0B",
    tickLabel: "Gold Tick",
    unlocksLevel: 6,
    deposit: 10000,
    depositRange: "10,000+ TFT",
    incomeBoost: 1.0,
    stakeBoost: 1.0,
    membersOnly: 115,
    withdrawal: "System password protected",
    perks: [
      "🔓 Unlock All Levels",
      "📈 +1% Income rate boost",
      "💎 +1% Stake earn boost",
      "🏦 Deposit only 10,000 TFT",
      "🥇 Golden verification tick",
      "🏆 Access to higher achievements",
      "🎁 Mystery box access",
      "🔐 System password protected withdrawal",
      "🎀 Free rare NFT",
      "💎 VIP service",
      "👥 Max 115 members",
    ],
  },
];

interface SubscriptionState {
  activePlan: PlanId | null;
  plan: PlanConfig | null;
  userLevel: number;
  stakeBoost: number;
  incomeBoost: number;
  subscribeToPlan: (planId: PlanId) => boolean;
  cancelPlan: () => void;
}

const SubscriptionContext = createContext<SubscriptionState>({
  activePlan: null,
  plan: null,
  userLevel: 1,
  stakeBoost: 0,
  incomeBoost: 0,
  subscribeToPlan: () => false,
  cancelPlan: () => {},
});

const STORAGE_KEY = "treasurefun_subscription_v1";

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [activePlan, setActivePlan] = useState<PlanId | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.activePlan) setActivePlan(saved.activePlan);
        } catch {}
      }
    });
  }, []);

  const plan = activePlan ? PLANS.find((p) => p.id === activePlan) ?? null : null;
  const userLevel = 6;
  const stakeBoost = 0;
  const incomeBoost = 0;

  const subscribeToPlan = (planId: PlanId): boolean => {
    setActivePlan(planId);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ activePlan: planId }));
    return true;
  };

  const cancelPlan = () => {
    setActivePlan(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SubscriptionContext.Provider
      value={{ activePlan, plan, userLevel, stakeBoost, incomeBoost, subscribeToPlan, cancelPlan }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
