-- Función para normalizar texto para comparación de duplicados
CREATE OR REPLACE FUNCTION public.normalize_tech_name(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          COALESCE(input_text, ''),
          '[™®©]', '', 'g'  -- Quitar símbolos de marca
        ),
        '\s+', ' ', 'g'  -- Normalizar espacios múltiples
      )
    )
  );
END;
$$;

-- Función para verificar si existe un duplicado en technologies
CREATE OR REPLACE FUNCTION public.check_technology_duplicate(
  p_name TEXT,
  p_provider TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_id UUID,
  existing_name TEXT,
  existing_provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_normalized_name TEXT;
  v_normalized_provider TEXT;
  v_found_id UUID;
  v_found_name TEXT;
  v_found_provider TEXT;
BEGIN
  v_normalized_name := normalize_tech_name(p_name);
  v_normalized_provider := normalize_tech_name(p_provider);
  
  -- Buscar duplicado por nombre normalizado + proveedor normalizado
  SELECT t.id, t."Nombre de la tecnología", t."Proveedor / Empresa"
  INTO v_found_id, v_found_name, v_found_provider
  FROM technologies t
  WHERE normalize_tech_name(t."Nombre de la tecnología") = v_normalized_name
    AND (
      -- Mismo proveedor o ambos sin proveedor
      normalize_tech_name(t."Proveedor / Empresa") = v_normalized_provider
      OR (COALESCE(v_normalized_provider, '') = '' AND COALESCE(normalize_tech_name(t."Proveedor / Empresa"), '') = '')
    )
    AND (p_exclude_id IS NULL OR t.id != p_exclude_id)
  LIMIT 1;
  
  IF v_found_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_found_id, v_found_name, v_found_provider;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$;

-- Función para verificar duplicados en scouting_queue
CREATE OR REPLACE FUNCTION public.check_scouting_duplicate(
  p_name TEXT,
  p_provider TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
  in_technologies BOOLEAN,
  in_scouting BOOLEAN,
  existing_tech_id UUID,
  existing_scouting_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_normalized_name TEXT;
  v_normalized_provider TEXT;
  v_tech_id UUID;
  v_scouting_id UUID;
BEGIN
  v_normalized_name := normalize_tech_name(p_name);
  v_normalized_provider := normalize_tech_name(p_provider);
  
  -- Verificar en technologies
  SELECT t.id INTO v_tech_id
  FROM technologies t
  WHERE normalize_tech_name(t."Nombre de la tecnología") = v_normalized_name
    AND normalize_tech_name(t."Proveedor / Empresa") = v_normalized_provider
  LIMIT 1;
  
  -- Verificar en scouting_queue
  SELECT s.id INTO v_scouting_id
  FROM scouting_queue s
  WHERE normalize_tech_name(s."Nombre de la tecnología") = v_normalized_name
    AND normalize_tech_name(s."Proveedor / Empresa") = v_normalized_provider
    AND s.queue_status NOT IN ('rejected', 'approved')
    AND (p_exclude_id IS NULL OR s.id != p_exclude_id)
  LIMIT 1;
  
  RETURN QUERY SELECT 
    v_tech_id IS NOT NULL,
    v_scouting_id IS NOT NULL,
    v_tech_id,
    v_scouting_id,
    CASE 
      WHEN v_tech_id IS NOT NULL THEN 'Ya existe en la base de datos de tecnologías'
      WHEN v_scouting_id IS NOT NULL THEN 'Ya existe en la cola de scouting pendiente de revisión'
      ELSE NULL
    END;
END;
$$;

-- Trigger para prevenir duplicados en technologies
CREATE OR REPLACE FUNCTION public.prevent_technology_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_duplicate RECORD;
BEGIN
  -- Verificar si ya existe un duplicado
  SELECT * INTO v_duplicate
  FROM check_technology_duplicate(
    NEW."Nombre de la tecnología",
    NEW."Proveedor / Empresa",
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  );
  
  IF v_duplicate.is_duplicate THEN
    RAISE EXCEPTION 'Duplicado detectado: La tecnología "%" del proveedor "%" ya existe en la base de datos (ID: %)',
      NEW."Nombre de la tecnología",
      COALESCE(NEW."Proveedor / Empresa", 'Sin proveedor'),
      v_duplicate.existing_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para prevenir duplicados en scouting_queue
CREATE OR REPLACE FUNCTION public.prevent_scouting_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_duplicate RECORD;
BEGIN
  -- Verificar si ya existe un duplicado
  SELECT * INTO v_duplicate
  FROM check_scouting_duplicate(
    NEW."Nombre de la tecnología",
    NEW."Proveedor / Empresa",
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  );
  
  IF v_duplicate.in_technologies THEN
    RAISE EXCEPTION 'Esta tecnología ya existe en la base de datos principal (ID: %)',
      v_duplicate.existing_tech_id;
  END IF;
  
  IF v_duplicate.in_scouting AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Esta tecnología ya está en la cola de scouting pendiente de revisión (ID: %)',
      v_duplicate.existing_scouting_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear triggers
DROP TRIGGER IF EXISTS prevent_tech_duplicate_trigger ON public.technologies;
CREATE TRIGGER prevent_tech_duplicate_trigger
  BEFORE INSERT OR UPDATE OF "Nombre de la tecnología", "Proveedor / Empresa"
  ON public.technologies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_technology_duplicate();

DROP TRIGGER IF EXISTS prevent_scouting_duplicate_trigger ON public.scouting_queue;
CREATE TRIGGER prevent_scouting_duplicate_trigger
  BEFORE INSERT OR UPDATE OF "Nombre de la tecnología", "Proveedor / Empresa"
  ON public.scouting_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_scouting_duplicate();

-- Crear índice para acelerar búsquedas de duplicados
CREATE INDEX IF NOT EXISTS idx_technologies_normalized_name 
ON technologies (normalize_tech_name("Nombre de la tecnología"));

CREATE INDEX IF NOT EXISTS idx_technologies_normalized_provider 
ON technologies (normalize_tech_name("Proveedor / Empresa"));

CREATE INDEX IF NOT EXISTS idx_scouting_normalized_name 
ON scouting_queue (normalize_tech_name("Nombre de la tecnología"));

CREATE INDEX IF NOT EXISTS idx_scouting_normalized_provider 
ON scouting_queue (normalize_tech_name("Proveedor / Empresa"));