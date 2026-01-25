-- fix_candidate_address.sql
-- Safe migration to correct the misspelled column `candidate_addreess` -> `candidate_address`
-- Run this in your Postgres (Supabase SQL editor or psql) as a DB superuser or role with ALTER TABLE privileges.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='candidate_db' AND column_name='candidate_addreess'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='candidate_db' AND column_name='candidate_address'
    ) THEN
      ALTER TABLE public.candidate_db RENAME COLUMN candidate_addreess TO candidate_address;
      RAISE NOTICE 'Renamed candidate_addreess -> candidate_address';
    ELSE
      -- both exist: copy non-null values and drop the misspelled column
      UPDATE public.candidate_db SET candidate_address = candidate_addreess WHERE candidate_address IS NULL;
      ALTER TABLE public.candidate_db DROP COLUMN candidate_addreess;
      RAISE NOTICE 'Copied data from candidate_addreess and dropped the legacy column';
    END IF;
  ELSE
    RAISE NOTICE 'No legacy column candidate_addreess found; nothing to do';
  END IF;
END
$$ LANGUAGE plpgsql;

-- Make sure the PostgREST role has privileges. Replace `anon` with your API role if different.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_db TO anon;

-- If you use the identity sequence and want the API role to see it:
-- (Adjust sequence name if different)
GRANT USAGE, SELECT ON SEQUENCE public.candidate_db_candidate_iid_seq TO anon;

-- After running this migration:
-- - If you are using self-hosted PostgREST, restart it to refresh schema cache (e.g., `systemctl restart postgrest` or restart your container).
-- - If you are using Supabase, the new column should appear in the generated API; if not, try reloading the dashboard or waiting a minute.

-- Quick check:
-- SELECT table_schema, table_name, column_name
-- FROM information_schema.columns
-- WHERE table_name = 'candidate_db' AND column_name IN ('candidate_address','candidate_addreess');
