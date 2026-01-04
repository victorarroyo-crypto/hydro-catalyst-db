-- Add column to store original technology data in trends
ALTER TABLE public.technological_trends 
ADD COLUMN IF NOT EXISTS original_data jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.technological_trends.original_data IS 'Stores all original technology fields when moved from technologies table';