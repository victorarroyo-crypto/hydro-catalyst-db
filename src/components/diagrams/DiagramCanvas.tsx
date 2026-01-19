import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
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
import { DiagramLegend } from './DiagramLegend';
import { nodeTypes } from './CustomNodes';
import { scenarioNodeTypes } from './ScenarioNodes';
import { edgeTypes } from './CustomEdge';
import { scenarioEdgeTypes } from './ScenarioEdge';
import { 
  Diagram, 
  DiagramLevel, 
  NodeType, 
  DiagramNode, 
  DiagramConnection, 
  DiagramAnnotation,
  Scenario,
  DiagramChange,
  ChangeType,
} from './types';
import { API_URL } from '@/lib/api';

interface DiagramCanvasProps {
  projectId: string;
  diagram?: Diagram;
  onSave?: (diagram: Partial<Diagram>) => Promise<void>;
  scenarios?: Scenario[];
  onSaveScenarioChanges?: (scenarioId: string, changes: DiagramChange[]) => Promise<void>;
}

export function DiagramCanvas({ 
  projectId, 
  diagram, 
  onSave,
  scenarios = [],
  onSaveScenarioChanges,
}: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [level, setLevel] = useState<DiagramLevel>(diagram?.level || 0);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Scenario mode
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioChanges, setScenarioChanges] = useState<DiagramChange[]>([]);
  const [baselineNodes, setBaselineNodes] = useState<Node[]>([]);
  const [baselineEdges, setBaselineEdges] = useState<Edge[]>([]);

  const isScenarioMode = selectedScenarioId !== null;

  // Store baseline when loading diagram
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
      setBaselineNodes(flowNodes);
      setBaselineEdges(flowEdges);
    }
  }, [diagram, setNodes, setEdges]);

  // Fetch scenario changes when scenario is selected
  useEffect(() => {
    if (selectedScenarioId && diagram) {
      fetchScenarioChanges(selectedScenarioId);
    } else {
      // Reset to baseline
      setScenarioChanges([]);
      if (baselineNodes.length > 0) {
        setNodes(baselineNodes.map(n => ({ ...n, data: { ...n.data, changeType: undefined } })));
        setEdges(baselineEdges.map(e => ({ ...e, data: { ...e.data, changeType: undefined } })));
      }
    }
  }, [selectedScenarioId, diagram]);

  const fetchScenarioChanges = async (scenarioId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/scenarios/${scenarioId}/diagram-changes?diagram_id=${diagram?.id}`
      );
      if (response.ok) {
        const changes: DiagramChange[] = await response.json();
        setScenarioChanges(changes);
        applyScenarioChanges(changes);
      } else if (response.status === 404) {
        setScenarioChanges([]);
        applyScenarioChanges([]);
      }
    } catch (error) {
      console.error('Error fetching scenario changes:', error);
      setScenarioChanges([]);
      applyScenarioChanges([]);
    }
  };

  const applyScenarioChanges = (changes: DiagramChange[]) => {
    // Start with baseline
    let updatedNodes = [...baselineNodes];
    let updatedEdges = [...baselineEdges];

    // Create a map of changes by element
    const changeMap = new Map<string, DiagramChange>();
    changes.forEach(change => {
      changeMap.set(change.element_id, change);
    });

    // Apply changes to existing nodes
    updatedNodes = updatedNodes.map(node => {
      const change = changeMap.get(node.id);
      if (change) {
        if (change.change_type === 'remove') {
          return { ...node, data: { ...node.data, changeType: 'remove' as ChangeType } };
        } else if (change.change_type === 'modify' && change.modified_data) {
          return { 
            ...node, 
            data: { 
              ...node.data, 
              ...change.modified_data,
              changeType: 'modify' as ChangeType 
            },
            position: change.modified_data.position as { x: number; y: number } || node.position,
          };
        }
      }
      return { ...node, data: { ...node.data, changeType: undefined } };
    });

    // Add new nodes from changes
    changes
      .filter(c => c.change_type === 'add' && (c.element_type === 'node' || c.element_type === 'annotation'))
      .forEach(change => {
        if (change.modified_data) {
          const newNode: Node = {
            id: change.element_id,
            type: change.element_type === 'annotation' ? 'annotation' : 'customNode',
            position: change.modified_data.position as { x: number; y: number } || { x: 0, y: 0 },
            data: { 
              ...change.modified_data,
              changeType: 'add' as ChangeType 
            },
          };
          updatedNodes.push(newNode);
        }
      });

    // Apply changes to existing edges
    updatedEdges = updatedEdges.map(edge => {
      const change = changeMap.get(edge.id);
      if (change) {
        if (change.change_type === 'remove') {
          return { ...edge, data: { ...edge.data, changeType: 'remove' as ChangeType } };
        } else if (change.change_type === 'modify' && change.modified_data) {
          return { 
            ...edge, 
            data: { 
              ...edge.data, 
              ...change.modified_data,
              changeType: 'modify' as ChangeType 
            },
          };
        }
      }
      return { ...edge, data: { ...edge.data, changeType: undefined } };
    });

    // Add new edges from changes
    changes
      .filter(c => c.change_type === 'add' && c.element_type === 'connection')
      .forEach(change => {
        if (change.modified_data) {
          const newEdge: Edge = {
            id: change.element_id,
            source: change.modified_data.source_node_id as string,
            target: change.modified_data.target_node_id as string,
            type: 'flowEdge',
            data: { 
              ...change.modified_data,
              changeType: 'add' as ChangeType 
            },
            markerEnd: { type: MarkerType.ArrowClosed },
          };
          updatedEdges.push(newEdge);
        }
      });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'flowEdge',
        data: { 
          flow_m3_day: 0, 
          medium: 'water',
          changeType: isScenarioMode ? 'add' as ChangeType : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Track as scenario change if in scenario mode
      if (isScenarioMode && selectedScenarioId && diagram) {
        const newChange: DiagramChange = {
          diagram_id: diagram.id,
          scenario_id: selectedScenarioId,
          change_type: 'add',
          element_type: 'connection',
          element_id: newEdge.id as string,
          modified_data: {
            source_node_id: params.source,
            target_node_id: params.target,
            flow_m3_day: 0,
            medium: 'water',
          },
        };
        setScenarioChanges(prev => [...prev, newChange]);
      }
    },
    [setEdges, isScenarioMode, selectedScenarioId, diagram]
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
        data: { 
          label: `Nuevo ${type}`, 
          nodeType: type, 
          data: {},
          changeType: isScenarioMode ? 'add' as ChangeType : undefined,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // Track as scenario change if in scenario mode
      if (isScenarioMode && selectedScenarioId && diagram) {
        const newChange: DiagramChange = {
          diagram_id: diagram.id,
          scenario_id: selectedScenarioId,
          change_type: 'add',
          element_type: 'node',
          element_id: id,
          modified_data: {
            label: `Nuevo ${type}`,
            nodeType: type,
            position,
          },
        };
        setScenarioChanges(prev => [...prev, newChange]);
      }
    },
    [reactFlowInstance, setNodes, isScenarioMode, selectedScenarioId, diagram]
  );

  const addAnnotation = useCallback(() => {
    const id = `annotation-${Date.now()}`;
    const position = reactFlowInstance?.screenToFlowPosition({ x: 300, y: 300 }) || { x: 300, y: 300 };

    const newNode: Node = {
      id,
      type: 'annotation',
      position,
      data: { 
        text: 'Nueva anotación', 
        annotationType: 'finding',
        changeType: isScenarioMode ? 'add' as ChangeType : undefined,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Track as scenario change if in scenario mode
    if (isScenarioMode && selectedScenarioId && diagram) {
      const newChange: DiagramChange = {
        diagram_id: diagram.id,
        scenario_id: selectedScenarioId,
        change_type: 'add',
        element_type: 'annotation',
        element_id: id,
        modified_data: {
          text: 'Nueva anotación',
          annotationType: 'finding',
          position,
        },
      };
      setScenarioChanges(prev => [...prev, newChange]);
    }
  }, [reactFlowInstance, setNodes, isScenarioMode, selectedScenarioId, diagram]);

  const updateNode = useCallback(
    (id: string, data: Partial<Node['data']>) => {
      const isBaselineNode = baselineNodes.some(n => n.id === id);
      
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            const updatedData = { ...node.data, ...data };
            // Mark as modified in scenario mode if it was a baseline node
            if (isScenarioMode && isBaselineNode && node.data.changeType !== 'add') {
              updatedData.changeType = 'modify';
            }
            return { ...node, data: updatedData };
          }
          return node;
        })
      );

      // Track as scenario change if in scenario mode
      if (isScenarioMode && selectedScenarioId && diagram && isBaselineNode) {
        const existingChange = scenarioChanges.find(c => c.element_id === id);
        const baselineNode = baselineNodes.find(n => n.id === id);
        
        if (existingChange) {
          setScenarioChanges(prev => prev.map(c => 
            c.element_id === id 
              ? { ...c, modified_data: { ...c.modified_data, ...data } }
              : c
          ));
        } else {
          const newChange: DiagramChange = {
            diagram_id: diagram.id,
            scenario_id: selectedScenarioId,
            change_type: 'modify',
            element_type: baselineNode?.type === 'annotation' ? 'annotation' : 'node',
            element_id: id,
            original_data: baselineNode?.data,
            modified_data: data,
          };
          setScenarioChanges(prev => [...prev, newChange]);
        }
      }

      setSelectedNode(null);
    },
    [setNodes, isScenarioMode, selectedScenarioId, diagram, baselineNodes, scenarioChanges]
  );

  const updateEdge = useCallback(
    (id: string, data: Partial<Edge['data']>) => {
      const isBaselineEdge = baselineEdges.some(e => e.id === id);

      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === id) {
            const updatedData = { ...edge.data, ...data };
            // Mark as modified in scenario mode if it was a baseline edge
            if (isScenarioMode && isBaselineEdge && edge.data?.changeType !== 'add') {
              updatedData.changeType = 'modify';
            }
            return { ...edge, data: updatedData };
          }
          return edge;
        })
      );

      // Track as scenario change if in scenario mode
      if (isScenarioMode && selectedScenarioId && diagram && isBaselineEdge) {
        const existingChange = scenarioChanges.find(c => c.element_id === id);
        const baselineEdge = baselineEdges.find(e => e.id === id);
        
        if (existingChange) {
          setScenarioChanges(prev => prev.map(c => 
            c.element_id === id 
              ? { ...c, modified_data: { ...c.modified_data, ...data } }
              : c
          ));
        } else {
          const newChange: DiagramChange = {
            diagram_id: diagram.id,
            scenario_id: selectedScenarioId,
            change_type: 'modify',
            element_type: 'connection',
            element_id: id,
            original_data: baselineEdge?.data,
            modified_data: data,
          };
          setScenarioChanges(prev => [...prev, newChange]);
        }
      }

      setSelectedEdge(null);
    },
    [setEdges, isScenarioMode, selectedScenarioId, diagram, baselineEdges, scenarioChanges]
  );

  const deleteNode = useCallback(
    (id: string) => {
      const isBaselineNode = baselineNodes.some(n => n.id === id);

      if (isScenarioMode && isBaselineNode) {
        // In scenario mode, mark as removed instead of deleting
        setNodes((nds) =>
          nds.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, changeType: 'remove' as ChangeType } } : node
          )
        );
        setEdges((eds) =>
          eds.map((edge) =>
            edge.source === id || edge.target === id
              ? { ...edge, data: { ...edge.data, changeType: 'remove' as ChangeType } }
              : edge
          )
        );

        // Track as scenario change
        if (selectedScenarioId && diagram) {
          const baselineNode = baselineNodes.find(n => n.id === id);
          const newChange: DiagramChange = {
            diagram_id: diagram.id,
            scenario_id: selectedScenarioId,
            change_type: 'remove',
            element_type: baselineNode?.type === 'annotation' ? 'annotation' : 'node',
            element_id: id,
            original_data: baselineNode?.data,
          };
          setScenarioChanges(prev => [...prev.filter(c => c.element_id !== id), newChange]);
        }
      } else {
        // Normal delete for non-baseline or non-scenario mode
        setNodes((nds) => nds.filter((node) => node.id !== id));
        setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
        
        // Remove from scenario changes if it was an added node
        if (isScenarioMode) {
          setScenarioChanges(prev => prev.filter(c => c.element_id !== id));
        }
      }
      setSelectedNode(null);
    },
    [setNodes, setEdges, isScenarioMode, selectedScenarioId, diagram, baselineNodes]
  );

  const deleteEdge = useCallback(
    (id: string) => {
      const isBaselineEdge = baselineEdges.some(e => e.id === id);

      if (isScenarioMode && isBaselineEdge) {
        // In scenario mode, mark as removed instead of deleting
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id ? { ...edge, data: { ...edge.data, changeType: 'remove' as ChangeType } } : edge
          )
        );

        // Track as scenario change
        if (selectedScenarioId && diagram) {
          const baselineEdge = baselineEdges.find(e => e.id === id);
          const newChange: DiagramChange = {
            diagram_id: diagram.id,
            scenario_id: selectedScenarioId,
            change_type: 'remove',
            element_type: 'connection',
            element_id: id,
            original_data: baselineEdge?.data,
          };
          setScenarioChanges(prev => [...prev.filter(c => c.element_id !== id), newChange]);
        }
      } else {
        // Normal delete for non-baseline or non-scenario mode
        setEdges((eds) => eds.filter((edge) => edge.id !== id));
        
        // Remove from scenario changes if it was an added edge
        if (isScenarioMode) {
          setScenarioChanges(prev => prev.filter(c => c.element_id !== id));
        }
      }
      setSelectedEdge(null);
    },
    [setEdges, isScenarioMode, selectedScenarioId, diagram, baselineEdges]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (isScenarioMode && selectedScenarioId && onSaveScenarioChanges) {
        // Save scenario changes
        await onSaveScenarioChanges(selectedScenarioId, scenarioChanges);
        toast.success('Cambios del escenario guardados');
      } else if (onSave) {
        // Save baseline diagram
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
      }
    } catch (error) {
      toast.error('Error al guardar');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, level, onSave, isScenarioMode, selectedScenarioId, scenarioChanges, onSaveScenarioChanges]);

  const handleExport = useCallback(() => {
    if (!reactFlowWrapper.current) return;

    toPng(reactFlowWrapper.current, {
      backgroundColor: '#ffffff',
      width: reactFlowWrapper.current.offsetWidth,
      height: reactFlowWrapper.current.offsetHeight,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const scenarioSuffix = selectedScenarioId ? `-escenario-${selectedScenarioId}` : '';
        link.download = `diagrama-${diagram?.id || 'nuevo'}${scenarioSuffix}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Imagen exportada correctamente');
      })
      .catch((error) => {
        toast.error('Error al exportar la imagen');
        console.error('Export error:', error);
      });
  }, [diagram?.id, selectedScenarioId]);

  // Use scenario-aware node/edge types when in scenario mode
  const activeNodeTypes = useMemo(() => isScenarioMode ? scenarioNodeTypes : nodeTypes, [isScenarioMode]);
  const activeEdgeTypes = useMemo(() => isScenarioMode ? scenarioEdgeTypes : edgeTypes, [isScenarioMode]);

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
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onScenarioChange={setSelectedScenarioId}
        isScenarioMode={isScenarioMode}
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
          nodeTypes={activeNodeTypes}
          edgeTypes={activeEdgeTypes}
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

        {isScenarioMode && <DiagramLegend />}

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
          isScenarioMode={isScenarioMode}
          scenarioChanges={scenarioChanges}
        />
      </div>
    </div>
  );
}
