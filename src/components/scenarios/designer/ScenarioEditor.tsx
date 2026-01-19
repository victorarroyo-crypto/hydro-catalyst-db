import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  RefreshCw, 
  Trash2, 
  Lock,
  Info,
  Target,
  GitBranch,
  Sparkles
} from 'lucide-react';
import { 
  ScenarioDesign, 
  ScenarioType, 
  SCENARIO_TYPE_CONFIG,
  TreatmentTrain 
} from '@/types/scenarioDesigner';
import TreatmentTrainBuilder from './TreatmentTrainBuilder';

interface ScenarioEditorProps {
  scenario: ScenarioDesign;
  onChange: (updates: Partial<ScenarioDesign>) => void;
  onSave: () => void;
  onRecalculate: () => void;
  onDelete: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  isRecalculating?: boolean;
}

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  onChange,
  onSave,
  onRecalculate,
  onDelete,
  isDirty = false,
  isSaving = false,
  isRecalculating = false,
}) => {
  const isBaseline = scenario.is_baseline;

  const updateObjectives = (field: string, value: any) => {
    onChange({
      objectives: {
        ...scenario.objectives,
        [field]: value,
      },
    });
  };

  const handleTrainsChange = (trains: TreatmentTrain[]) => {
    onChange({ treatment_trains: trains });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBaseline && (
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              <Lock className="h-3 w-3 mr-1" />
              Solo lectura
            </Badge>
          )}
          {scenario.is_ai_generated && (
            <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          )}
          {isDirty && (
            <Badge variant="secondary" className="text-amber-600">
              Cambios sin guardar
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRecalculate}
            disabled={isBaseline || isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isBaseline || !isDirty || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
          {!isBaseline && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="info" className="h-full">
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="info" className="gap-2">
                <Info className="h-4 w-4" />
                Información
              </TabsTrigger>
              <TabsTrigger value="objectives" className="gap-2">
                <Target className="h-4 w-4" />
                Objetivos
              </TabsTrigger>
              <TabsTrigger value="trains" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Trenes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Info Tab */}
          <TabsContent value="info" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre del escenario</Label>
                <Input
                  id="name"
                  value={scenario.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  disabled={isBaseline}
                  placeholder="Ej: Escenario de máximo reciclaje"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de escenario</Label>
                <Select
                  value={scenario.scenario_type}
                  onValueChange={(value: ScenarioType) => onChange({ scenario_type: value })}
                  disabled={isBaseline}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCENARIO_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado</Label>
                <div className="flex gap-2 mt-2">
                  <Badge variant={scenario.is_recommended ? 'default' : 'outline'}>
                    {scenario.is_recommended ? '⭐ Recomendado' : 'No recomendado'}
                  </Badge>
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={scenario.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  disabled={isBaseline}
                  rows={2}
                  placeholder="Describe el escenario..."
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="methodology">Metodología</Label>
                <Textarea
                  id="methodology"
                  value={scenario.methodology || ''}
                  onChange={(e) => onChange({ methodology: e.target.value })}
                  disabled={isBaseline}
                  rows={3}
                  placeholder="Describe la metodología aplicada..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Objectives Tab */}
          <TabsContent value="objectives" className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Objetivo Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={scenario.objectives?.main_objective || ''}
                  onChange={(e) => updateObjectives('main_objective', e.target.value)}
                  disabled={isBaseline}
                  rows={2}
                  placeholder="Ej: Reducir el consumo de agua de red en un 40%"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Objetivos Secundarios</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={scenario.objectives?.secondary_objectives?.join('\n') || ''}
                  onChange={(e) => updateObjectives('secondary_objectives', e.target.value.split('\n').filter(Boolean))}
                  disabled={isBaseline}
                  rows={3}
                  placeholder="Un objetivo por línea..."
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Metas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Ahorro agua objetivo (%)</Label>
                    <Input
                      type="number"
                      value={scenario.objectives?.target_water_savings || 0}
                      onChange={(e) => updateObjectives('target_water_savings', parseFloat(e.target.value) || 0)}
                      disabled={isBaseline}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ahorro costes objetivo (%)</Label>
                    <Input
                      type="number"
                      value={scenario.objectives?.target_cost_savings || 0}
                      onChange={(e) => updateObjectives('target_cost_savings', parseFloat(e.target.value) || 0)}
                      disabled={isBaseline}
                      className="h-8"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Restricciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">CAPEX máximo (€)</Label>
                    <Input
                      type="number"
                      value={scenario.objectives?.max_capex || 0}
                      onChange={(e) => updateObjectives('max_capex', parseFloat(e.target.value) || 0)}
                      disabled={isBaseline}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Payback máximo (años)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={scenario.objectives?.max_payback_years || 0}
                      onChange={(e) => updateObjectives('max_payback_years', parseFloat(e.target.value) || 0)}
                      disabled={isBaseline}
                      className="h-8"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Otras Restricciones</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={scenario.objectives?.constraints?.join('\n') || ''}
                  onChange={(e) => updateObjectives('constraints', e.target.value.split('\n').filter(Boolean))}
                  disabled={isBaseline}
                  rows={3}
                  placeholder="Una restricción por línea..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment Trains Tab */}
          <TabsContent value="trains" className="p-4">
            <TreatmentTrainBuilder
              trains={scenario.treatment_trains || []}
              onChange={handleTrainsChange}
              isReadOnly={isBaseline}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScenarioEditor;
