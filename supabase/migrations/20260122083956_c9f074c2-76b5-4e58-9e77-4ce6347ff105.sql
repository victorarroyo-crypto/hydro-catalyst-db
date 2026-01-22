-- Fase 1: Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Fase 2: Borrar tabla existente (no afecta BD externa)
DROP TABLE IF EXISTS technologies CASCADE;

-- Fase 3: Crear nueva tabla con estructura snake_case simplificada
CREATE TABLE technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT,
    descripcion TEXT,
    proveedor TEXT,
    pais TEXT,
    web TEXT,
    email TEXT,
    tipo TEXT,
    sector TEXT,
    aplicacion TEXT,
    ventaja TEXT,
    innovacion TEXT,
    casos_referencia TEXT,
    paises_actua TEXT,
    comentarios TEXT,
    fecha_scouting TEXT,
    estado_seguimiento TEXT,
    trl INTEGER,
    quality_score INTEGER,
    status TEXT DEFAULT 'active',
    review_status TEXT DEFAULT 'pending',
    reviewer_id UUID,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    review_requested_at TIMESTAMPTZ,
    review_requested_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    version INTEGER DEFAULT 1,
    embedding vector(1536),
    embedding_updated_at TIMESTAMPTZ,
    tipo_id INTEGER,
    subcategoria_id INTEGER,
    sector_id TEXT,
    categorias TEXT[] DEFAULT '{}',
    tipos TEXT[] DEFAULT '{}',
    subcategorias TEXT[] DEFAULT '{}',
    subsector_industrial TEXT
);

-- Fase 4: Crear índices para búsquedas eficientes
CREATE INDEX idx_tech_categorias ON technologies USING gin(categorias);
CREATE INDEX idx_tech_tipos ON technologies USING gin(tipos);
CREATE INDEX idx_tech_subcategorias ON technologies USING gin(subcategorias);
CREATE INDEX idx_tech_status ON technologies(status);
CREATE INDEX idx_tech_trl ON technologies(trl);
CREATE INDEX idx_tech_tipo_id ON technologies(tipo_id);
CREATE INDEX idx_tech_subcategoria_id ON technologies(subcategoria_id);
CREATE INDEX idx_tech_sector_id ON technologies(sector_id);

-- Índice para búsqueda semántica con vectores (requiere al menos 1 registro para ivfflat)
-- Por ahora usamos hnsw que no requiere datos previos
CREATE INDEX idx_tech_embedding ON technologies USING hnsw (embedding vector_cosine_ops);

-- Fase 5: Configurar RLS
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Allow public read" ON technologies FOR SELECT USING (true);

-- Políticas para usuarios autenticados
CREATE POLICY "Allow authenticated insert" ON technologies 
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON technologies 
FOR UPDATE TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated delete" ON technologies 
FOR DELETE TO authenticated 
USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_technologies_updated_at
    BEFORE UPDATE ON technologies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE technologies;