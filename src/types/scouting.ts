// Types for the Scouting module

export interface ScoutingQueueItem {
  id: string;
  nombre: string;
  proveedor: string;
  web: string;
  relevance_score: number | null;
  pais: string | null;
  email: string | null;
  tipo_sugerido: string | null;
  subcategoria: string | null;
  sector: string | null;
  subsector: string | null;
  descripcion: string | null;
  aplicacion_principal: string | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  trl_estimado: number | null;
  casos_referencia: string | null;
  paises_actua: string | null;
  comentarios_analista: string | null;
  relevance_reason: string | null;
  status: 'review' | 'pending_approval' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RejectedTechnology {
  id: string;
  nombre: string;
  proveedor: string;
  web: string;
  relevance_score: number | null;
  pais: string | null;
  email: string | null;
  tipo_sugerido: string | null;
  subcategoria: string | null;
  sector: string | null;
  subsector: string | null;
  descripcion: string | null;
  aplicacion_principal: string | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  trl_estimado: number | null;
  casos_referencia: string | null;
  paises_actua: string | null;
  comentarios_analista: string | null;
  relevance_reason: string | null;
  original_scouting_id: string | null;
  scouting_created_at: string | null;
  rejection_reason: string;
  rejected_by: string;
  rejected_at: string | null;
  rejection_stage: 'analyst' | 'supervisor' | 'admin';
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
  approved_by?: string;
  approved_at?: string;
}

// Transform from DB to UI format
export const normalizeScoutingItem = (item: ScoutingQueueItem): QueueItemUI => ({
  id: item.id,
  name: item.nombre,
  provider: item.proveedor,
  country: item.pais || 'N/A',
  score: item.relevance_score ?? 0,
  trl: item.trl_estimado ?? 0,
  status: item.status,
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
  relevanceReason: item.relevance_reason || undefined,
  reviewed_by: item.reviewed_by || undefined,
  reviewed_at: item.reviewed_at || undefined,
  approved_by: item.approved_by || undefined,
  approved_at: item.approved_at || undefined,
});

// Form data for editing scouting items
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
