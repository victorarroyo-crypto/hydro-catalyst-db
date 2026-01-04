-- Drop existing constraint and add new one with correct values
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'on_hold'::text, 'closed'::text]));