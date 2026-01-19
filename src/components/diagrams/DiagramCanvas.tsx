import { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { DiagramToolbar } from './DiagramToolbar';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { nodeTypes } from './CustomNodes';
import { edgeTypes } from './CustomEdge';
import { Diagram, DiagramLevel, NodeType, DiagramNode, DiagramConnection, DiagramAnnotation } from './types';
import { API_URL } from '@/lib/api';

interface DiagramCanvasProps {
  projectId: string;
  diagram?: Diagram;
  onSave?: (diagram: Partial<Diagram>) => Promise<void>;
}

export function DiagramCanvas({ projectId, diagram, onSave }: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [level, setLevel] = useState<DiagramLevel>(diagram?.level || 0);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Convert diagram data to React Flow format
  useEffect(() => {
    if (diagram) {
      const flowNodes: Node[] = [
        ...diagram.nodes.map((n) => ({
          id: n.id,
          type: 'customNode',
          position: n.position,
          data: { label: n.label, nodeType: n.type, data: n.data },
        })),
        ...diagram.annotations.map((a) => ({
          id: a.id,
          type: 'annotation',
          position: a.position,
          data: { text: a.text, annotationType: a.type },
        })),
      ];

      const flowEdges: Edge[] = diagram.connections.map((c) => ({
        id: c.id,
        source: c.source_node_id,
        target: c.target_node_id,
        type: 'flowEdge',
        data: { flow_m3_day: c.flow_m3_day, medium: c.medium },
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [diagram, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'flowEdge',
        data: { flow_m3_day: 0, medium: 'water' },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const addNode = useCallback(
    (type: NodeType) => {
      const id = `node-${Date.now()}`;
      const position = reactFlowInstance?.screenToFlowPosition({ x: 200, y: 200 }) || { x: 200, y: 200 };
      
      const newNode: Node = {
        id,
        type: 'customNode',
        position,
        data: { label: `Nuevo ${type}`, nodeType: type, data: {} },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const addAnnotation = useCallback(() => {
    const id = `annotation-${Date.now()}`;
    const position = reactFlowInstance?.screenToFlowPosition({ x: 300, y: 300 }) || { x: 300, y: 300 };

    const newNode: Node = {
      id,
      type: 'annotation',
      position,
      data: { text: 'Nueva anotación', annotationType: 'finding' },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance, setNodes]);

  const updateNode = useCallback(
    (id: string, data: Partial<Node['data']>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      setSelectedNode(null);
    },
    [setNodes]
  );

  const updateEdge = useCallback(
    (id: string, data: Partial<Edge['data']>) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
        )
      );
      setSelectedEdge(null);
    },
    [setEdges]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const deleteEdge = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
      setSelectedEdge(null);
    },
    [setEdges]
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      const diagramNodes: DiagramNode[] = nodes
        .filter((n) => n.type === 'customNode')
        .map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label,
          position: n.position,
          data: n.data.data || {},
          level,
        }));

      const annotations: DiagramAnnotation[] = nodes
        .filter((n) => n.type === 'annotation')
        .map((n) => ({
          id: n.id,
          position: n.position,
          text: n.data.text,
          type: n.data.annotationType,
        }));

      const connections: DiagramConnection[] = edges.map((e) => ({
        id: e.id,
        source_node_id: e.source,
        target_node_id: e.target,
        flow_m3_day: e.data?.flow_m3_day || 0,
        medium: e.data?.medium || 'water',
      }));

      await onSave({
        level,
        nodes: diagramNodes,
        annotations,
        connections,
      });

      toast.success('Diagrama guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar el diagrama');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, level, onSave]);

  const handleExport = useCallback(() => {
    if (!reactFlowWrapper.current) return;

    toPng(reactFlowWrapper.current, {
      backgroundColor: '#ffffff',
      width: reactFlowWrapper.current.offsetWidth,
      height: reactFlowWrapper.current.offsetHeight,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `diagrama-${diagram?.id || 'nuevo'}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Imagen exportada correctamente');
      })
      .catch((error) => {
        toast.error('Error al exportar la imagen');
        console.error('Export error:', error);
      });
  }, [diagram?.id]);

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden">
      <DiagramToolbar
        level={level}
        onLevelChange={setLevel}
        onAddNode={addNode}
        onAddAnnotation={addAnnotation}
        onSave={handleSave}
        onExport={handleExport}
        onZoomIn={() => reactFlowInstance?.zoomIn()}
        onZoomOut={() => reactFlowInstance?.zoomOut()}
        onFitView={() => reactFlowInstance?.fitView()}
        isSaving={isSaving}
      />

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'flowEdge',
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
          
          <svg>
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>

        <NodePropertiesPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNode={updateNode}
          onUpdateEdge={updateEdge}
          onDeleteNode={deleteNode}
          onDeleteEdge={deleteEdge}
          onClose={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        />
      </div>
    </div>
  );
}
