-- Actualizar función close_zombie_jobs con default de 15 minutos
CREATE OR REPLACE FUNCTION public.close_zombie_jobs(max_age_minutes integer DEFAULT 15)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Crear función específica para case study jobs con 15 minutos de threshold
CREATE OR REPLACE FUNCTION public.close_zombie_case_study_jobs(max_age_minutes integer DEFAULT 15)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  -- Verify user is admin or supervisor
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')) THEN
    RAISE EXCEPTION 'Solo administradores o supervisores pueden cerrar jobs zombie de case studies';
  END IF;

  UPDATE case_study_jobs
  SET 
    status = 'failed',
    completed_at = NOW(),
    current_phase = 'zombie_closed',
    error_message = 'Job zombie - cerrado automáticamente por inactividad (' || max_age_minutes || ' minutos)',
    updated_at = NOW()
  WHERE status = 'processing'
    AND updated_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;