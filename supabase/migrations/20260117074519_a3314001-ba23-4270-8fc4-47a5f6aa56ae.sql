-- Drop and recreate the function with proper type handling
DROP FUNCTION IF EXISTS public.search_technologies_by_keywords_v2;

CREATE OR REPLACE FUNCTION public.search_technologies_by_keywords_v2(
  p_keywords TEXT[],
  p_min_trl INT DEFAULT NULL,
  p_max_trl INT DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL,
  p_sector_ids TEXT[] DEFAULT NULL,
  p_tipo_id INT DEFAULT NULL,
  p_subcategoria_id INT DEFAULT NULL,
  p_limit INT DEFAULT 300
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  tipo TEXT,
  subcategoria TEXT,
  sector TEXT,
  proveedor TEXT,
  descripcion TEXT,
  aplicacion TEXT,
  trl INT,
  status TEXT,
  relevance_score INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kw TEXT;
  kw_pattern TEXT;
BEGIN
  RETURN QUERY
  WITH keyword_matches AS (
    SELECT 
      t.id,
      t."Nombre de la tecnología" as nombre,
      t."Tipo de tecnología" as tipo,
      t."Subcategoría" as subcategoria,
      t."Sector y subsector" as sector,
      t."Proveedor / Empresa" as proveedor,
      t."Descripción técnica breve" as descripcion,
      t."Aplicación principal" as aplicacion,
      t."Grado de madurez (TRL)" as trl,
      t.status,
      -- Calculate relevance score based on keyword matches
      (
        SELECT COUNT(*)::INT 
        FROM unnest(p_keywords) AS k
        WHERE 
          LOWER(COALESCE(t."Nombre de la tecnología", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Tipo de tecnología", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Subcategoría", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Aplicación principal", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Descripción técnica breve", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Proveedor / Empresa", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Sector y subsector", '')) LIKE '%' || LOWER(k) || '%'
      ) as relevance_score
    FROM technologies t
    WHERE 
      -- At least one keyword must match
      EXISTS (
        SELECT 1 FROM unnest(p_keywords) AS k
        WHERE 
          LOWER(COALESCE(t."Nombre de la tecnología", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Tipo de tecnología", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Subcategoría", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Aplicación principal", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Descripción técnica breve", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Proveedor / Empresa", '')) LIKE '%' || LOWER(k) || '%'
          OR LOWER(COALESCE(t."Sector y subsector", '')) LIKE '%' || LOWER(k) || '%'
      )
      -- Apply optional filters
      AND (p_min_trl IS NULL OR t."Grado de madurez (TRL)" >= p_min_trl)
      AND (p_max_trl IS NULL OR t."Grado de madurez (TRL)" <= p_max_trl)
      AND (p_statuses IS NULL OR t.status = ANY(p_statuses))
      AND (p_sector_ids IS NULL OR t.sector_id::TEXT = ANY(p_sector_ids))
      AND (p_tipo_id IS NULL OR t.tipo_id = p_tipo_id)
      AND (p_subcategoria_id IS NULL OR t.subcategoria_id = p_subcategoria_id)
  )
  SELECT * FROM keyword_matches
  WHERE keyword_matches.relevance_score > 0
  ORDER BY keyword_matches.relevance_score DESC, keyword_matches.nombre ASC
  LIMIT p_limit;
END;
$$;