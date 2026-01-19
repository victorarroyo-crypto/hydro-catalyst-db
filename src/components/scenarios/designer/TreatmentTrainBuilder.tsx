import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  Trash2,
  Droplets,
  ArrowRight
} from 'lucide-react';
import { TreatmentTrain, TechnologyConfig, TECHNOLOGY_TYPES } from '@/types/scenarioDesigner';
import TechnologyConfigPanel from './TechnologyConfigPanel';

interface TreatmentTrainBuilderProps {
  trains: TreatmentTrain[];
  onChange: (trains: TreatmentTrain[]) => void;
  isReadOnly?: boolean;
}

const TreatmentTrainBuilder: React.FC<TreatmentTrainBuilderProps> = ({
  trains,
  onChange,
  isReadOnly = false,
}) => {
  const [expandedTrains, setExpandedTrains] = useState<Set<string>>(new Set());
  const [editingTechId, setEditingTechId] = useState<string | null>(null);

  const toggleTrain = (id: string) => {
    const newExpanded = new Set(expandedTrains);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTrains(newExpanded);
  };

  const addTrain = () => {
    const newTrain: TreatmentTrain = {
      id: `train-${Date.now()}`,
      name: `Tren ${trains.length + 1}`,
      description: '',
      order: trains.length,
      capacity_m3_day: 1000,
      source_type: 'wastewater',
      target_use: 'riego',
      technologies: [],
    };
    onChange([...trains, newTrain]);
  };

  const updateTrain = (id: string, updates: Partial<TreatmentTrain>) => {
    onChange(trains.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTrain = (id: string) => {
    onChange(trains.filter(t => t.id !== id));
  };

  const addTechnology = (trainId: string) => {
    const train = trains.find(t => t.id === trainId);
    if (!train) return;

    const newTech: TechnologyConfig = {
      id: `tech-${Date.now()}`,
      technology_type: 'UF',
      name: 'Ultrafiltración',
      recovery_rate: 95,
      removal_efficiency: { TSS: 99, Turbidity: 99 },
      energy_consumption: 0.3,
      chemical_consumption: {},
      design_flow: train.capacity_m3_day,
      peak_factor: 1.5,
      hydraulic_retention_time: 0.5,
      capex: 50000,
      opex_per_m3: 0.15,
      maintenance_percent: 3,
      lifespan_years: 15,
      is_default: true,
      notes: '',
    };

    updateTrain(trainId, {
      technologies: [...train.technologies, newTech],
    });
  };

  const updateTechnology = (trainId: string, techId: string, updates: Partial<TechnologyConfig>) => {
    const train = trains.find(t => t.id === trainId);
    if (!train) return;

    const updatedTechs = train.technologies.map(tech =>
      tech.id === techId ? { ...tech, ...updates } : tech
    );
    updateTrain(trainId, { technologies: updatedTechs });
  };

  const deleteTechnology = (trainId: string, techId: string) => {
    const train = trains.find(t => t.id === trainId);
    if (!train) return;

    updateTrain(trainId, {
      technologies: train.technologies.filter(t => t.id !== techId),
    });
  };

  const sourceTypeLabels: Record<string, string> = {
    raw_water: 'Agua cruda',
    wastewater: 'Agua residual',
    recycled: 'Agua reciclada',
    rainwater: 'Agua de lluvia',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Trenes de Tratamiento</h3>
        {!isReadOnly && (
          <Button size="sm" variant="outline" onClick={addTrain}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tren
          </Button>
        )}
      </div>

      {trains.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay trenes de tratamiento configurados</p>
            {!isReadOnly && (
              <Button size="sm" variant="link" onClick={addTrain} className="mt-2">
                Agregar el primer tren
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trains.map((train, index) => (
            <Collapsible
              key={train.id}
              open={expandedTrains.has(train.id)}
              onOpenChange={() => toggleTrain(train.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {!isReadOnly && (
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      )}
                      {expandedTrains.has(train.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium">
                          {train.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {sourceTypeLabels[train.source_type]}
                          </Badge>
                          <ArrowRight className="h-3 w-3" />
                          <span>{train.target_use}</span>
                          <span className="ml-2">•</span>
                          <span>{train.capacity_m3_day.toLocaleString('es-ES')} m³/día</span>
                          <span className="ml-2">•</span>
                          <span>{train.technologies.length} tecnologías</span>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrain(train.id);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Train Configuration */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          value={train.name}
                          onChange={(e) => updateTrain(train.id, { name: e.target.value })}
                          disabled={isReadOnly}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Capacidad (m³/día)</Label>
                        <Input
                          type="number"
                          value={train.capacity_m3_day}
                          onChange={(e) => updateTrain(train.id, { capacity_m3_day: parseFloat(e.target.value) || 0 })}
                          disabled={isReadOnly}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Origen</Label>
                        <select
                          value={train.source_type}
                          onChange={(e) => updateTrain(train.id, { source_type: e.target.value as TreatmentTrain['source_type'] })}
                          disabled={isReadOnly}
                          className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                        >
                          <option value="raw_water">Agua cruda</option>
                          <option value="wastewater">Agua residual</option>
                          <option value="recycled">Reciclada</option>
                          <option value="rainwater">Pluvial</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Uso destino</Label>
                        <Input
                          value={train.target_use}
                          onChange={(e) => updateTrain(train.id, { target_use: e.target.value })}
                          disabled={isReadOnly}
                          className="h-8 text-sm"
                          placeholder="ej: riego, proceso..."
                        />
                      </div>
                    </div>

                    {/* Technologies */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Tecnologías en secuencia
                        </Label>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addTechnology(train.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Añadir
                          </Button>
                        )}
                      </div>

                      {train.technologies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Sin tecnologías configuradas
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {train.technologies.map((tech, techIndex) => (
                            <React.Fragment key={tech.id}>
                              {techIndex > 0 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <TechnologyConfigPanel
                                technology={tech}
                                onChange={(updates) => updateTechnology(train.id, tech.id, updates)}
                                onDelete={() => deleteTechnology(train.id, tech.id)}
                                isReadOnly={isReadOnly}
                                isEditing={editingTechId === tech.id}
                                onEditToggle={() => setEditingTechId(
                                  editingTechId === tech.id ? null : tech.id
                                )}
                              />
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreatmentTrainBuilder;
