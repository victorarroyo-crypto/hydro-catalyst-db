import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { SUBSECTORES_INDUSTRIALES } from '@/constants/taxonomyData';

interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface TaxonomySectorSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  subsectorValue?: string | null;
  onSubsectorChange?: (value: string) => void;
  showSubsector?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const TaxonomySectorSelector: React.FC<TaxonomySectorSelectorProps> = ({
  value,
  onChange,
  subsectorValue,
  onSubsectorChange,
  showSubsector = true,
  placeholder = 'Seleccionar sector',
  disabled = false,
}) => {
  const { data: sectores, isLoading } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  // Show subsector only if sector is "IND" (Industrial)
  const showSubsectorField = showSubsector && value === 'IND';

  return (
    <div className="space-y-4">
      <Select
        value={value || ''}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Cargando...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {sectores?.map((sector) => (
            <SelectItem key={sector.id} value={sector.id}>
              <span className="font-medium">{sector.nombre}</span>
              {sector.descripcion && (
                <span className="text-muted-foreground text-xs ml-2">
                  ({sector.descripcion})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showSubsectorField && onSubsectorChange && (
        <div className="space-y-2">
          <Label className="text-sm">Subsector Industrial</Label>
          <Select
            value={subsectorValue || ''}
            onValueChange={onSubsectorChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar subsector" />
            </SelectTrigger>
            <SelectContent>
              {SUBSECTORES_INDUSTRIALES.map((subsector) => (
                <SelectItem key={subsector} value={subsector}>
                  {subsector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
