export type AppRole = 'admin' | 'supervisor' | 'analyst' | 'client_basic' | 'client_professional' | 'client_enterprise';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

/**
 * Technology interface - matches external Supabase DB schema (snake_case)
 * 
 * The external database uses snake_case column names for all technology fields.
 * This interface is used for reading/writing to the external technologies table.
 */
export interface Technology {
  id: string;
  // Core business fields
  nombre: string;
  descripcion: string | null;
  proveedor: string | null;
  pais: string | null;
  web: string | null;
  email: string | null;
  tipo: string | null;
  sector: string | null;
  aplicacion: string | null;
  ventaja: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
  paises_actua: string | null;
  comentarios: string | null;
  fecha_scouting: string | null;
  estado_seguimiento: string | null;
  trl: number | null;
  
  // Taxonomy arrays (new 3-level system)
  categorias: string[] | null;
  tipos: string[] | null;
  subcategorias: string[] | null;
  
  // Legacy taxonomy IDs
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string | null;
  
  // System fields
  status: string | null;
  quality_score: number | null;
  review_status: 'none' | 'in_review' | 'pending_approval' | 'completed' | null;
  reviewer_id: string | null;
  review_requested_at: string | null;
  review_requested_by: string | null;
  reviewed_at: string | null;
  updated_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Embedding for semantic search
  embedding: number[] | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  technology_id: string;
  created_at: string;
}

export interface TechnologyFilters {
  search: string;
  tipoTecnologia: string;
  subcategoria: string;
  trlMin: number;
  trlMax: number;
  pais: string;
  sector: string;
  status: string;
}
