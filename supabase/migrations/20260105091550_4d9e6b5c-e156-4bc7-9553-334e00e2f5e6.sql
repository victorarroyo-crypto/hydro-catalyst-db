-- Create table for AI usage logs
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'classification', 'search', 'knowledge_base'
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Internal users can insert logs
CREATE POLICY "Internal users can insert AI usage logs" 
ON public.ai_usage_logs 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'analyst')
);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view AI usage logs" 
ON public.ai_usage_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Index for faster queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_action_type ON public.ai_usage_logs(action_type);
CREATE INDEX idx_ai_usage_logs_model ON public.ai_usage_logs(model);