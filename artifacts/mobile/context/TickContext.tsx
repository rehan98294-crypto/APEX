import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TICK_STORAGE_KEY = "apexnft_ticks_v3";

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

// ─── Static tick definitions (image sources + visual config) ──────────────────
export const BADGE_TICKS: TickItem[] = [
  { id: "badge-green",  name: "Green Badge",  price: 99.99,  zone: "badge", color: "#4CAF50", imageSource: require("../assets/ticks/badge-green.jpeg"),  freeMinPlan: 3 },
  { id: "badge-teal",   name: "Teal Badge",   price: 99.99,  zone: "badge", color: "#26C6DA", imageSource: require("../assets/ticks/badge-teal.jpeg"),   freeMinPlan: 3 },
  { id: "badge-blue",   name: "Blue Badge",   price: 99.99,  zone: "badge", color: "#42A5F5", imageSource: require("../assets/ticks/badge-blue.jpeg"),   freeMinPlan: 3 },
  { id: "badge-red",    name: "Red Badge",    price: 99.99,  zone: "badge", color: "#EF5350", imageSource: require("../assets/ticks/badge-red.jpeg"),    freeMinPlan: 3 },
  { id: "badge-orange", name: "Orange Badge", price: 99.99,  zone: "badge", color: "#FFA726", imageSource: require("../assets/ticks/badge-orange.jpeg"), freeMinPlan: 3 },
  { id: "badge-gold",   name: "Gold Badge",   price: 499.99, zone: "badge", color: "#FFD700", imageSource: null, isGold: true, freeMinPlan: 5 },
];

export const CIRCLE_TICKS: TickItem[] = [
  { id: "circle-purple", name: "Purple Tick", price: 49.99,  zone: "circle", color: "#7C4DFF", imageSource: require("../assets/ticks/circle-purple.jpeg"), freeMinPlan: 4 },
  { id: "circle-blue",   name: "Blue Tick",   price: 49.99,  zone: "circle", color: "#3B82F6", imageSource: require("../assets/ticks/circle-blue.jpeg"),   freeMinPlan: 4 },
  { id: "circle-red",    name: "Red Tick",    price: 49.99,  zone: "circle", color: "#EF5350", imageSource: require("../assets/ticks/circle-red.jpeg"),    freeMinPlan: 3 },
  { id: "circle-pink",   name: "Pink Tick",   price: 49.99,  zone: "circle", color: "#EC407A", imageSource: require("../assets/ticks/circle-pink.jpeg"),   freeMinPlan: 4 },
  { id: "circle-green",  name: "Green Tick",  price: 49.99,  zone: "circle", color: "#26A69A", imageSource: require("../assets/ticks/circle-green.jpeg"),  freeMinPlan: 3 },
  { id: "circle-gold",   name: "Gold Tick",   price: 499.99, zone: "circle", color: "#FFD700", imageSource: null, isGold: true, freeMinPlan: 5 },
];

export const ALL_TICKS = [...BADGE_TICKS, ...CIRCLE_TICKS];

// ─── Context interface ─────────────────────────────────────────────────────────
interface TickState {
  // Owned IDs (static-slug-based for AsyncStorage OR db UUIDs)
  ownedTickIds: string[];
  // Per-zone active IDs
  activeBadgeId: string | null;
  activeCircleId: string | null;
  // Resolved tick objects (null = none active)
  activeBadgeTick: TickItem | null;
  activeCircleTick: TickItem | null;
  // Backward compat: last activated tick overall
  activeTickId: string | null;
  activeTick: TickItem | null;
  // Actions
  purchaseTick: (tick: TickItem) => void;
  activateTick: (tick: TickItem) => void;
  deactivateTick: (zone?: TickZone) => void;
  grantTick: (tickId: string) => void;
  isOwned: (tickId: string) => boolean;
  // DB sync: called on app load from useUserItems
  syncFromDB: (ownedIds: string[], activeBadgeId: string | null, activeCircleId: string | null, tickLookup: Map<string, TickItem>) => void;
}

const TickContext = createContext<TickState>({
  ownedTickIds: [],
  activeBadgeId: null,
  activeCircleId: null,
  activeBadgeTick: null,
  activeCircleTick: null,
  activeTickId: null,
  activeTick: null,
  purchaseTick: () => {},
  activateTick: () => {},
  deactivateTick: () => {},
  grantTick: () => {},
  isOwned: () => false,
  syncFromDB: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function TickProvider({ children }: { children: React.ReactNode }) {
  const [ownedTickIds, setOwnedTickIds] = useState<string[]>([]);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  // Extra map for DB-fetched items (uuid → TickItem)
  const [dbTickMap, setDbTickMap] = useState<Map<string, TickItem>>(new Map());

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(TICK_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.owned)  setOwnedTickIds(saved.owned);
        if (saved.badge)  setActiveBadgeId(saved.badge);
        if (saved.circle) setActiveCircleId(saved.circle);
      } catch {}
    });
  }, []);

  const save = useCallback((owned: string[], badge: string | null, circle: string | null) => {
    AsyncStorage.setItem(TICK_STORAGE_KEY, JSON.stringify({ owned, badge, circle }));
  }, []);

  // Resolve a tick by id: check DB map first, then static ALL_TICKS
  const resolveTick = useCallback((id: string | null, map: Map<string, TickItem>): TickItem | null => {
    if (!id) return null;
    if (map.has(id)) return map.get(id)!;
    return ALL_TICKS.find((t) => t.id === id) ?? null;
  }, []);

  // ── DB Sync ───────────────────────────────────────────────────────────────
  const syncFromDB = useCallback((
    ownedIds: string[],
    dbBadgeId: string | null,
    dbCircleId: string | null,
    tickLookup: Map<string, TickItem>,
  ) => {
    setDbTickMap(tickLookup);
    setOwnedTickIds(ownedIds);
    if (dbBadgeId) setActiveBadgeId(dbBadgeId);
    if (dbCircleId) setActiveCircleId(dbCircleId);
    // Persist to AsyncStorage
    save(ownedIds, dbBadgeId, dbCircleId);
  }, [save]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const purchaseTick = useCallback((tick: TickItem) => {
    setOwnedTickIds((prev) => {
      if (prev.includes(tick.id)) return prev;
      const next = [...prev, tick.id];
      save(next, activeBadgeId, activeCircleId);
      return next;
    });
  }, [activeBadgeId, activeCircleId, save]);

  const grantTick = useCallback((tickId: string) => {
    setOwnedTickIds((prev) => {
      if (prev.includes(tickId)) return prev;
      const next = [...prev, tickId];
      save(next, activeBadgeId, activeCircleId);
      return next;
    });
  }, [activeBadgeId, activeCircleId, save]);

  const activateTick = useCallback((tick: TickItem) => {
    // Ensure ownership
    setOwnedTickIds((prev) => {
      const next = prev.includes(tick.id) ? prev : [...prev, tick.id];
      return next;
    });
    // Set zone-specific active
    if (tick.zone === "badge") {
      setActiveBadgeId(tick.id);
      save(ownedTickIds, tick.id, activeCircleId);
    } else {
      setActiveCircleId(tick.id);
      save(ownedTickIds, activeBadgeId, tick.id);
    }
  }, [ownedTickIds, activeBadgeId, activeCircleId, save]);

  const deactivateTick = useCallback((zone?: TickZone) => {
    if (!zone) {
      // Deactivate both
      setActiveBadgeId(null);
      setActiveCircleId(null);
      save(ownedTickIds, null, null);
    } else if (zone === "badge") {
      setActiveBadgeId(null);
      save(ownedTickIds, null, activeCircleId);
    } else {
      setActiveCircleId(null);
      save(ownedTickIds, activeBadgeId, null);
    }
  }, [ownedTickIds, activeBadgeId, activeCircleId, save]);

  const isOwned = useCallback((tickId: string) => ownedTickIds.includes(tickId), [ownedTickIds]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeBadgeTick = resolveTick(activeBadgeId, dbTickMap);
  const activeCircleTick = resolveTick(activeCircleId, dbTickMap);
  // Backward-compat: last activated
  const activeTickId = activeBadgeId ?? activeCircleId;
  const activeTick = activeBadgeTick ?? activeCircleTick;

  return (
    <TickContext.Provider value={{
      ownedTickIds,
      activeBadgeId,
      activeCircleId,
      activeBadgeTick,
      activeCircleTick,
      activeTickId,
      activeTick,
      purchaseTick,
      activateTick,
      deactivateTick,
      grantTick,
      isOwned,
      syncFromDB,
    }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  return useContext(TickContext);
}
