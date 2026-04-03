import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /api/nfts?page=1&limit=20&category=Stake&search=apex
router.get("/nfts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const category = String(req.query.category ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const offset = (page - 1) * limit;

    // Count query
    let countQuery = supabase.from("nfts").select("*", { count: "exact", head: true });
    if (category && category !== "All") countQuery = countQuery.eq("category", category);
    if (search) countQuery = countQuery.ilike("title", `%${search}%`);

    const { count, error: countError } = await countQuery;
    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const totalItems = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    // Data query
    let dataQuery = supabase
      .from("nfts")
      .select("id, title, image_url, level, min_price, max_price, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== "All") dataQuery = dataQuery.eq("category", category);
    if (search) dataQuery = dataQuery.ilike("title", `%${search}%`);

    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      return res.status(500).json({ error: dataError.message });
    }

    console.log(`[API] GET /api/nfts page=${page} limit=${limit} offset=${offset} → ${data?.length ?? 0}/${totalItems}`);

    return res.json({
      data: data ?? [],
      page,
      limit,
      totalPages,
      totalItems,
      hasMore: page < totalPages,
    });
  } catch (err: any) {
    console.error("[API] GET /api/nfts error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/orders?userId=xxx&page=1&limit=20&status=bought
router.get("/orders", async (req, res) => {
  try {
    const userId = String(req.query.userId ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    // Count query
    let countQuery = supabase.from("orders").select("*", { count: "exact", head: true });
    if (userId) countQuery = countQuery.eq("user_id", userId);
    if (status) countQuery = countQuery.eq("status", status);

    const { count, error: countError } = await countQuery;
    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const totalItems = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    // Data query
    let dataQuery = supabase
      .from("orders")
      .select("order_id, user_id, nft_id, status, profit, price, level, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) dataQuery = dataQuery.eq("user_id", userId);
    if (status) dataQuery = dataQuery.eq("status", status);

    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      return res.status(500).json({ error: dataError.message });
    }

    console.log(`[API] GET /api/orders userId=${userId} page=${page} → ${data?.length ?? 0}/${totalItems}`);

    return res.json({
      data: data ?? [],
      page,
      limit,
      totalPages,
      totalItems,
      hasMore: page < totalPages,
    });
  } catch (err: any) {
    console.error("[API] GET /api/orders error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
