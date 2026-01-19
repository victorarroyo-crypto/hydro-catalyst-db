import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  ChevronDown, 
  ChevronUp,
  GitBranch,
  ArrowRight,
  Trash2,
  X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { TreatmentTrain } from '@/types/scenarioDesigner';

interface TreatmentTrainBuilderProps {
  trains: TreatmentTrain[];
  onTrainsChange?: (trains: TreatmentTrain[]) => void;
  onChange?: (trains: TreatmentTrain[]) => void; // Alias for compatibility
  onTechnologyClick?: (trainId: string, stageIndex: number) => void;
  readOnly?: boolean;
  isReadOnly?: boolean; // Alias for compatibility
}

const STAGE_TYPES = [
  { value: 'MBR', label: 'MBR', color: 'bg-blue-500', description: 'Biorreactor de Membrana' },
  { value: 'RO', label: 'Ósmosis Inversa', color: 'bg-purple-500', description: 'Eliminación de sales y contaminantes disueltos' },
  { value: 'UF', label: 'Ultrafiltración', color: 'bg-cyan-500', description: 'Filtración por membrana 0.01-0.1 µm' },
  { value: 'UV', label: 'UV', color: 'bg-yellow-500', description: 'Desinfección ultravioleta' },
  { value: 'OZONE', label: 'Ozono', color: 'bg-orange-500', description: 'Oxidación avanzada con ozono' },
  { value: 'EVAP', label: 'Evaporador', color: 'bg-red-500', description: 'Concentración por evaporación' },
  { value: 'CRYST', label: 'Cristalizador', color: 'bg-pink-500', description: 'Recuperación de sales sólidas' },
  { value: 'DAF', label: 'DAF', color: 'bg-emerald-500', description: 'Flotación por aire disuelto' },
  { value: 'CHEM', label: 'Químico', color: 'bg-amber-500', description: 'Tratamiento químico' },
  { value: 'BIO', label: 'Biológico', color: 'bg-green-500', description: 'Tratamiento biológico' },
];

const TreatmentTrainBuilder: React.FC<TreatmentTrainBuilderProps> = ({
  trains,
  onTrainsChange,
  onChange,
  onTechnologyClick,
  readOnly = false,
  isReadOnly = false,
}) => {
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null);
  
  // Support both prop names
  const isDisabled = readOnly || isReadOnly;
  const handleChange = (updated: TreatmentTrain[]) => {
    onTrainsChange?.(updated);
    onChange?.(updated);
  };

  const addTrain = () => {
    const newTrain: TreatmentTrain = {
      id: `TT-${Date.now()}`,
      name: `Tren ${trains.length + 1}`,
      stages: [],
      inlet_stream: 'Agua Residual',
      outlet_quality: 'Agua Tratada',
      design_capacity_m3_day: 0,
    };
    handleChange([...trains, newTrain]);
    setExpandedTrain(newTrain.id);
  };

  const updateTrainName = (trainId: string, name: string) => {
    const updated = trains.map(t =>
      t.id === trainId ? { ...t, name } : t
    );
    handleChange(updated);
  };

  const updateTrainCapacity = (trainId: string, capacity: number) => {
    const updated = trains.map(t =>
      t.id === trainId ? { ...t, design_capacity_m3_day: capacity } : t
    );
    handleChange(updated);
  };

  const deleteTrain = (trainId: string) => {
    handleChange(trains.filter(t => t.id !== trainId));
    if (expandedTrain === trainId) {
      setExpandedTrain(null);
    }
  };

  const addStage = (trainId: string, stageType: string) => {
    const updated = trains.map(t => {
      if (t.id === trainId) {
        const currentStages = t.stages || [];
        return { ...t, stages: [...currentStages, stageType] };
      }
      return t;
    });
    handleChange(updated);
  };

  const removeStage = (trainId: string, stageIndex: number) => {
    const updated = trains.map(t => {
      if (t.id === trainId) {
        const newStages = [...(t.stages || [])];
        newStages.splice(stageIndex, 1);
        return { ...t, stages: newStages };
      }
      return t;
    });
    handleChange(updated);
  };

  const moveStage = (trainId: string, fromIndex: number, toIndex: number) => {
    if (toIndex < 0) return;
    const updated = trains.map(t => {
      if (t.id === trainId) {
        const newStages = [...(t.stages || [])];
        const maxIndex = newStages.length - 1;
        const clampedTo = Math.min(toIndex, maxIndex);
        const [movedStage] = newStages.splice(fromIndex, 1);
        newStages.splice(clampedTo, 0, movedStage);
        return { ...t, stages: newStages };
      }
      return t;
    });
    handleChange(updated);
  };

  const getStageInfo = (stageType: string) => {
    return STAGE_TYPES.find(s => s.value === stageType) || {
      value: stageType,
      label: stageType,
      color: 'bg-slate-500',
      description: 'Tecnología personalizada',
    };
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Trenes de Tratamiento
          </h3>
          <span className="text-sm text-muted-foreground">
            {trains.length}/5 trenes
          </span>
        </div>

        {trains.map((train) => {
          const stages = train.stages || [];
          
          return (
            <Card key={train.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Header del tren */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <Input
                      value={train.name}
                      onChange={(e) => updateTrainName(train.id, e.target.value)}
                      className="w-48 h-8 font-medium"
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={train.design_capacity_m3_day || train.capacity_m3_day || 0}
                        onChange={(e) => updateTrainCapacity(train.id, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        disabled={isDisabled}
                      />
                      <span className="text-sm text-muted-foreground">m³/día</span>
                    </div>
                    {!isDisabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTrain(train.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTrain(
                        expandedTrain === train.id ? null : train.id
                      )}
                      className="h-8"
                    >
                      {expandedTrain === train.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Visualización del tren como secuencia horizontal */}
                <div className="flex items-center gap-2 overflow-x-auto py-3 px-2 bg-muted/30 rounded-lg">
                  {/* Entrada */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center min-w-[100px] h-12 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg text-xs font-medium text-green-700 dark:text-green-300 cursor-default">
                        {train.inlet_stream || train.source_type || 'Entrada'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Flujo de entrada al tren de tratamiento</p>
                    </TooltipContent>
                  </Tooltip>

                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Etapas del tren */}
                  {stages.length === 0 ? (
                    <div className="flex items-center justify-center min-w-[120px] h-12 border-2 border-dashed border-muted-foreground/30 rounded-lg text-xs text-muted-foreground">
                      Sin etapas
                    </div>
                  ) : (
                    stages.map((stage, idx) => {
                      const stageInfo = getStageInfo(stage);
                      return (
                        <React.Fragment key={`${train.id}-stage-${idx}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <Button
                                  variant="outline"
                                  className={`min-w-[80px] h-12 ${stageInfo.color} text-white border-none hover:opacity-90 transition-opacity`}
                                  onClick={() => !isDisabled && onTechnologyClick?.(train.id, idx)}
                                  disabled={isDisabled}
                                >
                                  {stage}
                                </Button>
                                {!isDisabled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeStage(train.id, idx);
                                    }}
                                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">{stageInfo.label}</p>
                                <p className="text-xs text-muted-foreground">{stageInfo.description}</p>
                                {!isDisabled && (
                                  <p className="text-xs mt-1 text-primary">Click para configurar</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Salida */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center min-w-[100px] h-12 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 cursor-default">
                        {train.outlet_quality || train.target_use || 'Salida'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Flujo de salida del tren de tratamiento</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Panel expandido para agregar etapas */}
                {expandedTrain === train.id && !isDisabled && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Agregar etapa al tren:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_TYPES.map((type) => (
                        <Tooltip key={type.value}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addStage(train.id, type.value)}
                              className="h-9"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {type.value}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs">{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Botón para agregar nuevo tren */}
        {!isDisabled && trains.length < 5 && (
          <Button variant="outline" onClick={addTrain} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tren de Tratamiento
          </Button>
        )}

        {trains.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay trenes de tratamiento configurados</p>
              {!isDisabled && (
                <Button size="sm" variant="link" onClick={addTrain} className="mt-2">
                  Agregar el primer tren
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TreatmentTrainBuilder;
