-- Allow tracking free queries in advisor_credits.type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'advisor_credits'
      AND c.conname = 'advisor_credits_type_check'
  ) THEN
    ALTER TABLE public.advisor_credits DROP CONSTRAINT advisor_credits_type_check;
  END IF;

  ALTER TABLE public.advisor_credits
    ADD CONSTRAINT advisor_credits_type_check
    CHECK (
      type = ANY (ARRAY['purchase'::text, 'usage'::text, 'bonus'::text, 'refund'::text, 'free_query'::text])
    );
END $$;