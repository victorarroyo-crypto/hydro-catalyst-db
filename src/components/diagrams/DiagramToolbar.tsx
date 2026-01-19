import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MessageSquarePlus, Save, Download, ZoomIn, ZoomOut, Maximize2, Layers } from 'lucide-react';
import { NODE_TYPE_CONFIG, NodeType, DiagramLevel, Scenario } from './types';

interface DiagramToolbarProps {
  level: DiagramLevel;
  onLevelChange: (level: DiagramLevel) => void;
  onAddNode: (type: NodeType) => void;
  onAddAnnotation: () => void;
  onSave: () => void;
  onExport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  isSaving?: boolean;
  // Scenario support
  scenarios?: Scenario[];
  selectedScenarioId?: string | null;
  onScenarioChange?: (scenarioId: string | null) => void;
  isScenarioMode?: boolean;
}

const LEVEL_LABELS: Record<DiagramLevel, string> = {
  0: 'Nivel 0 - Planta Completa',
  1: 'Nivel 1 - Subsistema',
  2: 'Nivel 2 - Equipo',
};

export function DiagramToolbar({
  level,
  onLevelChange,
  onAddNode,
  onAddAnnotation,
  onSave,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitView,
  isSaving,
  scenarios = [],
  selectedScenarioId,
  onScenarioChange,
  isScenarioMode = false,
}: DiagramToolbarProps) {
  return (
    <div className="flex flex-col border-b bg-muted/30">
      {/* Main toolbar row */}
      <div className="flex items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2">
          <Select
            value={level.toString()}
            onValueChange={(v) => onLevelChange(parseInt(v) as DiagramLevel)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{LEVEL_LABELS[0]}</SelectItem>
              <SelectItem value="1">{LEVEL_LABELS[1]}</SelectItem>
              <SelectItem value="2">{LEVEL_LABELS[2]}</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Añadir Nodo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.entries(NODE_TYPE_CONFIG) as [NodeType, typeof NODE_TYPE_CONFIG[NodeType]][]).map(
                ([type, config]) => (
                  <DropdownMenuItem key={type} onClick={() => onAddNode(type)}>
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="gap-2" onClick={onAddAnnotation}>
            <MessageSquarePlus className="w-4 h-4" />
            Anotación
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="w-4 h-4" />
            Exportar
          </Button>

          <Button size="sm" className="gap-2" onClick={onSave} disabled={isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : isScenarioMode ? 'Guardar Cambios' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Scenario selector row */}
      {scenarios.length > 0 && onScenarioChange && (
        <div className="flex items-center gap-3 px-3 pb-3 pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span>Vista de escenario:</span>
          </div>
          <Select
            value={selectedScenarioId || 'baseline'}
            onValueChange={(v) => onScenarioChange(v === 'baseline' ? null : v)}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Seleccionar escenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baseline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Base</Badge>
                  Baseline (sin cambios)
                </div>
              </SelectItem>
              <DropdownMenuSeparator />
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{
                        borderColor: getScenarioColor(scenario.scenario_type),
                        color: getScenarioColor(scenario.scenario_type),
                      }}
                    >
                      {getScenarioLabel(scenario.scenario_type)}
                    </Badge>
                    {scenario.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isScenarioMode && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-300">
              Modo Escenario - Los cambios se guardan como delta
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function getScenarioColor(type: string): string {
  const colors: Record<string, string> = {
    baseline: '#3b82f6',
    conservative: '#22c55e',
    moderate: '#eab308',
    transformational: '#a855f7',
    alternative: '#6b7280',
  };
  return colors[type] || colors.alternative;
}

function getScenarioLabel(type: string): string {
  const labels: Record<string, string> = {
    baseline: 'Base',
    conservative: 'Conservador',
    moderate: 'Moderado',
    transformational: 'Transformacional',
    alternative: 'Alternativo',
  };
  return labels[type] || type;
}
