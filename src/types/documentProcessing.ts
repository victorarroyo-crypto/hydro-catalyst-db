// Document Processing Status Types

export type DocumentProcessingStatus =
  | 'pending'              // Subido, esperando procesar
  | 'processing'           // Extrayendo texto
  | 'chunking'             // Dividiendo en chunks
  | 'embedding'            // Generando embeddings (más lento)
  | 'extracting_entities'  // Extrayendo entidades con LLM
  | 'completed'            // Completado
  | 'failed';              // Error

// Estado de una parte del documento
export interface DocumentPart {
  part_number: number;
  status: DocumentProcessingStatus;
  chunk_count: number;
  id: string;
}

export interface DocumentProcessingState {
  success: boolean;
  document_id: string;
  filename: string;
  status: DocumentProcessingStatus;
  stage: DocumentProcessingStatus;  // Etapa actual
  progress: number;                 // 0-100
  chunks_created: number;
  embeddings_generated: number;
  entities_count: number;
  extraction_status: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  // Campos para documentos divididos
  is_split_document?: boolean;
  total_parts?: number | null;
  parts_completed?: number | null;
  parts?: DocumentPart[] | null;
}

// Documento en lista con soporte para partes
export interface ProjectDocumentWithParts {
  id: string;
  project_id: string;
  filename: string;
  document_type: string;
  processing_status: string;
  chunk_count: number;
  file_size: number;
  created_at: string;
  mime_type?: string;
  entities_count?: number;
  processing_error?: string;
  // Campos de documento dividido
  is_split_document?: boolean;
  total_parts?: number | null;
  parent_document_id?: string | null;
  part_number?: number | null;
}

export interface ProcessingStageInfo {
  label: string;
  description: string;
  percentage: number;
}

export const PROCESSING_STAGES: Record<DocumentProcessingStatus, ProcessingStageInfo> = {
  pending: { label: 'Pendiente', description: 'Esperando en cola...', percentage: 0 },
  processing: { label: 'Extrayendo', description: 'Extrayendo texto del documento...', percentage: 20 },
  chunking: { label: 'Troceando', description: 'Dividiendo en segmentos para análisis...', percentage: 40 },
  embedding: { label: 'Vectorizando', description: 'Generando representaciones vectoriales...', percentage: 60 },
  extracting_entities: { label: 'Analizando', description: 'Extrayendo entidades con IA...', percentage: 80 },
  completed: { label: 'Completado', description: 'Documento procesado correctamente', percentage: 100 },
  failed: { label: 'Error', description: 'Error durante el procesamiento', percentage: 0 },
};
