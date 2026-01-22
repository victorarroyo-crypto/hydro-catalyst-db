/**
 * Taxonomy Subcategory Dropdown Selector
 * 
 * Compact dropdown version of the subcategory selector for edit forms.
 * Supports multi-select with primary marking, filtered by selected tipos.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { externalSupabase } from '@/integrations/supabase/externalClient';

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

interface TaxonomySubcategoryDropdownProps {
  selectedSubcategorias: SelectedSubcategoria[];
  onChange: (subcategorias: SelectedSubcategoria[]) => void;
  filterByTipoIds?: number[];
  disabled?: boolean;
}

export const TaxonomySubcategoryDropdown: React.FC<TaxonomySubcategoryDropdownProps> = ({
  selectedSubcategorias,
  onChange,
  filterByTipoIds = [],
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: allSubcategorias, isLoading } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('taxonomy_subcategorias')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

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
      if (newSubs.length > 0 && !newSubs.some((s) => s.is_primary)) {
        newSubs[0].is_primary = true;
      }
      onChange(newSubs);
    }
  };

  const handleSetPrimary = (subcategoriaId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(
      selectedSubcategorias.map((s) => ({
        ...s,
        is_primary: s.subcategoria_id === subcategoriaId,
      }))
    );
  };

  const removeSubcategory = (subcategoriaId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    handleSubcategoriaToggle(subcategoriaId, false);
  };

  const getSubcategoryName = (subcategoriaId: number) => {
    const sub = allSubcategorias?.find((s) => s.id === subcategoriaId);
    return sub ? `${sub.codigo} - ${sub.nombre}` : `ID: ${subcategoriaId}`;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-2 border rounded-md">Cargando subcategorías...</div>;
  }

  if (filterByTipoIds.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-2 border rounded-md bg-muted/30">
        Selecciona primero un tipo de tecnología
      </div>
    );
  }

  if (!filteredSubcategorias || filteredSubcategorias.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-2 border rounded-md bg-muted/30">
        No hay subcategorías para los tipos seleccionados
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className="w-full justify-between h-auto min-h-10 py-2"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedSubcategorias.length === 0 ? (
              <span className="text-muted-foreground">Seleccionar subcategorías...</span>
            ) : (
              selectedSubcategorias.map((ss) => (
                <Badge
                  key={ss.subcategoria_id}
                  variant={ss.is_primary ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {ss.is_primary && <Star className="w-3 h-3 fill-current" />}
                  {getSubcategoryName(ss.subcategoria_id)}
                  <button
                    type="button"
                    onClick={(e) => removeSubcategory(ss.subcategoria_id, e)}
                    className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ))
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="border rounded-md p-2 bg-background max-h-[200px] overflow-y-auto space-y-1">
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
                className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id={`subcat-drop-${sub.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    handleSubcategoriaToggle(sub.id, !!checked)
                  }
                  disabled={disabled}
                />
                <label
                  htmlFor={`subcat-drop-${sub.id}`}
                  className="text-sm font-medium leading-none flex-1 cursor-pointer"
                >
                  <span className="text-muted-foreground text-xs mr-1">{sub.codigo}</span>
                  {sub.nombre}
                </label>
                {isSelected && selectedSubcategorias.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleSetPrimary(sub.id, e)}
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
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
