-- Add taxonomy ID columns to study_longlist for standardized dropdowns
ALTER TABLE study_longlist 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tipo_id INTEGER REFERENCES taxonomy_tipos(id),
  ADD COLUMN IF NOT EXISTS subcategoria_id INTEGER REFERENCES taxonomy_subcategorias(id),
  ADD COLUMN IF NOT EXISTS sector_id VARCHAR REFERENCES taxonomy_sectores(id),
  ADD COLUMN IF NOT EXISTS subsector_industrial TEXT;

-- Add index for better query performance on taxonomy fields
CREATE INDEX IF NOT EXISTS idx_study_longlist_tipo_id ON study_longlist(tipo_id);
CREATE INDEX IF NOT EXISTS idx_study_longlist_sector_id ON study_longlist(sector_id);
CREATE INDEX IF NOT EXISTS idx_study_longlist_status ON study_longlist(status);