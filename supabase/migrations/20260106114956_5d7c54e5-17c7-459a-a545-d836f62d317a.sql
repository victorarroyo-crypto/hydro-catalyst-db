-- Crear triggers de sincronización para scouting_queue
CREATE TRIGGER sync_scouting_queue_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.scouting_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_to_external();

-- Crear triggers de sincronización para rejected_technologies
CREATE TRIGGER sync_rejected_technologies_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.rejected_technologies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_to_external();