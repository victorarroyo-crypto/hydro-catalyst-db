-- Add default AI model setting for enrichment action
INSERT INTO public.ai_model_settings (id, action_type, model)
VALUES ('enrichment', 'enrichment', 'google/gemini-2.5-flash')
ON CONFLICT (action_type) DO NOTHING;