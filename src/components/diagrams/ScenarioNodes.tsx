import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Droplets, Filter, Database, GitBranch, ArrowRightFromLine, Cog } from 'lucide-react';
import { NODE_TYPE_CONFIG, NodeType, ChangeType, CHANGE_TYPE_CONFIG } from './types';

const iconMap = {
  Droplets,
  Filter,
  Database,
  GitBranch,
  ArrowRightFromLine,
  Cog,
};

interface ScenarioNodeData {
  label: string;
  nodeType: NodeType;
  data?: Record<string, unknown>;
  changeType?: ChangeType;
}

export const ScenarioCustomNode = memo(({ data, selected }: NodeProps<ScenarioNodeData>) => {
  const config = NODE_TYPE_CONFIG[data.nodeType] || NODE_TYPE_CONFIG.equipment;
  const IconComponent = iconMap[config.icon as keyof typeof iconMap] || Cog;
  const changeConfig = data.changeType ? CHANGE_TYPE_CONFIG[data.changeType] : null;

  const borderColor = changeConfig?.borderColor || config.color;
  const bgColor = changeConfig?.bgColor || 'var(--background)';
  const isRemoved = data.changeType === 'remove';

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[120px] transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${isRemoved ? 'opacity-50' : ''}`}
      style={{ 
        borderColor,
        backgroundColor: bgColor,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-muted-foreground"
      />
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 rounded"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <IconComponent className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{config.label}</span>
          <span 
            className={`text-sm font-medium truncate max-w-[100px] ${isRemoved ? 'line-through' : ''}`}
          >
            {data.label}
          </span>
        </div>
      </div>
      {changeConfig && (
        <div 
          className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ 
            backgroundColor: changeConfig.borderColor,
            color: 'white',
          }}
        >
          {changeConfig.label}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-muted-foreground"
      />
    </div>
  );
});

ScenarioCustomNode.displayName = 'ScenarioCustomNode';

interface ScenarioAnnotationData {
  text: string;
  annotationType: string;
  changeType?: ChangeType;
}

export const ScenarioAnnotationNode = memo(({ data, selected }: NodeProps<ScenarioAnnotationData>) => {
  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    finding: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
    opportunity: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    risk: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  };

  const colors = typeColors[data.annotationType] || typeColors.finding;
  const changeConfig = data.changeType ? CHANGE_TYPE_CONFIG[data.changeType] : null;
  const isRemoved = data.changeType === 'remove';

  return (
    <div
      className={`px-3 py-2 rounded shadow-sm max-w-[200px] relative ${colors.bg} ${
        selected ? 'ring-2 ring-primary ring-offset-1' : ''
      } ${isRemoved ? 'opacity-50' : ''}`}
      style={{
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: changeConfig?.borderColor || undefined,
      }}
    >
      <p className={`text-xs ${colors.text} ${isRemoved ? 'line-through' : ''}`}>{data.text}</p>
      {changeConfig && (
        <div 
          className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ 
            backgroundColor: changeConfig.borderColor,
            color: 'white',
          }}
        >
          {changeConfig.label}
        </div>
      )}
    </div>
  );
});

ScenarioAnnotationNode.displayName = 'ScenarioAnnotationNode';

export const scenarioNodeTypes = {
  customNode: ScenarioCustomNode,
  annotation: ScenarioAnnotationNode,
};
