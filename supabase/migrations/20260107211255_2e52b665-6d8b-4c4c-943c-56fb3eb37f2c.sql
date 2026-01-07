-- Add extended technology fields to persist enriched longlist data
ALTER TABLE public.study_longlist
  ADD COLUMN IF NOT EXISTS paises_actua text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS ventaja_competitiva text,
  ADD COLUMN IF NOT EXISTS innovacion text,
  ADD COLUMN IF NOT EXISTS casos_referencia text,
  ADD COLUMN IF NOT EXISTS email text;