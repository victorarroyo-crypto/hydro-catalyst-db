-- Keyword search for technologies with flexible TRL/status and optional taxonomy filters
CREATE OR REPLACE FUNCTION public.search_technologies_by_keywords_v2(
  p_keywords TEXT[],
  p_min_trl INTEGER DEFAULT 1,
  p_max_trl INTEGER DEFAULT 9,
  p_statuses TEXT[] DEFAULT ARRAY['active','approved','en_revision','inactive'],
  p_tipo_id INTEGER DEFAULT NULL,
  p_subcategoria_id INTEGER DEFAULT NULL,
  p_sector_id UUID DEFAULT NULL,
  p_max_results INTEGER DEFAULT 300
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  proveedor TEXT,
  pais TEXT,
  trl INTEGER,
  descripcion TEXT,
  aplicacion TEXT,
  tipo TEXT,
  subcategoria TEXT,
  web TEXT,
  ventaja TEXT,
  innovacion TEXT,
  casos_referencia TEXT,
  sector TEXT,
  relevance_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t."Nombre de la tecnología"::TEXT,
    t."Proveedor / Empresa"::TEXT,
    t."País de origen"::TEXT,
    t."Grado de madurez (TRL)",
    t."Descripción técnica breve"::TEXT,
    t."Aplicación principal"::TEXT,
    t."Tipo de tecnología"::TEXT,
    t."Subcategoría"::TEXT,
    t."Web de la empresa"::TEXT,
    t."Ventaja competitiva clave"::TEXT,
    t."Porque es innovadora"::TEXT,
    t."Casos de referencia"::TEXT,
    t."Sector y subsector"::TEXT,
    (
      SELECT COUNT(*)::INTEGER
      FROM unnest(p_keywords) k
      WHERE
        COALESCE(t."Descripción técnica breve", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Aplicación principal", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Nombre de la tecnología", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Sector y subsector", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Proveedor / Empresa", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Tipo de tecnología", '') ILIKE '%' || k || '%'
    ) AS relevance
  FROM public.technologies t
  WHERE
    (
      t.status IS NULL OR
      t.status = ANY(p_statuses)
    )
    AND COALESCE(t."Grado de madurez (TRL)", 0) BETWEEN p_min_trl AND p_max_trl
    AND (p_tipo_id IS NULL OR t.tipo_id = p_tipo_id)
    AND (p_subcategoria_id IS NULL OR t.subcategoria_id = p_subcategoria_id)
    AND (p_sector_id IS NULL OR t.sector_id = p_sector_id)
    AND EXISTS (
      SELECT 1
      FROM unnest(p_keywords) k
      WHERE
        COALESCE(t."Descripción técnica breve", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Aplicación principal", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Nombre de la tecnología", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Proveedor / Empresa", '') ILIKE '%' || k || '%'
    )
  ORDER BY relevance DESC, COALESCE(t."Grado de madurez (TRL)", 0) DESC
  LIMIT p_max_results;
END;
$$;

-- Allow authenticated users to execute (SECURITY DEFINER but explicit grant is nice)
GRANT EXECUTE ON FUNCTION public.search_technologies_by_keywords_v2(TEXT[], INTEGER, INTEGER, TEXT[], INTEGER, INTEGER, UUID, INTEGER) TO anon, authenticated;
