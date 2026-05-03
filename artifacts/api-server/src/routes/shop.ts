import { Router, Request, Response, NextFunction, type IRouter } from "express";
import { verifyToken } from "../services/auth.service.js";
import supabase from "../lib/supabase";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  try {
    const payload = verifyToken(auth.slice(7));
    (req as any).userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

// ─── DB columns ───────────────────────────────────────────────────────────────
// shop_items : id, type, name, price, created_at
// user_items : id, user_id, item_id, purchased_at, is_active

// Static enrichment map (type+name → color, zone, freeMinPlan, isGold)
const STATIC_ITEMS: Record<string, { color: string; zone: "badge" | "circle"; freeMinPlan: number; isGold?: boolean }> = {
  "Green Badge":  { color: "#4CAF50", zone: "badge",  freeMinPlan: 3 },
  "Teal Badge":   { color: "#26C6DA", zone: "badge",  freeMinPlan: 3 },
  "Blue Badge":   { color: "#42A5F5", zone: "badge",  freeMinPlan: 3 },
  "Red Badge":    { color: "#EF5350", zone: "badge",  freeMinPlan: 3 },
  "Orange Badge": { color: "#FFA726", zone: "badge",  freeMinPlan: 3 },
  "Gold Badge":   { color: "#FFD700", zone: "badge",  freeMinPlan: 5, isGold: true },
  "Purple Tick":  { color: "#7C4DFF", zone: "circle", freeMinPlan: 4 },
  "Blue Tick":    { color: "#3B82F6", zone: "circle", freeMinPlan: 4 },
  "Red Tick":     { color: "#EF5350", zone: "circle", freeMinPlan: 3 },
  "Pink Tick":    { color: "#EC407A", zone: "circle", freeMinPlan: 4 },
  "Green Tick":   { color: "#26A69A", zone: "circle", freeMinPlan: 3 },
  "Gold Tick":    { color: "#FFD700", zone: "circle", freeMinPlan: 5, isGold: true },
};

// Sort order within a zone
const SORT_ORDER: Record<string, number> = {
  "Green Badge": 1, "Teal Badge": 2, "Blue Badge": 3,
  "Red Badge": 4, "Orange Badge": 5, "Gold Badge": 6,
  "Purple Tick": 1, "Blue Tick": 2, "Red Tick": 3,
  "Pink Tick": 4, "Green Tick": 5, "Gold Tick": 6,
};

function enrich(item: { id: string; type: string; name: string; price: number }) {
  const meta = STATIC_ITEMS[item.name] ?? { color: "#888", zone: item.type as "badge" | "circle", freeMinPlan: 99 };
  return {
    ...item,
    zone: meta.zone,
    color: meta.color,
    freeMinPlan: meta.freeMinPlan,
    isGold: meta.isGold ?? false,
    sort_order: SORT_ORDER[item.name] ?? 99,
  };
}

// ─── GET /api/shop-items ─────────────────────────────────────────────────────
router.get("/shop-items", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("shop_items")
      .select("id, type, name, price");

    if (error) {
      console.error("[Shop] fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const items = (data ?? []).map(enrich).sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.sort_order - b.sort_order;
    });

    const badge = items.filter((i) => i.zone === "badge");
    const circle = items.filter((i) => i.zone === "circle");

    return res.json({ items, badge, circle });
  } catch (err: any) {
    console.error("[Shop] GET /shop-items:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/shop-items/seed ────────────────────────────────────────────────
router.post("/shop-items/seed", async (_req, res) => {
  try {
    const { data: existing } = await supabase.from("shop_items").select("id").limit(1);
    if (existing && existing.length > 0) {
      return res.json({ message: "Already seeded." });
    }

    const seeds = [
      { type: "badge",  name: "Green Badge",  price: 99.99  },
      { type: "badge",  name: "Teal Badge",   price: 99.99  },
      { type: "badge",  name: "Blue Badge",   price: 99.99  },
      { type: "badge",  name: "Red Badge",    price: 99.99  },
      { type: "badge",  name: "Orange Badge", price: 99.99  },
      { type: "badge",  name: "Gold Badge",   price: 499.99 },
      { type: "circle", name: "Purple Tick",  price: 49.99  },
      { type: "circle", name: "Blue Tick",    price: 49.99  },
      { type: "circle", name: "Red Tick",     price: 49.99  },
      { type: "circle", name: "Pink Tick",    price: 49.99  },
      { type: "circle", name: "Green Tick",   price: 49.99  },
      { type: "circle", name: "Gold Tick",    price: 499.99 },
    ];

    const { data, error } = await supabase.from("shop_items").insert(seeds).select("id, name");
    if (error) {
      console.error("[Shop] seed error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Shop] Seeded ${data?.length ?? 0} shop items`);
    return res.json({ success: true, seeded: data?.length ?? 0 });
  } catch (err: any) {
    console.error("[Shop] POST /shop-items/seed:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/user-items ─────────────────────────────────────────────────────
// Returns all items owned by the authenticated user
router.get("/user-items", requireAuth, async (req, res) => {
  try {
    const user_id = (req as any).userId as string;

    const { data, error } = await supabase
      .from("user_items")
      .select("id, user_id, item_id, purchased_at, is_active")
      .eq("user_id", user_id)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("[Shop] user-items fetch error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with shop_item details
    const itemIds = [...new Set((data ?? []).map((u) => u.item_id))];
    let shopMap: Record<string, any> = {};
    if (itemIds.length > 0) {
      const { data: shopItems } = await supabase
        .from("shop_items")
        .select("id, type, name, price")
        .in("id", itemIds);
      (shopItems ?? []).forEach((s) => { shopMap[s.id] = enrich(s); });
    }

    const enriched = (data ?? []).map((u) => ({
      ...u,
      item: shopMap[u.item_id] ?? null,
    }));

    return res.json({ userItems: enriched });
  } catch (err: any) {
    console.error("[Shop] GET /user-items:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/user-items ─────────────────────────────────────────────────────
// Body: { item_id }  — user_id comes from JWT token
router.post("/user-items", requireAuth, async (req, res) => {
  try {
    const user_id = (req as any).userId as string;
    const body = req.body ?? {};
    const item_id = String(body.item_id ?? body.itemId ?? "").trim();

    if (!item_id) {
      return res.status(400).json({ error: "item_id is required." });
    }
    console.log(`[Shop] POST /user-items user=${user_id} item=${item_id}`);

    // Check already owned
    const { data: existing } = await supabase
      .from("user_items")
      .select("id, is_active")
      .eq("user_id", user_id)
      .eq("item_id", item_id)
      .single();

    if (existing) {
      // Already owned — just activate it
      return activateItem(user_id, item_id, existing.id, res);
    }

    // Fetch item to get its type
    const { data: shopItem, error: siErr } = await supabase
      .from("shop_items")
      .select("id, type, name, price")
      .eq("id", item_id)
      .single();

    if (siErr || !shopItem) {
      return res.status(404).json({ error: "Shop item not found." });
    }

    // Deactivate all user_items of the same type for this user
    const { data: sameType } = await supabase
      .from("user_items")
      .select("id")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (sameType && sameType.length > 0) {
      // Get item_ids of active items and check type
      const activeItemIds = sameType.map((u: any) => u.id);
      const { data: activeShopItems } = await supabase
        .from("shop_items")
        .select("id, type")
        .eq("type", shopItem.type);

      const activeShopIds = new Set((activeShopItems ?? []).map((s: any) => s.id));

      // Deactivate active items of same type
      for (const ui of sameType) {
        const { data: uiDetail } = await supabase
          .from("user_items")
          .select("item_id")
          .eq("id", ui.id)
          .single();
        if (uiDetail && activeShopIds.has(uiDetail.item_id)) {
          await supabase.from("user_items").update({ is_active: false }).eq("id", ui.id);
        }
      }
    }

    // Insert new owned item
    const purchased_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("user_items")
      .insert([{ user_id, item_id, purchased_at, is_active: true }])
      .select("id, user_id, item_id, purchased_at, is_active")
      .single();

    if (error || !data) {
      console.error("[Shop] user-items insert error:", error?.message);
      return res.status(500).json({ error: error?.message ?? "Failed to buy item." });
    }

    console.log(`[Shop] User ${user_id} bought item ${shopItem.name}`);
    return res.json({ success: true, userItem: { ...data, item: enrich(shopItem) } });
  } catch (err: any) {
    console.error("[Shop] POST /user-items:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/user-items/activate ────────────────────────────────────────────
// Body: { item_id }  — user_id comes from JWT token
router.post("/user-items/activate", requireAuth, async (req, res) => {
  try {
    const user_id = (req as any).userId as string;
    const body = req.body ?? {};
    const item_id = String(body.item_id ?? body.itemId ?? "").trim();

    if (!item_id) {
      return res.status(400).json({ error: "item_id is required." });
    }
    console.log(`[Shop] POST /user-items/activate user=${user_id} item=${item_id}`);

    const { data: ui } = await supabase
      .from("user_items")
      .select("id")
      .eq("user_id", user_id)
      .eq("item_id", item_id)
      .single();

    if (!ui) return res.status(404).json({ error: "Item not owned." });
    return activateItem(user_id, item_id, ui.id, res);
  } catch (err: any) {
    console.error("[Shop] POST /user-items/activate:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/user-items/deactivate ─────────────────────────────────────────
// Body: { type }  (type = 'badge' | 'circle') — user_id comes from JWT token
router.post("/user-items/deactivate", requireAuth, async (req, res) => {
  try {
    const user_id = (req as any).userId as string;
    const body = req.body ?? {};
    const type    = String(body.type ?? "").trim() as "badge" | "circle";

    if (!type) {
      return res.status(400).json({ error: "type is required." });
    }
    console.log(`[Shop] POST /user-items/deactivate user=${user_id} type=${type}`);

    // Get all shop_items of this type
    const { data: shopItems } = await supabase
      .from("shop_items")
      .select("id")
      .eq("type", type);

    const typeItemIds = (shopItems ?? []).map((s: any) => s.id);
    if (typeItemIds.length === 0) return res.json({ success: true, deactivated: 0 });

    // Deactivate all active user_items matching this type
    const { data, error } = await supabase
      .from("user_items")
      .update({ is_active: false })
      .eq("user_id", user_id)
      .eq("is_active", true)
      .in("item_id", typeItemIds)
      .select("id");

    if (error) {
      console.error("[Shop] deactivate error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Shop] Deactivated ${data?.length ?? 0} ${type} items for user ${user_id}`);
    return res.json({ success: true, deactivated: data?.length ?? 0 });
  } catch (err: any) {
    console.error("[Shop] POST /user-items/deactivate:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Shared activate helper ────────────────────────────────────────────────────
async function activateItem(user_id: string, item_id: string, ui_id: string, res: any) {
  // Fetch item type
  const { data: shopItem } = await supabase
    .from("shop_items")
    .select("id, type, name, price")
    .eq("id", item_id)
    .single();

  if (!shopItem) return res.status(404).json({ error: "Shop item not found." });

  // Get all items of same type owned by user
  const { data: sameTypeItems } = await supabase
    .from("shop_items")
    .select("id")
    .eq("type", shopItem.type);

  const sameTypeIds = (sameTypeItems ?? []).map((s: any) => s.id);

  // Deactivate existing active items of same type
  if (sameTypeIds.length > 0) {
    await supabase
      .from("user_items")
      .update({ is_active: false })
      .eq("user_id", user_id)
      .eq("is_active", true)
      .in("item_id", sameTypeIds);
  }

  // Activate the target item
  const { data, error } = await supabase
    .from("user_items")
    .update({ is_active: true })
    .eq("id", ui_id)
    .select("id, user_id, item_id, purchased_at, is_active")
    .single();

  if (error || !data) {
    console.error("[Shop] activate error:", error?.message);
    return res.status(500).json({ error: error?.message ?? "Failed to activate." });
  }

  console.log(`[Shop] Activated ${shopItem.name} for user ${user_id}`);
  return res.json({ success: true, userItem: { ...data, item: enrich(shopItem) } });
}

export default router;
