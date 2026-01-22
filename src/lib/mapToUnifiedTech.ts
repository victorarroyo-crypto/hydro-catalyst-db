/**
 * Mapping Functions for Unified Technology Data
 * 
 * Converts data from different sources to the unified format.
 * All output field names match the technologies table schema exactly.
 */

import type { UnifiedTechData, TechMetadata, TechActions, UnifiedTechEditData } from '@/types/unifiedTech';
import type { Technology } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

type LonglistItem = Tables<'study_longlist'>;
type ScoutingQueueItem = Tables<'scouting_queue'>;

/**
 * Maps a technology from the main database to unified format
 * Direct 1:1 mapping - field names already match
 */
export function mapFromTechnologies(tech: Technology): UnifiedTechData {
  return {
    id: tech.id,
    nombre: tech.nombre,
    proveedor: tech.proveedor,
    pais: tech.pais,
    paises_actua: tech.paises_actua,
    web: tech.web,
    email: tech.email,
    trl: tech.trl,
    estado_seguimiento: tech.estado_seguimiento,
    fecha_scouting: tech.fecha_scouting,
    tipo: tech.tipo || tech.tipos?.[0] || null,
    subcategoria: tech.subcategorias?.[0] || null,
    sector: tech.sector,
    aplicacion: tech.aplicacion,
    descripcion: tech.descripcion,
    ventaja: tech.ventaja,
    innovacion: tech.innovacion,
    casos_referencia: tech.casos_referencia,
    comentarios: tech.comentarios,
    status: tech.status,
    quality_score: tech.quality_score,
    review_status: tech.review_status,
    created_at: tech.created_at,
    updated_at: tech.updated_at,
  };
}

/**
 * Maps a longlist item to unified format
 * Translates English column names to canonical Spanish names
 */
export function mapFromLonglist(
  item: LonglistItem, 
  linkedTech?: Technology | null
): UnifiedTechData {
  const extendedItem = item as any;
  
  if (linkedTech) {
    return mapFromTechnologies(linkedTech);
  }
  
  return {
    id: item.id,
    nombre: item.technology_name,
    proveedor: item.provider,
    pais: item.country,
    paises_actua: extendedItem.paises_actua || null,
    web: item.web,
    email: extendedItem.email || null,
    trl: item.trl,
    estado_seguimiento: null,
    fecha_scouting: null,
    tipo: item.type_suggested,
    subcategoria: item.subcategory_suggested,
    sector: extendedItem.sector || null,
    aplicacion: item.applications?.join(', ') || null,
    descripcion: item.brief_description,
    ventaja: extendedItem.ventaja_competitiva || null,
    innovacion: extendedItem.innovacion || null,
    casos_referencia: extendedItem.casos_referencia || null,
    comentarios: item.inclusion_reason,
    status: null,
    quality_score: null,
    review_status: null,
    created_at: item.added_at,
    updated_at: null,
  };
}

/**
 * Maps a scouting queue item to unified format
 * Translates column names with spaces/accents to canonical names
 */
export function mapFromScouting(item: ScoutingQueueItem): UnifiedTechData {
  return {
    id: item.id,
    nombre: item['Nombre de la tecnología'],
    proveedor: item['Proveedor / Empresa'],
    pais: item['País de origen'],
    paises_actua: item['Paises donde actua'],
    web: item['Web de la empresa'],
    email: item['Email de contacto'],
    trl: item['Grado de madurez (TRL)'],
    estado_seguimiento: item['Estado del seguimiento'],
    fecha_scouting: item['Fecha de scouting'],
    tipo: item['Tipo de tecnología'],
    subcategoria: item['Subcategoría'],
    sector: item['Sector y subsector'],
    aplicacion: item['Aplicación principal'],
    descripcion: item['Descripción técnica breve'],
    ventaja: item['Ventaja competitiva clave'],
    innovacion: item['Porque es innovadora'],
    casos_referencia: item['Casos de referencia'],
    comentarios: item['Comentarios del analista'],
    status: item.queue_status,
    quality_score: null,
    review_status: null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Creates metadata for a database technology
 */
export function createDatabaseMetadata(): TechMetadata {
  return {
    source: 'database',
    isLinkedToDB: true,
  };
}

/**
 * Creates metadata for a longlist item
 */
export function createLonglistMetadata(
  studyId: string,
  studyName: string,
  item: LonglistItem,
  isLinked: boolean
): TechMetadata {
  return {
    source: isLinked ? 'database' : 'longlist',
    phase: 'Fase 3: Lista Larga',
    studyId,
    studyName,
    isLinkedToDB: isLinked,
    linkedTechId: item.existing_technology_id || undefined,
    confidenceScore: item.confidence_score || undefined,
    specificSource: item.source || undefined,
    addedAt: item.added_at,
  };
}

/**
 * Creates metadata for scouting queue item
 */
export function createScoutingMetadata(item: ScoutingQueueItem): TechMetadata {
  return {
    source: 'scouting',
    phase: getScoutingPhase(item.queue_status || 'pending'),
    specificSource: item.source || undefined,
    addedAt: item.created_at,
  };
}

function getScoutingPhase(status: string): string {
  switch (status) {
    case 'pending': return 'Pendiente de revisión';
    case 'review': return 'En revisión';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
}

/**
 * Creates actions for a database technology view
 */
export function createDatabaseActions(isInternalUser: boolean): TechActions {
  return {
    canEdit: isInternalUser,
    canSave: isInternalUser,
    canEnrich: isInternalUser,
    canDownload: true,
    canSendToApproval: false,
    canApproveToDatabase: false,
    canReject: false,
    canBackToReview: false,
    canSendToReview: isInternalUser,
    canCompleteReview: false,
    canReleaseReview: false,
    canSendReviewToApproval: false,
    canApproveReview: false,
    canBackToReviewDB: false,
    canSendToDB: false,
    canViewInDB: false,
    canSendToScouting: false,
    canAddToProject: true,
    canFavorite: true,
    canSeeInternalInfo: isInternalUser,
    canSeeSpecifications: false,
  };
}

/**
 * Creates actions for a longlist item
 * All items can be edited and enriched - linked items sync changes to main DB
 */
export function createLonglistActions(isLinkedToDB: boolean): TechActions {
  return {
    canEdit: true,
    canSave: true,
    canEnrich: true,
    canDownload: true,
    canSendToApproval: false,
    canApproveToDatabase: false,
    canReject: false,
    canBackToReview: false,
    canSendToReview: false,
    canCompleteReview: false,
    canReleaseReview: false,
    canSendReviewToApproval: false,
    canApproveReview: false,
    canBackToReviewDB: false,
    canSendToDB: !isLinkedToDB,
    canViewInDB: isLinkedToDB,
    canSendToScouting: false,
    canAddToProject: false,
    canFavorite: false,
    canSeeInternalInfo: false,
    canSeeSpecifications: false,
  };
}

/**
 * Creates actions for scouting queue
 */
export function createScoutingActions(status: string): TechActions {
  return {
    canEdit: status !== 'approved',
    canSave: status !== 'approved',
    canEnrich: status !== 'approved',
    canDownload: true,
    canSendToApproval: status === 'review',
    canApproveToDatabase: status === 'pending_approval',
    canReject: true,
    canBackToReview: status === 'pending_approval',
    canSendToReview: false,
    canCompleteReview: false,
    canReleaseReview: false,
    canSendReviewToApproval: false,
    canApproveReview: false,
    canBackToReviewDB: false,
    canSendToDB: false,
    canViewInDB: false,
    canSendToScouting: false,
    canAddToProject: false,
    canFavorite: false,
    canSeeInternalInfo: true,
    canSeeSpecifications: false,
  };
}

/**
 * Converts UnifiedTechData to edit data format
 * Field names match the technologies table schema
 */
export function toEditData(data: UnifiedTechData): UnifiedTechEditData {
  // Extended data for accessing taxonomy IDs
  const extData = data as any;
  
  return {
    nombre: data.nombre || '',
    proveedor: data.proveedor || '',
    pais: data.pais || '',
    paises_actua: data.paises_actua || '',
    web: data.web || '',
    email: data.email || '',
    trl: data.trl,
    tipo: data.tipo || '',
    subcategoria: data.subcategoria || '',
    sector: data.sector || '',
    aplicacion: data.aplicacion || '',
    descripcion: data.descripcion || '',
    ventaja: data.ventaja || '',
    innovacion: data.innovacion || '',
    casos_referencia: data.casos_referencia || '',
    comentarios: data.comentarios || '',
    // Taxonomy IDs
    status: data.status || 'active',
    tipo_id: extData.tipo_id || null,
    subcategoria_id: extData.subcategoria_id || null,
    sector_id: extData.sector_id || null,
    subsector_industrial: extData.subsector_industrial || '',
    estado_seguimiento: data.estado_seguimiento || '',
  };
}

/**
 * Gets the source label in Spanish
 */
export function getSourceLabel(metadata: TechMetadata): string {
  if (metadata.isLinkedToDB) return 'Base de Datos';
  
  switch (metadata.specificSource) {
    case 'database': return 'Base de Datos';
    case 'ai_session':
    case 'ai_extracted': return 'Búsqueda Web (IA)';
    case 'manual': return 'Entrada Manual';
    case 'chrome_extension': return 'Extensión Chrome';
    default:
      switch (metadata.source) {
        case 'database': return 'Base de Datos';
        case 'longlist': return 'Lista Larga';
        case 'scouting': return 'Scouting';
        case 'extracted': return 'Extracción IA';
        default: return 'No especificada';
      }
  }
}
