import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const NODE_STYLES: Record<string, { background: string; border: string; color: string }> = {
  input:    { background: '#32b4cd', border: '#2a96ab', color: '#ffffff' },
  output:   { background: '#8cb63c', border: '#749832', color: '#ffffff' },
  process:  { background: '#307177', border: '#265a5f', color: '#ffffff' },
  storage:  { background: '#ffa720', border: '#d98d1a', color: '#ffffff' },
  chemical: { background: '#f5f5f5', border: '#cccccc', color: '#333333' },
  split:    { background: '#ffffff', border: '#307177', color: '#307177' },
  merge:    { background: '#ffffff', border: '#307177', color: '#307177' },
};

export interface ReactFlowData {
  title?: string;
  direction?: 'LR' | 'TD';
  nodes: Array<{ id: string; label: string; type?: string }>;
  edges: Array<{ source: string; target: string; label?: string }>;
}

function getLayoutedElements(nodes: Node[], edges: Edge[], direction: 'LR' | 'TD' = 'LR') {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction === 'LR' ? 'LR' : 'TB',
    nodesep: 60,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => g.setNode(node.id, { width: 160, height: 60 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  const isHorizontal = direction === 'LR';
  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 80, y: pos.y - 30 },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
    };
  });

  return { nodes: layoutedNodes, edges };
}

function convertToReactFlow(data: ReactFlowData) {
  const nodes: Node[] = data.nodes.map((n) => {
    const style = NODE_STYLES[n.type || 'process'] || NODE_STYLES.process;
    const isSplitMerge = n.type === 'split' || n.type === 'merge';

    return {
      id: n.id,
      data: { label: n.label.replace(/\\n/g, '\n') },
      position: { x: 0, y: 0 },
      style: {
        background: style.background,
        border: `2px ${isSplitMerge ? 'dashed' : 'solid'} ${style.border}`,
        color: style.color,
        borderRadius: isSplitMerge ? '50%' : '8px',
        padding: isSplitMerge ? '8px' : '12px 16px',
        fontSize: '13px',
        fontFamily: "'Proxima Nova', 'Helvetica Neue', sans-serif",
        textAlign: 'center' as const,
        whiteSpace: 'pre-line' as const,
        minWidth: isSplitMerge ? '50px' : '120px',
        width: isSplitMerge ? '60px' : undefined,
        height: isSplitMerge ? '60px' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    };
  });

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#307177' },
    style: { stroke: '#307177', strokeWidth: 2 },
    labelStyle: { fontSize: '11px', fill: '#666' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
  }));

  return getLayoutedElements(nodes, edges, data.direction || 'LR');
}

interface ReactFlowDiagramProps {
  data: ReactFlowData;
}

export function ReactFlowDiagram({ data }: ReactFlowDiagramProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => convertToReactFlow(data),
    [data]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  // Calculate dynamic height based on node positions
  const maxY = Math.max(...nodes.map((n) => n.position.y), 0) + 100;
  const height = Math.max(200, Math.min(500, maxY + 80));

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      {data.title && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <h4 className="text-sm font-semibold text-foreground">{data.title}</h4>
        </div>
      )}
      <div style={{ height: `${height}px`, width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          preventScrolling={false}
        >
          <Background color="#e0e0e0" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default ReactFlowDiagram;
