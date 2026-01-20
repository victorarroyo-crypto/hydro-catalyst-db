import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProjectBriefing, ScopeArea, ProjectScope } from '@/types/briefing';
import {
  Droplets, Factory, Thermometer, Flame,
  Waves, Trash2, AlertTriangle, Recycle,
  Layers, Zap, MoreHorizontal
} from 'lucide-react';

const SCOPE_AREAS: {
  key: keyof ProjectScope;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { key: 'water_supply', label: 'Captación de Agua', icon: Droplets, description: 'Red municipal, pozos, otras fuentes' },
  { key: 'process_water', label: 'Agua de Proceso', icon: Factory, description: 'Agua utilizada en producción' },
  { key: 'cooling_systems', label: 'Torres de Refrigeración', icon: Thermometer, description: 'Sistemas de refrigeración evaporativos' },
  { key: 'boiler_steam', label: 'Calderas y Vapor', icon: Flame, description: 'Generación de vapor, agua de alimentación' },
  { key: 'wastewater_treatment', label: 'Tratamiento de Aguas Residuales', icon: Waves, description: 'PTAR, tratamiento biológico/físico-químico' },
  { key: 'sludge_management', label: 'Gestión de Lodos', icon: Layers, description: 'Deshidratación, disposición, valorización' },
  { key: 'hazardous_waste', label: 'Residuos Peligrosos', icon: AlertTriangle, description: 'Residuos clasificados como peligrosos (HP)' },
  { key: 'non_hazardous_waste', label: 'Residuos No Peligrosos', icon: Trash2, description: 'Residuos industriales no peligrosos' },
  { key: 'reuse_recycling', label: 'Reúso y Reciclaje', icon: Recycle, description: 'Estrategias de reutilización de agua' },
  { key: 'ro_membranes', label: 'Ósmosis Inversa / Membranas', icon: Layers, description: 'Sistemas de membranas (RO, UF, NF, MBR)' },
  { key: 'energy_water_nexus', label: 'Nexo Agua-Energía', icon: Zap, description: 'Eficiencia energética, huella de carbono' },
  { key: 'other', label: 'Otros', icon: MoreHorizontal, description: 'Especificar en notas' },
];

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function ScopeSection({ briefing, onChange }: Props) {
  const updateScopeArea = (key: keyof ProjectScope, field: keyof ScopeArea, value: boolean | string) => {
    onChange({
      ...briefing,
      scope_areas: {
        ...briefing.scope_areas,
        [key]: {
          ...briefing.scope_areas[key],
          [field]: value,
        },
      },
    });
  };

  const enabledCount = Object.values(briefing.scope_areas).filter(a => a.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Alcance del Proyecto</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona las áreas que estarán incluidas en el análisis.
          <span className="ml-2 font-medium">{enabledCount} áreas seleccionadas</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCOPE_AREAS.map(area => {
          const Icon = area.icon;
          const scopeArea = briefing.scope_areas[area.key];

          return (
            <div
              key={area.key}
              className={`border rounded-lg p-4 transition-colors
                ${scopeArea.enabled ? 'border-primary bg-primary/5' : 'border-border'}
              `}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={area.key}
                  checked={scopeArea.enabled}
                  onCheckedChange={(checked) =>
                    updateScopeArea(area.key, 'enabled', !!checked)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor={area.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{area.label}</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {area.description}
                  </p>

                  {scopeArea.enabled && (
                    <Input
                      placeholder="Notas adicionales (opcional)"
                      value={scopeArea.notes}
                      onChange={(e) => updateScopeArea(area.key, 'notes', e.target.value)}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
