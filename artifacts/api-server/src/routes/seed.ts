import { Router, type IRouter } from "express";
import supabase from "../lib/supabase";

const router: IRouter = Router();

// ─── NFT Name Generator ───────────────────────────────────────────────────────
// Produces 300+ unique, real-sounding NFT names without using "NFT1" / "Apex1"
const ADJECTIVES = [
  "Cosmic", "Mystic", "Shadow", "Golden", "Neon", "Quantum", "Phantom",
  "Crystal", "Ancient", "Cyber", "Frozen", "Blazing", "Silent", "Eternal",
  "Radiant", "Obsidian", "Celestial", "Vortex", "Lunar", "Solar",
];
const NOUNS = [
  "Dragon", "Phoenix", "Ape", "Wolf", "Panther", "Tiger", "Lion",
  "Eagle", "Serpent", "Samurai", "Warrior", "Oracle", "Titan", "Specter",
  "Golem", "Wraith", "Daemon", "Cipher", "Nexus", "Sentinel",
];
const SUFFIXES = [
  "Genesis", "Origin", "Legacy", "Prime", "Rare", "Elite",
  "Ultra", "Legendary", "Divine", "Apex",
];

function buildNFTName(index: number): string {
  const adj = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(index / ADJECTIVES.length) % NOUNS.length];
  const suffix = SUFFIXES[Math.floor(index / (ADJECTIVES.length * NOUNS.length)) % SUFFIXES.length];
  const seq = String(index + 1).padStart(4, "0");
  // Rotate pattern so names vary nicely across 300
  const pattern = index % 3;
  if (pattern === 0) return `${adj} ${noun} #${seq}`;
  if (pattern === 1) return `${noun} of ${suffix} #${seq}`;
  return `${adj} ${suffix} ${noun} #${seq}`;
}

// Price tiers by level
const PRICE_TIERS = [
  { min: 80,  max: 200 },  // level 1
  { min: 200, max: 500 },  // level 2
  { min: 500, max: 1200 }, // level 3
];

function nftLevel(index: number): number {
  // Distribute: 50% level1, 33% level2, 17% level3
  const r = index % 6;
  if (r < 3) return 1;
  if (r < 5) return 2;
  return 3;
}

function nftPrices(index: number, level: number) {
  const tier = PRICE_TIERS[level - 1];
  const spread = tier.max - tier.min;
  const offset = (index * 37) % spread;
  return { min_price: tier.min + offset, max_price: tier.max + (index * 13) % 100 };
}

// ─── Bucket helpers ──────────────────────────────────────────────────────────
// Try both "apex" and "Apex" — whichever lists files wins
async function listAllFilesFromBucket(): Promise<{
  bucket: string;
  files: { name: string; path: string; publicUrl: string }[];
  rawLog: string[];
}> {
  const bucketsToTry = ["apex", "Apex", "APEX"];
  const rawLog: string[] = [];

  for (const bucket of bucketsToTry) {
    rawLog.push(`[Storage] Trying bucket: "${bucket}"`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .list("", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    rawLog.push(`[Storage]   → data count=${data?.length ?? 0} error=${error?.message ?? "none"}`);

    if (error || !data || data.length === 0) continue;

    // Log ALL items returned (no extension filter yet)
    data.forEach((item) => {
      rawLog.push(`[Storage]   file: name="${item.name}" id=${item.id ?? "null(folder)"}`);
    });

    // Collect real files (have an id) — include ALL, don't filter by extension
    const files = data
      .filter((item) => !!item.id)
      .map((item) => {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(item.name);
        return {
          name: item.name,
          path: item.name,
          publicUrl: urlData.publicUrl,
        };
      });

    rawLog.push(`[Storage] ✓ Found ${files.length} files in bucket "${bucket}"`);
    console.log(rawLog.join("\n"));
    return { bucket, files, rawLog };
  }

  console.log(rawLog.join("\n"));
  return { bucket: "none", files: [], rawLog };
}

// ─── POST /seed-nfts-from-storage ─────────────────────────────────────────────
// Lists ALL files from bucket "apex" (case-insensitive probe),
// generates 300 NFT records with real names, upserts into nfts table.
router.post("/seed-nfts-from-storage", async (_req, res) => {
  try {
    const TARGET = 300;

    // 1. List all files from storage
    const { bucket, files, rawLog } = await listAllFilesFromBucket();

    console.log(`[Seed] Storage probe complete. bucket="${bucket}" files=${files.length}`);
    console.log(`[Seed] File names:`, files.map((f) => f.name).join(", ") || "(none)");

    // 2. Build the pool of image URLs
    // If we have storage files, use them (cycling to reach TARGET if needed).
    // If bucket is empty, fall back to deterministic picsum URLs.
    const imagePool: string[] = [];

    if (files.length > 0) {
      for (let i = 0; i < TARGET; i++) {
        imagePool.push(files[i % files.length].publicUrl);
      }
    } else {
      // Fallback: 30 distinct picsum seeds × 10 styles = 300 unique URLs
      const SEEDS = [
        "nftdragon", "nftphoenix", "nftape", "nftwolf", "nftpanther",
        "nfttiger", "nftlion", "nfteagle", "nftserpent", "nftsamurai",
        "nftwarrior", "nftoracle", "nfttitan", "nftspecter", "nftgolem",
        "nftwraith", "nftdaemon", "nftcipher", "nftnexus", "nftsentinel",
        "nftcosmic", "nftmystic", "nftshadow", "nftgolden", "nftneon",
        "nftquantum", "nftphantom", "nftcrystal", "nftancient", "nftcyber",
      ];
      for (let i = 0; i < TARGET; i++) {
        const seed = SEEDS[i % SEEDS.length];
        const size = 400 + (i % 3) * 100; // 400, 500, 600 px variety
        imagePool.push(`https://picsum.photos/seed/${seed}${Math.floor(i / SEEDS.length) + 1}/${size}/${size}`);
      }
      console.log(`[Seed] No storage images found. Using ${TARGET} picsum fallback URLs.`);
    }

    // 3. Build 300 NFT records with real names
    const records = imagePool.slice(0, TARGET).map((imageUrl, i) => {
      const level = nftLevel(i);
      const { min_price, max_price } = nftPrices(i, level);
      return {
        title: buildNFTName(i),
        image_url: imageUrl,
        level,
        min_price,
        max_price,
      };
    });

    console.log(`[Seed] Built ${records.length} NFT records. Sample names:`,
      records.slice(0, 5).map((r) => r.title).join(", "));

    // 4. Check existing count — if already >= TARGET, wipe and re-seed fresh
    const { count: existingCount } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true });

    if ((existingCount ?? 0) > 0) {
      console.log(`[Seed] Clearing ${existingCount} existing nft records before re-seeding...`);
      const { error: delError } = await supabase.from("nfts").delete().gte("created_at", "2000-01-01");
      if (delError) {
        console.error("[Seed] Delete error:", delError.message);
        // If delete failed due to RLS, try to continue with insert anyway
      }
    }

    // 5. Insert in batches of 50 (plain insert — no conflict needed after wipe)
    const BATCH = 50;
    let totalInserted = 0;
    const errors: string[] = [];
    const sampleInserted: any[] = [];

    for (let b = 0; b < records.length; b += BATCH) {
      const batch = records.slice(b, b + BATCH);
      const { data: inserted, error: insertError } = await supabase
        .from("nfts")
        .insert(batch)
        .select("id, title");

      if (insertError) {
        console.error(`[Seed] Batch ${b / BATCH + 1} error:`, insertError.message);
        errors.push(insertError.message);
        if (insertError.message?.includes("row-level security") || insertError.code === "42501") {
          return res.status(403).json({
            success: false,
            error: "RLS_BLOCKED",
            fix_sql: `
-- Run these in Supabase SQL Editor:
CREATE POLICY "Allow anon insert nfts" ON public.nfts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon delete nfts" ON public.nfts FOR DELETE TO anon USING (true);`,
            rawLog,
          });
        }
        // Non-RLS error: log and continue with remaining batches
      } else {
        const count = inserted?.length ?? 0;
        totalInserted += count;
        console.log(`[Seed] Batch ${b / BATCH + 1} (records ${b + 1}–${b + batch.length}): inserted ${count}`);
        if (sampleInserted.length < 5 && inserted) {
          sampleInserted.push(...inserted.slice(0, 5 - sampleInserted.length));
        }
      }
    }

    // 6. Final count
    const { count: dbCount } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true });

    console.log(`[Seed] ✓ COMPLETE — requestedTarget=${TARGET} insertedThisRun=${totalInserted} totalInDB=${dbCount ?? "?"} storageFiles=${files.length} errors=${errors.length}`);

    return res.json({
      success: errors.length === 0 && totalInserted > 0,
      storageFiles: files.length,
      bucketUsed: bucket === "none" ? "picsum-fallback" : bucket,
      requestedTarget: TARGET,
      recordsBuilt: records.length,
      insertedThisRun: totalInserted,
      totalInDatabase: dbCount ?? 0,
      errors: errors.length > 0 ? errors : undefined,
      sampleTitles: records.slice(0, 10).map((r) => r.title),
      sampleInserted: sampleInserted.slice(0, 5),
      rawLog,
    });
  } catch (err: any) {
    console.error("[Seed] Fatal error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /storage/images — probe bucket and list all files ───────────────────
router.get("/storage/images", async (_req, res) => {
  try {
    const { bucket, files, rawLog } = await listAllFilesFromBucket();
    return res.json({
      bucket,
      count: files.length,
      files: files.map((f) => ({ name: f.name, url: f.publicUrl })),
      rawLog,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /seed-nfts/status ────────────────────────────────────────────────────
router.get("/seed-nfts/status", async (_req, res) => {
  const { count, error } = await supabase.from("nfts").select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ count });
});

// ─── POST /seed-nfts (legacy — 50 picsum records) ────────────────────────────
router.post("/seed-nfts", async (_req, res) => {
  try {
    const records = Array.from({ length: 50 }, (_, i) => {
      const level = nftLevel(i);
      const { min_price, max_price } = nftPrices(i, level);
      const seed = ["nftdragon", "nftphoenix", "nftape", "nftwolf", "nftpanther"][i % 5];
      return {
        title: buildNFTName(i),
        image_url: `https://picsum.photos/seed/${seed}${i + 1}/400/400`,
        level,
        min_price,
        max_price,
      };
    });

    const { data, error } = await supabase
      .from("nfts")
      .upsert(records, { onConflict: "image_url", ignoreDuplicates: true })
      .select("id, title");

    if (error) {
      const isRLS = error.message?.includes("row-level security") || error.code === "42501";
      if (isRLS) {
        return res.status(403).json({
          success: false,
          error: "RLS_BLOCKED",
          fix_sql: `CREATE POLICY "Allow anon insert nfts" ON public.nfts FOR INSERT TO anon WITH CHECK (true);`,
        });
      }
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, inserted: data?.length ?? 0, sample: data?.slice(0, 3) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
