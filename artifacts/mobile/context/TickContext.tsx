import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TICK_STORAGE_KEY = "apexnft_ticks_v2";

export type TickZone = "badge" | "circle";

export interface TickItem {
  id: string;
  name: string;
  price: number;
  zone: TickZone;
  color: string;
  imageSource: any;
  isGold?: boolean;
  freeMinPlan?: number;
}

export const BADGE_TICKS: TickItem[] = [
  { id: "badge-green",  name: "Green Badge",  price: 99.99, zone: "badge", color: "#4CAF50", imageSource: require("../assets/ticks/badge-green.jpeg"),  freeMinPlan: 3 },
  { id: "badge-teal",   name: "Teal Badge",   price: 99.99, zone: "badge", color: "#26C6DA", imageSource: require("../assets/ticks/badge-teal.jpeg"),   freeMinPlan: 3 },
  { id: "badge-blue",   name: "Blue Badge",   price: 99.99, zone: "badge", color: "#42A5F5", imageSource: require("../assets/ticks/badge-blue.jpeg"),   freeMinPlan: 3 },
  { id: "badge-red",    name: "Red Badge",    price: 99.99, zone: "badge", color: "#EF5350", imageSource: require("../assets/ticks/badge-red.jpeg"),    freeMinPlan: 3 },
  { id: "badge-orange", name: "Orange Badge", price: 99.99, zone: "badge", color: "#FFA726", imageSource: require("../assets/ticks/badge-orange.jpeg"), freeMinPlan: 3 },
  { id: "badge-gold",   name: "Gold Badge",   price: 499.99, zone: "badge", color: "#FFD700", imageSource: null, isGold: true,                          freeMinPlan: 5 },
];

export const CIRCLE_TICKS: TickItem[] = [
  { id: "circle-purple", name: "Purple Tick", price: 49.99, zone: "circle", color: "#7C4DFF", imageSource: require("../assets/ticks/circle-purple.jpeg"), freeMinPlan: 4 },
  { id: "circle-blue",   name: "Blue Tick",   price: 49.99, zone: "circle", color: "#3B82F6", imageSource: require("../assets/ticks/circle-blue.jpeg"),   freeMinPlan: 4 },
  { id: "circle-red",    name: "Red Tick",    price: 49.99, zone: "circle", color: "#EF5350", imageSource: require("../assets/ticks/circle-red.jpeg"),    freeMinPlan: 3 },
  { id: "circle-pink",   name: "Pink Tick",   price: 49.99, zone: "circle", color: "#EC407A", imageSource: require("../assets/ticks/circle-pink.jpeg"),   freeMinPlan: 4 },
  { id: "circle-green",  name: "Green Tick",  price: 49.99, zone: "circle", color: "#26A69A", imageSource: require("../assets/ticks/circle-green.jpeg"),  freeMinPlan: 3 },
  { id: "circle-gold",   name: "Gold Tick",   price: 499.99, zone: "circle", color: "#FFD700", imageSource: null, isGold: true,                            freeMinPlan: 5 },
];

export const ALL_TICKS = [...BADGE_TICKS, ...CIRCLE_TICKS];

interface TickState {
  ownedTickIds: string[];
  activeTickId: string | null;
  activeTick: TickItem | null;
  purchaseTick: (tick: TickItem) => void;
  activateTick: (tick: TickItem) => void;
  deactivateTick: () => void;
  grantTick: (tickId: string) => void;
  isOwned: (tickId: string) => boolean;
}

const TickContext = createContext<TickState>({
  ownedTickIds: [],
  activeTickId: null,
  activeTick: null,
  purchaseTick: () => {},
  activateTick: () => {},
  deactivateTick: () => {},
  grantTick: () => {},
  isOwned: () => false,
});

export function TickProvider({ children }: { children: React.ReactNode }) {
  const [ownedTickIds, setOwnedTickIds] = useState<string[]>([]);
  const [activeTickId, setActiveTickId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TICK_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.owned) setOwnedTickIds(saved.owned);
        if (saved.active) setActiveTickId(saved.active);
      } catch {}
    });
  }, []);

  const save = (owned: string[], active: string | null) => {
    AsyncStorage.setItem(TICK_STORAGE_KEY, JSON.stringify({ owned, active }));
  };

  const purchaseTick = (tick: TickItem) => {
    if (ownedTickIds.includes(tick.id)) return;
    const next = [...ownedTickIds, tick.id];
    setOwnedTickIds(next);
    save(next, activeTickId);
  };

  const grantTick = (tickId: string) => {
    if (ownedTickIds.includes(tickId)) return;
    const next = [...ownedTickIds, tickId];
    setOwnedTickIds(next);
    save(next, activeTickId);
  };

  const activateTick = (tick: TickItem) => {
    setActiveTickId(tick.id);
    if (!ownedTickIds.includes(tick.id)) {
      const next = [...ownedTickIds, tick.id];
      setOwnedTickIds(next);
      save(next, tick.id);
    } else {
      save(ownedTickIds, tick.id);
    }
  };

  const deactivateTick = () => {
    setActiveTickId(null);
    save(ownedTickIds, null);
  };

  const isOwned = (tickId: string) => ownedTickIds.includes(tickId);

  const activeTick = activeTickId ? (ALL_TICKS.find((t) => t.id === activeTickId) ?? null) : null;

  return (
    <TickContext.Provider value={{ ownedTickIds, activeTickId, activeTick, purchaseTick, activateTick, deactivateTick, grantTick, isOwned }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  return useContext(TickContext);
}
