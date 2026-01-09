/**
 * Unified Technology Types
 * 
 * Single source of truth for technology data across all views.
 * Ensures consistent field display whether data comes from:
 * - technologies table (main DB)
 * - study_longlist table (studies)
 * - scouting_queue table (scouting process)
 */

export interface UnifiedTechData {
  // Identificación
  id: string;
  technology_name: string;
  
  // Información General
  provider: string | null;
  country: string | null;
  paises_actua: string | null;
  web: string | null;
  email: string | null;
  trl: number | null;
  estado_seguimiento: string | null;
  fecha_scouting: string | null;
  
  // Clasificación
  type: string | null;
  subcategory: string | null;
  sector: string | null;
  applications: string | null;
  
  // Descripción e Innovación
  description: string | null;
  ventaja_competitiva: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
  
  // Notas
  comentarios_analista: string | null;
  
  // Metadatos (solo lectura)
  status: string | null;
  quality_score: number | null;
  review_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TechMetadata {
  /** Origen de los datos */
  source: 'database' | 'longlist' | 'scouting' | 'extracted';
  
  /** Fase actual del proceso (e.g., "Fase 3: Lista Larga") */
  phase?: string;
  
  /** Nombre del estudio (si aplica) */
  studyName?: string;
  
  /** ID del estudio (si aplica) */
  studyId?: string;
  
  /** Si está vinculada a la BD principal */
  isLinkedToDB?: boolean;
  
  /** ID de la tecnología vinculada en BD */
  linkedTechId?: string;
  
  /** Score de confianza (IA) */
  confidenceScore?: number;
  
  /** Score de relevancia (scouting) */
  relevanceScore?: number;
  
  /** Fuente específica (ai_session, manual, database, etc) */
  specificSource?: string;
  
  /** Fecha de adición al contexto actual */
  addedAt?: string;
}

export interface TechActions {
  /** Puede editar los campos */
  canEdit: boolean;
  
  /** Puede usar enriquecimiento IA */
  canEnrich: boolean;
  
  /** Puede descargar ficha Word */
  canDownload: boolean;
  
  /** Puede enviar a la BD principal */
  canSendToDB: boolean;
  
  /** Puede añadir a proyectos */
  canAddToProject: boolean;
  
  /** Puede marcar como favorito */
  canFavorite: boolean;
  
  /** Puede enviar a revisión */
  canSendToReview: boolean;
  
  /** Puede mover a tendencias */
  canMoveToTrends: boolean;
  
  /** Puede mover a casos de estudio */
  canMoveToCaseStudy: boolean;
  
  /** Puede ver en BD (cuando está vinculada) */
  canViewInDB: boolean;
  
  /** Puede cambiar estado (scouting workflow) */
  canChangeStatus: boolean;
}

/** 
 * Campos editables en el formulario unificado 
 */
export interface UnifiedTechEditData {
  technology_name: string;
  provider: string;
  country: string;
  paises_actua: string;
  web: string;
  email: string;
  trl: number | null;
  type: string;
  subcategory: string;
  sector: string;
  applications: string;
  description: string;
  ventaja_competitiva: string;
  innovacion: string;
  casos_referencia: string;
  comentarios_analista: string;
  
  // Taxonomy IDs for standardized dropdowns
  status: string;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string;
  estado_seguimiento: string;
}

/**
 * Props base para el contenido unificado de detalle de tecnología
 */
export interface UnifiedTechDetailContentProps {
  data: UnifiedTechData;
  metadata: TechMetadata;
  actions: TechActions;
  isEditing?: boolean;
  editData?: UnifiedTechEditData;
  isLoading?: boolean;
  isSaving?: boolean;
  
  // Callbacks de edición
  onEditChange?: (field: keyof UnifiedTechEditData, value: string | number | null) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSave?: () => void;
  
  // Callbacks de acciones
  onEnrichmentComplete?: (data: Record<string, any>) => void;
  onDownloadWord?: () => void;
  onSendToDB?: () => void;
  onViewInDB?: () => void;
  onAddToProject?: (projectId: string) => void;
  onAddFavorite?: () => void;
  onSendToReview?: () => void;
  onMoveToTrends?: () => void;
  onMoveToCaseStudy?: () => void;
  onChangeStatus?: (newStatus: string) => void;
}
