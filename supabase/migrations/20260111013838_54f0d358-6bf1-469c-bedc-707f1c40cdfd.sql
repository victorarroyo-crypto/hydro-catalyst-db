-- Añadir campo application_data JSONB a case_study_technologies
ALTER TABLE public.case_study_technologies 
ADD COLUMN IF NOT EXISTS application_data JSONB DEFAULT NULL;

-- Añadir comentario descriptivo
COMMENT ON COLUMN public.case_study_technologies.application_data IS 'Datos adicionales de la tecnología extraídos del caso de estudio que no mapean a la ficha estándar: capacity, removal_efficiency, footprint, power_consumption, price_range, opex_estimate, business_model, lead_time, rationale, provider_countries_active, other_specs';