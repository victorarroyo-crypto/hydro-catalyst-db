import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Scenario, scenarioTypeConfig } from './ScenarioCard';

interface ScenarioCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: Scenario[];
  isComparing: boolean;
  comparisonResult: any | null;
  onCompare: (scenarioIds: string[]) => void;
}

export const ScenarioCompareModal: React.FC<ScenarioCompareModalProps> = ({
  open,
  onOpenChange,
  scenarios,
  isComparing,
  comparisonResult,
  onCompare,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      onCompare(selectedIds);
    }
  };

  const selectedScenarios = scenarios.filter(s => selectedIds.includes(s.id));

  const formatNumber = (num: number | null, suffix = '') => {
    if (num === null || num === undefined) return '—';
    return `${num.toLocaleString('es-ES')}${suffix}`;
  };

  const getMaxValue = (key: keyof Scenario) => {
    const values = selectedScenarios
      .map(s => s[key] as number | null)
      .filter((v): v is number => v !== null);
    return Math.max(...values, 0);
  };

  const getMinValue = (key: keyof Scenario) => {
    const values = selectedScenarios
      .map(s => s[key] as number | null)
      .filter((v): v is number => v !== null);
    return Math.min(...values, Infinity);
  };

  const metrics: { key: keyof Scenario; label: string; suffix: string; higherIsBetter: boolean }[] = [
    { key: 'water_savings_m3', label: 'Ahorro de agua', suffix: ' m³/año', higherIsBetter: true },
    { key: 'cost_savings_eur', label: 'Ahorro de costes', suffix: ' €/año', higherIsBetter: true },
    { key: 'capex_total', label: 'CAPEX total', suffix: ' €', higherIsBetter: false },
    { key: 'payback_years', label: 'Payback', suffix: ' años', higherIsBetter: false },
    { key: 'roi_percent', label: 'ROI', suffix: '%', higherIsBetter: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Comparar Escenarios
          </DialogTitle>
        </DialogHeader>

        {selectedIds.length < 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona entre 2 y 4 escenarios para comparar:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map(scenario => {
                const typeConfig = scenarioTypeConfig[scenario.scenario_type] || scenarioTypeConfig.alternative;
                const isSelected = selectedIds.includes(scenario.id);
                
                return (
                  <div
                    key={scenario.id}
                    onClick={() => toggleSelection(scenario.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                      }
                      ${!isSelected && selectedIds.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{scenario.name}</p>
                      <Badge variant="outline" className={`text-xs ${typeConfig.className}`}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Seleccionados: {selectedIds.length}/4
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedIds([])}
              >
                ← Cambiar selección
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground min-w-[140px]">
                      Métrica
                    </th>
                    {selectedScenarios.map(scenario => {
                      const typeConfig = scenarioTypeConfig[scenario.scenario_type] || scenarioTypeConfig.alternative;
                      return (
                        <th key={scenario.id} className="text-left p-3 min-w-[150px]">
                          <div className="font-semibold">{scenario.name}</div>
                          <Badge variant="outline" className={`text-xs mt-1 ${typeConfig.className}`}>
                            {typeConfig.label}
                          </Badge>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(metric => {
                    const maxVal = getMaxValue(metric.key);
                    const minVal = getMinValue(metric.key);
                    
                    return (
                      <tr key={metric.key} className="border-b">
                        <td className="p-3 text-muted-foreground">{metric.label}</td>
                        {selectedScenarios.map(scenario => {
                          const value = scenario[metric.key] as number | null;
                          const isBest = value !== null && (
                            (metric.higherIsBetter && value === maxVal) ||
                            (!metric.higherIsBetter && value === minVal)
                          );
                          const isWorst = value !== null && (
                            (metric.higherIsBetter && value === minVal) ||
                            (!metric.higherIsBetter && value === maxVal)
                          );
                          
                          return (
                            <td key={scenario.id} className="p-3">
                              <div className={`flex items-center gap-1 ${isBest ? 'text-green-600 font-medium' : isWorst ? 'text-red-500' : ''}`}>
                                {isBest && <TrendingUp className="w-4 h-4" />}
                                {isWorst && selectedScenarios.length > 2 && <TrendingDown className="w-4 h-4" />}
                                {formatNumber(value, metric.suffix)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="p-3 text-muted-foreground">Mejoras incluidas</td>
                    {selectedScenarios.map(scenario => (
                      <td key={scenario.id} className="p-3 text-sm">
                        {scenario.included_improvements?.length || 0} mejoras
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {selectedIds.length >= 2 && (
            <Button onClick={handleCompare} disabled={isComparing}>
              {isComparing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Comparar en API
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
