// Document Entity Types

export type EntityType =
  | 'equipment'      // Bombas, tanques, reactores
  | 'instrument'     // Sensores, transmisores
  | 'valve'          // Válvulas
  | 'pipeline'       // Líneas de proceso
  | 'stream'         // Corrientes de agua
  | 'parameter'      // Parámetros de análisis
  | 'limit'          // Límites de vertido
  | 'chemical'       // Químicos
  | 'process'        // Procesos de tratamiento
  | 'specification'  // Especificaciones técnicas
  | 'other';

export type DocumentExtractionType =
  | 'pid'           // P&ID - extrae equipos, instrumentos, válvulas
  | 'analytics'     // Análisis de agua - extrae parámetros
  | 'datasheet'     // Fichas técnicas - extrae especificaciones
  | 'permit'        // Permisos - extrae límites de vertido
  | 'process_flow'  // PFD - similar a P&ID
  | 'other';

export interface DocumentEntity {
  id: string;
  project_id: string;
  document_id: string | null;
  entity_type: EntityType;
  tag: string | null;        // P-101, FT-201, etc.
  name: string | null;
  value: string | null;      // Para parámetros
  unit: string | null;
  attributes: Record<string, any>;  // type, capacity, range, etc.
  source_text: string | null;
  confidence: number;        // 0-1
  extraction_method: 'llm' | 'regex' | 'ocr' | 'manual';
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  project_documents?: {
    filename: string;
    document_type: string;
  };
}

export interface EntitiesSummary {
  project_id: string;
  total_entities: number;
  verified_count: number;
  by_type: Record<EntityType, number>;
  equipment_list: Array<{ tag: string; name: string }>;
  instrument_list: Array<{ tag: string; name: string }>;
}

export interface EquipmentItem {
  tag: string;
  name: string;
  type: string;
  capacity: string | null;
  source: string | null;  // Filename
  verified: boolean;
}

export interface WaterParameter {
  name: string;
  value: string;
  unit: string;
  limit: string | null;
  compliant: boolean | null;
}

export interface EnhancedUploadResult {
  success: boolean;
  document_id: string;
  chunks_created: number;
  embeddings_generated: number;
  entities_extracted: number;
  extraction_method: string | null;
}

export interface EntityCreateInput {
  entity_type: EntityType;
  tag?: string;
  name?: string;
  value?: string;
  unit?: string;
  attributes?: Record<string, any>;
}

export interface EntityFilters {
  entity_type?: EntityType;
  document_id?: string;
  verified_only?: boolean;
  limit?: number;
  offset?: number;
}
