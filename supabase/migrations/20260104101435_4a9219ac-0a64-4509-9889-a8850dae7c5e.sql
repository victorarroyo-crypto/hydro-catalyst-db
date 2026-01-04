-- Create technological_trends table
CREATE TABLE public.technological_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  technology_type text NOT NULL,
  subcategory text,
  sector text,
  source_technology_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.technological_trends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view trends"
ON public.technological_trends
FOR SELECT
USING (true);

CREATE POLICY "Internal users can insert trends"
ON public.technological_trends
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Internal users can update trends"
ON public.technological_trends
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Admins can delete trends"
ON public.technological_trends
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add delete policy for technologies (for internal users)
CREATE POLICY "Internal users can delete technologies"
ON public.technologies
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);