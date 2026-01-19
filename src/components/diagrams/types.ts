export type NodeType = 'source' | 'treatment' | 'storage' | 'distribution' | 'discharge' | 'equipment';
export type MediumType = 'water' | 'wastewater' | 'steam' | 'condensate' | 'recycled';
export type AnnotationType = 'finding' | 'opportunity' | 'risk';
export type DiagramLevel = 0 | 1 | 2;
export type ChangeType = 'add' | 'modify' | 'remove';
export type ElementType = 'node' | 'connection' | 'annotation';

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  level: DiagramLevel;
}

export interface DiagramConnection {
  id: string;
  source_node_id: string;
  target_node_id: string;
  flow_m3_day: number;
  medium: MediumType;
}

export interface DiagramAnnotation {
  id: string;
  position: { x: number; y: number };
  text: string;
  type: AnnotationType;
  linked_node_id?: string;
}

export interface Diagram {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  level: DiagramLevel;
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  annotations: DiagramAnnotation[];
  created_at: string;
  updated_at: string;
}

export interface DiagramChange {
  id?: string;
  diagram_id: string;
  scenario_id: string;
  change_type: ChangeType;
  element_type: ElementType;
  element_id: string;
  original_data?: Record<string, unknown>;
  modified_data?: Record<string, unknown>;
  created_at?: string;
}

export interface Scenario {
  id: string;
  name: string;
  scenario_type: string;
  is_baseline?: boolean;
}

export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; color: string; icon: string }> = {
  source: { label: 'Fuente', color: '#3b82f6', icon: 'Droplets' },
  treatment: { label: 'Tratamiento', color: '#10b981', icon: 'Filter' },
  storage: { label: 'Almacenamiento', color: '#6366f1', icon: 'Database' },
  distribution: { label: 'Distribución', color: '#f59e0b', icon: 'GitBranch' },
  discharge: { label: 'Descarga', color: '#ef4444', icon: 'ArrowRightFromLine' },
  equipment: { label: 'Equipo', color: '#8b5cf6', icon: 'Cog' },
};

export const MEDIUM_CONFIG: Record<MediumType, { label: string; color: string }> = {
  water: { label: 'Agua', color: '#3b82f6' },
  wastewater: { label: 'Agua residual', color: '#78716c' },
  steam: { label: 'Vapor', color: '#f97316' },
  condensate: { label: 'Condensado', color: '#06b6d4' },
  recycled: { label: 'Reciclada', color: '#22c55e' },
};

export const ANNOTATION_CONFIG: Record<AnnotationType, { label: string; color: string; bgColor: string }> = {
  finding: { label: 'Hallazgo', color: '#3b82f6', bgColor: '#dbeafe' },
  opportunity: { label: 'Oportunidad', color: '#22c55e', bgColor: '#dcfce7' },
  risk: { label: 'Riesgo', color: '#ef4444', bgColor: '#fee2e2' },
};

export const CHANGE_TYPE_CONFIG: Record<ChangeType, { label: string; borderColor: string; bgColor: string; textColor: string }> = {
  add: { label: 'Añadido', borderColor: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.1)', textColor: '#2e7d32' },
  modify: { label: 'Modificado', borderColor: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.1)', textColor: '#e65100' },
  remove: { label: 'Eliminado', borderColor: '#F44336', bgColor: 'rgba(244, 67, 54, 0.1)', textColor: '#c62828' },
};
