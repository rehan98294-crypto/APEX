-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: add UNIQUE constraint on nfts.image_url + delete policy
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add UNIQUE constraint (required for ON CONFLICT (image_url) DO NOTHING)
--    Safe: IF NOT EXISTS guard prevents duplicate constraint errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.nfts'::regclass
      AND conname = 'nfts_image_url_unique'
  ) THEN
    ALTER TABLE public.nfts
      ADD CONSTRAINT nfts_image_url_unique UNIQUE (image_url);
    RAISE NOTICE 'UNIQUE constraint added on nfts.image_url';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already exists — skipping';
  END IF;
END $$;

-- 2. Add missing RLS policies (safe — drops first)
DROP POLICY IF EXISTS "Allow anon delete nfts" ON public.nfts;
CREATE POLICY "Allow anon delete nfts" ON public.nfts
  FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert nfts" ON public.nfts;
CREATE POLICY "Allow anon insert nfts" ON public.nfts
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update nfts" ON public.nfts;
CREATE POLICY "Allow anon update nfts" ON public.nfts
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read nfts" ON public.nfts;
CREATE POLICY "Allow anon read nfts" ON public.nfts
  FOR SELECT TO anon USING (true);

-- 3. Verify
SELECT
  conname AS constraint_name,
  contype AS type
FROM pg_constraint
WHERE conrelid = 'public.nfts'::regclass
ORDER BY conname;
