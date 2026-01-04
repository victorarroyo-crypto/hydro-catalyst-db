-- Make technology_id nullable to support new technology suggestions
ALTER TABLE technology_edits 
  ALTER COLUMN technology_id DROP NOT NULL;

-- Add column to distinguish suggestion types
ALTER TABLE technology_edits 
  ADD COLUMN IF NOT EXISTS edit_type text 
  DEFAULT 'update' 
  CHECK (edit_type IN ('create', 'update', 'classify'));