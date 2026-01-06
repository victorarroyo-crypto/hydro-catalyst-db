-- Create sync trigger for scouting_sources table
CREATE TRIGGER trigger_sync_scouting_sources
AFTER INSERT OR UPDATE OR DELETE ON public.scouting_sources
FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_to_external();