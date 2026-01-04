-- Create junction table for many-to-many relationship between technologies and tipos
CREATE TABLE public.technology_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  tipo_id integer NOT NULL REFERENCES public.taxonomy_tipos(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(technology_id, tipo_id)
);

-- Enable RLS
ALTER TABLE public.technology_tipos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read technology_tipos"
ON public.technology_tipos
FOR SELECT
USING (true);

CREATE POLICY "Internal users can insert technology_tipos"
ON public.technology_tipos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Internal users can update technology_tipos"
ON public.technology_tipos
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Internal users can delete technology_tipos"
ON public.technology_tipos
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

-- Create index for better query performance
CREATE INDEX idx_technology_tipos_technology_id ON public.technology_tipos(technology_id);
CREATE INDEX idx_technology_tipos_tipo_id ON public.technology_tipos(tipo_id);