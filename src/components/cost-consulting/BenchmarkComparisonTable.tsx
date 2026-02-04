import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  AlertCircle,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingDown,
} from 'lucide-react';
import {
  getBenchmarkComparison,
  BenchmarkCategoryData,
  BenchmarkPosition,
} from '@/services/costConsultingApi';

interface BenchmarkComparisonTableProps {
  projectId: string;
}

type SortField = 'category_name' | 'your_price' | 'position' | 'potential_savings';
type SortDirection = 'asc' | 'desc';

const POSITION_CONFIG: Record<BenchmarkPosition, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  excellent: {
    label: 'Excelente',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  good: {
    label: 'Bueno',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  average: {
    label: 'Promedio',
    variant: 'default',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  above_market: {
    label: 'Sobre mercado',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
};

// Position order for sorting (excellent = best = 1, above_market = worst = 4)
const POSITION_ORDER: Record<BenchmarkPosition, number> = {
  excellent: 1,
  good: 2,
  average: 3,
  above_market: 4,
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPrice = (value: number, unit?: string): string => {
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return unit ? `${formatted}/${unit}` : formatted;
};

// Sortable Column Header
const SortableHeader: React.FC<{
  label: string;
  field: SortField;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}> = ({ label, field, currentSort, direction, onSort, className }) => {
  const isActive = currentSort === field;

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(field)}
        className="h-8 px-2 -ml-2 font-medium hover:bg-muted/50"
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="ml-1 h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
};

// Position Badge
const PositionBadge: React.FC<{ position: BenchmarkPosition }> = ({ position }) => {
  const config = POSITION_CONFIG[position];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

export const BenchmarkComparisonTable: React.FC<BenchmarkComparisonTableProps> = ({
  projectId,
}) => {
  const [sortField, setSortField] = useState<SortField>('potential_savings');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['benchmark-comparison', projectId],
    queryFn: () => getBenchmarkComparison(projectId),
    enabled: !!projectId,
  });

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'potential_savings' ? 'desc' : 'asc');
    }
  };

  // Sorted data
  const sortedCategories = useMemo(() => {
    if (!data?.categories) return [];

    return [...data.categories].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'category_name':
          comparison = a.category_name.localeCompare(b.category_name);
          break;
        case 'your_price':
          comparison = a.your_price - b.your_price;
          break;
        case 'position':
          comparison = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
          break;
        case 'potential_savings':
          comparison = a.potential_savings - b.potential_savings;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data?.categories, sortField, sortDirection]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparación con Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Error al cargar datos de benchmark</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data?.categories?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparación con Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">No hay datos de benchmark disponibles</p>
            <p className="text-xs mt-1">Los datos aparecerán cuando haya suficientes facturas categorizadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparación con Benchmark de Mercado
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Categorías excelentes:{' '}
              <strong className="text-green-600">{data.categories_excellent}</strong>
            </span>
            <span className="text-muted-foreground">
              Sobre mediana:{' '}
              <strong className="text-amber-600">{data.categories_above_median}</strong>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  label="Categoría"
                  field="category_name"
                  currentSort={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Tu Precio"
                  field="your_price"
                  currentSort={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <TableHead className="text-right">P25</TableHead>
                <TableHead className="text-right">Mediana</TableHead>
                <TableHead className="text-right">P75</TableHead>
                <SortableHeader
                  label="Posición"
                  field="position"
                  currentSort={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Ahorro Potencial"
                  field="potential_savings"
                  currentSort={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedCategories.map((category) => (
                <TableRow key={category.category_id}>
                  <TableCell className="font-medium">
                    {category.category_name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({category.invoice_count} facturas)
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(category.your_price, category.unit)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPrice(category.benchmark_p25, category.unit)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPrice(category.benchmark_median, category.unit)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPrice(category.benchmark_p75, category.unit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <PositionBadge position={category.position} />
                  </TableCell>
                  <TableCell className="text-right">
                    {category.position !== 'excellent' && category.potential_savings > 0 ? (
                      <span className="font-medium text-green-600 flex items-center justify-end gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {formatCurrency(category.potential_savings)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold">
                  Total Ahorro Potencial (hasta P25)
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(data.total_potential_savings)}
                  </span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Leyenda:</span>
          {Object.entries(POSITION_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${config.className}`} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
