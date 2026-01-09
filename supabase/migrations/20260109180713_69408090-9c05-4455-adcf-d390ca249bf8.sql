-- Function to call the sync-advisor-embeddings edge function
CREATE OR REPLACE FUNCTION public.trigger_sync_advisor_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  payload jsonb;
  record_data jsonb;
BEGIN
  -- Build the record data based on operation
  IF TG_OP = 'DELETE' THEN
    record_data := to_jsonb(OLD);
  ELSE
    record_data := to_jsonb(NEW);
  END IF;

  -- Build the payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', record_data
  );

  -- Add old_record for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    payload := payload || jsonb_build_object('old_record', to_jsonb(OLD));
  END IF;

  -- Call edge function via pg_net (async HTTP)
  PERFORM net.http_post(
    url := 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/sync-advisor-embeddings',
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
  RAISE WARNING 'Sync to advisor embeddings failed: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger for technologies table (INSERT and UPDATE)
DROP TRIGGER IF EXISTS sync_technologies_to_advisor ON public.technologies;
CREATE TRIGGER sync_technologies_to_advisor
  AFTER INSERT OR UPDATE ON public.technologies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_advisor_embeddings();

-- Trigger for knowledge_documents table (INSERT and UPDATE)
DROP TRIGGER IF EXISTS sync_knowledge_documents_to_advisor ON public.knowledge_documents;
CREATE TRIGGER sync_knowledge_documents_to_advisor
  AFTER INSERT OR UPDATE ON public.knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_advisor_embeddings();

-- Trigger for knowledge_chunks table (INSERT only)
DROP TRIGGER IF EXISTS sync_knowledge_chunks_to_advisor ON public.knowledge_chunks;
CREATE TRIGGER sync_knowledge_chunks_to_advisor
  AFTER INSERT ON public.knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_advisor_embeddings();