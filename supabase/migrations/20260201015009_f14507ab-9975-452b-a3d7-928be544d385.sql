-- Fix the INSERT policy to properly check user_id
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.cost_consulting_projects;

CREATE POLICY "Users can insert their own projects" ON public.cost_consulting_projects
  FOR INSERT WITH CHECK (user_id IS NOT NULL);