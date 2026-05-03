import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/authApi";
import { ALL_TICKS, TickItem } from "@/context/TickContext";

// ─── DB types ─────────────────────────────────────────────────────────────────
export interface DBShopItem {
  id: string;
  type: "badge" | "circle";
  name: string;
  price: number;
  zone: "badge" | "circle";
  color: string;
  freeMinPlan: number;
  isGold: boolean;
  sort_order: number;
}

export interface DBUserItem {
  id: string;       // user_items row id
  user_id: string;
  item_id: string;  // shop_items.id
  purchased_at: string;
  is_active: boolean;
  item: DBShopItem | null;
}

// Map DB shop item → TickItem (with static imageSource from TickContext)
function dbItemToTickItem(db: DBShopItem): TickItem {
  const staticTick = ALL_TICKS.find((t) => t.name === db.name);
  return {
    id: db.id,          // use DB uuid as the tick id
    name: db.name,
    price: db.price,
    zone: db.zone,
    color: db.color,
    imageSource: staticTick?.imageSource ?? null,
    isGold: db.isGold,
    freeMinPlan: db.freeMinPlan,
  };
}

// ─── useShopItems ─────────────────────────────────────────────────────────────
// Fetches shop items from DB (with auto-seed on first empty response)
export function useShopItems() {
  const [badgeTicks, setBadgeTicks] = useState<TickItem[]>([]);
  const [circleTicks, setCircleTicks] = useState<TickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/shop-items`);
      const json = await res.json() as {
        badge?: DBShopItem[];
        circle?: DBShopItem[];
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Fetch failed");

      const badge = (json.badge ?? []).map(dbItemToTickItem);
      const circle = (json.circle ?? []).map(dbItemToTickItem);

      if (badge.length + circle.length === 0) {
        // Auto-seed and retry
        fetch(`${API_BASE}/shop-items/seed`, { method: "POST" })
          .then(() => setTimeout(fetchItems, 800))
          .catch(() => {});
      } else {
        setBadgeTicks(badge);
        setCircleTicks(circle);
      }
    } catch (err: any) {
      console.warn("[useShopItems] fetch failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { badgeTicks, circleTicks, loading, error, refetch: fetchItems };
}

// ─── useUserItems ─────────────────────────────────────────────────────────────
// Manages owned/active items for the authenticated user — token is required
export function useUserItems(token: string | null | undefined) {
  const [userItems, setUserItems] = useState<DBUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = (extra?: Record<string, string>) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  });

  const fetchUserItems = useCallback(async () => {
    if (!token) { setUserItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/user-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { userItems?: DBUserItem[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Fetch failed");
      setUserItems(json.userItems ?? []);
    } catch (err: any) {
      console.warn("[useUserItems] fetch failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUserItems(); }, [fetchUserItems]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const ownedItemIds = userItems.map((u) => u.item_id);

  const activeBadgeItem = userItems.find(
    (u) => u.is_active && u.item?.zone === "badge"
  ) ?? null;

  const activeCircleItem = userItems.find(
    (u) => u.is_active && u.item?.zone === "circle"
  ) ?? null;

  // ── API actions ───────────────────────────────────────────────────────────
  const buyItem = useCallback(async (itemId: string): Promise<DBUserItem | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/user-items`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ item_id: itemId }),
      });
      const json = await res.json() as { userItem?: DBUserItem; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Buy failed");
      if (json.userItem) {
        setUserItems((prev) => {
          const zone = json.userItem!.item?.zone;
          return [
            json.userItem!,
            ...prev.map((u) =>
              u.item?.zone === zone && u.is_active
                ? { ...u, is_active: false }
                : u
            ).filter((u) => u.item_id !== json.userItem!.item_id),
          ];
        });
        return json.userItem;
      }
    } catch (err: any) {
      console.warn("[useUserItems] buyItem error:", err.message);
    }
    return null;
  }, [token]);

  const activateItem = useCallback(async (itemId: string): Promise<DBUserItem | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/user-items/activate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ item_id: itemId }),
      });
      const json = await res.json() as { userItem?: DBUserItem; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Activate failed");
      if (json.userItem) {
        const zone = json.userItem.item?.zone;
        setUserItems((prev) => prev.map((u) => {
          if (u.item_id === itemId) return { ...u, is_active: true };
          if (u.item?.zone === zone && u.is_active) return { ...u, is_active: false };
          return u;
        }));
        return json.userItem;
      }
    } catch (err: any) {
      console.warn("[useUserItems] activateItem error:", err.message);
    }
    return null;
  }, [token]);

  const deactivateType = useCallback(async (type: "badge" | "circle"): Promise<void> => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/user-items/deactivate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type }),
      });
      setUserItems((prev) => prev.map((u) =>
        u.item?.zone === type && u.is_active ? { ...u, is_active: false } : u
      ));
    } catch (err: any) {
      console.warn("[useUserItems] deactivateType error:", err.message);
    }
  }, [token]);

  return {
    userItems,
    ownedItemIds,
    activeBadgeItem,
    activeCircleItem,
    loading,
    error,
    refetch: fetchUserItems,
    buyItem,
    activateItem,
    deactivateType,
  };
}
