// Types for AI Advisor Chat functionality

export interface Source {
  name: string;
  type: string;
  similarity: number;
  trl?: number | null;
  provider?: string | null;
  url?: string | null;
}

export interface TechnologySheet {
  id?: string;
  nombre: string;
  proveedor: string;
  pais?: string;
  trl?: number;
  descripcion?: string;
  tipo?: string;
  subcategoria?: string;
  sector?: string;
  aplicacion_principal?: string;
  ventaja_competitiva?: string;
  porque_innovadora?: string;
  casos_referencia?: string;
  web?: string;
  email?: string;
}

export interface ComparisonTable {
  technologies: string[];
  criteria: {
    name: string;
    values: Record<string, string>;
  }[];
}

export interface WaterAnalysisResult {
  parameters: {
    name: string;
    value: string;
    unit: string;
    status?: 'normal' | 'warning' | 'critical';
  }[];
  recommendations: {
    technology: string;
    reason: string;
    priority: number;
  }[];
}

export interface MessageMetadata {
  type: 'standard' | 'tech_sheet' | 'comparison' | 'water_analysis';
  tech_sheet?: TechnologySheet;
  comparison?: ComparisonTable;
  water_analysis?: WaterAnalysisResult;
  credits_cost?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  credits_used?: number;
  created_at: string;
  metadata?: MessageMetadata;
  attachments?: AttachmentInfo[];
}

export interface AttachmentInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface ChatResponse {
  response: string;
  chat_id: string;
  credits_used: number;
  credits_remaining: number;
  sources: Source[];
  metadata?: MessageMetadata;
}
