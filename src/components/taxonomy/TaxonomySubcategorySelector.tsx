import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TaxonomySubcategoria {
  id: number;
  tipo_id: number;
  codigo: string;
  nombre: string;
}

export interface SelectedSubcategoria {
  subcategoria_id: number;
  is_primary: boolean;
}

interface TaxonomySubcategorySelectorProps {
  selectedSubcategorias: SelectedSubcategoria[];
  onChange: (subcategorias: SelectedSubcategoria[]) => void;
  filterByTipoIds?: number[];
  disabled?: boolean;
}

export const TaxonomySubcategorySelector: React.FC<TaxonomySubcategorySelectorProps> = ({
  selectedSubcategorias,
  onChange,
  filterByTipoIds = [],
  disabled = false,
}) => {
  const { data: allSubcategorias, isLoading } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_subcategorias')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

  // Filter subcategories based on selected tipos
  const filteredSubcategorias = filterByTipoIds.length > 0
    ? allSubcategorias?.filter((sub) => filterByTipoIds.includes(sub.tipo_id))
    : allSubcategorias;

  const handleSubcategoriaToggle = (subcategoriaId: number, checked: boolean) => {
    if (disabled) return;
    
    if (checked) {
      const isFirst = selectedSubcategorias.length === 0;
      onChange([
        ...selectedSubcategorias,
        { subcategoria_id: subcategoriaId, is_primary: isFirst },
      ]);
    } else {
      const newSubs = selectedSubcategorias.filter(
        (s) => s.subcategoria_id !== subcategoriaId
      );
      // If we removed the primary, set first remaining as primary
      if (newSubs.length > 0 && !newSubs.some((s) => s.is_primary)) {
        newSubs[0].is_primary = true;
      }
      onChange(newSubs);
    }
  };

  const handleSetPrimary = (subcategoriaId: number) => {
    if (disabled) return;
    onChange(
      selectedSubcategorias.map((s) => ({
        ...s,
        is_primary: s.subcategoria_id === subcategoriaId,
      }))
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando subcategorías...</div>;
  }

  if (filterByTipoIds.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-2 border rounded-md bg-muted/30">
        Selecciona primero un tipo de tecnología para ver las subcategorías disponibles
      </div>
    );
  }

  if (!filteredSubcategorias || filteredSubcategorias.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-2 border rounded-md bg-muted/30">
        No hay subcategorías disponibles para los tipos seleccionados
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
        {filteredSubcategorias.map((sub) => {
          const isSelected = selectedSubcategorias.some(
            (s) => s.subcategoria_id === sub.id
          );
          const isPrimary = selectedSubcategorias.find(
            (s) => s.subcategoria_id === sub.id
          )?.is_primary;

          return (
            <div
              key={sub.id}
              className={`flex items-center space-x-2 p-2 rounded-md border transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-primary/30'
                  : 'hover:bg-muted/50 border-transparent'
              }`}
            >
              <Checkbox
                id={`subcategoria-${sub.id}`}
                checked={isSelected}
                onCheckedChange={(checked) =>
                  handleSubcategoriaToggle(sub.id, !!checked)
                }
                disabled={disabled}
              />
              <label
                htmlFor={`subcategoria-${sub.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
              >
                <span className="text-muted-foreground text-xs mr-1">
                  {sub.codigo}
                </span>
                {sub.nombre}
              </label>
              {isSelected && selectedSubcategorias.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(sub.id)}
                  className="p-1 hover:bg-muted rounded"
                  title={isPrimary ? 'Principal' : 'Marcar como principal'}
                  disabled={disabled}
                >
                  <Star
                    className={`w-3 h-3 ${
                      isPrimary
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              )}
              {isPrimary && selectedSubcategorias.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  Principal
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
