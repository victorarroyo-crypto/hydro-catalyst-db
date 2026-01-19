import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Droplets, Filter, Database, GitBranch, ArrowRightFromLine, Cog } from 'lucide-react';
import { NODE_TYPE_CONFIG, NodeType } from './types';

const iconMap = {
  Droplets,
  Filter,
  Database,
  GitBranch,
  ArrowRightFromLine,
  Cog,
};

interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  data?: Record<string, unknown>;
}

export const DiagramCustomNode = memo(({ data, selected }: NodeProps<CustomNodeData>) => {
  const config = NODE_TYPE_CONFIG[data.nodeType] || NODE_TYPE_CONFIG.equipment;
  const IconComponent = iconMap[config.icon as keyof typeof iconMap] || Cog;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md bg-background min-w-[120px] transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{ borderColor: config.color }}
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
          <span className="text-sm font-medium truncate max-w-[100px]">{data.label}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-muted-foreground"
      />
    </div>
  );
});

DiagramCustomNode.displayName = 'DiagramCustomNode';

export const AnnotationNode = memo(({ data, selected }: NodeProps<{ text: string; annotationType: string }>) => {
  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    finding: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
    opportunity: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    risk: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  };

  const colors = typeColors[data.annotationType] || typeColors.finding;

  return (
    <div
      className={`px-3 py-2 rounded border-2 shadow-sm max-w-[200px] ${colors.bg} ${colors.border} ${
        selected ? 'ring-2 ring-primary ring-offset-1' : ''
      }`}
    >
      <p className={`text-xs ${colors.text}`}>{data.text}</p>
    </div>
  );
});

AnnotationNode.displayName = 'AnnotationNode';

export const nodeTypes = {
  customNode: DiagramCustomNode,
  annotation: AnnotationNode,
};
