-- Enable pg_net extension for making HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to sync changes to external Supabase
CREATE OR REPLACE FUNCTION public.sync_to_external_supabase()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  edge_function_url text;
BEGIN
  -- Build the edge function URL
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sync-to-external';
  
  -- If URL is not set, try to get it from environment (fallback)
  IF edge_function_url IS NULL OR edge_function_url = '/functions/v1/sync-to-external' THEN
    edge_function_url := 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/sync-to-external';
  END IF;

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

  -- Make async HTTP request to edge function
  PERFORM extensions.http_post(
    edge_function_url,
    payload::text,
    'application/json'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for technologies table
DROP TRIGGER IF EXISTS sync_technologies_insert ON technologies;
CREATE TRIGGER sync_technologies_insert
  AFTER INSERT ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_technologies_update ON technologies;
CREATE TRIGGER sync_technologies_update
  AFTER UPDATE ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_technologies_delete ON technologies;
CREATE TRIGGER sync_technologies_delete
  AFTER DELETE ON technologies
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

-- Create triggers for taxonomy_tipos table
DROP TRIGGER IF EXISTS sync_taxonomy_tipos_insert ON taxonomy_tipos;
CREATE TRIGGER sync_taxonomy_tipos_insert
  AFTER INSERT ON taxonomy_tipos
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_tipos_update ON taxonomy_tipos;
CREATE TRIGGER sync_taxonomy_tipos_update
  AFTER UPDATE ON taxonomy_tipos
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_tipos_delete ON taxonomy_tipos;
CREATE TRIGGER sync_taxonomy_tipos_delete
  AFTER DELETE ON taxonomy_tipos
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

-- Create triggers for taxonomy_subcategorias table
DROP TRIGGER IF EXISTS sync_taxonomy_subcategorias_insert ON taxonomy_subcategorias;
CREATE TRIGGER sync_taxonomy_subcategorias_insert
  AFTER INSERT ON taxonomy_subcategorias
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_subcategorias_update ON taxonomy_subcategorias;
CREATE TRIGGER sync_taxonomy_subcategorias_update
  AFTER UPDATE ON taxonomy_subcategorias
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_subcategorias_delete ON taxonomy_subcategorias;
CREATE TRIGGER sync_taxonomy_subcategorias_delete
  AFTER DELETE ON taxonomy_subcategorias
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

-- Create triggers for taxonomy_sectores table
DROP TRIGGER IF EXISTS sync_taxonomy_sectores_insert ON taxonomy_sectores;
CREATE TRIGGER sync_taxonomy_sectores_insert
  AFTER INSERT ON taxonomy_sectores
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_sectores_update ON taxonomy_sectores;
CREATE TRIGGER sync_taxonomy_sectores_update
  AFTER UPDATE ON taxonomy_sectores
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_taxonomy_sectores_delete ON taxonomy_sectores;
CREATE TRIGGER sync_taxonomy_sectores_delete
  AFTER DELETE ON taxonomy_sectores
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

-- Create triggers for technological_trends table
DROP TRIGGER IF EXISTS sync_technological_trends_insert ON technological_trends;
CREATE TRIGGER sync_technological_trends_insert
  AFTER INSERT ON technological_trends
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_technological_trends_update ON technological_trends;
CREATE TRIGGER sync_technological_trends_update
  AFTER UPDATE ON technological_trends
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();

DROP TRIGGER IF EXISTS sync_technological_trends_delete ON technological_trends;
CREATE TRIGGER sync_technological_trends_delete
  AFTER DELETE ON technological_trends
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_external_supabase();