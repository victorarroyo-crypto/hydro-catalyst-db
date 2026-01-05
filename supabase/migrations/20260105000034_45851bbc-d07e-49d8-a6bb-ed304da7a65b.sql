-- Create junction table for many-to-many relationship between technologies and subcategorias
CREATE TABLE public.technology_subcategorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  subcategoria_id integer NOT NULL REFERENCES public.taxonomy_subcategorias(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(technology_id, subcategoria_id)
);

-- Enable RLS
ALTER TABLE public.technology_subcategorias ENABLE ROW LEVEL SECURITY;

-- Create policies for technology_subcategorias
CREATE POLICY "Anyone can read technology_subcategorias"
ON public.technology_subcategorias FOR SELECT
USING (true);

CREATE POLICY "Internal users can insert technology_subcategorias"
ON public.technology_subcategorias FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

CREATE POLICY "Internal users can update technology_subcategorias"
ON public.technology_subcategorias FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

CREATE POLICY "Internal users can delete technology_subcategorias"
ON public.technology_subcategorias FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);