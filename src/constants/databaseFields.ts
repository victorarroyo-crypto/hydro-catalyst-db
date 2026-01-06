/**
 * Diccionario de campos de base de datos
 * 
 * Este archivo proporciona constantes TypeScript para acceder a los nombres
 * de columnas de la base de datos, evitando typos y proporcionando autocompletado.
 * 
 * Los mapeos se sincronizan con public/field_mappings.json para que
 * Railway/Python y otros sistemas puedan usar el mismo diccionario.
 * 
 * @example
 * import { TECH_FIELDS, getField } from '@/constants/databaseFields';
 * 
 * // Usando constantes directamente
 * const query = supabase.from('technologies').select(TECH_FIELDS.nombre_tecnologia);
 * 
 * // Usando función helper
 * const columnName = getField('technologies', 'nombre_tecnologia');
 * // Retorna: "Nombre de la tecnología"
 */

// ============================================
// CAMPOS DE TECNOLOGÍAS (technologies)
// ============================================
export const TECH_FIELDS = {
  // Identificador
  id: 'id',
  
  // Campos de negocio (español con espacios)
  nombre_tecnologia: 'Nombre de la tecnología',
  tipo_tecnologia: 'Tipo de tecnología',
  subcategoria: 'Subcategoría',
  sector_subsector: 'Sector y subsector',
  proveedor_empresa: 'Proveedor / Empresa',
  pais_origen: 'País de origen',
  /** @note Typo histórico: debería ser "Países donde actúa" */
  paises_operacion: 'Paises donde actua',
  web_empresa: 'Web de la empresa',
  email_contacto: 'Email de contacto',
  descripcion_tecnica: 'Descripción técnica breve',
  aplicacion_principal: 'Aplicación principal',
  ventaja_competitiva: 'Ventaja competitiva clave',
  innovacion: 'Porque es innovadora',
  grado_madurez_trl: 'Grado de madurez (TRL)',
  casos_referencia: 'Casos de referencia',
  comentarios_analista: 'Comentarios del analista',
  fecha_scouting: 'Fecha de scouting',
  estado_seguimiento: 'Estado del seguimiento',
  
  // Campos de taxonomía (IDs numéricos)
  tipo_id: 'tipo_id',
  subcategoria_id: 'subcategoria_id',
  sector_id: 'sector_id',
  subsector_industrial: 'subsector_industrial',
  
  // Campos de sistema
  status: 'status',
  quality_score: 'quality_score',
  review_status: 'review_status',
  review_requested_at: 'review_requested_at',
  review_requested_by: 'review_requested_by',
  reviewer_id: 'reviewer_id',
  reviewed_at: 'reviewed_at',
  updated_by: 'updated_by',
  created_at: 'created_at',
  updated_at: 'updated_at',
} as const;

// ============================================
// CAMPOS DE COLA DE SCOUTING (scouting_queue)
// ============================================
export const SCOUTING_FIELDS = {
  ...TECH_FIELDS,
  
  // Campos específicos de scouting
  source: 'source',
  source_url: 'source_url',
  priority: 'priority',
  notes: 'notes',
  queue_status: 'queue_status',
  rejection_reason: 'rejection_reason',
  created_by: 'created_by',
  reviewed_by: 'reviewed_by',
} as const;

// ============================================
// CAMPOS DE TECNOLOGÍAS RECHAZADAS
// ============================================
export const REJECTED_FIELDS = {
  ...TECH_FIELDS,
  
  // Campos específicos de rechazo
  original_scouting_id: 'original_scouting_id',
  rejection_reason: 'rejection_reason',
  rejection_category: 'rejection_category',
  original_data: 'original_data',
  rejected_at: 'rejected_at',
  rejected_by: 'rejected_by',
} as const;

// ============================================
// CAMPOS DE TAXONOMÍA
// ============================================
export const TAXONOMY_FIELDS = {
  // taxonomy_tipos
  tipo: {
    id: 'id',
    codigo: 'codigo',
    nombre: 'nombre',
    descripcion: 'descripcion',
  },
  // taxonomy_subcategorias
  subcategoria: {
    id: 'id',
    tipo_id: 'tipo_id',
    codigo: 'codigo',
    nombre: 'nombre',
  },
  // taxonomy_sectores
  sector: {
    id: 'id',
    nombre: 'nombre',
    descripcion: 'descripcion',
  },
} as const;

// ============================================
// TIPOS DERIVADOS
// ============================================
export type TechFieldKey = keyof typeof TECH_FIELDS;
export type TechFieldValue = typeof TECH_FIELDS[TechFieldKey];
export type ScoutingFieldKey = keyof typeof SCOUTING_FIELDS;
export type RejectedFieldKey = keyof typeof REJECTED_FIELDS;

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Obtiene el nombre real de una columna a partir de su alias snake_case
 * @param table - Nombre de la tabla
 * @param alias - Alias snake_case del campo
 * @returns Nombre real de la columna en la base de datos
 */
export function getField(
  table: 'technologies' | 'scouting_queue' | 'rejected_technologies',
  alias: TechFieldKey | ScoutingFieldKey | RejectedFieldKey
): string {
  switch (table) {
    case 'technologies':
      return TECH_FIELDS[alias as TechFieldKey] ?? alias;
    case 'scouting_queue':
      return SCOUTING_FIELDS[alias as ScoutingFieldKey] ?? alias;
    case 'rejected_technologies':
      return REJECTED_FIELDS[alias as RejectedFieldKey] ?? alias;
    default:
      return alias;
  }
}

/**
 * Obtiene el alias snake_case a partir del nombre real de columna
 * @param columnName - Nombre real de la columna
 * @returns Alias snake_case o el nombre original si no se encuentra
 */
export function getAlias(columnName: string): string {
  for (const [alias, realName] of Object.entries(TECH_FIELDS)) {
    if (realName === columnName) {
      return alias;
    }
  }
  return columnName;
}

/**
 * Lista de todos los campos de negocio en español (los que tienen espacios/caracteres especiales)
 */
export const BUSINESS_FIELDS = [
  TECH_FIELDS.nombre_tecnologia,
  TECH_FIELDS.tipo_tecnologia,
  TECH_FIELDS.subcategoria,
  TECH_FIELDS.sector_subsector,
  TECH_FIELDS.proveedor_empresa,
  TECH_FIELDS.pais_origen,
  TECH_FIELDS.paises_operacion,
  TECH_FIELDS.web_empresa,
  TECH_FIELDS.email_contacto,
  TECH_FIELDS.descripcion_tecnica,
  TECH_FIELDS.aplicacion_principal,
  TECH_FIELDS.ventaja_competitiva,
  TECH_FIELDS.innovacion,
  TECH_FIELDS.grado_madurez_trl,
  TECH_FIELDS.casos_referencia,
  TECH_FIELDS.comentarios_analista,
  TECH_FIELDS.fecha_scouting,
  TECH_FIELDS.estado_seguimiento,
] as const;

/**
 * Lista de campos técnicos/sistema (snake_case en inglés)
 */
export const SYSTEM_FIELDS = [
  TECH_FIELDS.id,
  TECH_FIELDS.tipo_id,
  TECH_FIELDS.subcategoria_id,
  TECH_FIELDS.sector_id,
  TECH_FIELDS.subsector_industrial,
  TECH_FIELDS.status,
  TECH_FIELDS.quality_score,
  TECH_FIELDS.review_status,
  TECH_FIELDS.created_at,
  TECH_FIELDS.updated_at,
] as const;
