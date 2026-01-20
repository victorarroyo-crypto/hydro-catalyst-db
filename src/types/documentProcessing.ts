// Document Processing Status Types

export type DocumentProcessingStatus =
  | 'pending'              // Subido, esperando procesar
  | 'processing'           // Extrayendo texto
  | 'chunking'             // Dividiendo en chunks
  | 'embedding'            // Generando embeddings (más lento)
  | 'extracting_entities'  // Extrayendo entidades con LLM
  | 'completed'            // Completado
  | 'failed';              // Error

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
