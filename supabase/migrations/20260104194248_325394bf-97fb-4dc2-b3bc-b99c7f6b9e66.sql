-- Crear o reemplazar la función de sincronización que llama al edge function
CREATE OR REPLACE FUNCTION public.trigger_sync_to_external()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Build payload based on operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'action', 'INSERT',
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'action', 'UPDATE',
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'recordId', NEW.id
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'action', 'DELETE',
      'table', TG_TABLE_NAME,
      'recordId', OLD.id
    );
  END IF;

  -- Call edge function via pg_net (async HTTP)
  PERFORM net.http_post(
    url := 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/sync-to-external',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Sync to external failed: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Crear triggers para technologies
DROP TRIGGER IF EXISTS sync_technologies_insert ON public.technologies;
DROP TRIGGER IF EXISTS sync_technologies_update ON public.technologies;
DROP TRIGGER IF EXISTS sync_technologies_delete ON public.technologies;

CREATE TRIGGER sync_technologies_insert
  AFTER INSERT ON public.technologies
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_technologies_update
  AFTER UPDATE ON public.technologies
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_technologies_delete
  AFTER DELETE ON public.technologies
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

-- Crear triggers para casos_de_estudio
DROP TRIGGER IF EXISTS sync_casos_insert ON public.casos_de_estudio;
DROP TRIGGER IF EXISTS sync_casos_update ON public.casos_de_estudio;
DROP TRIGGER IF EXISTS sync_casos_delete ON public.casos_de_estudio;

CREATE TRIGGER sync_casos_insert
  AFTER INSERT ON public.casos_de_estudio
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_casos_update
  AFTER UPDATE ON public.casos_de_estudio
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_casos_delete
  AFTER DELETE ON public.casos_de_estudio
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

-- Crear triggers para technological_trends
DROP TRIGGER IF EXISTS sync_trends_insert ON public.technological_trends;
DROP TRIGGER IF EXISTS sync_trends_update ON public.technological_trends;
DROP TRIGGER IF EXISTS sync_trends_delete ON public.technological_trends;

CREATE TRIGGER sync_trends_insert
  AFTER INSERT ON public.technological_trends
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_trends_update
  AFTER UPDATE ON public.technological_trends
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();

CREATE TRIGGER sync_trends_delete
  AFTER DELETE ON public.technological_trends
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_to_external();