-- Create scouting_sources table
CREATE TABLE public.scouting_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('directorio', 'feria', 'revista', 'aceleradora', 'asociacion', 'empresa', 'otro')),
  descripcion TEXT,
  pais TEXT,
  sector_foco TEXT CHECK (sector_foco IN ('municipal', 'industrial', 'ambos')),
  tecnologias_foco TEXT,
  frecuencia_escaneo TEXT CHECK (frecuencia_escaneo IN ('semanal', 'mensual', 'trimestral', 'anual')),
  ultima_revision TIMESTAMP WITH TIME ZONE,
  proxima_revision TIMESTAMP WITH TIME ZONE,
  tecnologias_encontradas INTEGER DEFAULT 0,
  calidad_score INTEGER CHECK (calidad_score >= 1 AND calidad_score <= 5),
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.scouting_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view scouting_sources"
ON public.scouting_sources
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

CREATE POLICY "Internal users can insert scouting_sources"
ON public.scouting_sources
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

CREATE POLICY "Internal users can update scouting_sources"
ON public.scouting_sources
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);

CREATE POLICY "Admins can delete scouting_sources"
ON public.scouting_sources
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_scouting_sources_updated_at
BEFORE UPDATE ON public.scouting_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.scouting_sources (nombre, url, tipo, pais, calidad_score, sector_foco, frecuencia_escaneo, activo, descripcion) VALUES
('IFAT Munich', 'https://ifat.de', 'feria', 'Alemania', 5, 'ambos', 'anual', true, 'Feria líder mundial en gestión de agua, residuos y materias primas'),
('Aquatech Amsterdam', 'https://aquatechtrade.com', 'feria', 'Países Bajos', 5, 'ambos', 'anual', true, 'Principal feria internacional de tecnología del agua'),
('BlueTech Research', 'https://bluetechresearch.com', 'directorio', 'USA', 4, 'ambos', 'mensual', true, 'Directorio y análisis de startups de agua'),
('Water Online', 'https://wateronline.com', 'revista', 'USA', 3, 'municipal', 'semanal', true, 'Portal de noticias y tecnología del agua'),
('Imagine H2O', 'https://imagineh2o.org', 'aceleradora', 'USA', 4, 'ambos', 'trimestral', true, 'Aceleradora líder de startups de agua');