-- Drop existing policies on rejected_technologies that allow analyst access
DROP POLICY IF EXISTS "Analysts can view rejected technologies" ON public.rejected_technologies;
DROP POLICY IF EXISTS "authenticated_users_rejected_technologies_select" ON public.rejected_technologies;
DROP POLICY IF EXISTS "Users can view rejected technologies" ON public.rejected_technologies;

-- Create policy that restricts rejected_technologies access to supervisors and admins only
CREATE POLICY "Supervisors and admins can view rejected technologies"
ON public.rejected_technologies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update INSERT policy to allow only supervisors and admins
DROP POLICY IF EXISTS "Analysts can insert rejected technologies" ON public.rejected_technologies;
DROP POLICY IF EXISTS "authenticated_users_rejected_technologies_insert" ON public.rejected_technologies;

CREATE POLICY "Supervisors and admins can insert rejected technologies"
ON public.rejected_technologies
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update DELETE policy to allow only admins
DROP POLICY IF EXISTS "Admins can delete rejected technologies" ON public.rejected_technologies;
DROP POLICY IF EXISTS "authenticated_users_rejected_technologies_delete" ON public.rejected_technologies;

CREATE POLICY "Only admins can delete rejected technologies"
ON public.rejected_technologies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));