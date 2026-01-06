-- Add reviewed_at field to track when admin/supervisor approved the technology
ALTER TABLE public.technologies 
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Add comment explaining the fields
COMMENT ON COLUMN public.technologies.reviewed_at IS 'Fecha en que el admin/supervisor revisó y aprobó la tecnología';
COMMENT ON COLUMN public.technologies.reviewer_id IS 'ID del admin/supervisor que revisó la tecnología';
COMMENT ON COLUMN public.technologies.updated_by IS 'ID del analista que realizó la última edición';