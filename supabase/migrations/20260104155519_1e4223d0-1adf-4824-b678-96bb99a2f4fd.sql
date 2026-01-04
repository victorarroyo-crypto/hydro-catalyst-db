-- Add new columns to projects table for workflow
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS target_date date,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

-- Update status default and ensure it accepts our new values
-- Valid statuses: 'draft', 'active', 'on_hold', 'closed'
ALTER TABLE public.projects 
ALTER COLUMN status SET DEFAULT 'draft';

-- Update existing projects to use new status values
UPDATE public.projects SET status = 'draft' WHERE status = 'pending' OR status IS NULL;
UPDATE public.projects SET status = 'active' WHERE status = 'in_progress';
UPDATE public.projects SET status = 'closed' WHERE status = 'completed';

-- Add policy for updating projects
CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (created_by = auth.uid() OR client_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Add policy for deleting projects
CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));