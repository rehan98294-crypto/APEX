import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

const SUPABASE_URL = "https://juqdsjlnvdbzvwqzhjrb.supabase.co";
const STORAGE_BUCKET = "Apex";

// ─── POST /seed-nfts  (legacy — random picsum images) ──────────────────────
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
      const isRLS = error.message?.includes("row-level security") || error.code === "42501";
      if (isRLS) {
        return res.status(403).json({
          success: false,
          error: "RLS_BLOCKED",
          message: "Row-Level Security is blocking anon inserts. Run the fix_sql in Supabase SQL Editor, then retry.",
          fix_sql: `CREATE POLICY "Allow anon insert" ON public.nfts FOR INSERT TO anon WITH CHECK (true);`,
        });
      }
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, inserted: data?.length ?? records.length, sample: data?.slice(0, 3) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /seed-nfts/status ──────────────────────────────────────────────────
router.get("/seed-nfts/status", async (_req, res) => {
  const { count, error } = await supabase.from("nfts").select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ count });
});

// ─── POST /seed-nfts-from-storage ──────────────────────────────────────────
// Reads all image files from the Supabase "Apex" storage bucket,
// generates public URLs, and inserts NFT records into the nfts table.
router.post("/seed-nfts-from-storage", async (_req, res) => {
  try {
    // 1. List ALL files in the bucket (recursively via pagination)
    const allFiles: { name: string; folder: string }[] = [];

    async function listFolder(prefix: string) {
      const { data: items, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });

      if (error || !items) return;

      for (const item of items) {
        if (!item.id) {
          // It's a "folder" (no id) — recurse
          const sub = prefix ? `${prefix}/${item.name}` : item.name;
          await listFolder(sub);
        } else {
          // It's a file
          allFiles.push({ name: item.name, folder: prefix });
        }
      }
    }

    await listFolder("");

    if (allFiles.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No files found in storage bucket. Upload images to the 'Apex' bucket first.",
        bucket: STORAGE_BUCKET,
      });
    }

    // 2. Filter to image files only
    const imageFiles = allFiles.filter((f) =>
      /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(f.name)
    );

    if (imageFiles.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No image files found in bucket.",
        filesFound: allFiles.map((f) => f.name).slice(0, 20),
      });
    }

    // 3. Build public URLs + NFT records
    const records = imageFiles.map((file, i) => {
      const filePath = file.folder ? `${file.folder}/${file.name}` : file.name;
      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;

      // Derive a clean title from filename
      const baseName = file.name.replace(/\.[^.]+$/, ""); // strip extension
      const title = baseName
        .replace(/^imgi_\d+_[a-f0-9]+$/i, `Apex NFT #${i + 1}`) // hash filenames
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const lvl = ((i % 3) + 1) as 1 | 2 | 3;
      const minP = [80, 150, 300][lvl - 1];
      const maxP = [200, 400, 800][lvl - 1];

      return {
        title,
        image_url: imageUrl,
        level: lvl,
        min_price: minP + Math.floor(i * 3.7) % 50,
        max_price: maxP + Math.floor(i * 5.3) % 100,
      };
    });

    // 4. Upsert records (skip duplicates by image_url)
    const { data: inserted, error: insertError } = await supabase
      .from("nfts")
      .upsert(records, { onConflict: "image_url", ignoreDuplicates: true })
      .select("id, title, image_url");

    if (insertError) {
      const isRLS = insertError.message?.includes("row-level security") || insertError.code === "42501";
      if (isRLS) {
        return res.status(403).json({
          success: false,
          error: "RLS_BLOCKED",
          fix_sql: `CREATE POLICY "Allow anon insert nfts" ON public.nfts FOR INSERT TO anon WITH CHECK (true);`,
        });
      }
      return res.status(500).json({ success: false, error: insertError.message });
    }

    console.log(`[Seed] Storage → nfts: found ${imageFiles.length} images, inserted ${inserted?.length ?? 0}`);

    return res.json({
      success: true,
      totalImages: imageFiles.length,
      inserted: inserted?.length ?? 0,
      sample: inserted?.slice(0, 5),
      urls: imageFiles.slice(0, 5).map((f) => {
        const fp = f.folder ? `${f.folder}/${f.name}` : f.name;
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fp}`;
      }),
    });
  } catch (err: any) {
    console.error("[Seed] Storage seed error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /storage/images — list public URLs from bucket ─────────────────────
router.get("/storage/images", async (_req, res) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: 200 });

    if (error) return res.status(500).json({ error: error.message });

    const imageFiles = (data ?? []).filter(
      (f) => f.id && /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(f.name)
    );

    const urls = imageFiles.map((f) => ({
      name: f.name,
      url: `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${f.name}`,
    }));

    return res.json({ count: urls.length, urls });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
