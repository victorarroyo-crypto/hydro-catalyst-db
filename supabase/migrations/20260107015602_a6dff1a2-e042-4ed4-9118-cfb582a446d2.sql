-- =====================================================
-- FASE 1: Agregar subcategorías faltantes a TAR (Tratamiento de Aguas Residuales)
-- =====================================================

-- Obtener el tipo_id de TAR
DO $$
DECLARE
  tar_tipo_id INTEGER;
  alc_tipo_id INTEGER;
  red_tipo_id INTEGER;
  mon_tipo_id INTEGER;
BEGIN
  SELECT id INTO tar_tipo_id FROM taxonomy_tipos WHERE codigo = 'TAR';
  SELECT id INTO alc_tipo_id FROM taxonomy_tipos WHERE codigo = 'ALC';
  SELECT id INTO red_tipo_id FROM taxonomy_tipos WHERE codigo = 'RED';
  SELECT id INTO mon_tipo_id FROM taxonomy_tipos WHERE codigo = 'MON';

  -- TAR: Agregar subcategorías faltantes
  INSERT INTO taxonomy_subcategorias (codigo, nombre, tipo_id) VALUES
    ('TAR-20', 'Oxidación Avanzada (AOP)', tar_tipo_id),
    ('TAR-21', 'Electrocoagulación', tar_tipo_id),
    ('TAR-22', 'MABR (Reactores de Biopelícula con Membrana Aireada)', tar_tipo_id),
    ('TAR-23', 'Tratamiento Cuaternario / Micropoluentes', tar_tipo_id),
    ('TAR-24', 'Filtración por Membrana (MF/UF)', tar_tipo_id),
    ('TAR-25', 'Ósmosis Inversa para Reutilización', tar_tipo_id),
    ('TAR-26', 'Humedales Artificiales', tar_tipo_id),
    ('TAR-27', 'Reactores de Lecho Móvil (MBBR)', tar_tipo_id),
    ('TAR-28', 'Tratamiento de Fangos', tar_tipo_id),
    ('TAR-29', 'Digestión Anaerobia', tar_tipo_id),
    ('TAR-30', 'Desinfección UV para Reutilización', tar_tipo_id)
  ON CONFLICT (codigo) DO NOTHING;

  -- ALC: Crear TODAS las subcategorías (actualmente vacío)
  INSERT INTO taxonomy_subcategorias (codigo, nombre, tipo_id) VALUES
    ('ALC-01', 'Monitorización de Colectores', alc_tipo_id),
    ('ALC-02', 'Control de Olores y Corrosión', alc_tipo_id),
    ('ALC-03', 'Control en Tiempo Real (RTC)', alc_tipo_id),
    ('ALC-04', 'Limpieza y Desatasco', alc_tipo_id),
    ('ALC-05', 'Inspección CCTV de Colectores', alc_tipo_id),
    ('ALC-06', 'Rehabilitación de Colectores', alc_tipo_id),
    ('ALC-07', 'Gestión de Aguas Pluviales (SUDS)', alc_tipo_id),
    ('ALC-08', 'Control de Desbordamientos (CSO/SSO)', alc_tipo_id),
    ('ALC-09', 'Estaciones de Bombeo de Aguas Residuales', alc_tipo_id),
    ('ALC-10', 'Modelización Hidráulica de Saneamiento', alc_tipo_id)
  ON CONFLICT (codigo) DO NOTHING;

  -- RED: Agregar subcategorías faltantes
  INSERT INTO taxonomy_subcategorias (codigo, nombre, tipo_id) VALUES
    ('RED-16', 'Protección contra Inundaciones', red_tipo_id),
    ('RED-17', 'GIS y Mapeo de Activos', red_tipo_id),
    ('RED-18', 'Control de Calidad en Red', red_tipo_id),
    ('RED-19', 'Válvulas Inteligentes', red_tipo_id),
    ('RED-20', 'Resiliencia Urbana', red_tipo_id),
    ('RED-21', 'Rehabilitación sin Zanja (CIPP/Pipe Bursting)', red_tipo_id),
    ('RED-22', 'Inspección de Tuberías', red_tipo_id)
  ON CONFLICT (codigo) DO NOTHING;

  -- MON: Agregar subcategorías faltantes
  INSERT INTO taxonomy_subcategorias (codigo, nombre, tipo_id) VALUES
    ('MON-11', 'Análisis Microbiológico Rápido', mon_tipo_id),
    ('MON-12', 'Sensores de Micropoluentes', mon_tipo_id),
    ('MON-13', 'Monitorización de Caudal', mon_tipo_id),
    ('MON-14', 'Gemelos Digitales', mon_tipo_id),
    ('MON-15', 'IoT y Sensores Remotos', mon_tipo_id)
  ON CONFLICT (codigo) DO NOTHING;

END $$;

-- Verificar que se han añadido correctamente
SELECT t.codigo as tipo, t.nombre as tipo_nombre, COUNT(s.id) as num_subcategorias
FROM taxonomy_tipos t
LEFT JOIN taxonomy_subcategorias s ON s.tipo_id = t.id
GROUP BY t.id, t.codigo, t.nombre
ORDER BY t.codigo;