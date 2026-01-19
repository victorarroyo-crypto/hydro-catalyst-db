import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Flag, 
  Star, 
  Sparkles, 
  Lock,
  Layers
} from 'lucide-react';
import { ScenarioDesign, SCENARIO_TYPE_CONFIG } from '@/types/scenarioDesigner';
import { cn } from '@/lib/utils';

interface ScenarioListProps {
  scenarios: ScenarioDesign[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  maxScenarios?: number;
}

const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  selectedId,
  onSelect,
  onCreateNew,
  maxScenarios = 6,
}) => {
  const canCreate = scenarios.length < maxScenarios;

  return (
    <div className="h-full flex flex-col border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Escenarios
          </h3>
          <Badge variant="secondary" className="text-xs">
            {scenarios.length}/{maxScenarios}
          </Badge>
        </div>
        <Button
          onClick={onCreateNew}
          disabled={!canCreate}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Escenario
        </Button>
        {!canCreate && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Máximo de escenarios alcanzado
          </p>
        )}
      </div>

      {/* Scenario List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {scenarios.map((scenario) => {
            const typeConfig = SCENARIO_TYPE_CONFIG[scenario.scenario_type];
            const isSelected = selectedId === scenario.id;

            return (
              <button
                key={scenario.id}
                onClick={() => onSelect(scenario.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  'hover:bg-muted/50',
                  isSelected && 'bg-primary/10 border border-primary/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {scenario.is_baseline && (
                        <Lock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm truncate">
                        {scenario.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          `bg-${typeConfig.color}-100 text-${typeConfig.color}-700 border-${typeConfig.color}-200`,
                          `dark:bg-${typeConfig.color}-900/30 dark:text-${typeConfig.color}-300 dark:border-${typeConfig.color}-800`
                        )}
                      >
                        {typeConfig.label}
                      </Badge>
                      {scenario.is_ai_generated && (
                        <Sparkles className="h-3 w-3 text-purple-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {scenario.is_recommended && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                    {scenario.is_baseline && (
                      <Flag className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </div>
                </div>
                {scenario.financials && (
                  <div className="mt-2 text-xs text-muted-foreground flex gap-3">
                    <span>€{scenario.financials.total_capex.toLocaleString('es-ES')}</span>
                    <span>{scenario.financials.roi_percent?.toFixed(0)}% ROI</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScenarioList;
