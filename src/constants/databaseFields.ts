/**
 * Database field constants for the external Supabase database
 * 
 * IMPORTANT: The technologies table in the external DB uses snake_case column names.
 * The scouting_queue and rejected_technologies tables use Spanish names with spaces.
 * 
 * This file serves as the source of truth for field mappings.
 * Last updated: 2026-01-24
 */

// ============================================================================
// TECHNOLOGIES TABLE - snake_case columns (BD externa)
// ============================================================================
export const EXTERNAL_TECH_FIELDS = {
  // Identifier
  id: 'id',
  
  // Core business fields (snake_case)
  nombre: 'nombre',
  proveedor: 'proveedor',
  pais: 'pais',
  paises_actua: 'paises_actua',
  web: 'web',
  email: 'email',
  descripcion: 'descripcion',
  aplicacion: 'aplicacion',
  ventaja: 'ventaja',
  innovacion: 'innovacion',
  trl: 'trl',
  tipo: 'tipo',
  sector: 'sector',
  casos_referencia: 'casos_referencia',
  comentarios: 'comentarios',
  fecha_scouting: 'fecha_scouting',
  estado_seguimiento: 'estado_seguimiento',
  
  // 3-level taxonomy arrays (new system)
  categorias: 'categorias',       // text[]
  tipos: 'tipos',                 // text[]
  subcategorias: 'subcategorias', // text[]
  
  // Legacy taxonomy IDs (for backward compatibility)
  tipo_id: 'tipo_id',
  subcategoria_id: 'subcategoria_id',
  sector_id: 'sector_id',
  subsector_industrial: 'subsector_industrial',
  
  // System/workflow fields
  status: 'status',
  quality_score: 'quality_score',
  review_status: 'review_status',
  review_requested_at: 'review_requested_at',
  review_requested_by: 'review_requested_by',
  reviewer_id: 'reviewer_id',
  reviewed_at: 'reviewed_at',
  approved_at: 'approved_at',
  approved_by: 'approved_by',
  created_by: 'created_by',
  updated_by: 'updated_by',
  created_at: 'created_at',
  updated_at: 'updated_at',
  version: 'version',
  
  // Embeddings (semantic search)
  embedding: 'embedding',
  embedding_updated_at: 'embedding_updated_at',
} as const;

// ============================================================================
// SCOUTING_QUEUE TABLE - Spanish column names with spaces (legacy)
// ============================================================================
export const SCOUTING_QUEUE_FIELDS = {
  id: 'id',
  nombre_tecnologia: 'Nombre de la tecnología',
  tipo_tecnologia: 'Tipo de tecnología',
  subcategoria: 'Subcategoría',
  sector_subsector: 'Sector y subsector',
  proveedor_empresa: 'Proveedor / Empresa',
  pais_origen: 'País de origen',
  paises_operacion: 'Paises donde actua', // Note: typo is historical
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
  // System fields (snake_case)
  tipo_id: 'tipo_id',
  subcategoria_id: 'subcategoria_id',
  sector_id: 'sector_id',
  subsector_industrial: 'subsector_industrial',
  source: 'source',
  source_url: 'source_url',
  priority: 'priority',
  notes: 'notes',
  queue_status: 'queue_status',
  rejection_reason: 'rejection_reason',
  scouting_job_id: 'scouting_job_id',
  case_study_id: 'case_study_id',
  created_by: 'created_by',
  reviewed_by: 'reviewed_by',
  reviewed_at: 'reviewed_at',
  created_at: 'created_at',
  updated_at: 'updated_at',
} as const;

// ============================================================================
// REJECTED_TECHNOLOGIES TABLE - Spanish column names with spaces (legacy)
// ============================================================================
export const REJECTED_TECH_FIELDS = {
  id: 'id',
  original_scouting_id: 'original_scouting_id',
  nombre_tecnologia: 'Nombre de la tecnología',
  tipo_tecnologia: 'Tipo de tecnología',
  subcategoria: 'Subcategoría',
  sector_subsector: 'Sector y subsector',
  proveedor_empresa: 'Proveedor / Empresa',
  pais_origen: 'País de origen',
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
  tipo_id: 'tipo_id',
  subcategoria_id: 'subcategoria_id',
  sector_id: 'sector_id',
  subsector_industrial: 'subsector_industrial',
  rejection_reason: 'rejection_reason',
  rejection_category: 'rejection_category',
  original_data: 'original_data',
  rejected_at: 'rejected_at',
  rejected_by: 'rejected_by',
  created_at: 'created_at',
} as const;

// ============================================================================
// TAXONOMY TABLES
// ============================================================================
export const TAXONOMY_FIELDS = {
  tipos: {
    id: 'id',
    codigo: 'codigo',
    nombre: 'nombre',
    descripcion: 'descripcion',
  },
  subcategorias: {
    id: 'id',
    tipo_id: 'tipo_id',
    codigo: 'codigo',
    nombre: 'nombre',
  },
  sectores: {
    id: 'id',
    nombre: 'nombre',
    descripcion: 'descripcion',
  },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
export type ExternalTechFieldKey = keyof typeof EXTERNAL_TECH_FIELDS;
export type ExternalTechFieldValue = (typeof EXTERNAL_TECH_FIELDS)[ExternalTechFieldKey];

export type ScoutingQueueFieldKey = keyof typeof SCOUTING_QUEUE_FIELDS;
export type ScoutingQueueFieldValue = (typeof SCOUTING_QUEUE_FIELDS)[ScoutingQueueFieldKey];

export type RejectedTechFieldKey = keyof typeof REJECTED_TECH_FIELDS;
export type RejectedTechFieldValue = (typeof REJECTED_TECH_FIELDS)[RejectedTechFieldKey];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the actual column name for a given table and field alias
 */
export function getFieldName(
  table: 'technologies' | 'scouting_queue' | 'rejected_technologies',
  alias: string
): string {
  switch (table) {
    case 'technologies':
      return EXTERNAL_TECH_FIELDS[alias as ExternalTechFieldKey] || alias;
    case 'scouting_queue':
      return SCOUTING_QUEUE_FIELDS[alias as ScoutingQueueFieldKey] || alias;
    case 'rejected_technologies':
      return REJECTED_TECH_FIELDS[alias as RejectedTechFieldKey] || alias;
    default:
      return alias;
  }
}

/**
 * Get all business fields for technologies (for quality checks)
 */
export const TECH_BUSINESS_FIELDS = [
  'nombre',
  'proveedor',
  'pais',
  'paises_actua',
  'web',
  'email',
  'descripcion',
  'aplicacion',
  'ventaja',
  'innovacion',
  'trl',
  'tipo',
  'sector',
  'casos_referencia',
  'comentarios',
  'fecha_scouting',
  'estado_seguimiento',
] as const;

/**
 * Get all system fields for technologies
 */
export const TECH_SYSTEM_FIELDS = [
  'id',
  'status',
  'quality_score',
  'review_status',
  'review_requested_at',
  'review_requested_by',
  'reviewer_id',
  'reviewed_at',
  'approved_at',
  'approved_by',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'version',
  'embedding',
  'embedding_updated_at',
] as const;

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/** @deprecated Use EXTERNAL_TECH_FIELDS instead */
export const TECH_FIELDS = SCOUTING_QUEUE_FIELDS;

/** @deprecated Use SCOUTING_QUEUE_FIELDS instead */
export const SCOUTING_FIELDS = SCOUTING_QUEUE_FIELDS;

/** @deprecated Use REJECTED_TECH_FIELDS instead */
export const REJECTED_FIELDS = REJECTED_TECH_FIELDS;

// Legacy type aliases
export type TechFieldKey = ScoutingQueueFieldKey;
export type TechFieldValue = ScoutingQueueFieldValue;
export type ScoutingFieldKey = ScoutingQueueFieldKey;
export type RejectedFieldKey = RejectedTechFieldKey;

/** @deprecated Use getFieldName instead */
export function getField(
  table: 'technologies' | 'scouting_queue' | 'rejected_technologies',
  alias: string
): string {
  return getFieldName(table, alias);
}

/** @deprecated Use EXTERNAL_TECH_FIELDS with reverse lookup */
export function getAlias(columnName: string): string {
  const entries = Object.entries(EXTERNAL_TECH_FIELDS);
  const found = entries.find(([_, col]) => col === columnName);
  return found ? found[0] : columnName;
}

/** @deprecated Use TECH_BUSINESS_FIELDS */
export const BUSINESS_FIELDS = Object.values(TECH_BUSINESS_FIELDS);

/** @deprecated Use TECH_SYSTEM_FIELDS */
export const SYSTEM_FIELDS = Object.values(TECH_SYSTEM_FIELDS);
