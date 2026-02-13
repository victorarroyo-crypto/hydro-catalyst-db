
-- =============================================
-- MÓDULO DE QUÍMICOS - TODAS LAS TABLAS
-- =============================================

-- 1. PROVEEDORES DE QUÍMICOS
CREATE TABLE public.chem_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  cif TEXT,
  contacto TEXT,
  email TEXT,
  telefono TEXT,
  web TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_suppliers" ON public.chem_suppliers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2. PROYECTOS DE QUÍMICOS
CREATE TABLE public.chem_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre_cliente TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'otro',
  contacto_principal TEXT,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'prospeccion',
  fecha_mandato DATE,
  gasto_total_anual NUMERIC DEFAULT 0,
  potencial_ahorro NUMERIC DEFAULT 0,
  ahorro_conseguido NUMERIC DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chem_projects" ON public.chem_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. PRODUCTOS QUÍMICOS (INVENTARIO)
CREATE TABLE public.chem_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  nombre_comercial TEXT NOT NULL,
  materia_activa TEXT,
  concentracion NUMERIC,
  familia TEXT,
  clasificacion_pareto TEXT DEFAULT 'commodity',
  codigo_taric TEXT,
  aplicacion TEXT,
  proveedor_id UUID REFERENCES public.chem_suppliers(id),
  proveedor_nombre TEXT,
  precio_kg NUMERIC,
  tipo_precio TEXT DEFAULT 'fijo',
  indice_referencia TEXT,
  prima_actual NUMERIC,
  incoterm TEXT DEFAULT 'DAP',
  coste_transporte NUMERIC,
  formato_envase TEXT,
  consumo_anual_kg NUMERIC DEFAULT 0,
  benchmark_kg_ma NUMERIC,
  potencial_ahorro NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_products" ON public.chem_products
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 4. AUDITORÍA CONTRACTUAL
CREATE TABLE public.chem_contract_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES public.chem_suppliers(id),
  proveedor_nombre TEXT NOT NULL,
  
  -- Pago
  plazo_pago_dias INTEGER,
  pronto_pago_descuento NUMERIC,
  pronto_pago_dias INTEGER,
  
  -- Duración
  duracion_meses INTEGER,
  fecha_vencimiento DATE,
  renovacion_automatica BOOLEAN DEFAULT false,
  preaviso_dias INTEGER,
  clausula_salida BOOLEAN DEFAULT false,
  
  -- Volúmenes
  volumen_comprometido NUMERIC,
  banda_min NUMERIC,
  banda_max NUMERIC,
  take_or_pay BOOLEAN DEFAULT false,
  penalizacion_detalle TEXT,
  
  -- Revisión precios
  existe_formula BOOLEAN DEFAULT false,
  formula_detalle TEXT,
  indice_vinculado TEXT,
  frecuencia_revision TEXT,
  simetria BOOLEAN DEFAULT true,
  cap_subida NUMERIC,
  floor_bajada NUMERIC,
  
  -- Rappels
  rappel_existe BOOLEAN DEFAULT false,
  rappel_detalle TEXT,
  rappel_cobrado BOOLEAN DEFAULT false,
  
  -- Logística
  stock_consigna BOOLEAN DEFAULT false,
  gestion_envases TEXT,
  coste_envases_incluido BOOLEAN DEFAULT true,
  
  -- Servicio
  servicio_tecnico BOOLEAN DEFAULT false,
  servicio_tecnico_detalle TEXT,
  equipos_comodato BOOLEAN DEFAULT false,
  equipos_comodato_detalle TEXT,
  clausula_mfn BOOLEAN DEFAULT false,
  
  -- Scoring
  score_precio NUMERIC,
  score_condiciones NUMERIC,
  score_servicio NUMERIC,
  score_logistica NUMERIC,
  score_media NUMERIC,
  
  -- Campos IA
  campos_ia_confirmados JSONB DEFAULT '{}',
  
  -- Progreso
  campos_completados INTEGER DEFAULT 0,
  campos_totales INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_contract_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_contract_audits" ON public.chem_contract_audits
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 5. DOCUMENTOS CONTRACTUALES
CREATE TABLE public.chem_contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.chem_contract_audits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'otro',
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  estado_extraccion TEXT DEFAULT 'pendiente',
  datos_extraidos JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_contract_documents" ON public.chem_contract_documents
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 6. BASELINES
CREATE TABLE public.chem_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  periodo_inicio DATE,
  periodo_fin DATE,
  volumen_referencia_kg NUMERIC,
  precio_medio_ponderado NUMERIC,
  precio_kg_ma NUMERIC,
  prima_baseline NUMERIC,
  fuente_verificacion TEXT,
  formula_calculo TEXT,
  firmado BOOLEAN DEFAULT false,
  fecha_firma DATE,
  firmante_cliente TEXT,
  firmante_era TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_baselines" ON public.chem_baselines
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 7. BENCHMARKS
CREATE TABLE public.chem_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'sin_investigar',
  
  -- Cotizaciones distribuidores (hasta 3)
  cotizacion_1_proveedor TEXT,
  cotizacion_1_precio NUMERIC,
  cotizacion_1_fecha DATE,
  cotizacion_2_proveedor TEXT,
  cotizacion_2_precio NUMERIC,
  cotizacion_2_fecha DATE,
  cotizacion_3_proveedor TEXT,
  cotizacion_3_precio NUMERIC,
  cotizacion_3_fecha DATE,
  
  -- DataComex
  taric_precio_cif NUMERIC,
  taric_periodo TEXT,
  
  -- ICIS / ChemAnalyst
  icis_precio NUMERIC,
  icis_prima NUMERIC,
  icis_fecha DATE,
  
  -- Benchmark histórico
  historico_precio NUMERIC,
  historico_proyecto TEXT,
  historico_fecha DATE,
  historico_proveedor TEXT,
  historico_volumen NUMERIC,
  
  -- Resultado
  mejor_benchmark NUMERIC,
  gap_porcentaje NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_benchmarks" ON public.chem_benchmarks
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 8. BIBLIOTECA DE BENCHMARKS (cross-proyecto)
CREATE TABLE public.chem_benchmark_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  materia_activa TEXT NOT NULL,
  concentracion NUMERIC,
  precio_kg_ma NUMERIC NOT NULL,
  proveedor TEXT,
  volumen_anual NUMERIC,
  proyecto_origen TEXT,
  proyecto_id UUID,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_benchmark_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_benchmark_library" ON public.chem_benchmark_library
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 9. HISTÓRICO DE PRECIOS
CREATE TABLE public.chem_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  importe_facturado NUMERIC,
  cantidad_kg NUMERIC,
  indice_icis NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_price_history" ON public.chem_price_history
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 10. VISITAS A PLANTA
CREATE TABLE public.chem_plant_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  fecha_visita DATE,
  visitante TEXT,
  acompanante_cliente TEXT,
  checklist JSONB DEFAULT '[]',
  impacto_total_estimado NUMERIC DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_plant_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_plant_visits" ON public.chem_plant_visits
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 11. RFQs
CREATE TABLE public.chem_rfqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  estado TEXT DEFAULT 'borrador',
  fecha_envio DATE,
  fecha_limite DATE,
  incoterm TEXT DEFAULT 'DAP',
  condiciones_pago TEXT,
  especificaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_rfqs" ON public.chem_rfqs
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 12. PRODUCTOS EN RFQ
CREATE TABLE public.chem_rfq_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.chem_rfqs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_rfq_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_rfq_products" ON public.chem_rfq_products
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 13. PROVEEDORES EN RFQ
CREATE TABLE public.chem_rfq_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.chem_rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.chem_suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_rfq_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_rfq_suppliers" ON public.chem_rfq_suppliers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 14. OFERTAS
CREATE TABLE public.chem_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.chem_rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.chem_suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  precio NUMERIC,
  incoterm TEXT,
  plazo_pago INTEGER,
  incluye_transporte BOOLEAN DEFAULT false,
  incluye_servicio BOOLEAN DEFAULT false,
  incluye_comodato BOOLEAN DEFAULT false,
  certificaciones TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_offers" ON public.chem_offers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 15. TRACKING DE AHORRO
CREATE TABLE public.chem_savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.chem_products(id) ON DELETE CASCADE,
  tipo_ahorro TEXT DEFAULT 'fijo',
  baseline_kg_ma NUMERIC,
  nuevo_precio_kg_ma NUMERIC,
  prima_anterior NUMERIC,
  prima_nueva NUMERIC,
  volumen_real_12m NUMERIC,
  ahorro_anual NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_savings" ON public.chem_savings
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 16. SEGUIMIENTO MENSUAL DE AHORRO
CREATE TABLE public.chem_savings_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saving_id UUID NOT NULL REFERENCES public.chem_savings(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  ahorro_real NUMERIC DEFAULT 0,
  indice_icis NUMERIC,
  prima_efectiva NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_savings_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_savings_monthly" ON public.chem_savings_monthly
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 17. CARTA DE AUTORIZACIÓN
CREATE TABLE public.chem_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.chem_projects(id) ON DELETE CASCADE,
  nombre_empresa TEXT,
  nif TEXT,
  firmante TEXT,
  cargo TEXT,
  alcance TEXT,
  vigencia_desde DATE,
  vigencia_hasta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chem_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chem_authorizations" ON public.chem_authorizations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Storage bucket para documentos y fotos de visita
INSERT INTO storage.buckets (id, name, public) VALUES ('chem-documents', 'chem-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chem docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chem-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read chem docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'chem-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete chem docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'chem-documents' AND auth.uid() IS NOT NULL);
