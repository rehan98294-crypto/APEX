import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseKey = process.env["SUPABASE_API_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_API_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const LEVEL_CONFIG: Record<number, { minPrice: number; maxPrice: number }> = {
  1: { minPrice: 5, maxPrice: 50 },
  2: { minPrice: 50, maxPrice: 200 },
  3: { minPrice: 200, maxPrice: 1000 },
};

const STORAGE_BUCKET = "nft-images";

function buildImageUrl(index: number): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/nft${index}.png`;
}

function randomLevel(): number {
  return Math.floor(Math.random() * 3) + 1;
}

function randomPrice(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

async function seed() {
  console.log("Checking for existing NFT records...");

  const { data: existing, error: checkError } = await supabase
    .from("nfts")
    .select("title")
    .limit(1);

  if (checkError) {
    console.error("Error checking existing records:", checkError.message);
    console.log("Attempting to create the 'nfts' table...");

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS nfts (
          id BIGSERIAL PRIMARY KEY,
          title TEXT UNIQUE NOT NULL,
          image_url TEXT NOT NULL,
          min_price NUMERIC(12,2) NOT NULL,
          max_price NUMERIC(12,2) NOT NULL,
          level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });

    if (createError) {
      console.error(
        "Could not auto-create table. Please create the 'nfts' table in Supabase first:",
      );
      console.error(createError.message);
      console.log(`
Required table schema:

CREATE TABLE nfts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  min_price NUMERIC(12,2) NOT NULL,
  max_price NUMERIC(12,2) NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`);
      process.exit(1);
    }
    console.log("Table created successfully.");
  }

  const records = [];
  for (let i = 1; i <= 100; i++) {
    const level = randomLevel();
    const config = LEVEL_CONFIG[level]!;
    const minPrice = randomPrice(config.minPrice, config.maxPrice * 0.6);
    const maxPrice = randomPrice(minPrice, config.maxPrice);

    records.push({
      title: `NFT #${i}`,
      image_url: buildImageUrl(i),
      min_price: minPrice,
      max_price: maxPrice,
      level,
    });
  }

  const { data: existingRows } = await supabase
    .from("nfts")
    .select("title");
  const existingTitles = new Set((existingRows ?? []).map((r: any) => r.title));
  const toInsert = records.filter((r) => !existingTitles.has(r.title));

  if (toInsert.length === 0) {
    console.log("All 100 NFTs already exist. No duplicates inserted.");
    const { count } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true });
    console.log(`Total NFTs in table: ${count}`);
    return;
  }

  console.log(`Inserting ${toInsert.length} new NFT records (${existingTitles.size} already exist)...`);

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let offset = 0; offset < toInsert.length; offset += BATCH_SIZE) {
    const batch = toInsert.slice(offset, offset + BATCH_SIZE);

    const { data, error } = await supabase
      .from("nfts")
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch at offset ${offset}:`, error.message);
      continue;
    }

    const batchInserted = data?.length ?? 0;
    inserted += batchInserted;
    console.log(
      `  Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${batchInserted} inserted`,
    );
  }

  console.log(`\nDone! ${inserted} records inserted.`);

  const { count } = await supabase
    .from("nfts")
    .select("*", { count: "exact", head: true });
  console.log(`Total NFTs in table: ${count}`);
}

seed().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
