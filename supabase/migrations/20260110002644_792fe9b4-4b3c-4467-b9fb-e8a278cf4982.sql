-- Tabla sync_queue para encolar cambios hacia Railway
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices optimizados para el procesador
CREATE INDEX idx_sync_queue_pending ON sync_queue(status, next_retry_at) 
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_sync_queue_table ON sync_queue(table_name);
CREATE INDEX idx_sync_queue_record ON sync_queue(record_id);

-- Habilitar RLS
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Política para que solo service role pueda acceder
CREATE POLICY "Service role full access to sync_queue"
ON public.sync_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Función trigger para encolar cambios de technologies
CREATE OR REPLACE FUNCTION enqueue_technology_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload_data JSONB;
  field TEXT;
  excluded_fields TEXT[] := ARRAY[
    'tipo_id', 'subcategoria_id', 'sector_id', 'subsector_industrial',
    'quality_score', 'review_status', 'review_requested_at', 
    'review_requested_by', 'reviewed_at', 'reviewer_id'
  ];
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Para DELETE solo enviamos id y operación
    payload_data := jsonb_build_object('id', OLD.id, 'operation', 'DELETE');
    
    INSERT INTO sync_queue (table_name, operation, record_id, payload)
    VALUES ('technologies', 'DELETE', OLD.id, payload_data);
    
    RETURN OLD;
  ELSE
    -- Para INSERT/UPDATE enviamos registro completo excepto campos excluidos
    payload_data := to_jsonb(NEW);
    
    -- Remover campos excluidos
    FOREACH field IN ARRAY excluded_fields LOOP
      payload_data := payload_data - field;
    END LOOP;
    
    INSERT INTO sync_queue (table_name, operation, record_id, payload)
    VALUES ('technologies', TG_OP, NEW.id, payload_data);
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en technologies
CREATE TRIGGER technology_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON technologies
FOR EACH ROW EXECUTE FUNCTION enqueue_technology_sync();