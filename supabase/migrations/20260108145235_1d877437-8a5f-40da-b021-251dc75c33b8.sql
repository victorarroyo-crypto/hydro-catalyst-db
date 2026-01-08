-- Function to search technologies by keywords with proper handling of special column names
CREATE OR REPLACE FUNCTION public.search_technologies_by_keywords(
  p_keywords TEXT[],
  p_min_trl INTEGER DEFAULT 7,
  p_max_results INTEGER DEFAULT 50
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
      SELECT COUNT(*)::INTEGER FROM unnest(p_keywords) k
      WHERE 
        COALESCE(t."Descripción técnica breve", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Aplicación principal", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Nombre de la tecnología", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Sector y subsector", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Proveedor / Empresa", '') ILIKE '%' || k || '%' OR
        COALESCE(t."Tipo de tecnología", '') ILIKE '%' || k || '%'
    ) AS relevance
  FROM technologies t
  WHERE 
    t.status = 'active'
    AND COALESCE(t."Grado de madurez (TRL)", 0) >= p_min_trl
    AND EXISTS (
      SELECT 1 FROM unnest(p_keywords) k
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