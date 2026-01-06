-- =============================================
-- TABLA: scouting_queue (Cola de Scouting)
-- =============================================
CREATE TABLE public.scouting_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Campos principales (misma estructura que technologies)
  "Nombre de la tecnología" TEXT NOT NULL,
  "Tipo de tecnología" TEXT NOT NULL DEFAULT 'Sin clasificar',
  "Subcategoría" TEXT,
  "Sector y subsector" TEXT,
  "Proveedor / Empresa" TEXT,
  "País de origen" TEXT,
  "Paises donde actua" TEXT,
  "Web de la empresa" TEXT,
  "Email de contacto" TEXT,
  "Descripción técnica breve" TEXT,
  "Aplicación principal" TEXT,
  "Ventaja competitiva clave" TEXT,
  "Porque es innovadora" TEXT,
  "Grado de madurez (TRL)" INTEGER,
  "Casos de referencia" TEXT,
  "Comentarios del analista" TEXT,
  "Fecha de scouting" DATE DEFAULT CURRENT_DATE,
  "Estado del seguimiento" TEXT,
  
  -- Clasificación taxonómica
  tipo_id INTEGER REFERENCES public.taxonomy_tipos(id),
  subcategoria_id INTEGER REFERENCES public.taxonomy_subcategorias(id),
  sector_id VARCHAR REFERENCES public.taxonomy_sectores(id),
  subsector_industrial VARCHAR,
  
  -- Metadatos de scouting
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'api'
  source_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  
  -- Estado en la cola
  queue_status TEXT DEFAULT 'pending' CHECK (queue_status IN ('pending', 'reviewing', 'approved', 'rejected')),
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Índices para scouting_queue
CREATE INDEX idx_scouting_queue_status ON public.scouting_queue(queue_status);
CREATE INDEX idx_scouting_queue_priority ON public.scouting_queue(priority);
CREATE INDEX idx_scouting_queue_created_at ON public.scouting_queue(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_scouting_queue_updated_at
  BEFORE UPDATE ON public.scouting_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.scouting_queue ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para scouting_queue
CREATE POLICY "Internal users can view scouting_queue"
  ON public.scouting_queue FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Internal users can insert scouting_queue"
  ON public.scouting_queue FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Internal users can update scouting_queue"
  ON public.scouting_queue FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Admins and supervisors can delete scouting_queue"
  ON public.scouting_queue FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- =============================================
-- TABLA: rejected_technologies (Tecnologías Rechazadas)
-- =============================================
CREATE TABLE public.rejected_technologies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ID original si venía de scouting_queue
  original_scouting_id UUID,
  
  -- Campos principales
  "Nombre de la tecnología" TEXT NOT NULL,
  "Tipo de tecnología" TEXT NOT NULL DEFAULT 'Sin clasificar',
  "Subcategoría" TEXT,
  "Sector y subsector" TEXT,
  "Proveedor / Empresa" TEXT,
  "País de origen" TEXT,
  "Paises donde actua" TEXT,
  "Web de la empresa" TEXT,
  "Email de contacto" TEXT,
  "Descripción técnica breve" TEXT,
  "Aplicación principal" TEXT,
  "Ventaja competitiva clave" TEXT,
  "Porque es innovadora" TEXT,
  "Grado de madurez (TRL)" INTEGER,
  "Casos de referencia" TEXT,
  "Comentarios del analista" TEXT,
  "Fecha de scouting" DATE,
  "Estado del seguimiento" TEXT,
  
  -- Clasificación taxonómica
  tipo_id INTEGER REFERENCES public.taxonomy_tipos(id),
  subcategoria_id INTEGER REFERENCES public.taxonomy_subcategorias(id),
  sector_id VARCHAR REFERENCES public.taxonomy_sectores(id),
  subsector_industrial VARCHAR,
  
  -- Razón del rechazo
  rejection_reason TEXT NOT NULL,
  rejection_category TEXT CHECK (rejection_category IN ('duplicate', 'irrelevant', 'incomplete', 'outdated', 'out_of_scope', 'other')),
  
  -- Datos originales para auditoría
  original_data JSONB,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rejected_by UUID
);

-- Índices para rejected_technologies
CREATE INDEX idx_rejected_technologies_category ON public.rejected_technologies(rejection_category);
CREATE INDEX idx_rejected_technologies_rejected_at ON public.rejected_technologies(rejected_at DESC);

-- Habilitar RLS
ALTER TABLE public.rejected_technologies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rejected_technologies
CREATE POLICY "Internal users can view rejected_technologies"
  ON public.rejected_technologies FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Internal users can insert rejected_technologies"
  ON public.rejected_technologies FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Admins can update rejected_technologies"
  ON public.rejected_technologies FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rejected_technologies"
  ON public.rejected_technologies FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FUNCIÓN RPC: approve_scouting_to_technologies
-- Mueve un registro de scouting_queue a technologies
-- =============================================
CREATE OR REPLACE FUNCTION public.approve_scouting_to_technologies(scouting_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tech_id UUID;
  scouting_record RECORD;
BEGIN
  -- Obtener el registro de scouting
  SELECT * INTO scouting_record FROM scouting_queue WHERE id = scouting_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scouting record not found: %', scouting_id;
  END IF;
  
  IF scouting_record.queue_status != 'pending' AND scouting_record.queue_status != 'reviewing' THEN
    RAISE EXCEPTION 'Scouting record is not pending or reviewing: %', scouting_record.queue_status;
  END IF;
  
  -- Insertar en technologies
  INSERT INTO technologies (
    "Nombre de la tecnología",
    "Tipo de tecnología",
    "Subcategoría",
    "Sector y subsector",
    "Proveedor / Empresa",
    "País de origen",
    "Paises donde actua",
    "Web de la empresa",
    "Email de contacto",
    "Descripción técnica breve",
    "Aplicación principal",
    "Ventaja competitiva clave",
    "Porque es innovadora",
    "Grado de madurez (TRL)",
    "Casos de referencia",
    "Comentarios del analista",
    "Fecha de scouting",
    "Estado del seguimiento",
    tipo_id,
    subcategoria_id,
    sector_id,
    subsector_industrial,
    status,
    review_status
  ) VALUES (
    scouting_record."Nombre de la tecnología",
    scouting_record."Tipo de tecnología",
    scouting_record."Subcategoría",
    scouting_record."Sector y subsector",
    scouting_record."Proveedor / Empresa",
    scouting_record."País de origen",
    scouting_record."Paises donde actua",
    scouting_record."Web de la empresa",
    scouting_record."Email de contacto",
    scouting_record."Descripción técnica breve",
    scouting_record."Aplicación principal",
    scouting_record."Ventaja competitiva clave",
    scouting_record."Porque es innovadora",
    scouting_record."Grado de madurez (TRL)",
    scouting_record."Casos de referencia",
    scouting_record."Comentarios del analista",
    scouting_record."Fecha de scouting",
    scouting_record."Estado del seguimiento",
    scouting_record.tipo_id,
    scouting_record.subcategoria_id,
    scouting_record.sector_id,
    scouting_record.subsector_industrial,
    'active',
    'none'
  ) RETURNING id INTO new_tech_id;
  
  -- Actualizar estado en scouting_queue
  UPDATE scouting_queue 
  SET queue_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = scouting_id;
  
  -- Eliminar de scouting_queue
  DELETE FROM scouting_queue WHERE id = scouting_id;
  
  RETURN new_tech_id;
END;
$$;

-- =============================================
-- FUNCIÓN RPC: reject_scouting_to_rejected
-- Mueve un registro de scouting_queue a rejected_technologies
-- =============================================
CREATE OR REPLACE FUNCTION public.reject_scouting_to_rejected(
  scouting_id UUID,
  reason TEXT,
  category TEXT DEFAULT 'other'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_rejected_id UUID;
  scouting_record RECORD;
BEGIN
  -- Obtener el registro de scouting
  SELECT * INTO scouting_record FROM scouting_queue WHERE id = scouting_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scouting record not found: %', scouting_id;
  END IF;
  
  -- Insertar en rejected_technologies
  INSERT INTO rejected_technologies (
    original_scouting_id,
    "Nombre de la tecnología",
    "Tipo de tecnología",
    "Subcategoría",
    "Sector y subsector",
    "Proveedor / Empresa",
    "País de origen",
    "Paises donde actua",
    "Web de la empresa",
    "Email de contacto",
    "Descripción técnica breve",
    "Aplicación principal",
    "Ventaja competitiva clave",
    "Porque es innovadora",
    "Grado de madurez (TRL)",
    "Casos de referencia",
    "Comentarios del analista",
    "Fecha de scouting",
    "Estado del seguimiento",
    tipo_id,
    subcategoria_id,
    sector_id,
    subsector_industrial,
    rejection_reason,
    rejection_category,
    original_data,
    rejected_by
  ) VALUES (
    scouting_record.id,
    scouting_record."Nombre de la tecnología",
    scouting_record."Tipo de tecnología",
    scouting_record."Subcategoría",
    scouting_record."Sector y subsector",
    scouting_record."Proveedor / Empresa",
    scouting_record."País de origen",
    scouting_record."Paises donde actua",
    scouting_record."Web de la empresa",
    scouting_record."Email de contacto",
    scouting_record."Descripción técnica breve",
    scouting_record."Aplicación principal",
    scouting_record."Ventaja competitiva clave",
    scouting_record."Porque es innovadora",
    scouting_record."Grado de madurez (TRL)",
    scouting_record."Casos de referencia",
    scouting_record."Comentarios del analista",
    scouting_record."Fecha de scouting",
    scouting_record."Estado del seguimiento",
    scouting_record.tipo_id,
    scouting_record.subcategoria_id,
    scouting_record.sector_id,
    scouting_record.subsector_industrial,
    reason,
    category,
    to_jsonb(scouting_record),
    auth.uid()
  ) RETURNING id INTO new_rejected_id;
  
  -- Eliminar de scouting_queue
  DELETE FROM scouting_queue WHERE id = scouting_id;
  
  RETURN new_rejected_id;
END;
$$;