import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectBriefing, CapexPreference } from '@/types/briefing';
import { Plus, X } from 'lucide-react';

const CAPEX_OPTIONS: { value: CapexPreference; label: string; description: string }[] = [
  {
    value: 'zero_or_minimum',
    label: 'CAPEX Cero o Mínimo',
    description: 'Sin inversión de capital o muy limitada (<5.000€). Solo mejoras operativas y quick wins.'
  },
  {
    value: 'limited',
    label: 'Inversión Limitada',
    description: 'Presupuesto limitado (5.000€ - 50.000€). Mejoras moderadas.'
  },
  {
    value: 'flexible',
    label: 'Flexible según ROI',
    description: 'Dispuesto a invertir si el retorno es atractivo (payback <3 años).'
  },
  {
    value: 'investment_ready',
    label: 'Preparado para Invertir',
    description: 'Presupuesto disponible para proyectos mayores (>100.000€).'
  },
];

const COMMON_OPERATIONAL = [
  'Sin paradas de producción',
  'Mantener calidad de producto actual',
  'No afectar procesos críticos',
  'Operación 24/7',
];

const COMMON_TECHNICAL = [
  'Espacio físico limitado',
  'Sin personal técnico adicional',
  'Integración con sistemas existentes',
  'Tecnología probada (TRL 9)',
];

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function ConstraintsSection({ briefing, onChange }: Props) {
  const [newOperational, setNewOperational] = useState('');
  const [newTechnical, setNewTechnical] = useState('');

  const addConstraint = (type: 'operational' | 'technical', value: string) => {
    if (!value.trim()) return;

    const key = type === 'operational' ? 'operational_constraints' : 'technical_constraints';
    const current = briefing.constraints[key] || [];

    if (!current.includes(value)) {
      onChange({
        ...briefing,
        constraints: {
          ...briefing.constraints,
          [key]: [...current, value],
        },
      });
    }

    if (type === 'operational') setNewOperational('');
    else setNewTechnical('');
  };

  const removeConstraint = (type: 'operational' | 'technical', value: string) => {
    const key = type === 'operational' ? 'operational_constraints' : 'technical_constraints';
    const current = briefing.constraints[key] || [];

    onChange({
      ...briefing,
      constraints: {
        ...briefing.constraints,
        [key]: current.filter(c => c !== value),
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-2">Restricciones y Preferencias</h2>
        <p className="text-sm text-muted-foreground">
          Define las limitaciones que deben considerar los agentes al proponer soluciones
        </p>
      </div>

      {/* CAPEX Preference */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Preferencia de Inversión (CAPEX)</Label>

        <RadioGroup
          value={briefing.constraints.capex_preference}
          onValueChange={(value: CapexPreference) =>
            onChange({
              ...briefing,
              constraints: { ...briefing.constraints, capex_preference: value }
            })
          }
          className="grid grid-cols-1 gap-3"
        >
          {CAPEX_OPTIONS.map(option => (
            <div key={option.value} className="relative">
              <RadioGroupItem
                value={option.value}
                id={`capex-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`capex-${option.value}`}
                className="flex flex-col p-4 border rounded-lg cursor-pointer
                  peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                  hover:bg-muted transition-colors"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {(briefing.constraints.capex_preference === 'limited' ||
          briefing.constraints.capex_preference === 'investment_ready') && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="capex_max">Presupuesto máximo aproximado</Label>
            <div className="flex items-center gap-2">
              <Input
                id="capex_max"
                type="number"
                placeholder="50000"
                value={briefing.constraints.capex_max_eur || ''}
                onChange={(e) => onChange({
                  ...briefing,
                  constraints: {
                    ...briefing.constraints,
                    capex_max_eur: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <Label htmlFor="timeline">Plazo de implementación deseado</Label>
        <div className="flex items-center gap-2">
          <Input
            id="timeline"
            type="number"
            placeholder="12"
            value={briefing.constraints.timeline_months || ''}
            onChange={(e) => onChange({
              ...briefing,
              constraints: {
                ...briefing.constraints,
                timeline_months: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">meses</span>
        </div>
      </div>

      {/* Operational Constraints */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Restricciones Operativas</Label>

        <div className="flex flex-wrap gap-2">
          {COMMON_OPERATIONAL.map(c => (
            <Button
              key={c}
              variant="outline"
              size="sm"
              onClick={() => addConstraint('operational', c)}
              disabled={briefing.constraints.operational_constraints?.includes(c)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {c}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {briefing.constraints.operational_constraints?.map(c => (
            <Badge key={c} variant="secondary" className="pl-2">
              {c}
              <button
                onClick={() => removeConstraint('operational', c)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Agregar otra restricción operativa..."
            value={newOperational}
            onChange={(e) => setNewOperational(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addConstraint('operational', newOperational)}
          />
          <Button variant="outline" onClick={() => addConstraint('operational', newOperational)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Technical Constraints */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Restricciones Técnicas</Label>

        <div className="flex flex-wrap gap-2">
          {COMMON_TECHNICAL.map(c => (
            <Button
              key={c}
              variant="outline"
              size="sm"
              onClick={() => addConstraint('technical', c)}
              disabled={briefing.constraints.technical_constraints?.includes(c)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {c}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {briefing.constraints.technical_constraints?.map(c => (
            <Badge key={c} variant="secondary" className="pl-2">
              {c}
              <button
                onClick={() => removeConstraint('technical', c)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Agregar otra restricción técnica..."
            value={newTechnical}
            onChange={(e) => setNewTechnical(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addConstraint('technical', newTechnical)}
          />
          <Button variant="outline" onClick={() => addConstraint('technical', newTechnical)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
