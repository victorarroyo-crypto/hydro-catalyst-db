import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface SelectedTipo {
  tipo_id: number;
  is_primary: boolean;
}

interface TaxonomyTypeSelectorProps {
  selectedTipos: SelectedTipo[];
  onChange: (tipos: SelectedTipo[]) => void;
  disabled?: boolean;
}

export const TaxonomyTypeSelector: React.FC<TaxonomyTypeSelectorProps> = ({
  selectedTipos,
  onChange,
  disabled = false,
}) => {
  const { data: tipos, isLoading } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  const handleTipoToggle = (tipoId: number, checked: boolean) => {
    if (disabled) return;
    
    if (checked) {
      const isFirst = selectedTipos.length === 0;
      onChange([...selectedTipos, { tipo_id: tipoId, is_primary: isFirst }]);
    } else {
      const newTipos = selectedTipos.filter((t) => t.tipo_id !== tipoId);
      // If we removed the primary, set first remaining as primary
      if (newTipos.length > 0 && !newTipos.some((t) => t.is_primary)) {
        newTipos[0].is_primary = true;
      }
      onChange(newTipos);
    }
  };

  const handleSetPrimary = (tipoId: number) => {
    if (disabled) return;
    onChange(
      selectedTipos.map((t) => ({
        ...t,
        is_primary: t.tipo_id === tipoId,
      }))
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando tipos...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {tipos?.map((tipo) => {
          const isSelected = selectedTipos.some((t) => t.tipo_id === tipo.id);
          const isPrimary = selectedTipos.find((t) => t.tipo_id === tipo.id)?.is_primary;

          return (
            <div
              key={tipo.id}
              className={`flex items-center space-x-2 p-2 rounded-md border transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-primary/30'
                  : 'hover:bg-muted/50 border-transparent'
              }`}
            >
              <Checkbox
                id={`tipo-${tipo.id}`}
                checked={isSelected}
                onCheckedChange={(checked) => handleTipoToggle(tipo.id, !!checked)}
                disabled={disabled}
              />
              <label
                htmlFor={`tipo-${tipo.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
              >
                {tipo.nombre}
              </label>
              {isSelected && selectedTipos.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(tipo.id)}
                  className="p-1 hover:bg-muted rounded"
                  title={isPrimary ? 'Principal' : 'Marcar como principal'}
                  disabled={disabled}
                >
                  <Star
                    className={`w-3 h-3 ${
                      isPrimary ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                  />
                </button>
              )}
              {isPrimary && selectedTipos.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  Principal
                </Badge>
              )}
            </div>
          );
        })}
      </div>
      {selectedTipos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Selecciona al menos un tipo de tecnología
        </p>
      )}
    </div>
  );
};
