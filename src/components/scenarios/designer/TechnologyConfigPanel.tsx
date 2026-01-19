import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Trash2, 
  Zap,
  DollarSign
} from 'lucide-react';
import { TechnologyConfig, TECHNOLOGY_TYPES } from '@/types/scenarioDesigner';
import { cn } from '@/lib/utils';

interface TechnologyConfigPanelProps {
  technology: TechnologyConfig;
  onChange: (updates: Partial<TechnologyConfig>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
  isEditing?: boolean;
  onEditToggle?: () => void;
}

const TechnologyConfigPanel: React.FC<TechnologyConfigPanelProps> = ({
  technology,
  onChange,
  onDelete,
  isReadOnly = false,
  isEditing = false,
  onEditToggle,
}) => {
  const techType = TECHNOLOGY_TYPES.find(t => t.type === technology.technology_type);
  const categoryColors: Record<string, string> = {
    biological: 'bg-green-100 text-green-700 border-green-200',
    membrane: 'bg-blue-100 text-blue-700 border-blue-200',
    disinfection: 'bg-purple-100 text-purple-700 border-purple-200',
    physical: 'bg-amber-100 text-amber-700 border-amber-200',
    chemical: 'bg-pink-100 text-pink-700 border-pink-200',
    adsorption: 'bg-orange-100 text-orange-700 border-orange-200',
    thermal: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Popover open={isEditing} onOpenChange={(open) => !open && onEditToggle?.()}>
      <PopoverTrigger asChild>
        <button
          onClick={onEditToggle}
          disabled={isReadOnly}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
            'hover:bg-muted/50',
            isEditing && 'ring-2 ring-primary',
            categoryColors[techType?.category || 'physical']
          )}
        >
          <span className="font-medium text-sm">{technology.technology_type}</span>
          <span className="text-xs opacity-75">{technology.recovery_rate}%</span>
          {!isReadOnly && <Settings className="h-3 w-3 opacity-50" />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Configuración de Tecnología</h4>
            {!isReadOnly && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Technology Type Selector */}
          <div>
            <Label className="text-xs">Tipo de tecnología</Label>
            <Select
              value={technology.technology_type}
              onValueChange={(value) => {
                const selected = TECHNOLOGY_TYPES.find(t => t.type === value);
                onChange({
                  technology_type: value,
                  name: selected?.label || value,
                });
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TECHNOLOGY_TYPES.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Performance Parameters */}
          <div className="border-t pt-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
              <Zap className="h-3 w-3" />
              Rendimientos
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Recuperación (%)</Label>
                <Input
                  type="number"
                  value={technology.recovery_rate}
                  onChange={(e) => onChange({ recovery_rate: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label className="text-xs">Consumo energía (kWh/m³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={technology.energy_consumption}
                  onChange={(e) => onChange({ energy_consumption: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Caudal diseño (m³/día)</Label>
                <Input
                  type="number"
                  value={technology.design_flow}
                  onChange={(e) => onChange({ design_flow: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Factor punta</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={technology.peak_factor}
                  onChange={(e) => onChange({ peak_factor: parseFloat(e.target.value) || 1 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cost Parameters */}
          <div className="border-t pt-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
              <DollarSign className="h-3 w-3" />
              Costes
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">CAPEX (€)</Label>
                <Input
                  type="number"
                  value={technology.capex}
                  onChange={(e) => onChange({ capex: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">OPEX (€/m³)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={technology.opex_per_m3}
                  onChange={(e) => onChange({ opex_per_m3: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Mantenimiento (% CAPEX/año)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={technology.maintenance_percent}
                  onChange={(e) => onChange({ maintenance_percent: parseFloat(e.target.value) || 0 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Vida útil (años)</Label>
                <Input
                  type="number"
                  value={technology.lifespan_years}
                  onChange={(e) => onChange({ lifespan_years: parseInt(e.target.value) || 10 })}
                  disabled={isReadOnly}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {technology.is_default && (
            <Badge variant="secondary" className="text-xs">
              Valores por defecto
            </Badge>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TechnologyConfigPanel;
