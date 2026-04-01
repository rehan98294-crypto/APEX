import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://juqdsjlnvdbzvwqzhjrb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cWRzamxudmRienZ3cXpoanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAzMjcsImV4cCI6MjA5MDE4NjMyN30.BF_SbIkXJDA79mgccYuzjoyt9IOYiMW2sf9hEf5hSQs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchAllNFTs(): Promise<{ name: string; image_url: string; level: number }[]> {
  try {
    const { data, error } = await supabase
      .from("nfts")
      .select("title, image_url, level")
      .limit(30);
    if (error || !data) return [];
    return data.map((r) => ({ name: r.title, image_url: r.image_url, level: r.level ?? 1 }));
  } catch {
    return [];
  }
}

// ─── Order persistence ────────────────────────────────────────────────────────

export interface DBOrder {
  order_id: string;
  user_id: string;
  nft_id: string;
  status: "processing" | "bought" | "sold";
  profit: number;
  price: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export async function insertOrderToDB(order: DBOrder): Promise<void> {
  try {
    const { error } = await supabase.from("orders").insert([order]);
    if (error) {
      console.error("[Supabase] insertOrder error:", error.message);
    } else {
      console.log("[Supabase] Order inserted:", order.order_id, "status:", order.status);
    }
  } catch (err) {
    console.error("[Supabase] insertOrder exception:", err);
  }
}

export async function updateOrderInDB(
  order_id: string,
  updates: Partial<Pick<DBOrder, "status" | "nft_id" | "profit" | "price" | "level">>
): Promise<void> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("order_id", order_id);
    if (error) {
      console.error("[Supabase] updateOrder error:", error.message);
    } else {
      console.log("[Supabase] Order updated:", order_id, "→", updates.status ?? "(no status change)");
    }
  } catch (err) {
    console.error("[Supabase] updateOrder exception:", err);
  }
}

export async function fetchRandomNFT(): Promise<{ name: string; image_url: string; level: number } | null> {
  try {
    const { data, error } = await supabase
      .from("nfts")
      .select("title, image_url, level")
      .limit(50);

    if (error || !data || data.length === 0) return null;

    const random = data[Math.floor(Math.random() * data.length)];
    return { name: random.title, image_url: random.image_url, level: random.level ?? 1 };
  } catch {
    return null;
  }
}
