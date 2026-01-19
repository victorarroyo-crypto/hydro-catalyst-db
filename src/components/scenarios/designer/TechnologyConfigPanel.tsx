import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Settings, Save, Info } from 'lucide-react';

// New interface for the enhanced technology configuration
export interface TechnologyConfigData {
  id: string;
  technology_id?: string;
  name: string;
  position_in_train?: string;
  performance: {
    removal_dbo?: number;
    removal_dqo?: number;
    removal_sst?: number;
    removal_nt?: number;
    recovery_percent?: number;
    [key: string]: number | undefined;
  };
  design_params: {
    inlet_flow_m3_day?: number;
    outlet_flow_m3_day?: number;
    concentrate_m3_day?: number;
    [key: string]: number | undefined;
  };
  costs: {
    capex_eur?: number;
    opex_eur_m3?: number;
    energy_kwh_m3?: number;
  };
  notes?: string;
}

export interface TechnologyDefaults {
  typical_performance: {
    removal_dbo_percent?: { min?: number; max?: number; typical?: number };
    removal_dqo_percent?: { min?: number; max?: number; typical?: number };
    removal_sst_percent?: { min?: number; max?: number; typical?: number };
    recovery_percent?: { min?: number; max?: number; typical?: number };
  };
  cost_references: {
    capex_eur_m3_day?: { min?: number; max?: number; typical?: number };
    opex_eur_m3?: { min?: number; max?: number; typical?: number };
    energy_kwh_m3?: { min?: number; max?: number; typical?: number };
  };
}

interface TechnologyConfigPanelProps {
  technology: TechnologyConfigData;
  defaults?: TechnologyDefaults;
  open: boolean;
  onSave: (tech: TechnologyConfigData) => void;
  onClose: () => void;
}

const TechnologyConfigPanel: React.FC<TechnologyConfigPanelProps> = ({
  technology,
  defaults,
  open,
  onSave,
  onClose,
}) => {
  const [config, setConfig] = useState<TechnologyConfigData>(technology);
  const [activeTab, setActiveTab] = useState('performance');

  // Reset config when technology changes
  useEffect(() => {
    setConfig(technology);
  }, [technology]);

  // Load default values if available and not already set
  useEffect(() => {
    if (defaults && config.performance.recovery_percent === undefined) {
      setConfig(prev => ({
        ...prev,
        performance: {
          removal_dbo: defaults.typical_performance.removal_dbo_percent?.typical ?? 95,
          removal_dqo: defaults.typical_performance.removal_dqo_percent?.typical ?? 90,
          removal_sst: defaults.typical_performance.removal_sst_percent?.typical ?? 99,
          recovery_percent: defaults.typical_performance.recovery_percent?.typical ?? 95,
          ...prev.performance,
        },
        costs: {
          capex_eur: prev.costs.capex_eur,
          opex_eur_m3: defaults.cost_references.opex_eur_m3?.typical ?? 0.15,
          energy_kwh_m3: defaults.cost_references.energy_kwh_m3?.typical ?? 0.5,
          ...prev.costs,
        },
      }));
    }
  }, [defaults]);

  const handlePerformanceChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value },
    }));
  };

  const handleDesignChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      design_params: { ...prev.design_params, [key]: value },
    }));
  };

  const handleCostChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      costs: { ...prev.costs, [key]: value },
    }));
  };

  // Auto-calculate outlet and concentrate flows
  useEffect(() => {
    const inlet = config.design_params.inlet_flow_m3_day || 0;
    const recovery = config.performance.recovery_percent || 95;
    
    if (inlet > 0) {
      const outlet = inlet * (recovery / 100);
      const concentrate = inlet - outlet;

      setConfig(prev => ({
        ...prev,
        design_params: {
          ...prev.design_params,
          outlet_flow_m3_day: Math.round(outlet * 10) / 10,
          concentrate_m3_day: Math.round(concentrate * 10) / 10,
        },
      }));
    }
  }, [config.design_params.inlet_flow_m3_day, config.performance.recovery_percent]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {config.name}
          </SheetTitle>
          <SheetDescription>
            Configure rendimientos, parámetros de diseño y costos
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="design">Diseño</TabsTrigger>
            <TabsTrigger value="costs">Costos</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-5 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Remoción DBO (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[config.performance.removal_dbo ?? 95]}
                    onValueChange={([v]) => handlePerformanceChange('removal_dbo', v)}
                    max={100}
                    min={0}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="w-14 text-right font-medium text-sm">
                    {config.performance.removal_dbo ?? 95}%
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Remoción DQO (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[config.performance.removal_dqo ?? 90]}
                    onValueChange={([v]) => handlePerformanceChange('removal_dqo', v)}
                    max={100}
                    min={0}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="w-14 text-right font-medium text-sm">
                    {config.performance.removal_dqo ?? 90}%
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Remoción SST (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[config.performance.removal_sst ?? 99]}
                    onValueChange={([v]) => handlePerformanceChange('removal_sst', v)}
                    max={100}
                    min={0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="w-14 text-right font-medium text-sm">
                    {config.performance.removal_sst ?? 99}%
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Remoción NT (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[config.performance.removal_nt ?? 80]}
                    onValueChange={([v]) => handlePerformanceChange('removal_nt', v)}
                    max={100}
                    min={0}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-14 text-right font-medium text-sm">
                    {config.performance.removal_nt ?? 80}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="text-sm font-medium">Recuperación de agua (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[config.performance.recovery_percent ?? 95]}
                    onValueChange={([v]) => handlePerformanceChange('recovery_percent', v)}
                    max={100}
                    min={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-14 text-right font-bold text-primary">
                    {config.performance.recovery_percent ?? 95}%
                  </span>
                </div>
              </div>
            </div>

            {defaults && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Valores típicos: Remoción DBO {defaults.typical_performance.removal_dbo_percent?.typical ?? 95}%,
                  Recuperación {defaults.typical_performance.recovery_percent?.typical ?? 95}%
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium">Caudal de entrada (m³/día)</Label>
              <Input
                type="number"
                value={config.design_params.inlet_flow_m3_day ?? 0}
                onChange={(e) => handleDesignChange('inlet_flow_m3_day', parseFloat(e.target.value) || 0)}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Caudal de salida (m³/día)</Label>
                <Input
                  type="number"
                  value={config.design_params.outlet_flow_m3_day ?? 0}
                  disabled
                  className="mt-2 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculado automáticamente
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Concentrado (m³/día)</Label>
                <Input
                  type="number"
                  value={config.design_params.concentrate_m3_day ?? 0}
                  disabled
                  className="mt-2 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Rechazo / purga
                </p>
              </div>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Los caudales de salida y concentrado se calculan automáticamente según el % de recuperación configurado en la pestaña de Rendimiento.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium">CAPEX (€)</Label>
              <Input
                type="number"
                value={config.costs.capex_eur ?? 0}
                onChange={(e) => handleCostChange('capex_eur', parseFloat(e.target.value) || 0)}
                className="mt-2"
                placeholder="Inversión inicial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">OPEX (€/m³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.costs.opex_eur_m3 ?? 0}
                  onChange={(e) => handleCostChange('opex_eur_m3', parseFloat(e.target.value) || 0)}
                  className="mt-2"
                  placeholder="Coste operativo"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Energía (kWh/m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.costs.energy_kwh_m3 ?? 0}
                  onChange={(e) => handleCostChange('energy_kwh_m3', parseFloat(e.target.value) || 0)}
                  className="mt-2"
                  placeholder="Consumo energético"
                />
              </div>
            </div>

            {defaults && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Costos típicos: CAPEX {defaults.cost_references.capex_eur_m3_day?.typical ?? 'N/A'} €/m³·día,
                  OPEX {defaults.cost_references.opex_eur_m3?.typical ?? 'N/A'} €/m³
                </AlertDescription>
              </Alert>
            )}

            {config.design_params.inlet_flow_m3_day && config.design_params.inlet_flow_m3_day > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm font-medium">Resumen de costos estimados:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">OPEX anual:</span>
                  <span className="font-medium text-right">
                    €{((config.costs.opex_eur_m3 ?? 0) * (config.design_params.inlet_flow_m3_day ?? 0) * 365).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-muted-foreground">Energía anual:</span>
                  <span className="font-medium text-right">
                    {((config.costs.energy_kwh_m3 ?? 0) * (config.design_params.inlet_flow_m3_day ?? 0) * 365).toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Label className="text-sm font-medium">Notas del consultor</Label>
          <Textarea
            value={config.notes ?? ''}
            onChange={(e) => setConfig(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Justificación de parámetros, referencias bibliográficas, supuestos..."
            rows={3}
            className="mt-2"
          />
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Configuración
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default TechnologyConfigPanel;
