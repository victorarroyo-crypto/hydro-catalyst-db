/**
 * Mapping Functions for Unified Technology Data
 * 
 * Converts data from different sources to the unified format.
 */

import type { UnifiedTechData, TechMetadata, TechActions, UnifiedTechEditData } from '@/types/unifiedTech';
import type { Technology } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

type LonglistItem = Tables<'study_longlist'>;
type ScoutingQueueItem = Tables<'scouting_queue'>;

/**
 * Maps a technology from the main database to unified format
 */
export function mapFromTechnologies(tech: Technology): UnifiedTechData {
  return {
    id: tech.id,
    technology_name: tech['Nombre de la tecnología'],
    provider: tech['Proveedor / Empresa'],
    country: tech['País de origen'],
    paises_actua: tech['Paises donde actua'],
    web: tech['Web de la empresa'],
    email: tech['Email de contacto'],
    trl: tech['Grado de madurez (TRL)'],
    estado_seguimiento: tech['Estado del seguimiento'],
    fecha_scouting: tech['Fecha de scouting'],
    type: tech['Tipo de tecnología'],
    subcategory: tech['Subcategoría'],
    sector: tech['Sector y subsector'],
    applications: tech['Aplicación principal'],
    description: tech['Descripción técnica breve'],
    ventaja_competitiva: tech['Ventaja competitiva clave'],
    innovacion: tech['Porque es innovadora'],
    casos_referencia: tech['Casos de referencia'],
    comentarios_analista: tech['Comentarios del analista'],
    status: tech.status,
    quality_score: tech.quality_score,
    review_status: tech.review_status,
    created_at: tech.created_at,
    updated_at: tech.updated_at,
  };
}

/**
 * Maps a longlist item to unified format
 * If linkedTech is provided, uses data from the linked technology
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
    technology_name: item.technology_name,
    provider: item.provider,
    country: item.country,
    paises_actua: extendedItem.paises_actua || null,
    web: item.web,
    email: extendedItem.email || null,
    trl: item.trl,
    estado_seguimiento: null,
    fecha_scouting: null,
    type: item.type_suggested,
    subcategory: item.subcategory_suggested,
    sector: extendedItem.sector || null,
    applications: item.applications?.join(', ') || null,
    description: item.brief_description,
    ventaja_competitiva: extendedItem.ventaja_competitiva || null,
    innovacion: extendedItem.innovacion || null,
    casos_referencia: extendedItem.casos_referencia || null,
    comentarios_analista: item.inclusion_reason,
    status: null,
    quality_score: null,
    review_status: null,
    created_at: item.added_at,
    updated_at: null,
  };
}

/**
 * Maps a scouting queue item to unified format
 */
export function mapFromScouting(item: ScoutingQueueItem): UnifiedTechData {
  return {
    id: item.id,
    technology_name: item['Nombre de la tecnología'],
    provider: item['Proveedor / Empresa'],
    country: item['País de origen'],
    paises_actua: item['Paises donde actua'],
    web: item['Web de la empresa'],
    email: item['Email de contacto'],
    trl: item['Grado de madurez (TRL)'],
    estado_seguimiento: item['Estado del seguimiento'],
    fecha_scouting: item['Fecha de scouting'],
    type: item['Tipo de tecnología'],
    subcategory: item['Subcategoría'],
    sector: item['Sector y subsector'],
    applications: item['Aplicación principal'],
    description: item['Descripción técnica breve'],
    ventaja_competitiva: item['Ventaja competitiva clave'],
    innovacion: item['Porque es innovadora'],
    casos_referencia: item['Casos de referencia'],
    comentarios_analista: item['Comentarios del analista'],
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
    canEnrich: isInternalUser,
    canDownload: true,
    canSendToDB: false,
    canAddToProject: true,
    canFavorite: true,
    canSendToReview: isInternalUser,
    canMoveToTrends: isInternalUser,
    canMoveToCaseStudy: isInternalUser,
    canViewInDB: false,
    canChangeStatus: false,
  };
}

/**
 * Creates actions for a longlist item
 * All items can be edited and enriched - linked items sync changes to main DB
 */
export function createLonglistActions(isLinkedToDB: boolean): TechActions {
  return {
    canEdit: true,              // Always allow editing
    canEnrich: true,            // Always allow AI enrichment
    canDownload: true,
    canSendToDB: !isLinkedToDB, // Only if not already linked
    canAddToProject: false,
    canFavorite: false,
    canSendToReview: false,
    canMoveToTrends: false,
    canMoveToCaseStudy: false,
    canViewInDB: isLinkedToDB,
    canChangeStatus: false,
  };
}

/**
 * Creates actions for scouting queue
 */
export function createScoutingActions(status: string): TechActions {
  return {
    canEdit: status !== 'approved',
    canEnrich: status !== 'approved',
    canDownload: false,
    canSendToDB: status === 'approved',
    canAddToProject: false,
    canFavorite: false,
    canSendToReview: false,
    canMoveToTrends: false,
    canMoveToCaseStudy: false,
    canViewInDB: false,
    canChangeStatus: true,
  };
}

/**
 * Converts UnifiedTechData to edit data format
 */
export function toEditData(data: UnifiedTechData): UnifiedTechEditData {
  return {
    technology_name: data.technology_name || '',
    provider: data.provider || '',
    country: data.country || '',
    paises_actua: data.paises_actua || '',
    web: data.web || '',
    email: data.email || '',
    trl: data.trl,
    type: data.type || '',
    subcategory: data.subcategory || '',
    sector: data.sector || '',
    applications: data.applications || '',
    description: data.description || '',
    ventaja_competitiva: data.ventaja_competitiva || '',
    innovacion: data.innovacion || '',
    casos_referencia: data.casos_referencia || '',
    comentarios_analista: data.comentarios_analista || '',
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
