-- Función para normalizar URLs (quitar www, trailing slashes, etc)
CREATE OR REPLACE FUNCTION public.normalize_source_url(url TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(url, '^https?://(www\.)?', ''),
          '/+$', ''
        ),
        '/en/?$', ''
      ),
      '/es/?$', ''
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Eliminar duplicados (mantener el registro más antiguo)
DELETE FROM scouting_sources a
USING scouting_sources b
WHERE a.id > b.id 
AND public.normalize_source_url(a.url) = public.normalize_source_url(b.url);

-- Crear índice único en URL normalizada para prevenir duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS idx_scouting_sources_normalized_url 
ON scouting_sources (public.normalize_source_url(url));