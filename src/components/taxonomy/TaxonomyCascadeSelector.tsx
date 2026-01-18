import React, { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, X, ChevronDown, ChevronRight, Layers, Tag, ListTree } from 'lucide-react';
import { useTaxonomy3Levels, TaxonomySelections } from '@/hooks/useTaxonomy3Levels';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TaxonomyCascadeSelectorProps {
  value: TaxonomySelections;
  onChange: (value: TaxonomySelections) => void;
  disabled?: boolean;
}

export const TaxonomyCascadeSelector: React.FC<TaxonomyCascadeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { 
    taxonomyData, 
    isLoading, 
    getAllCategorias, 
    getTiposForCategorias, 
    getSubcategoriasForTipos 
  } = useTaxonomy3Levels();

  const [openSections, setOpenSections] = React.useState({
    categorias: true,
    tipos: true,
    subcategorias: true,
  });

  const categorias = useMemo(() => getAllCategorias(), [taxonomyData]);
  const availableTipos = useMemo(() => getTiposForCategorias(value.categorias), [value.categorias, taxonomyData]);
  const availableSubcategorias = useMemo(
    () => getSubcategoriasForTipos(value.categorias, value.tipos),
    [value.categorias, value.tipos, taxonomyData]
  );

  // Clean up tipos when categorias change (remove tipos that are no longer available)
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

  const removeBadge = (type: 'categorias' | 'tipos' | 'subcategorias', item: string) => {
    const newValue = { ...value, [type]: value[type].filter((v: string) => v !== item) };
    onChange(newValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando taxonomía...
      </div>
    );
  }

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    count, 
    selectedCount,
    isOpen, 
    onToggle 
  }: { 
    title: string; 
    icon: React.ElementType; 
    count: number;
    selectedCount: number;
    isOpen: boolean; 
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors"
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title}</span>
        <Badge variant="outline" className="text-xs">
          {selectedCount}/{count}
        </Badge>
      </div>
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Selected badges summary */}
      {(value.categorias.length > 0 || value.tipos.length > 0 || value.subcategorias.length > 0) && (
        <div className="p-3 bg-muted/30 rounded-lg space-y-2">
          {value.categorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground font-medium mr-1">Categorías:</span>
              {value.categorias.map(codigo => {
                const cat = categorias.find(c => c.codigo === codigo);
                return (
                  <Badge key={codigo} variant="default" className="text-xs py-0 h-5">
                    <span className="font-mono mr-1">{codigo}</span>
                    {cat?.nombre}
                    <button
                      type="button"
                      onClick={() => removeBadge('categorias', codigo)}
                      className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                      disabled={disabled}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          {value.tipos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground font-medium mr-1">Tipos:</span>
              {value.tipos.map(tipo => (
                <Badge key={tipo} variant="secondary" className="text-xs py-0 h-5">
                  {tipo}
                  <button
                    type="button"
                    onClick={() => removeBadge('tipos', tipo)}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {value.subcategorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground font-medium mr-1">Subcategorías:</span>
              {value.subcategorias.map(sub => (
                <Badge key={sub} variant="outline" className="text-xs py-0 h-5">
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeBadge('subcategorias', sub)}
                    className="ml-1 hover:bg-foreground/10 rounded-full p-0.5"
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categorías */}
      <Collapsible
        open={openSections.categorias}
        onOpenChange={(open) => setOpenSections(prev => ({ ...prev, categorias: open }))}
      >
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              title="Categorías"
              icon={Layers}
              count={categorias.length}
              selectedCount={value.categorias.length}
              isOpen={openSections.categorias}
              onToggle={() => setOpenSections(prev => ({ ...prev, categorias: !prev.categorias }))}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-md p-3 mt-2 max-h-48 overflow-y-auto space-y-2">
            {categorias.map((cat) => {
              const isSelected = value.categorias.includes(cat.codigo);
              return (
                <div key={cat.codigo} className="flex items-start space-x-2">
                  <Checkbox
                    id={`cat-${cat.codigo}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleCategoriaToggle(cat.codigo, !!checked)}
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`cat-${cat.codigo}`}
                    className="text-sm cursor-pointer flex-1 leading-tight"
                  >
                    <span className="font-mono text-xs text-primary mr-1.5">{cat.codigo}</span>
                    <span className="font-medium">{cat.nombre}</span>
                    {cat.descripcion && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cat.descripcion}</p>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tipos */}
      <Collapsible
        open={openSections.tipos}
        onOpenChange={(open) => setOpenSections(prev => ({ ...prev, tipos: open }))}
      >
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              title="Tipos"
              icon={Tag}
              count={availableTipos.length}
              selectedCount={value.tipos.length}
              isOpen={openSections.tipos}
              onToggle={() => setOpenSections(prev => ({ ...prev, tipos: !prev.tipos }))}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-md p-3 mt-2 max-h-48 overflow-y-auto space-y-2">
            {value.categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Selecciona primero una o más categorías
              </p>
            ) : availableTipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No hay tipos disponibles
              </p>
            ) : (
              availableTipos.map((tipo) => {
                const isSelected = value.tipos.includes(tipo);
                return (
                  <div key={tipo} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tipo-${tipo}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleTipoToggle(tipo, !!checked)}
                      disabled={disabled}
                    />
                    <label
                      htmlFor={`tipo-${tipo}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {tipo}
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Subcategorías */}
      <Collapsible
        open={openSections.subcategorias}
        onOpenChange={(open) => setOpenSections(prev => ({ ...prev, subcategorias: open }))}
      >
        <CollapsibleTrigger asChild>
          <div>
            <SectionHeader
              title="Subcategorías"
              icon={ListTree}
              count={availableSubcategorias.length}
              selectedCount={value.subcategorias.length}
              isOpen={openSections.subcategorias}
              onToggle={() => setOpenSections(prev => ({ ...prev, subcategorias: !prev.subcategorias }))}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-md p-3 mt-2 max-h-48 overflow-y-auto space-y-2">
            {value.tipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Selecciona primero uno o más tipos
              </p>
            ) : availableSubcategorias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No hay subcategorías disponibles
              </p>
            ) : (
              availableSubcategorias.map((sub) => {
                const isSelected = value.subcategorias.includes(sub);
                return (
                  <div key={sub} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sub-${sub}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSubcategoriaToggle(sub, !!checked)}
                      disabled={disabled}
                    />
                    <label
                      htmlFor={`sub-${sub}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {sub}
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
