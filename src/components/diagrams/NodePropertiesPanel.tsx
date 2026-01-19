import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { 
  NODE_TYPE_CONFIG, 
  MEDIUM_CONFIG, 
  ANNOTATION_CONFIG, 
  CHANGE_TYPE_CONFIG,
  NodeType, 
  MediumType, 
  AnnotationType,
  DiagramChange,
  ChangeType,
} from './types';

interface NodePropertiesPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNode: (id: string, data: Partial<Node['data']>) => void;
  onUpdateEdge: (id: string, data: Partial<Edge['data']>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
  isScenarioMode?: boolean;
  scenarioChanges?: DiagramChange[];
}

export function NodePropertiesPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onClose,
  isScenarioMode = false,
  scenarioChanges = [],
}: NodePropertiesPanelProps) {
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('equipment');
  const [annotationText, setAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState<AnnotationType>('finding');
  const [edgeFlow, setEdgeFlow] = useState<number>(0);
  const [edgeMedium, setEdgeMedium] = useState<MediumType>('water');

  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.type === 'annotation') {
        setAnnotationText(selectedNode.data.text || '');
        setAnnotationType(selectedNode.data.annotationType || 'finding');
      } else {
        setNodeLabel(selectedNode.data.label || '');
        setNodeType(selectedNode.data.nodeType || 'equipment');
      }
    }
    if (selectedEdge) {
      setEdgeFlow(selectedEdge.data?.flow_m3_day || 0);
      setEdgeMedium(selectedEdge.data?.medium || 'water');
    }
  }, [selectedNode, selectedEdge]);

  const handleSaveNode = () => {
    if (!selectedNode) return;
    if (selectedNode.type === 'annotation') {
      onUpdateNode(selectedNode.id, { text: annotationText, annotationType });
    } else {
      onUpdateNode(selectedNode.id, { label: nodeLabel, nodeType });
    }
  };

  const handleSaveEdge = () => {
    if (!selectedEdge) return;
    onUpdateEdge(selectedEdge.id, { flow_m3_day: edgeFlow, medium: edgeMedium });
  };

  // Get change info for selected element
  const getChangeInfo = (): { changeType: ChangeType; original?: Record<string, unknown> } | null => {
    const elementId = selectedNode?.id || selectedEdge?.id;
    if (!elementId) return null;

    const change = scenarioChanges.find(c => c.element_id === elementId);
    if (change) {
      return { changeType: change.change_type, original: change.original_data };
    }

    // Check if element has changeType in data
    const dataChangeType = selectedNode?.data?.changeType || selectedEdge?.data?.changeType;
    if (dataChangeType) {
      return { changeType: dataChangeType };
    }

    return null;
  };

  const changeInfo = isScenarioMode ? getChangeInfo() : null;

  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l shadow-lg z-10 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {selectedEdge ? 'Conexión' : selectedNode?.type === 'annotation' ? 'Anotación' : 'Nodo'}
          </h3>
          {changeInfo && (
            <Badge
              style={{
                backgroundColor: CHANGE_TYPE_CONFIG[changeInfo.changeType].bgColor,
                borderColor: CHANGE_TYPE_CONFIG[changeInfo.changeType].borderColor,
                color: CHANGE_TYPE_CONFIG[changeInfo.changeType].textColor,
              }}
              variant="outline"
            >
              {CHANGE_TYPE_CONFIG[changeInfo.changeType].label}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scenario change comparison */}
        {isScenarioMode && changeInfo && changeInfo.changeType === 'modify' && changeInfo.original && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
            <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase">
              Comparación con Baseline
            </h4>
            {selectedNode && selectedNode.type !== 'annotation' && (
              <div className="text-sm space-y-1">
                {changeInfo.original.label !== nodeLabel && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through">{changeInfo.original.label as string}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">{nodeLabel}</span>
                  </div>
                )}
              </div>
            )}
            {selectedEdge && (
              <div className="text-sm space-y-1">
                {changeInfo.original.flow_m3_day !== edgeFlow && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through">{changeInfo.original.flow_m3_day as number} m³/día</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">{edgeFlow} m³/día</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedNode && selectedNode.type !== 'annotation' && (
          <>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                placeholder="Nombre del nodo"
                disabled={changeInfo?.changeType === 'remove'}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={nodeType} 
                onValueChange={(v) => setNodeType(v as NodeType)}
                disabled={changeInfo?.changeType === 'remove'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(NODE_TYPE_CONFIG) as [NodeType, typeof NODE_TYPE_CONFIG[NodeType]][]).map(
                    ([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {changeInfo?.changeType !== 'remove' && (
              <Button onClick={handleSaveNode} className="w-full">
                {isScenarioMode ? 'Aplicar Cambio' : 'Guardar Cambios'}
              </Button>
            )}
          </>
        )}

        {selectedNode && selectedNode.type === 'annotation' && (
          <>
            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Texto de la anotación"
                rows={3}
                disabled={changeInfo?.changeType === 'remove'}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={annotationType} 
                onValueChange={(v) => setAnnotationType(v as AnnotationType)}
                disabled={changeInfo?.changeType === 'remove'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ANNOTATION_CONFIG) as [AnnotationType, typeof ANNOTATION_CONFIG[AnnotationType]][]).map(
                    ([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {changeInfo?.changeType !== 'remove' && (
              <Button onClick={handleSaveNode} className="w-full">
                {isScenarioMode ? 'Aplicar Cambio' : 'Guardar Cambios'}
              </Button>
            )}
          </>
        )}

        {selectedEdge && (
          <>
            <div className="space-y-2">
              <Label>Caudal (m³/día)</Label>
              <Input
                type="number"
                value={edgeFlow}
                onChange={(e) => setEdgeFlow(parseFloat(e.target.value) || 0)}
                placeholder="0"
                disabled={changeInfo?.changeType === 'remove'}
              />
            </div>

            <div className="space-y-2">
              <Label>Medio</Label>
              <Select 
                value={edgeMedium} 
                onValueChange={(v) => setEdgeMedium(v as MediumType)}
                disabled={changeInfo?.changeType === 'remove'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MEDIUM_CONFIG) as [MediumType, typeof MEDIUM_CONFIG[MediumType]][]).map(
                    ([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {changeInfo?.changeType !== 'remove' && (
              <Button onClick={handleSaveEdge} className="w-full">
                {isScenarioMode ? 'Aplicar Cambio' : 'Guardar Cambios'}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t">
        {changeInfo?.changeType === 'remove' ? (
          <div className="text-center text-sm text-muted-foreground">
            Este elemento está marcado para eliminación en este escenario
          </div>
        ) : (
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => {
              if (selectedNode) onDeleteNode(selectedNode.id);
              if (selectedEdge) onDeleteEdge(selectedEdge.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
            {isScenarioMode ? 'Marcar como Eliminado' : 'Eliminar'}
          </Button>
        )}
      </div>
    </div>
  );
}
