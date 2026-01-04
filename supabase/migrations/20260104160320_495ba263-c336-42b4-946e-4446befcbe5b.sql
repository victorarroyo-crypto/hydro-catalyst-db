-- Add policy for deleting project technologies
CREATE POLICY "Users can remove technologies from projects" 
ON public.project_technologies 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_technologies.project_id 
    AND (projects.client_id = auth.uid() OR projects.created_by = auth.uid())
  ) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'supervisor'::app_role)
);