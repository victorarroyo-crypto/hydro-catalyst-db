/**
 * Unified Technology Types
 * 
 * Single source of truth for technology data across all views.
 * Field names match exactly with the `technologies` table columns.
 * 
 * Sources that use different column names (e.g., scouting_queue, study_longlist)
 * are mapped to these canonical names in mapToUnifiedTech.ts
 */

export interface UnifiedTechData {
  // Identificación
  id: string;
  nombre: string;
  
  // Información General
  proveedor: string | null;
  pais: string | null;
  paises_actua: string | null;
  web: string | null;
  email: string | null;
  trl: number | null;
  estado_seguimiento: string | null;
  fecha_scouting: string | null;
  
  // Clasificación
  tipo: string | null;
  subcategoria: string | null;
  sector: string | null;
  aplicacion: string | null;
  
  // Descripción e Innovación
  descripcion: string | null;
  ventaja: string | null;
  innovacion: string | null;
  casos_referencia: string | null;
  
  // Notas
  comentarios: string | null;
  
  // Technical Specifications (from case studies)
  capacity?: string | null;
  removal_efficiency?: string | null;
  footprint?: string | null;
  power_consumption?: string | null;
  price_range?: string | null;
  business_model?: string | null;
  lead_time?: string | null;
  
  // Metadatos (solo lectura)
  status: string | null;
  quality_score: number | null;
  review_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TechMetadata {
  /** Origen de los datos */
  source: 'database' | 'longlist' | 'scouting' | 'case_study' | 'extracted';
  
  /** Fase actual del proceso */
  phase?: string;
  
  /** Nombre del estudio (si aplica) */
  studyName?: string;
  
  /** ID del estudio (si aplica) */
  studyId?: string;
  
  /** Nombre del caso de estudio (si aplica) */
  caseStudyName?: string;
  
  /** ID del caso de estudio (si aplica) */
  caseStudyId?: string;
  
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
  
  // === Workflow Status ===
  
  /** Estado en la cola de scouting */
  queueStatus?: 'review' | 'pending_approval' | 'approved' | 'rejected' | string;
  
  /** Estado de revisión en BD */
  reviewStatus?: 'none' | 'pending' | 'in_review' | 'pending_approval' | 'completed' | string;
  
  /** ID del revisor asignado */
  reviewerId?: string;
  
  /** Si el usuario actual es el revisor asignado */
  isCurrentReviewer?: boolean;
  
  /** Si ya está en la cola de scouting */
  isInScoutingQueue?: boolean;
  
  /** ID en la cola de scouting */
  scoutingQueueId?: string;
  
  /** Rol de la tecnología (para casos de estudio) */
  role?: 'recommended' | 'evaluated' | 'mentioned';
  
  /** Justificación de selección IA */
  selectionRationale?: string;
}

export interface TechActions {
  // === EDITING ===
  /** Puede editar los campos */
  canEdit: boolean;
  /** Puede guardar cambios */
  canSave: boolean;
  
  // === IA ===
  /** Puede usar enriquecimiento IA */
  canEnrich: boolean;
  
  // === EXPORTACIÓN ===
  /** Puede descargar ficha Word */
  canDownload: boolean;
  
  // === WORKFLOW SCOUTING ===
  /** Puede enviar a aprobación (analyst en 'review') */
  canSendToApproval: boolean;
  /** Puede aprobar a la BD (supervisor en 'pending_approval') */
  canApproveToDatabase: boolean;
  /** Puede rechazar */
  canReject: boolean;
  
  // === WORKFLOW BD REVIEW CON APROBACIÓN ===
  /** Puede enviar revisión a aprobación (analista en 'in_review') */
  canSendReviewToApproval: boolean;
  /** Puede aprobar revisión (admin/supervisor en 'pending_approval') */
  canApproveReview: boolean;
  /** Puede devolver a revisión (admin/supervisor en 'pending_approval') */
  canBackToReviewDB: boolean;
  /** Puede devolver a revisión (supervisor en 'pending_approval') */
  canBackToReview: boolean;
  
  // === WORKFLOW BD REVIEW ===
  /** Puede enviar a revisión */
  canSendToReview: boolean;
  /** Puede completar revisión */
  canCompleteReview: boolean;
  /** Puede liberar revisión */
  canReleaseReview: boolean;
  
  // === LINKING ===
  /** Puede enviar a la BD principal */
  canSendToDB: boolean;
  /** Puede ver en BD (cuando está vinculada) */
  canViewInDB: boolean;
  /** Puede enviar a cola de scouting */
  canSendToScouting: boolean;
  
  // === USER ACTIONS ===
  /** Puede añadir a proyectos */
  canAddToProject: boolean;
  /** Puede marcar como favorito */
  canFavorite: boolean;
  
  // === VISIBILITY ===
  /** Puede ver información interna */
  canSeeInternalInfo: boolean;
  /** Puede ver especificaciones técnicas (caso de estudio) */
  canSeeSpecifications: boolean;
}

/** 
 * Campos editables en el formulario unificado
 * Names match the technologies table schema
 */
export interface UnifiedTechEditData {
  nombre: string;
  proveedor: string;
  pais: string;
  paises_actua: string;
  web: string;
  email: string;
  trl: number | null;
  tipo: string;
  subcategoria: string;
  sector: string;
  aplicacion: string;
  descripcion: string;
  ventaja: string;
  innovacion: string;
  casos_referencia: string;
  comentarios: string;
  
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
  onSendToApproval?: () => void;
  onApproveToDatabase?: () => void;
  onReject?: (reason: string) => void;
  onBackToReview?: () => void;
  onSendToScouting?: () => void;
  onClaimReview?: () => void;
  onCompleteReview?: () => void;
  onReleaseReview?: () => void;
}
