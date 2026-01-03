export type AppRole = 'admin' | 'supervisor' | 'analyst' | 'client_basic' | 'client_professional' | 'client_enterprise';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface Technology {
  id: string;
  "Nombre de la tecnología": string;
  "Proveedor / Empresa": string | null;
  "País de origen": string | null;
  "Web de la empresa": string | null;
  "Email de contacto": string | null;
  "Tipo de tecnología": string;
  "Subcategoría": string | null;
  "Sector y subsector": string | null;
  "Aplicación principal": string | null;
  "Descripción técnica breve": string | null;
  "Ventaja competitiva clave": string | null;
  "Porque es innovadora": string | null;
  "Casos de referencia": string | null;
  "Paises donde actua": string | null;
  "Comentarios del analista": string | null;
  "Fecha de scouting": string | null;
  "Estado del seguimiento": string | null;
  "Grado de madurez (TRL)": number | null;
  status: string | null;
  quality_score: number | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
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
