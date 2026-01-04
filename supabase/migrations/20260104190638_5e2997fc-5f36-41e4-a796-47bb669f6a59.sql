-- Create table for case studies (moved from technologies - municipalities, councils, etc.)
CREATE TABLE public.casos_de_estudio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT, -- 'municipal', 'council', 'corporation', 'project', etc.
  country TEXT,
  sector TEXT,
  technology_types TEXT[], -- Array of technology types involved
  original_data JSONB, -- Preserve all original technology data
  source_technology_id UUID, -- Reference to original technology if moved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casos_de_estudio ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read casos_de_estudio"
ON public.casos_de_estudio
FOR SELECT
USING (true);

CREATE POLICY "Internal users can insert casos_de_estudio"
ON public.casos_de_estudio
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Internal users can update casos_de_estudio"
ON public.casos_de_estudio
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor') OR 
  has_role(auth.uid(), 'analyst')
);

CREATE POLICY "Admins can delete casos_de_estudio"
ON public.casos_de_estudio
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_casos_de_estudio_country ON public.casos_de_estudio(country);
CREATE INDEX idx_casos_de_estudio_entity_type ON public.casos_de_estudio(entity_type);

-- Trigger for updated_at
CREATE TRIGGER update_casos_de_estudio_updated_at
BEFORE UPDATE ON public.casos_de_estudio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();