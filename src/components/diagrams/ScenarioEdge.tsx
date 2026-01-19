import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { MEDIUM_CONFIG, MediumType, ChangeType, CHANGE_TYPE_CONFIG } from './types';

interface ScenarioEdgeData {
  flow_m3_day: number;
  medium: MediumType;
  changeType?: ChangeType;
}

export const ScenarioFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ScenarioEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const mediumConfig = MEDIUM_CONFIG[data?.medium || 'water'];
  const changeConfig = data?.changeType ? CHANGE_TYPE_CONFIG[data.changeType] : null;
  const strokeColor = changeConfig?.borderColor || mediumConfig.color;
  const isRemoved = data?.changeType === 'remove';

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 4 : 3}
        stroke={strokeColor}
        fill="none"
        markerEnd="url(#arrow)"
        strokeDasharray={isRemoved ? '8 4' : undefined}
        opacity={isRemoved ? 0.5 : 1}
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
              className={`px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm ${
                isRemoved ? 'line-through opacity-50' : ''
              }`}
              style={{ backgroundColor: strokeColor }}
            >
              {data.flow_m3_day} m³/día
              {changeConfig && (
                <span className="ml-1 opacity-75">({changeConfig.label})</span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

ScenarioFlowEdge.displayName = 'ScenarioFlowEdge';

export const scenarioEdgeTypes = {
  flowEdge: ScenarioFlowEdge,
};
