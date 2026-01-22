/**
 * Taxonomy 3-Level Dropdowns
 * 
 * Compact dropdown-based selector for the 3-level taxonomy hierarchy:
 * 1. Categorías (TAP, TAR, etc.) - from Railway API
 * 2. Tipos (Filtración, Desinfección, etc.) - filtered by selected categories
 * 3. Subcategorías (Ósmosis inversa, UV, etc.) - filtered by selected types
 * 
 * This component replaces the bulky TaxonomyCascadeSelector for edit forms.
 */

import React, { useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Loader2, Layers, Tag, ListTree, AlertCircle } from 'lucide-react';
import { useTaxonomy3Levels, TaxonomySelections } from '@/hooks/useTaxonomy3Levels';

interface Taxonomy3LevelDropdownsProps {
  value: TaxonomySelections;
  onChange: (value: TaxonomySelections) => void;
  disabled?: boolean;
  compact?: boolean; // Single-column layout for narrow containers
}

export const Taxonomy3LevelDropdowns: React.FC<Taxonomy3LevelDropdownsProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const { 
    taxonomyData, 
    isLoading, 
    getAllCategorias, 
    getTiposForCategorias, 
    getSubcategoriasForTipos 
  } = useTaxonomy3Levels();

  const [openSection, setOpenSection] = React.useState<'categorias' | 'tipos' | 'subcategorias' | null>(null);

  const categorias = useMemo(() => getAllCategorias(), [taxonomyData]);
  const availableTipos = useMemo(() => getTiposForCategorias(value.categorias), [value.categorias, taxonomyData]);
  const availableSubcategorias = useMemo(
    () => getSubcategoriasForTipos(value.categorias, value.tipos),
    [value.categorias, value.tipos, taxonomyData]
  );

  // Clean up tipos when categorias change
  useEffect(() => {
    const validTipos = value.tipos.filter(t => availableTipos.includes(t));
    if (validTipos.length !== value.tipos.length) {
      onChange({ ...value, tipos: validTipos });
    }
  }, [availableTipos]);

  // Clean up subcategorias when tipos change
  useEffect(() => {
    const validSubcategorias = value.subcategorias.filter(s => availableSubcategorias.includes(s));
    if (validSubcategorias.length !== value.subcategorias.length) {
      onChange({ ...value, subcategorias: validSubcategorias });
    }
  }, [availableSubcategorias]);

  const handleCategoriaToggle = (codigo: string, checked: boolean) => {
    const newCategorias = checked
      ? [...value.categorias, codigo]
      : value.categorias.filter(c => c !== codigo);
    onChange({ ...value, categorias: newCategorias });
  };

  const handleTipoToggle = (tipo: string, checked: boolean) => {
    const newTipos = checked
      ? [...value.tipos, tipo]
      : value.tipos.filter(t => t !== tipo);
    onChange({ ...value, tipos: newTipos });
  };

  const handleSubcategoriaToggle = (subcategoria: string, checked: boolean) => {
    const newSubcategorias = checked
      ? [...value.subcategorias, subcategoria]
      : value.subcategorias.filter(s => s !== subcategoria);
    onChange({ ...value, subcategorias: newSubcategorias });
  };

  const removeBadge = (type: 'categorias' | 'tipos' | 'subcategorias', item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange({ ...value, [type]: value[type].filter((v: string) => v !== item) });
  };

  const getCategoriaName = (codigo: string) => {
    return categorias.find(c => c.codigo === codigo)?.nombre || codigo;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/20">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando taxonomía...
      </div>
    );
  }

  const DropdownSection = ({
    id,
    label,
    icon: Icon,
    items,
    selectedItems,
    onToggle,
    getItemLabel,
    emptyMessage,
    disabledMessage,
    isDisabled,
    badgeVariant = 'secondary',
  }: {
    id: 'categorias' | 'tipos' | 'subcategorias';
    label: string;
    icon: React.ElementType;
    items: string[];
    selectedItems: string[];
    onToggle: (item: string, checked: boolean) => void;
    getItemLabel: (item: string) => string;
    emptyMessage: string;
    disabledMessage?: string;
    isDisabled?: boolean;
    badgeVariant?: 'default' | 'secondary' | 'outline';
  }) => {
    const isOpen = openSection === id;

    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </Label>
        <Collapsible 
          open={isOpen} 
          onOpenChange={(open) => setOpenSection(open ? id : null)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className="w-full justify-between h-auto min-h-9 py-1.5 text-sm"
              disabled={disabled || isDisabled}
            >
              <div className="flex flex-wrap gap-1 flex-1 text-left">
                {isDisabled ? (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {disabledMessage}
                  </span>
                ) : selectedItems.length === 0 ? (
                  <span className="text-muted-foreground text-xs">
                    Seleccionar {label.toLowerCase()}...
                  </span>
                ) : (
                  selectedItems.slice(0, 3).map((item) => (
                    <Badge
                      key={item}
                      variant={badgeVariant}
                      className="text-xs py-0 h-5"
                    >
                      {id === 'categorias' ? (
                        <>
                          <span className="font-mono mr-1">{item}</span>
                          {getCategoriaName(item)}
                        </>
                      ) : (
                        getItemLabel(item)
                      )}
                      <button
                        type="button"
                        onClick={(e) => removeBadge(id, item, e)}
                        className="ml-1 hover:bg-black/20 rounded-full"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
                {selectedItems.length > 3 && (
                  <Badge variant="outline" className="text-xs py-0 h-5">
                    +{selectedItems.length - 3} más
                  </Badge>
                )}
              </div>
              {!isDisabled && (
                isOpen ? (
                  <ChevronUp className="h-3 w-3 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-3 w-3 shrink-0 ml-2" />
                )
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5">
            <div className="border rounded-md p-2 bg-background max-h-[180px] overflow-y-auto space-y-0.5">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {emptyMessage}
                </p>
              ) : (
                items.map((item) => {
                  const isSelected = selectedItems.includes(item);
                  const itemLabel = getItemLabel(item);

                  return (
                    <div
                      key={item}
                      className={`flex items-center space-x-2 p-1.5 rounded-md transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`${id}-${item}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => onToggle(item, !!checked)}
                        disabled={disabled}
                        className="h-3.5 w-3.5"
                      />
                      <label
                        htmlFor={`${id}-${item}`}
                        className="text-xs font-medium leading-none flex-1 cursor-pointer"
                      >
                        {id === 'categorias' ? (
                          <>
                            <span className="font-mono text-primary mr-1">{item}</span>
                            {itemLabel}
                          </>
                        ) : (
                          itemLabel
                        )}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className={compact ? 'space-y-3' : 'grid grid-cols-3 gap-3'}>
      {/* Categorías */}
      <DropdownSection
        id="categorias"
        label="Categorías"
        icon={Layers}
        items={categorias.map(c => c.codigo)}
        selectedItems={value.categorias}
        onToggle={handleCategoriaToggle}
        getItemLabel={(codigo) => getCategoriaName(codigo)}
        emptyMessage="No hay categorías disponibles"
        badgeVariant="default"
      />

      {/* Tipos */}
      <DropdownSection
        id="tipos"
        label="Tipos"
        icon={Tag}
        items={availableTipos}
        selectedItems={value.tipos}
        onToggle={handleTipoToggle}
        getItemLabel={(tipo) => tipo}
        emptyMessage="No hay tipos disponibles"
        disabledMessage="Selecciona categorías primero"
        isDisabled={value.categorias.length === 0}
        badgeVariant="secondary"
      />

      {/* Subcategorías */}
      <DropdownSection
        id="subcategorias"
        label="Subcategorías"
        icon={ListTree}
        items={availableSubcategorias}
        selectedItems={value.subcategorias}
        onToggle={handleSubcategoriaToggle}
        getItemLabel={(sub) => sub}
        emptyMessage="No hay subcategorías disponibles"
        disabledMessage="Selecciona tipos primero"
        isDisabled={value.tipos.length === 0}
        badgeVariant="outline"
      />
    </div>
  );
};
