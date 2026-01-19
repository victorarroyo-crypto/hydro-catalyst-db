import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Star, StarOff, Flag } from 'lucide-react';

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  scenario_type: 'baseline' | 'conservative' | 'moderate' | 'transformational' | 'alternative';
  is_baseline: boolean;
  is_recommended: boolean;
  included_improvements: string[] | null;
  water_savings_m3: number | null;
  cost_savings_eur: number | null;
  capex_total: number | null;
  payback_years: number | null;
  roi_percent: number | null;
  created_at: string;
}

const scenarioTypeConfig: Record<string, { label: string; className: string }> = {
  baseline: { 
    label: 'Baseline', 
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
  },
  conservative: { 
    label: 'Conservador', 
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
  },
  moderate: { 
    label: 'Moderado', 
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
  },
  transformational: { 
    label: 'Transformacional', 
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
  },
  alternative: { 
    label: 'Alternativo', 
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800' 
  },
};

interface ScenarioCardProps {
  scenario: Scenario;
  onEdit: (scenario: Scenario) => void;
  onDelete: (id: string) => void;
  onSetRecommended: (id: string, recommended: boolean) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onEdit,
  onDelete,
  onSetRecommended,
}) => {
  const typeConfig = scenarioTypeConfig[scenario.scenario_type] || scenarioTypeConfig.alternative;

  const formatNumber = (num: number | null, suffix = '') => {
    if (num === null || num === undefined) return '—';
    return `${num.toLocaleString('es-ES')}${suffix}`;
  };

  return (
    <Card className={`card-hover relative ${scenario.is_recommended ? 'ring-2 ring-primary' : ''}`}>
      {scenario.is_recommended && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Recomendado
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1 flex items-center gap-2">
              {scenario.name}
              {scenario.is_baseline && (
                <Flag className="w-3.5 h-3.5 text-blue-500" />
              )}
            </CardTitle>
          </div>
          <Badge variant="outline" className={typeConfig.className}>
            {typeConfig.label}
          </Badge>
        </div>
        {scenario.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {scenario.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <p className="text-muted-foreground text-xs">Ahorro agua</p>
            <p className="font-medium">{formatNumber(scenario.water_savings_m3, ' m³')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Ahorro costes</p>
            <p className="font-medium">{formatNumber(scenario.cost_savings_eur, ' €')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">CAPEX</p>
            <p className="font-medium">{formatNumber(scenario.capex_total, ' €')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">ROI</p>
            <p className="font-medium">{formatNumber(scenario.roi_percent, '%')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(scenario)}
            className="flex-1"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetRecommended(scenario.id, !scenario.is_recommended)}
            className="flex-1"
          >
            {scenario.is_recommended ? (
              <>
                <StarOff className="w-3.5 h-3.5 mr-1" />
                Quitar
              </>
            ) : (
              <>
                <Star className="w-3.5 h-3.5 mr-1" />
                Recomendar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(scenario.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { scenarioTypeConfig };
