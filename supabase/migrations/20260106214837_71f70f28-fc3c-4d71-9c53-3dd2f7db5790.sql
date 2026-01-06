-- Tabla para almacenar el historial y progreso de sesiones de scouting
CREATE TABLE public.scouting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Métricas de progreso
  current_phase TEXT,
  progress_percentage INTEGER DEFAULT 0,
  sites_examined INTEGER DEFAULT 0,
  technologies_found INTEGER DEFAULT 0,
  technologies_discarded INTEGER DEFAULT 0,
  technologies_approved INTEGER DEFAULT 0,
  
  -- Configuración usada
  config JSONB,
  
  -- Resumen final
  summary JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para logs detallados de cada sesión
CREATE TABLE public.scouting_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.scouting_sessions(session_id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warning', 'error')),
  phase TEXT,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_scouting_sessions_status ON public.scouting_sessions(status);
CREATE INDEX idx_scouting_sessions_started_at ON public.scouting_sessions(started_at DESC);
CREATE INDEX idx_scouting_session_logs_session_id ON public.scouting_session_logs(session_id);
CREATE INDEX idx_scouting_session_logs_timestamp ON public.scouting_session_logs(timestamp DESC);

-- Habilitar RLS
ALTER TABLE public.scouting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_session_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: admins y supervisors pueden ver todo
CREATE POLICY "Admins and supervisors can view scouting sessions"
ON public.scouting_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor', 'analyst')
  )
);

CREATE POLICY "Admins and supervisors can view scouting logs"
ON public.scouting_session_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'supervisor', 'analyst')
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_scouting_sessions_updated_at
BEFORE UPDATE ON public.scouting_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para ver progreso en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouting_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouting_session_logs;