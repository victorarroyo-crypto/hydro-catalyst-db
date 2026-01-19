import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { MEDIUM_CONFIG, MediumType } from './types';

interface CustomEdgeData {
  flow_m3_day: number;
  medium: MediumType;
}

export const FlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const mediumConfig = MEDIUM_CONFIG[data?.medium || 'water'];

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 3 : 2}
        stroke={mediumConfig.color}
        fill="none"
        markerEnd="url(#arrow)"
      />
      {data?.flow_m3_day !== undefined && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: mediumConfig.color }}
            >
              {data.flow_m3_day} m³/día
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

FlowEdge.displayName = 'FlowEdge';

export const edgeTypes = {
  flowEdge: FlowEdge,
};
