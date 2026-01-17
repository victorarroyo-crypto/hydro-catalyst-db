// Types for the Scouting module

// ============================================================
// EXTERNAL DATABASE SCHEMA (snake_case) - BD ktzhrlcvluaptixngrsh
// ============================================================

/**
 * Schema de la base de datos externa (Railway/Supabase externo)
 * Usa snake_case para todos los campos
 */
export interface ExternalScoutingQueueItem {
  id: string;
  nombre: string;
  proveedor: string | null;
  pais: string | null;
  web: string | null;
  email: string | null;
  descripcion: string | null;
  tipo_sugerido: string | null;
  subcategoria: string | null;
  sector: string | null;
  subsector: string | null;
  aplicacion_principal: string | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  trl_estimado: number | null;
  casos_referencia: string | null;
  paises_actua: string | null;
  comentarios_analista: string | null;
  status: string | null; // 'pending', 'review', 'pending_approval', 'approved', 'rejected'
  source: string | null;
  source_url: string | null;
  scouting_job_id: string | null;
  priority: string | null;
  notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Schema para rejected_technologies en BD externa
 */
export interface ExternalRejectedTechnology {
  id: string;
  nombre: string;
  proveedor: string | null;
  pais: string | null;
  web: string | null;
  email: string | null;
  descripcion: string | null;
  tipo_sugerido: string | null;
  subcategoria: string | null;
  sector: string | null;
  subsector: string | null;
  aplicacion_principal: string | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  trl_estimado: number | null;
  casos_referencia: string | null;
  paises_actua: string | null;
  comentarios_analista: string | null;
  original_scouting_id: string | null;
  original_data: Record<string, unknown> | null;
  rejection_reason: string;
  rejection_category: string | null;
  rejected_by: string | null;
  rejected_at: string;
  created_at: string;
}

// ============================================================
// LOCAL DATABASE SCHEMA (nombres con espacios) - Lovable Cloud
// ============================================================

// Database schema - matches the actual scouting_queue table columns
export interface ScoutingQueueItem {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Subcategoría": string | null;
  "Sector y subsector": string | null;
  "Proveedor / Empresa": string | null;
  "País de origen": string | null;
  "Paises donde actua": string | null;
  "Web de la empresa": string | null;
  "Email de contacto": string | null;
  "Descripción técnica breve": string | null;
  "Aplicación principal": string | null;
  "Ventaja competitiva clave": string | null;
  "Porque es innovadora": string | null;
  "Grado de madurez (TRL)": number | null;
  "Casos de referencia": string | null;
  "Comentarios del analista": string | null;
  "Fecha de scouting": string | null;
  "Estado del seguimiento": string | null;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string | null;
  queue_status: string | null;
  source: string | null;
  source_url: string | null;
  scouting_job_id: string | null;
  priority: string | null;
  notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RejectedTechnology {
  id: string;
  "Nombre de la tecnología": string;
  "Tipo de tecnología": string;
  "Subcategoría": string | null;
  "Sector y subsector": string | null;
  "Proveedor / Empresa": string | null;
  "País de origen": string | null;
  "Paises donde actua": string | null;
  "Web de la empresa": string | null;
  "Email de contacto": string | null;
  "Descripción técnica breve": string | null;
  "Aplicación principal": string | null;
  "Ventaja competitiva clave": string | null;
  "Porque es innovadora": string | null;
  "Grado de madurez (TRL)": number | null;
  "Casos de referencia": string | null;
  "Comentarios del analista": string | null;
  "Fecha de scouting": string | null;
  "Estado del seguimiento": string | null;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string | null;
  original_scouting_id: string | null;
  original_data: Record<string, unknown> | null;
  rejection_reason: string;
  rejection_category: string | null;
  rejected_by: string | null;
  rejected_at: string;
  created_at: string;
}

// ============================================================
// UI TYPES (normalized for components)
// ============================================================

// Normalized queue item for UI (compatible with existing components)
export interface QueueItemUI {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
  queue_status?: string; // Raw queue_status from DB for filtering
  created_at?: string;
  // Extended fields
  description?: string;
  web?: string;
  email?: string;
  suggestedType?: string;
  suggestedSubcategory?: string;
  sector?: string;
  subsector?: string;
  aplicacionPrincipal?: string;
  competitiveAdvantage?: string;
  innovacion?: string;
  casosReferencia?: string;
  paisesActua?: string;
  comentariosAnalista?: string;
  relevanceReason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  scouting_job_id?: string;
}

// ============================================================
// NORMALIZATION FUNCTIONS
// ============================================================

/**
 * Transform from EXTERNAL DB (snake_case) to UI format
 */
export const normalizeExternalScoutingItem = (item: ExternalScoutingQueueItem): QueueItemUI => ({
  id: item.id,
  name: item.nombre || '',
  provider: item.proveedor || '',
  country: item.pais || 'N/A',
  score: 0,
  trl: item.trl_estimado ?? 0,
  status: item.status || 'pending',
  queue_status: item.status || 'pending',
  created_at: item.created_at,
  description: item.descripcion || undefined,
  web: item.web || undefined,
  email: item.email || undefined,
  suggestedType: item.tipo_sugerido || undefined,
  suggestedSubcategory: item.subcategoria || undefined,
  sector: item.sector || undefined,
  subsector: item.subsector || undefined,
  aplicacionPrincipal: item.aplicacion_principal || undefined,
  competitiveAdvantage: item.ventaja_competitiva || undefined,
  innovacion: item.innovacion || undefined,
  casosReferencia: item.casos_referencia || undefined,
  paisesActua: item.paises_actua || undefined,
  comentariosAnalista: item.comentarios_analista || undefined,
  reviewed_by: item.reviewed_by || undefined,
  reviewed_at: item.reviewed_at || undefined,
  scouting_job_id: item.scouting_job_id || undefined,
});

/**
 * Transform from LOCAL DB (nombres con espacios) to UI format
 * @deprecated - Mantener por compatibilidad con código existente
 */
export const normalizeScoutingItem = (item: ScoutingQueueItem): QueueItemUI => ({
  id: item.id,
  name: item["Nombre de la tecnología"] || '',
  provider: item["Proveedor / Empresa"] || '',
  country: item["País de origen"] || 'N/A',
  score: 0,
  trl: item["Grado de madurez (TRL)"] ?? 0,
  status: item.queue_status || 'pending',
  queue_status: item.queue_status || 'pending',
  created_at: item.created_at,
  description: item["Descripción técnica breve"] || undefined,
  web: item["Web de la empresa"] || undefined,
  email: item["Email de contacto"] || undefined,
  suggestedType: item["Tipo de tecnología"] || undefined,
  suggestedSubcategory: item["Subcategoría"] || undefined,
  sector: item["Sector y subsector"] || undefined,
  subsector: item.subsector_industrial || undefined,
  aplicacionPrincipal: item["Aplicación principal"] || undefined,
  competitiveAdvantage: item["Ventaja competitiva clave"] || undefined,
  innovacion: item["Porque es innovadora"] || undefined,
  casosReferencia: item["Casos de referencia"] || undefined,
  paisesActua: item["Paises donde actua"] || undefined,
  comentariosAnalista: item["Comentarios del analista"] || undefined,
  reviewed_by: item.reviewed_by || undefined,
  reviewed_at: item.reviewed_at || undefined,
  scouting_job_id: item.scouting_job_id || undefined,
});

// ============================================================
// FORM DATA (for editing)
// ============================================================

// Form data for editing scouting items - uses friendly field names
export interface ScoutingFormData {
  nombre: string;
  proveedor: string;
  web: string;
  pais: string;
  email: string;
  tipo_sugerido: string;
  subcategoria: string;
  sector: string;
  subsector: string;
  descripcion: string;
  aplicacion_principal: string;
  ventaja_competitiva: string;
  innovacion: string;
  trl_estimado: number | null;
  casos_referencia: string;
  paises_actua: string;
  comentarios_analista: string;
}

/**
 * Convert form data to EXTERNAL DB format (snake_case)
 */
export const formDataToExternalDbFormat = (formData: ScoutingFormData): Record<string, unknown> => ({
  nombre: formData.nombre,
  proveedor: formData.proveedor,
  web: formData.web,
  pais: formData.pais,
  email: formData.email,
  tipo_sugerido: formData.tipo_sugerido,
  subcategoria: formData.subcategoria,
  sector: formData.sector,
  subsector: formData.subsector,
  descripcion: formData.descripcion,
  aplicacion_principal: formData.aplicacion_principal,
  ventaja_competitiva: formData.ventaja_competitiva,
  innovacion: formData.innovacion,
  trl_estimado: formData.trl_estimado,
  casos_referencia: formData.casos_referencia,
  paises_actua: formData.paises_actua,
  comentarios_analista: formData.comentarios_analista,
});

/**
 * Convert form data to LOCAL DB format (nombres con espacios)
 * @deprecated - Mantener por compatibilidad con código existente
 */
export const formDataToDbFormat = (formData: ScoutingFormData): Record<string, unknown> => ({
  "Nombre de la tecnología": formData.nombre,
  "Proveedor / Empresa": formData.proveedor,
  "Web de la empresa": formData.web,
  "País de origen": formData.pais,
  "Email de contacto": formData.email,
  "Tipo de tecnología": formData.tipo_sugerido,
  "Subcategoría": formData.subcategoria,
  "Sector y subsector": formData.sector,
  "subsector_industrial": formData.subsector,
  "Descripción técnica breve": formData.descripcion,
  "Aplicación principal": formData.aplicacion_principal,
  "Ventaja competitiva clave": formData.ventaja_competitiva,
  "Porque es innovadora": formData.innovacion,
  "Grado de madurez (TRL)": formData.trl_estimado,
  "Casos de referencia": formData.casos_referencia,
  "Paises donde actua": formData.paises_actua,
  "Comentarios del analista": formData.comentarios_analista,
});
