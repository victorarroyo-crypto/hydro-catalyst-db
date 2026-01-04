-- Create taxonomy_tipos table (main technology types)
CREATE TABLE public.taxonomy_tipos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(3) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

-- Create taxonomy_subcategorias table
CREATE TABLE public.taxonomy_subcategorias (
  id SERIAL PRIMARY KEY,
  tipo_id INTEGER REFERENCES public.taxonomy_tipos(id) ON DELETE CASCADE,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL
);

-- Create taxonomy_sectores table
CREATE TABLE public.taxonomy_sectores (
  id VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT
);

-- Enable RLS
ALTER TABLE public.taxonomy_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_sectores ENABLE ROW LEVEL SECURITY;

-- Read policies (everyone can read taxonomy tables)
CREATE POLICY "Anyone can read taxonomy_tipos"
ON public.taxonomy_tipos FOR SELECT USING (true);

CREATE POLICY "Anyone can read taxonomy_subcategorias"
ON public.taxonomy_subcategorias FOR SELECT USING (true);

CREATE POLICY "Anyone can read taxonomy_sectores"
ON public.taxonomy_sectores FOR SELECT USING (true);

-- Write policies (only admins can modify)
CREATE POLICY "Admins can manage taxonomy_tipos"
ON public.taxonomy_tipos FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage taxonomy_subcategorias"
ON public.taxonomy_subcategorias FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage taxonomy_sectores"
ON public.taxonomy_sectores FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert the 8 main technology types
INSERT INTO public.taxonomy_tipos (codigo, nombre, descripcion) VALUES
('TAP', 'Tratamiento de Agua Potable', 'Tecnologías para potabilización y tratamiento de agua para consumo humano'),
('TAR', 'Tratamiento de Aguas Residuales', 'Tecnologías para depuración de aguas residuales urbanas e industriales'),
('GLR', 'Gestión de Lodos y Residuos', 'Tecnologías para tratamiento, deshidratación y valorización de lodos'),
('MON', 'Monitorización y Control', 'Sensores, analizadores y sistemas de control para calidad del agua'),
('RED', 'Gestión de Redes', 'Tecnologías para gestión, mantenimiento y optimización de infraestructura de redes'),
('SOF', 'Software y Digitalización', 'Plataformas digitales, analítica de datos e inteligencia artificial'),
('ENE', 'Energía y Eficiencia', 'Tecnologías de recuperación energética y eficiencia en plantas de agua'),
('EQU', 'Equipamiento Auxiliar', 'Equipos de soporte, bombeo, válvulas y elementos complementarios');

-- Insert subcategories for TAP (Tratamiento de Agua Potable)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('TAP-01', 'Pretratamiento y Cribado'),
  ('TAP-02', 'Coagulación y Floculación'),
  ('TAP-03', 'Sedimentación y Decantación'),
  ('TAP-04', 'Filtración Convencional'),
  ('TAP-05', 'Filtración por Membrana (MF/UF)'),
  ('TAP-06', 'Ósmosis Inversa (OI)'),
  ('TAP-07', 'Nanofiltración (NF)'),
  ('TAP-08', 'Electrodiálisis'),
  ('TAP-09', 'Intercambio Iónico'),
  ('TAP-10', 'Adsorción (Carbón Activado)'),
  ('TAP-11', 'Desinfección UV'),
  ('TAP-12', 'Desinfección por Ozono'),
  ('TAP-13', 'Cloración y Cloraminación'),
  ('TAP-14', 'Oxidación Avanzada (AOP)'),
  ('TAP-15', 'Eliminación de Hierro/Manganeso'),
  ('TAP-16', 'Eliminación de Arsénico'),
  ('TAP-17', 'Eliminación de PFAS'),
  ('TAP-18', 'Desalinización'),
  ('TAP-19', 'Ablandamiento')
) AS s(codigo, nombre)
WHERE t.codigo = 'TAP';

-- Insert subcategories for TAR (Tratamiento de Aguas Residuales)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('TAR-01', 'Pretratamiento (Desbaste/Desarenado)'),
  ('TAR-02', 'Tratamiento Primario (Decantación)'),
  ('TAR-03', 'Fangos Activados Convencional'),
  ('TAR-04', 'Fangos Activados (SBR)'),
  ('TAR-05', 'Reactor Biológico de Membrana (MBR)'),
  ('TAR-06', 'Reactor de Lecho Móvil (MBBR)'),
  ('TAR-07', 'Reactor de Biopelícula (IFAS)'),
  ('TAR-08', 'Filtros Percoladores'),
  ('TAR-09', 'Lagunas de Estabilización'),
  ('TAR-10', 'Humedales Artificiales'),
  ('TAR-11', 'Tratamiento Anaerobio (UASB/EGSB)'),
  ('TAR-12', 'Digestión Anaerobia'),
  ('TAR-13', 'Eliminación Biológica de Nutrientes (BNR)'),
  ('TAR-14', 'Desnitrificación'),
  ('TAR-15', 'Eliminación de Fósforo'),
  ('TAR-16', 'Tratamiento Terciario'),
  ('TAR-17', 'Desinfección de Efluentes'),
  ('TAR-18', 'Reutilización de Aguas'),
  ('TAR-19', 'Flotación por Aire Disuelto (DAF)')
) AS s(codigo, nombre)
WHERE t.codigo = 'TAR';

-- Insert subcategories for GLR (Gestión de Lodos y Residuos)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('GLR-01', 'Espesamiento de Lodos'),
  ('GLR-02', 'Deshidratación Mecánica (Centrífuga)'),
  ('GLR-03', 'Deshidratación Mecánica (Filtro Banda)'),
  ('GLR-04', 'Deshidratación Mecánica (Filtro Prensa)'),
  ('GLR-05', 'Secado Térmico de Lodos'),
  ('GLR-06', 'Secado Solar de Lodos'),
  ('GLR-07', 'Digestión Anaerobia de Lodos'),
  ('GLR-08', 'Compostaje de Biosólidos'),
  ('GLR-09', 'Incineración de Lodos'),
  ('GLR-10', 'Pirólisis y Gasificación'),
  ('GLR-11', 'Estabilización Química (Cal)'),
  ('GLR-12', 'Recuperación de Fósforo (Estruvita)'),
  ('GLR-13', 'Recuperación de Nitrógeno')
) AS s(codigo, nombre)
WHERE t.codigo = 'GLR';

-- Insert subcategories for MON (Monitorización y Control)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('MON-01', 'Sensores de Calidad en Línea'),
  ('MON-02', 'Analizadores Multiparamétricos'),
  ('MON-03', 'Monitoreo de Cloro Residual'),
  ('MON-04', 'Monitoreo de Turbidez'),
  ('MON-05', 'Monitoreo de DQO/DBO'),
  ('MON-06', 'Monitoreo de Nutrientes (N/P)'),
  ('MON-07', 'Análisis Microbiológico Rápido'),
  ('MON-08', 'Detección de Contaminantes Emergentes'),
  ('MON-09', 'Sistemas SCADA'),
  ('MON-10', 'Control de Procesos'),
  ('MON-11', 'Automatización de Plantas'),
  ('MON-12', 'Telemetría y IoT'),
  ('MON-13', 'Alertas y Alarmas en Tiempo Real')
) AS s(codigo, nombre)
WHERE t.codigo = 'MON';

-- Insert subcategories for RED (Gestión de Redes)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('RED-01', 'Detección Acústica de Fugas'),
  ('RED-02', 'Detección de Fugas por Correlación'),
  ('RED-03', 'Detección de Fugas Satelital'),
  ('RED-04', 'Localización de Fugas con Trazadores'),
  ('RED-05', 'Inspección de Tuberías (CCTV)'),
  ('RED-06', 'Evaluación de Condición de Activos'),
  ('RED-07', 'Rehabilitación sin Zanja (CIPP)'),
  ('RED-08', 'Rehabilitación sin Zanja (Pipe Bursting)'),
  ('RED-09', 'Gestión de Presiones'),
  ('RED-10', 'Modelización Hidráulica'),
  ('RED-11', 'Contadores Inteligentes (Smart Metering)')
) AS s(codigo, nombre)
WHERE t.codigo = 'RED';

-- Insert subcategories for SOF (Software y Digitalización)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('SOF-01', 'Plataformas de Gestión de Datos'),
  ('SOF-02', 'Analítica Avanzada y Big Data'),
  ('SOF-03', 'Inteligencia Artificial y ML'),
  ('SOF-04', 'Gemelos Digitales'),
  ('SOF-05', 'Sistemas de Información Geográfica (GIS)'),
  ('SOF-06', 'Software de Modelización'),
  ('SOF-07', 'Gestión de Órdenes de Trabajo (CMMS)'),
  ('SOF-08', 'Planificación de Recursos (ERP)'),
  ('SOF-09', 'Portal de Clientes'),
  ('SOF-10', 'Facturación y Gestión Comercial'),
  ('SOF-11', 'Pronóstico de Demanda'),
  ('SOF-12', 'Optimización de Operaciones')
) AS s(codigo, nombre)
WHERE t.codigo = 'SOF';

-- Insert subcategories for ENE (Energía y Eficiencia)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('ENE-01', 'Cogeneración con Biogás'),
  ('ENE-02', 'Recuperación de Calor'),
  ('ENE-03', 'Turbinas de Recuperación de Presión'),
  ('ENE-04', 'Energía Solar Fotovoltaica'),
  ('ENE-05', 'Almacenamiento de Energía (Baterías)'),
  ('ENE-06', 'Bombeo de Alta Eficiencia'),
  ('ENE-07', 'Aireación de Alta Eficiencia'),
  ('ENE-08', 'Variadores de Frecuencia'),
  ('ENE-09', 'Auditoría Energética'),
  ('ENE-10', 'Gestión Energética de Plantas')
) AS s(codigo, nombre)
WHERE t.codigo = 'ENE';

-- Insert subcategories for EQU (Equipamiento Auxiliar)
INSERT INTO public.taxonomy_subcategorias (tipo_id, codigo, nombre)
SELECT t.id, s.codigo, s.nombre
FROM public.taxonomy_tipos t,
(VALUES 
  ('EQU-01', 'Bombas Centrífugas'),
  ('EQU-02', 'Bombas de Desplazamiento Positivo'),
  ('EQU-03', 'Bombas de Tornillo'),
  ('EQU-04', 'Sistemas de Bombeo Inteligente'),
  ('EQU-05', 'Válvulas de Control'),
  ('EQU-06', 'Válvulas Reductoras de Presión'),
  ('EQU-07', 'Compresores y Soplantes'),
  ('EQU-08', 'Dosificadores de Químicos'),
  ('EQU-09', 'Sistemas de Almacenamiento'),
  ('EQU-10', 'Instrumentación de Campo')
) AS s(codigo, nombre)
WHERE t.codigo = 'EQU';

-- Insert sectors
INSERT INTO public.taxonomy_sectores (id, nombre, descripcion) VALUES
('MUN', 'Municipal', 'Servicios públicos de agua y saneamiento'),
('IND', 'Industrial', 'Aplicaciones industriales específicas'),
('AMB', 'Ambos', 'Aplicable a municipal e industrial');

-- Add new columns to technologies table for taxonomy references
ALTER TABLE public.technologies 
ADD COLUMN IF NOT EXISTS tipo_id INTEGER REFERENCES public.taxonomy_tipos(id),
ADD COLUMN IF NOT EXISTS subcategoria_id INTEGER REFERENCES public.taxonomy_subcategorias(id),
ADD COLUMN IF NOT EXISTS sector_id VARCHAR(3) REFERENCES public.taxonomy_sectores(id),
ADD COLUMN IF NOT EXISTS subsector_industrial VARCHAR(100);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_technologies_tipo_id ON public.technologies(tipo_id);
CREATE INDEX IF NOT EXISTS idx_technologies_subcategoria_id ON public.technologies(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_technologies_sector_id ON public.technologies(sector_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_subcategorias_tipo_id ON public.taxonomy_subcategorias(tipo_id);