-- Asegurar extensión uuid-ossp para uuid_generate_v5
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para encolar cambios de subcategorias
CREATE OR REPLACE FUNCTION public.enqueue_subcategoria_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload_data JSONB;
  converted_uuid UUID;
BEGIN
  -- Convertir INTEGER id a UUID usando uuid_generate_v5 con uuid_ns_oid()
  IF TG_OP = 'DELETE' THEN
    converted_uuid := uuid_generate_v5(uuid_ns_oid(), OLD.id::text);
    payload_data := jsonb_build_object('id', OLD.id, 'operation', 'DELETE');
    
    INSERT INTO sync_queue (table_name, operation, record_id, payload)
    VALUES ('taxonomy_subcategorias', 'DELETE', converted_uuid, payload_data);
    
    RETURN OLD;
  ELSE
    converted_uuid := uuid_generate_v5(uuid_ns_oid(), NEW.id::text);
    payload_data := to_jsonb(NEW);
    
    INSERT INTO sync_queue (table_name, operation, record_id, payload)
    VALUES ('taxonomy_subcategorias', TG_OP, converted_uuid, payload_data);
    
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger en taxonomy_subcategorias
CREATE TRIGGER subcategoria_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON taxonomy_subcategorias
FOR EACH ROW EXECUTE FUNCTION public.enqueue_subcategoria_sync();