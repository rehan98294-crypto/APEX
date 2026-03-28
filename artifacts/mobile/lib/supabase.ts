import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://juqdsjlnvdbzvwqzhjrb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cWRzamxudmRienZ3cXpoanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAzMjcsImV4cCI6MjA5MDE4NjMyN30.BF_SbIkXJDA79mgccYuzjoyt9IOYiMW2sf9hEf5hSQs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchRandomNFT(): Promise<{ name: string; image_url: string } | null> {
  try {
    const { data, error } = await supabase
      .from("nfts")
      .select("title, image_url")
      .limit(50);

    if (error || !data || data.length === 0) return null;

    const random = data[Math.floor(Math.random() * data.length)];
    return { name: random.title, image_url: random.image_url };
  } catch {
    return null;
  }
}
