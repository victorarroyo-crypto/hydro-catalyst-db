// Types for the Scouting module

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

// Normalized queue item for UI (compatible with existing components)
export interface QueueItemUI {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
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
}

// Transform from DB to UI format
export const normalizeScoutingItem = (item: ScoutingQueueItem): QueueItemUI => ({
  id: item.id,
  name: item["Nombre de la tecnología"] || '',
  provider: item["Proveedor / Empresa"] || '',
  country: item["País de origen"] || 'N/A',
  score: 0, // No relevance_score in DB schema
  trl: item["Grado de madurez (TRL)"] ?? 0,
  status: item.queue_status || 'pending',
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
});

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

// Convert form data to database format
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