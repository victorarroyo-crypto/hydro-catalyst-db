-- Create table for AI model settings per action
CREATE TABLE public.ai_model_settings (
  id TEXT PRIMARY KEY,
  action_type TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;

-- Insert default values for each action
INSERT INTO public.ai_model_settings (id, action_type, model) VALUES
  ('classification', 'classification', 'google/gemini-2.5-flash'),
  ('search', 'search', 'google/gemini-2.5-flash'),
  ('knowledge_base', 'knowledge_base', 'google/gemini-2.5-flash');

-- Policy: Admins can manage all settings
CREATE POLICY "Admins can manage AI model settings" 
ON public.ai_model_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: All authenticated users can read settings
CREATE POLICY "Authenticated users can read AI model settings" 
ON public.ai_model_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);