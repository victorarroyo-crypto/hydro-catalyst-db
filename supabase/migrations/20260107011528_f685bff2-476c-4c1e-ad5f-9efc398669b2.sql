-- Add last_heartbeat column to scouting_sessions
ALTER TABLE public.scouting_sessions 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Initialize last_heartbeat with updated_at for existing records
UPDATE public.scouting_sessions 
SET last_heartbeat = updated_at 
WHERE last_heartbeat IS NULL;

-- Function to force close a specific scouting job (admin only)
CREATE OR REPLACE FUNCTION public.force_close_scouting_job(
  job_id UUID,
  close_reason TEXT DEFAULT 'Cerrado manualmente desde admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is admin or supervisor
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')) THEN
    RAISE EXCEPTION 'Solo administradores o supervisores pueden forzar cierre de jobs';
  END IF;

  UPDATE scouting_sessions
  SET 
    status = 'failed',
    completed_at = NOW(),
    current_phase = 'force_closed',
    last_heartbeat = NOW(),
    error_message = close_reason,
    updated_at = NOW()
  WHERE id = job_id AND status = 'running';
  
  RETURN FOUND;
END;
$$;

-- Function to close all zombie jobs (admin only)
CREATE OR REPLACE FUNCTION public.close_zombie_jobs(
  max_age_minutes INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  -- Verify user is admin or supervisor
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')) THEN
    RAISE EXCEPTION 'Solo administradores o supervisores pueden cerrar jobs zombie';
  END IF;

  UPDATE scouting_sessions
  SET 
    status = 'failed',
    completed_at = NOW(),
    current_phase = 'zombie_closed',
    last_heartbeat = NOW(),
    error_message = 'Job zombie - cerrado automáticamente por inactividad (' || max_age_minutes || ' minutos)',
    updated_at = NOW()
  WHERE status = 'running'
    AND last_heartbeat < NOW() - (max_age_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;