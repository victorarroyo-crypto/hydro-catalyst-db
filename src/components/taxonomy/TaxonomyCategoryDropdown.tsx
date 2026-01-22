/**
 * Taxonomy Category Dropdown Selector
 * 
 * First level of the 3-level taxonomy hierarchy.
 * Categories use codes (TAP, TAR, etc.) and must be selected
 * before Types can be chosen.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Loader2, Layers } from 'lucide-react';
import { useTaxonomy3Levels } from '@/hooks/useTaxonomy3Levels';

export interface SelectedCategoria {
  codigo: string;
  nombre: string;
}

interface TaxonomyCategoryDropdownProps {
  selectedCategorias: SelectedCategoria[];
  onChange: (categorias: SelectedCategoria[]) => void;
  disabled?: boolean;
}

export const TaxonomyCategoryDropdown: React.FC<TaxonomyCategoryDropdownProps> = ({
  selectedCategorias,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { taxonomyData, isLoading, getAllCategorias } = useTaxonomy3Levels();

  const categorias = React.useMemo(() => getAllCategorias(), [taxonomyData]);

  const handleCategoriaToggle = (codigo: string, nombre: string, checked: boolean) => {
    if (disabled) return;
    
    if (checked) {
      onChange([...selectedCategorias, { codigo, nombre }]);
    } else {
      onChange(selectedCategorias.filter((c) => c.codigo !== codigo));
    }
  };

  const removeCategoria = (codigo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedCategorias.filter((c) => c.codigo !== codigo));
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando categorías...
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
            {selectedCategorias.length === 0 ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="w-4 h-4" />
                Seleccionar categorías...
              </span>
            ) : (
              selectedCategorias.map((cat) => (
                <Badge
                  key={cat.codigo}
                  variant="default"
                  className="flex items-center gap-1"
                >
                  <span className="font-mono text-xs">{cat.codigo}</span>
                  {cat.nombre}
                  <button
                    type="button"
                    onClick={(e) => removeCategoria(cat.codigo, e)}
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
          {categorias.map((cat) => {
            const isSelected = selectedCategorias.some((c) => c.codigo === cat.codigo);

            return (
              <div
                key={cat.codigo}
                className={`flex items-start space-x-2 p-2 rounded-md transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id={`cat-drop-${cat.codigo}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleCategoriaToggle(cat.codigo, cat.nombre, !!checked)}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`cat-drop-${cat.codigo}`}
                  className="text-sm leading-tight flex-1 cursor-pointer"
                >
                  <span className="font-mono text-xs text-primary mr-1">{cat.codigo}</span>
                  <span className="font-medium">{cat.nombre}</span>
                  {cat.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {cat.descripcion}
                    </p>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
