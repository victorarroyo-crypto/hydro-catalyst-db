import { API_URL } from '@/lib/api';
import type {
  DocumentEntity,
  EntitiesSummary,
  EquipmentItem,
  WaterParameter,
  EnhancedUploadResult,
  EntityCreateInput,
  EntityFilters,
  EntityType,
  DocumentExtractionType,
} from '@/types/documentEntities';

export const projectEntitiesService = {
  // Listar entidades con filtros
  async getEntities(
    projectId: string,
    filters?: EntityFilters
  ): Promise<{ entities: DocumentEntity[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.document_id) params.append('document_id', filters.document_id);
    if (filters?.verified_only) params.append('verified_only', 'true');
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities?${params}`
    );
    if (!response.ok) throw new Error('Failed to fetch entities');
    return response.json();
  },

  // Obtener resumen de entidades
  async getEntitiesSummary(projectId: string): Promise<EntitiesSummary> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities/summary`
    );
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  // Crear entidad manual
  async createEntity(
    projectId: string,
    entity: EntityCreateInput,
    documentId?: string
  ): Promise<{ success: boolean; entity: DocumentEntity }> {
    const params = documentId ? `?document_id=${documentId}` : '';
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      }
    );
    if (!response.ok) throw new Error('Failed to create entity');
    return response.json();
  },

  // Actualizar entidad
  async updateEntity(
    projectId: string,
    entityId: string,
    entity: Partial<EntityCreateInput>
  ): Promise<{ success: boolean; entity: DocumentEntity }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities/${entityId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      }
    );
    if (!response.ok) throw new Error('Failed to update entity');
    return response.json();
  },

  // Verificar entidad
  async verifyEntity(
    projectId: string,
    entityId: string,
    verified: boolean = true
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities/${entityId}/verify?verified=${verified}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to verify entity');
    return response.json();
  },

  // Eliminar entidad
  async deleteEntity(projectId: string, entityId: string): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/entities/${entityId}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete entity');
  },

  // Extraer/re-extraer entidades de documento
  async extractEntities(
    projectId: string,
    documentId: string,
    useVision: boolean = true
  ): Promise<{ success: boolean; entities_extracted: number; method: string }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/documents/${documentId}/extract-entities?use_vision=${useVision}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to extract entities');
    return response.json();
  },

  // Upload con extracción avanzada
  async uploadWithExtraction(
    projectId: string,
    file: File,
    documentType: DocumentExtractionType,
    extractEntities: boolean = true
  ): Promise<EnhancedUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('extract_entities', String(extractEntities));

    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/documents/process-enhanced`,
      {
        method: 'POST',
        body: formData,
      }
    );
    if (!response.ok) throw new Error('Failed to upload document');
    return response.json();
  },

  // Obtener lista de equipos
  async getEquipmentList(projectId: string): Promise<{ equipment: EquipmentItem[] }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/equipment-list`
    );
    if (!response.ok) throw new Error('Failed to fetch equipment');
    return response.json();
  },

  // Obtener resumen de parámetros de agua
  async getParametersSummary(projectId: string): Promise<{ parameters: WaterParameter[] }> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/parameters-summary`
    );
    if (!response.ok) throw new Error('Failed to fetch parameters');
    return response.json();
  },
};
