import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, SlidersHorizontal } from 'lucide-react';
import type { TechnologyFilters } from '@/types/database';
import type { FilterOptions } from '@/hooks/useTechnologyFilters';

interface TechnologyFiltersProps {
  filters: TechnologyFilters;
  onFiltersChange: (filters: TechnologyFilters) => void;
  filterOptions: FilterOptions;
  onReset: () => void;
}

export const TechnologyFiltersPanel: React.FC<TechnologyFiltersProps> = ({
  filters,
  onFiltersChange,
  filterOptions,
  onReset,
}) => {
  const updateFilter = <K extends keyof TechnologyFilters>(key: K, value: TechnologyFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = 
    filters.tipoTecnologia || 
    filters.subcategoria || 
    filters.pais || 
    filters.sector || 
    filters.status ||
    filters.trlMin > 1 ||
    filters.trlMax < 9;

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tipo de tecnología */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de tecnología</Label>
          <Select
            value={filters.tipoTecnologia || 'all'}
            onValueChange={(value) => updateFilter('tipoTecnologia', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              <SelectItem value="all">Todos los tipos</SelectItem>
              {filterOptions.tiposTecnologia.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.value}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{option.count}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subcategoría */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Subcategoría</Label>
          <Select
            value={filters.subcategoria || 'all'}
            onValueChange={(value) => updateFilter('subcategoria', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las subcategorías" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              <SelectItem value="all">Todas las subcategorías</SelectItem>
              {filterOptions.subcategorias.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.value}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{option.count}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* País */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">País de origen</Label>
          <Select
            value={filters.pais || 'all'}
            onValueChange={(value) => updateFilter('pais', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los países" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              <SelectItem value="all">Todos los países</SelectItem>
              {filterOptions.paises.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.value}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{option.count}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sector</Label>
          <Select
            value={filters.sector || 'all'}
            onValueChange={(value) => updateFilter('sector', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los sectores" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-popover">
              <SelectItem value="all">Todos los sectores</SelectItem>
              {filterOptions.sectores.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.value}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{option.count}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos los estados</SelectItem>
              {filterOptions.estados.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{option.value}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{option.count}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
