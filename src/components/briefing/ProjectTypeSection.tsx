import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectBriefing, ProjectType } from '@/types/briefing';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'diagnosis', label: 'Diagnóstico', description: 'Evaluación inicial del estado actual de los sistemas de agua' },
  { value: 'optimization', label: 'Optimización', description: 'Mejorar eficiencia de sistemas existentes' },
  { value: 'compliance', label: 'Cumplimiento Normativo', description: 'Adaptación a nuevas normativas o resolución de incumplimientos' },
  { value: 'expansion', label: 'Ampliación', description: 'Aumentar capacidad de tratamiento o producción' },
  { value: 'zld_mld', label: 'ZLD/MLD', description: 'Implementación de Zero/Minimum Liquid Discharge' },
  { value: 'new_plant', label: 'Nueva Planta', description: 'Diseño de sistemas para nueva instalación' },
  { value: 'audit', label: 'Auditoría', description: 'Auditoría ambiental o de eficiencia hídrica' },
  { value: 'feasibility', label: 'Estudio de Viabilidad', description: 'Análisis de viabilidad técnico-económica' },
  { value: 'other', label: 'Otro', description: 'Tipo de proyecto no listado (especificar abajo)' },
];

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function ProjectTypeSection({ briefing, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Tipo de Proyecto</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona el tipo de proyecto que mejor describe tu necesidad
        </p>
      </div>

      <RadioGroup
        value={briefing.project_type}
        onValueChange={(value: ProjectType) =>
          onChange({ ...briefing, project_type: value })
        }
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {PROJECT_TYPES.map(type => (
          <div key={type.value} className="relative">
            <RadioGroupItem
              value={type.value}
              id={type.value}
              className="peer sr-only"
            />
            <Label
              htmlFor={type.value}
              className="flex flex-col p-4 border rounded-lg cursor-pointer
                peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                hover:bg-muted transition-colors"
            >
              <span className="font-medium">{type.label}</span>
              <span className="text-xs text-muted-foreground">{type.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {briefing.project_type === 'other' && (
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="project_type_other">Describe el tipo de proyecto</Label>
          <Textarea
            id="project_type_other"
            placeholder="Ej: Proyecto piloto para prueba de nueva tecnología de tratamiento..."
            value={briefing.project_type_other || ''}
            onChange={(e) => onChange({ ...briefing, project_type_other: e.target.value })}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
