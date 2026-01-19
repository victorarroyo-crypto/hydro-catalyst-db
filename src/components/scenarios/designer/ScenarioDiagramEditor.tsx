import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ZoomIn, Maximize2 } from 'lucide-react';
import { ScenarioDesign, TreatmentTrain } from '@/types/scenarioDesigner';
import { nodeTypes as customNodeTypes } from '@/components/diagrams/CustomNodes';

interface ScenarioDiagramEditorProps {
  scenario: ScenarioDesign;
  onDiagramChange?: (diagramData: Record<string, unknown>) => void;
  isReadOnly?: boolean;
}

const ScenarioDiagramEditor: React.FC<ScenarioDiagramEditorProps> = ({
  scenario,
  onDiagramChange,
  isReadOnly = false,
}) => {
  // Generate nodes and edges from treatment trains
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (!scenario.treatment_trains || scenario.treatment_trains.length === 0) {
      return { initialNodes: nodes, initialEdges: edges };
    }

    let yOffset = 50;
    
    scenario.treatment_trains.forEach((train, trainIndex) => {
      const trainY = yOffset;
      let xOffset = 100;
      
      // Source node
      const sourceId = `source-${train.id}`;
      nodes.push({
        id: sourceId,
        type: 'customNode',
        position: { x: xOffset, y: trainY },
        data: {
          label: train.source_type === 'wastewater' ? 'Agua Residual' : 
                 train.source_type === 'raw_water' ? 'Agua Cruda' : 
                 train.source_type === 'recycled' ? 'Agua Reciclada' : 'Pluvial',
          nodeType: 'source',
        },
      });
      
      let prevNodeId = sourceId;
      xOffset += 180;
      
      // Technology nodes
      train.technologies.forEach((tech, techIndex) => {
        const techId = `tech-${train.id}-${tech.id}`;
        nodes.push({
          id: techId,
          type: 'customNode',
          position: { x: xOffset, y: trainY },
          data: {
            label: tech.technology_type,
            nodeType: 'treatment',
            recovery: tech.recovery_rate,
          },
        });
        
        edges.push({
          id: `edge-${prevNodeId}-${techId}`,
          source: prevNodeId,
          target: techId,
          animated: true,
          style: { stroke: '#3b82f6' },
          markerEnd: { type: MarkerType.ArrowClosed },
          label: techIndex === 0 ? `${train.capacity_m3_day} m³/d` : undefined,
        });
        
        prevNodeId = techId;
        xOffset += 180;
      });
      
      // Target node
      const targetId = `target-${train.id}`;
      nodes.push({
        id: targetId,
        type: 'customNode',
        position: { x: xOffset, y: trainY },
        data: {
          label: train.target_use || 'Uso',
          nodeType: 'distribution',
        },
      });
      
      edges.push({
        id: `edge-${prevNodeId}-${targetId}`,
        source: prevNodeId,
        target: targetId,
        animated: true,
        style: { stroke: '#22c55e' },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
      
      yOffset += 150;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [scenario.treatment_trains]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      if (isReadOnly) return;
      setEdges((eds) => addEdge(params, eds));
    },
    [isReadOnly, setEdges]
  );

  // Update parent when diagram changes
  React.useEffect(() => {
    if (onDiagramChange && !isReadOnly) {
      onDiagramChange({ nodes, edges });
    }
  }, [nodes, edges, onDiagramChange, isReadOnly]);

  // Sync with scenario changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!scenario.treatment_trains || scenario.treatment_trains.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diagrama del Escenario</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p className="text-sm text-center">
            Añade trenes de tratamiento para visualizar el diagrama
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Diagrama del Escenario</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {scenario.treatment_trains.length} trenes
          </Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-[300px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={customNodeTypes}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          className="bg-muted/20"
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap 
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-background border"
          />
        </ReactFlow>
      </CardContent>
    </Card>
  );
};

export default ScenarioDiagramEditor;
