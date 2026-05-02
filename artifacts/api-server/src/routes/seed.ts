import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import supabase from "../lib/supabase"; // anon client — used for nfts table

const router: IRouter = Router();

// ─── Supabase config ─────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env["SUPABASE_URL"] ?? "https://juqdsjlnvdbzvwqzhjrb.supabase.co";

// Storage listing requires service-role key (bypasses bucket RLS).
// Fallback to anon key only — will fail on private buckets.
const SERVICE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cWRzamxudmRienZ3cXpoanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAzMjcsImV4cCI6MjA5MDE4NjMyN30.BF_SbIkXJDA79mgccYuzjoyt9IOYiMW2sf9hEf5hSQs";

// Separate client for storage ops (uses service-role key when available)
const storageClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Real NFT name generator ─────────────────────────────────────────────────
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
  const suffix =
    SUFFIXES[Math.floor(index / (ADJECTIVES.length * NOUNS.length)) % SUFFIXES.length];
  const seq = String(index + 1).padStart(4, "0");
  const pattern = index % 3;
  if (pattern === 0) return `${adj} ${noun} #${seq}`;
  if (pattern === 1) return `${noun} of ${suffix} #${seq}`;
  return `${adj} ${suffix} ${noun} #${seq}`;
}

function nftLevel(index: number): 1 | 2 | 3 {
  const r = index % 6;
  if (r < 3) return 1;
  if (r < 5) return 2;
  return 3;
}

function nftPrices(index: number, level: 1 | 2 | 3) {
  const tiers = [
    { min: 80,  max: 200 },
    { min: 200, max: 500 },
    { min: 500, max: 1200 },
  ];
  const tier = tiers[level - 1];
  const spread = tier.max - tier.min;
  return {
    min_price: tier.min + (index * 37) % spread,
    max_price: tier.max + (index * 13) % 100,
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

// Try multiple bucket name casings (Supabase bucket names are case-sensitive)
const BUCKET_NAMES = ["apex", "Apex", "APEX"];

interface StorageFile {
  name: string;       // original filename (may contain spaces)
  publicUrl: string;  // Supabase public URL
}

interface BucketProbeResult {
  found: boolean;
  bucket: string;
  files: StorageFile[];
  log: string[];
  error?: string;
}

async function probeStorageBucket(): Promise<BucketProbeResult> {
  const log: string[] = [];
  const usingServiceRole = SERVICE_KEY !== process.env["SUPABASE_ANON_KEY"] &&
    !!process.env["SUPABASE_SERVICE_ROLE_KEY"];

  log.push(`[Storage] Service-role key available: ${usingServiceRole}`);

  for (const bucket of BUCKET_NAMES) {
    log.push(`[Storage] Probing bucket: "${bucket}"`);

    // List root — no extension filter, handles spaces automatically
    const { data, error } = await storageClient.storage
      .from(bucket)
      .list("", {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      log.push(`[Storage]   error: ${error.message}`);
      continue;
    }

    if (!data) {
      log.push(`[Storage]   no data returned`);
      continue;
    }

    log.push(`[Storage]   raw items returned: ${data.length}`);

    // Log ALL items (files and folders)
    data.forEach((item, i) => {
      log.push(`[Storage]   [${i}] name="${item.name}" id=${item.id ?? "null"} size=${item.metadata?.size ?? "?"}`);
    });

    // Files have an id; folders have id=null
    const fileItems = data.filter((item) => item.id != null);
    log.push(`[Storage]   files (with id): ${fileItems.length}`);

    if (fileItems.length === 0) {
      log.push(`[Storage]   no files in bucket "${bucket}" — might be private or empty`);
      continue;
    }

    // Generate public URLs — Supabase handles URL-encoding of spaces automatically
    const files: StorageFile[] = fileItems.map((item) => {
      const { data: urlData } = storageClient.storage
        .from(bucket)
        .getPublicUrl(item.name); // spaces are handled by the SDK
      return {
        name: item.name,
        publicUrl: urlData.publicUrl,
      };
    });

    log.push(`[Storage] ✓ Found ${files.length} files in bucket "${bucket}"`);
    files.slice(0, 10).forEach((f) => log.push(`[Storage]   → "${f.name}" → ${f.publicUrl}`));

    return { found: true, bucket, files, log };
  }

  // All buckets returned 0 files
  const isPrivate = !process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const hint = isPrivate
    ? "SUPABASE_SERVICE_ROLE_KEY secret is not set. Private buckets require the service-role key to list files. Either: (1) add the secret, or (2) make the bucket public in Supabase Dashboard → Storage → apex → Edit → toggle Public."
    : "All bucket variants returned 0 files. Confirm files exist in the bucket via Supabase Dashboard → Storage.";

  log.push(`[Storage] ✗ No files found in any bucket variant. ${hint}`);
  return { found: false, bucket: "none", files: [], log, error: hint };
}

// ─── GET /storage/images — diagnostic: probe bucket and list all files ────────
router.get("/storage/images", async (_req, res) => {
  try {
    const result = await probeStorageBucket();
    return res.json({
      found: result.found,
      bucket: result.bucket,
      count: result.files.length,
      files: result.files.map((f) => ({ name: f.name, url: f.publicUrl })),
      log: result.log,
      error: result.error,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /seed-nfts-from-storage ─────────────────────────────────────────────
// Lists ALL files from bucket "apex", generates 300 NFT records, upserts.
// Throws error if 0 files found — NO fallback to fake images.
router.post("/seed-nfts-from-storage", async (_req, res) => {
  const TARGET = 300;

  try {
    // 1. List all files from storage
    const probe = await probeStorageBucket();

    // Print log immediately
    probe.log.forEach((line) => console.log(line));

    // 2. HARD FAIL if bucket is empty — no picsum fallback
    if (!probe.found || probe.files.length === 0) {
      console.error("[Seed] ✗ Aborting — no files found in storage bucket.");
      return res.status(400).json({
        success: false,
        storageFiles: 0,
        bucketProbed: BUCKET_NAMES,
        error: "No files found in Supabase storage bucket 'apex'. Cannot insert without real images.",
        fix: probe.error,
        log: probe.log,
      });
    }

    console.log(`[Seed] ✓ Storage: ${probe.files.length} files in bucket "${probe.bucket}"`);
    console.log(`[Seed] File list:`, probe.files.map((f) => `"${f.name}"`).join(", "));

    // 3. Build 300 records — each gets a unique image_url.
    //    The 130 storage files are cycled; duplicates get ?v=N appended so
    //    every URL is distinct — no UNIQUE constraint conflict.
    const fileCount = probe.files.length;
    const records = Array.from({ length: TARGET }, (_, i) => {
      const file = probe.files[i % fileCount];
      const cycle = Math.floor(i / fileCount); // 0 = first pass, 1 = second, …

      // Make the URL unique per cycle so no two records share the same image_url
      const uniqueUrl = cycle === 0
        ? file.publicUrl
        : `${file.publicUrl}?v=${cycle + 1}`;

      const generatedName = buildNFTName(i);
      const level = nftLevel(i);
      const { min_price, max_price } = nftPrices(i, level);

      return {
        title: generatedName,
        image_url: uniqueUrl,
        level,
        min_price,
        max_price,
      };
    });

    console.log(`[Seed] Built ${records.length} records (${fileCount} real images, cycled). Sample titles:`,
      records.slice(0, 5).map((r) => r.title).join(" | "));

    // 4. Clear existing NFTs, then INSERT fresh 300 records.
    //    We use plain INSERT (not upsert) because each URL is now guaranteed unique.
    console.log("[Seed] Clearing existing NFT records…");
    const { error: deleteError } = await supabase
      .from("nfts")
      .delete()
      .gte("created_at", "2000-01-01");

    if (deleteError) {
      console.error("[Seed] Delete error:", deleteError.message);
      // Non-fatal — proceed with insert anyway
    }

    const BATCH = 50;
    let inserted = 0;
    let skipped = 0;
    const batchErrors: string[] = [];
    const sampleTitles: string[] = [];

    for (let b = 0; b < records.length; b += BATCH) {
      const batch = records.slice(b, b + BATCH);

      const { data, error } = await supabase
        .from("nfts")
        .insert(batch)
        .select("id, title");

      if (error) {
        console.error(`[Seed] Batch ${b / BATCH + 1} error: ${error.message}`);

        if (error.message.includes("row-level security") || error.code === "42501") {
          return res.status(403).json({
            success: false,
            error: "RLS_BLOCKED",
            fix_sql: "Run artifacts/mobile/supabase/fix_nfts_unique.sql in Supabase SQL Editor.",
            log: probe.log,
          });
        }

        batchErrors.push(`Batch ${b / BATCH + 1}: ${error.message}`);
        continue;
      }

      const batchInserted = data?.length ?? 0;
      inserted += batchInserted;

      console.log(`[Seed] Batch ${b / BATCH + 1}: inserted=${batchInserted}`);

      if (sampleTitles.length < 5 && data) {
        sampleTitles.push(...data.slice(0, 5 - sampleTitles.length).map((r: any) => r.title));
      }
    }

    // 6. Final count
    const { count: totalInDB } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true });

    console.log(`[Seed] ✓ DONE — storageFiles=${probe.files.length} inserted=${inserted} skipped=${skipped} totalInDB=${totalInDB}`);

    return res.json({
      success: batchErrors.length === 0,
      storageFiles: probe.files.length,
      bucketUsed: probe.bucket,
      recordsBuilt: records.length,
      insertedThisRun: inserted,
      skippedDuplicates: skipped,
      totalInDatabase: totalInDB ?? 0,
      sampleTitles,
      errors: batchErrors.length > 0 ? batchErrors : undefined,
      log: probe.log,
    });
  } catch (err: any) {
    console.error("[Seed] Fatal:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 80K SEED STATE ───────────────────────────────────────────────────────────
interface SeedState80K {
  running: boolean;
  inserted: number;
  total: number;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
}
const seed80kState: SeedState80K = {
  running: false, inserted: 0, total: 80000,
  startedAt: null, finishedAt: null, error: null,
};

// ─── 80K LEVEL CONFIG ─────────────────────────────────────────────────────────
const LEVEL_POOLS = [
  { level: 1, count: 20000, minPrice: 50,    maxPrice: 1000,   systemCut: 0.30 },
  { level: 2, count: 15000, minPrice: 500,   maxPrice: 2000,   systemCut: 0.28 },
  { level: 3, count: 15000, minPrice: 2000,  maxPrice: 5000,   systemCut: 0.28 },
  { level: 4, count: 10000, minPrice: 5000,  maxPrice: 15000,  systemCut: 0.28 },
  { level: 5, count: 10000, minPrice: 15000, maxPrice: 50000,  systemCut: 0.25 },
  { level: 6, count: 10000, minPrice: 50000, maxPrice: 200000, systemCut: 0.20 },
];

const ADJ80 = [
  "Cosmic","Mystic","Shadow","Golden","Neon","Quantum","Phantom",
  "Crystal","Ancient","Cyber","Frozen","Blazing","Silent","Eternal",
  "Radiant","Obsidian","Celestial","Vortex","Lunar","Solar",
  "Infernal","Arcane","Divine","Primal","Astral","Jade","Crimson",
  "Sapphire","Emerald","Onyx",
];
const NOUN80 = [
  "Dragon","Phoenix","Ape","Wolf","Panther","Tiger","Lion",
  "Eagle","Serpent","Samurai","Warrior","Oracle","Titan","Specter",
  "Golem","Wraith","Daemon","Cipher","Nexus","Sentinel",
  "Hydra","Griffin","Chimera","Wyvern","Basilisk","Sphinx","Kraken",
  "Leviathan","Behemoth","Colossus",
];

function buildName80K(level: number, indexInLevel: number): string {
  const adj  = ADJ80[indexInLevel % ADJ80.length];
  const noun = NOUN80[Math.floor(indexInLevel / ADJ80.length) % NOUN80.length];
  const seq  = String(indexInLevel + 1).padStart(5, "0");
  return `L${level} ${adj} ${noun} #${seq}`;
}

function levelPrice(pool: typeof LEVEL_POOLS[0], index: number): number {
  const spread = pool.maxPrice - pool.minPrice;
  // Deterministic spread using large prime
  const raw = pool.minPrice + (index * 7919) % spread;
  // Round to nearest $0.50 for cleanliness
  return Math.round(raw * 2) / 2;
}

// ─── Background 80K seed function ─────────────────────────────────────────────
async function run80KSeed(files: StorageFile[]): Promise<void> {
  const BATCH = 500;
  const fileCount = files.length;

  // Clear existing NFTs
  console.log("[Seed80K] Clearing existing NFT records…");
  await supabase.from("nfts").delete().gte("created_at", "2000-01-01");

  let globalIndex = 0;

  for (const pool of LEVEL_POOLS) {
    console.log(`[Seed80K] Seeding level ${pool.level} (${pool.count} NFTs, $${pool.minPrice}–$${pool.maxPrice})`);

    for (let b = 0; b < pool.count; b += BATCH) {
      const batchSize = Math.min(BATCH, pool.count - b);
      const records = [];

      for (let i = 0; i < batchSize; i++) {
        const levelIdx  = b + i;
        const fileIdx   = globalIndex % fileCount;
        const cycle     = Math.floor(globalIndex / fileCount);
        const rawUrl    = files[fileIdx].publicUrl;
        const imageUrl  = cycle === 0 ? rawUrl : `${rawUrl}?v=${cycle + 1}`;

        records.push({
          title:     buildName80K(pool.level, levelIdx),
          image_url: imageUrl,
          level:     pool.level,
          min_price: levelPrice(pool, levelIdx),
          max_price: pool.maxPrice,
        });
        globalIndex++;
      }

      const { error } = await supabase.from("nfts").insert(records);
      if (error) {
        console.error(`[Seed80K] Level ${pool.level} batch ${Math.floor(b / BATCH) + 1} error: ${error.message}`);
        if (error.code === "42501") {
          seed80kState.error = "RLS_BLOCKED: Run fix_nfts_unique.sql in Supabase SQL Editor.";
          seed80kState.running = false;
          seed80kState.finishedAt = Date.now();
          return;
        }
        // Non-fatal, continue
      } else {
        seed80kState.inserted += batchSize;
      }

      if (seed80kState.inserted % 5000 === 0 || b + BATCH >= pool.count) {
        console.log(`[Seed80K] Progress: ${seed80kState.inserted}/${seed80kState.total}`);
      }
    }
  }

  seed80kState.running = false;
  seed80kState.finishedAt = Date.now();
  console.log(`[Seed80K] ✓ Complete — inserted ${seed80kState.inserted} NFTs`);
}

// ─── POST /seed-nfts-80k ─────────────────────────────────────────────────────
router.post("/seed-nfts-80k", async (_req, res) => {
  if (seed80kState.running) {
    return res.json({
      started: false,
      message: "Seeding already in progress",
      progress: seed80kState,
    });
  }

  // Probe bucket first
  const probe = await probeStorageBucket();
  probe.log.forEach((l) => console.log(l));

  if (!probe.found || probe.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No images found in Supabase storage bucket 'apex'. Add images first.",
      fix: probe.error,
      log: probe.log,
    });
  }

  console.log(`[Seed80K] Starting background seed — ${probe.files.length} storage images available`);

  // Reset state and fire off background job
  seed80kState.running = true;
  seed80kState.inserted = 0;
  seed80kState.total = 80000;
  seed80kState.startedAt = Date.now();
  seed80kState.finishedAt = null;
  seed80kState.error = null;

  // Fire and forget
  run80KSeed(probe.files).catch((err) => {
    seed80kState.error = err.message;
    seed80kState.running = false;
    seed80kState.finishedAt = Date.now();
    console.error("[Seed80K] Fatal:", err.message);
  });

  return res.json({
    started: true,
    message: `Seeding 80,000 NFTs using ${probe.files.length} storage images. Poll /api/seed-nfts/status-80k for progress.`,
    storageImages: probe.files.length,
    totalNFTs: 80000,
  });
});

// ─── GET /seed-nfts/status-80k ───────────────────────────────────────────────
router.get("/seed-nfts/status-80k", (_req, res) => {
  const elapsed = seed80kState.startedAt
    ? Math.round((Date.now() - seed80kState.startedAt) / 1000)
    : null;
  return res.json({
    ...seed80kState,
    elapsedSeconds: elapsed,
    percentComplete: Math.round((seed80kState.inserted / seed80kState.total) * 100),
  });
});

// ─── GET /seed-nfts/status ────────────────────────────────────────────────────
router.get("/seed-nfts/status", async (_req, res) => {
  const { count, error } = await supabase
    .from("nfts")
    .select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });

  const byLevel: Record<string, number> = {};
  for (const pool of LEVEL_POOLS) {
    const { count: lc } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true })
      .eq("level", pool.level);
    byLevel[`level${pool.level}`] = lc ?? 0;
  }

  return res.json({ count, byLevel, seed80k: seed80kState });
});

// ─── POST /seed-nfts (generates 300 records — only if storage bucket is empty) ─
// A convenience endpoint that works WITHOUT storage files, using generated images.
// Only use this for testing when storage bucket has no images.
router.post("/seed-nfts", async (_req, res) => {
  try {
    const TARGET = 300;
    const PICSUM_SEEDS = [
      "nftdragon", "nftphoenix", "nftape", "nftwolf", "nftpanther",
      "nfttiger", "nftlion", "nfteagle", "nftserpent", "nftsamurai",
      "nftwarrior", "nftoracle", "nfttitan", "nftspecter", "nftgolem",
      "nftwraith", "nftdaemon", "nftcipher", "nftnexus", "nftsentinel",
      "nftcosmic", "nftmystic", "nftshadow", "nftgolden", "nftneon",
      "nftquantum", "nftphantom", "nftcrystal", "nftancient", "nftcyber",
    ];

    const records = Array.from({ length: TARGET }, (_, i) => {
      const seed = PICSUM_SEEDS[i % PICSUM_SEEDS.length];
      const cycle = Math.floor(i / PICSUM_SEEDS.length) + 1;
      const size = 400 + (i % 3) * 100;
      const level = nftLevel(i);
      const { min_price, max_price } = nftPrices(i, level);
      return {
        title: buildNFTName(i),
        image_url: `https://picsum.photos/seed/${seed}${cycle}/${size}/${size}`,
        level,
        min_price,
        max_price,
      };
    });

    // Clear all existing, then insert fresh
    await supabase.from("nfts").delete().gte("created_at", "2000-01-01");

    const BATCH = 50;
    let totalInserted = 0;

    for (let b = 0; b < records.length; b += BATCH) {
      const batch = records.slice(b, b + BATCH);
      const { data, error } = await supabase
        .from("nfts")
        .insert(batch)
        .select("id");

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          return res.status(403).json({
            success: false,
            error: "RLS_BLOCKED",
            fix_sql: "Run artifacts/mobile/supabase/fix_nfts_unique.sql in Supabase SQL Editor.",
          });
        }
        return res.status(500).json({ success: false, error: error.message });
      }

      totalInserted += data?.length ?? 0;
      console.log(`[Seed/Legacy] Batch ${b / BATCH + 1}: inserted ${data?.length ?? 0}`);
    }

    const { count } = await supabase.from("nfts").select("*", { count: "exact", head: true });
    console.log(`[Seed/Legacy] ✓ Done — inserted=${totalInserted} totalInDB=${count}`);

    return res.json({
      success: true,
      note: "Used generated picsum images (not storage). Use /seed-nfts-from-storage when bucket has real images.",
      inserted: totalInserted,
      totalInDatabase: count ?? 0,
      sampleTitles: records.slice(0, 5).map((r) => r.title),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
