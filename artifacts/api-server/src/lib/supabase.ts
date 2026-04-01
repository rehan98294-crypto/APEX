import { createClient } from "@supabase/supabase-js";

const url =
  process.env["SUPABASE_URL"] ??
  "https://juqdsjlnvdbzvwqzhjrb.supabase.co";

const key =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["SUPABASE_API_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cWRzamxudmRienZ3cXpoanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAzMjcsImV4cCI6MjA5MDE4NjMyN30.BF_SbIkXJDA79mgccYuzjoyt9IOYiMW2sf9hEf5hSQs";

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

export default supabase;
