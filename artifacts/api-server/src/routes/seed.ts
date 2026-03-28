import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

const IMAGE_BASES = [
  "https://picsum.photos/seed/nftape",
  "https://picsum.photos/seed/nftpunk",
  "https://picsum.photos/seed/nftrobot",
  "https://picsum.photos/seed/nftalien",
  "https://picsum.photos/seed/nftdragon",
  "https://picsum.photos/seed/nftcat",
  "https://picsum.photos/seed/nftlion",
  "https://picsum.photos/seed/nftbear",
  "https://picsum.photos/seed/nftfox",
  "https://picsum.photos/seed/nftwolf",
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRecords() {
  const records = [];
  for (let i = 1; i <= 50; i++) {
    const base = IMAGE_BASES[(i - 1) % IMAGE_BASES.length];
    const minPrice = randomBetween(50, 200);
    const maxPrice = randomBetween(200, 500);
    records.push({
      title: `NFT #${i}`,
      image_url: `${base}${i}/400/400`,
      level: randomBetween(1, 3),
      min_price: minPrice,
      max_price: maxPrice,
    });
  }
  return records;
}

router.post("/seed-nfts", async (_req, res) => {
  try {
    const records = buildRecords();

    const { data, error } = await supabase.from("nfts").insert(records).select("id, title");

    if (error) {
      const isRLS =
        error.message?.includes("row-level security") ||
        error.code === "42501";

      if (isRLS) {
        return res.status(403).json({
          success: false,
          error: "RLS_BLOCKED",
          message:
            "Row-Level Security is blocking anon inserts. Run the following SQL in your Supabase Dashboard → SQL Editor, then retry this endpoint:",
          fix_sql:
            "CREATE POLICY \"Allow anon insert\" ON public.nfts FOR INSERT TO anon WITH CHECK (true);",
          docs: "https://supabase.com/docs/guides/auth/row-level-security",
        });
      }

      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      inserted: data?.length ?? records.length,
      message: `Successfully inserted ${data?.length ?? records.length} NFT records.`,
      sample: data?.slice(0, 3),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/seed-nfts/status", async (_req, res) => {
  const { count, error } = await supabase
    .from("nfts")
    .select("*", { count: "exact", head: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ count });
});

export default router;
