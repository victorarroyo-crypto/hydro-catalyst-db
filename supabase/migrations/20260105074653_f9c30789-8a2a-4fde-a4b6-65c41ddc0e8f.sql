-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view technologies" ON public.technologies;

-- Create new policy: Internal users see all, clients only see active/approved
CREATE POLICY "Users can view technologies based on role" 
ON public.technologies 
FOR SELECT 
USING (
  -- Internal users (admin, supervisor, analyst) can see all technologies
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role) OR
  -- Clients can only see active/approved technologies
  (status = 'active' AND (
    has_role(auth.uid(), 'client_basic'::app_role) OR 
    has_role(auth.uid(), 'client_professional'::app_role) OR 
    has_role(auth.uid(), 'client_enterprise'::app_role)
  ))
);