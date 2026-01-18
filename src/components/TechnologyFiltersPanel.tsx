import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { TechnologyFilters } from '@/types/database';
import type { FilterOptions, TaxonomyFilters, TaxonomyTipo, TaxonomySubcategoria, TaxonomySector } from '@/hooks/useTechnologyFilters';
import { TIPOS_TECNOLOGIA, SECTORES, PAISES } from '@/constants/taxonomyData';

interface TechnologyFiltersProps {
  filters: TechnologyFilters;
  onFiltersChange: (filters: TechnologyFilters) => void;
  filterOptions: FilterOptions;
  onReset: () => void;
  // New taxonomy filters
  taxonomyFilters: TaxonomyFilters;
  onTaxonomyFiltersChange: (filters: TaxonomyFilters) => void;
  taxonomyTipos: TaxonomyTipo[];
  taxonomySubcategorias: TaxonomySubcategoria[];
  taxonomySectores: TaxonomySector[];
}

export const TechnologyFiltersPanel: React.FC<TechnologyFiltersProps> = ({
  filters,
  onFiltersChange,
  filterOptions,
  onReset,
  taxonomyFilters,
  onTaxonomyFiltersChange,
  taxonomyTipos,
  taxonomySubcategorias,
  taxonomySectores,
}) => {
  const updateFilter = <K extends keyof TechnologyFilters>(key: K, value: TechnologyFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const updateTaxonomyFilter = <K extends keyof TaxonomyFilters>(key: K, value: TaxonomyFilters[K]) => {
    const newFilters = { ...taxonomyFilters, [key]: value };
    // Reset subcategoria when tipo changes
    if (key === 'tipoId') {
      newFilters.subcategoriaId = null;
    }
    onTaxonomyFiltersChange(newFilters);
  };

  // Filter subcategorias based on selected tipo
  const filteredSubcategorias = taxonomySubcategorias.filter(
    (sub) => sub.tipo_id === taxonomyFilters.tipoId
  );

  const hasActiveFilters = 
    filters.tipoTecnologia || 
    filters.subcategoria || 
    filters.pais || 
    filters.sector || 
    filters.status ||
    filters.trlMin > 1 ||
    filters.trlMax < 9 ||
    taxonomyFilters.tipoId ||
    taxonomyFilters.subcategoriaId ||
    taxonomyFilters.sectorId;

  const handleFullReset = () => {
    onReset();
    onTaxonomyFiltersChange({
      tipoId: null,
      subcategoriaId: null,
      sectorId: null,
    });
  };

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleFullReset} className="h-8 text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Filtros por Taxonomía (datos fijos) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="w-4 h-4" />
            Taxonomía
          </div>
          
          {/* Tipo de tecnología (fijo) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de tecnología</Label>
            <Select
              value={filters.tipoTecnologia || 'all'}
              onValueChange={(value) => updateFilter('tipoTecnologia', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-popover z-50">
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TIPOS_TECNOLOGIA.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.nombre}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{tipo.codigo}</span>
                      {tipo.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sector (fijo) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sector</Label>
            <Select
              value={filters.sector || 'all'}
              onValueChange={(value) => updateFilter('sector', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los sectores" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos los sectores</SelectItem>
                {SECTORES.map((sector) => (
                  <SelectItem key={sector.id} value={sector.nombre}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{sector.id}</span>
                      {sector.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />
        </div>

        {/* TRL Slider */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Grado de madurez (TRL): {filters.trlMin} - {filters.trlMax}
          </Label>
          <Slider
            min={1}
            max={9}
            step={1}
            value={[filters.trlMin, filters.trlMax]}
            onValueChange={([min, max]) => {
              onFiltersChange({ ...filters, trlMin: min, trlMax: max });
            }}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (Básico)</span>
            <span>9 (Comercial)</span>
          </div>
        </div>

        {/* País (fijo) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">País de origen</Label>
          <Select
            value={filters.pais || 'all'}
            onValueChange={(value) => updateFilter('pais', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los países" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover z-50">
              <SelectItem value="all">Todos los países</SelectItem>
              {PAISES.map((pais) => (
                <SelectItem key={pais} value={pais}>
                  {pais}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado (Activo/Inactivo) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Activo
                </span>
              </SelectItem>
              <SelectItem value="inactive">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Inactivo
                </span>
              </SelectItem>
              <SelectItem value="en_revision">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  En revisión
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
