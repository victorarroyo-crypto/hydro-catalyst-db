/**
 * Taxonomy Type Dropdown Selector
 * 
 * Compact dropdown version of the type selector for edit forms.
 * Supports multi-select with primary marking.
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

interface TaxonomyTypeDropdownProps {
  selectedTipos: SelectedTipo[];
  onChange: (tipos: SelectedTipo[]) => void;
  disabled?: boolean;
}

export const TaxonomyTypeDropdown: React.FC<TaxonomyTypeDropdownProps> = ({
  selectedTipos,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
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
      if (newTipos.length > 0 && !newTipos.some((t) => t.is_primary)) {
        newTipos[0].is_primary = true;
      }
      onChange(newTipos);
    }
  };

  const handleSetPrimary = (tipoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(
      selectedTipos.map((t) => ({
        ...t,
        is_primary: t.tipo_id === tipoId,
      }))
    );
  };

  const removeType = (tipoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    handleTipoToggle(tipoId, false);
  };

  const getTypeName = (tipoId: number) => {
    return tipos?.find((t) => t.id === tipoId)?.nombre || `ID: ${tipoId}`;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-2 border rounded-md">Cargando tipos...</div>;
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
            {selectedTipos.length === 0 ? (
              <span className="text-muted-foreground">Seleccionar tipos...</span>
            ) : (
              selectedTipos.map((st) => (
                <Badge
                  key={st.tipo_id}
                  variant={st.is_primary ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {st.is_primary && <Star className="w-3 h-3 fill-current" />}
                  {getTypeName(st.tipo_id)}
                  <button
                    type="button"
                    onClick={(e) => removeType(st.tipo_id, e)}
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
          {tipos?.map((tipo) => {
            const isSelected = selectedTipos.some((t) => t.tipo_id === tipo.id);
            const isPrimary = selectedTipos.find((t) => t.tipo_id === tipo.id)?.is_primary;

            return (
              <div
                key={tipo.id}
                className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id={`tipo-drop-${tipo.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleTipoToggle(tipo.id, !!checked)}
                  disabled={disabled}
                />
                <label
                  htmlFor={`tipo-drop-${tipo.id}`}
                  className="text-sm font-medium leading-none flex-1 cursor-pointer"
                >
                  {tipo.nombre}
                </label>
                {isSelected && selectedTipos.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleSetPrimary(tipo.id, e)}
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
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
