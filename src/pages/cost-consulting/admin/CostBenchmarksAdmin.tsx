import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Plus,
  Search,
  TrendingUp,
  Database,
  Calendar,
  Edit,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { useCostBenchmarks, useBenchmarkMutations } from '@/hooks/useCostAdminData';
import { BenchmarkPrice, BenchmarkFilters, BenchmarkCreateData } from '@/types/costConsulting';
import { BenchmarkFormModal } from '@/components/cost-consulting/admin/BenchmarkFormModal';
import { BenchmarkPriceBar } from '@/components/cost-consulting/admin/BenchmarkPriceBar';
import { PriceComparator } from '@/components/cost-consulting/admin/PriceComparator';

const CATEGORY_NAMES: Record<string, string> = {
  quimicos_basicos: 'Químicos Básicos',
  quimicos_especiales: 'Químicos Especiales',
  floculantes_coagulantes: 'Floculantes y Coagulantes',
  energia_electrica: 'Energía Eléctrica',
  gestion_lodos: 'Gestión de Lodos',
  gestion_residuos: 'Gestión de Residuos',
  analiticas: 'Analíticas',
  mantenimiento_general: 'Mantenimiento General',
  instrumentacion: 'Instrumentación',
  otros: 'Otros',
};

const CostBenchmarksAdmin = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BenchmarkFilters>({
    search: '',
    category_id: undefined,
    region: undefined,
    year: new Date().getFullYear(),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<BenchmarkPrice | null>(null);

  const { data: benchmarks = [], isLoading } = useCostBenchmarks(filters);
  const { createBenchmark, updateBenchmark, deleteBenchmark } = useBenchmarkMutations();

  // Calculate stats
  const stats = useMemo(() => {
    const categories = new Set(benchmarks.map(b => b.cost_categories?.code || b.category_id));
    const lastUpdate = benchmarks.length > 0
      ? benchmarks.reduce((latest, b) => {
          const date = b.updated_at || b.created_at;
          return date && date > latest ? date : latest;
        }, '')
      : null;
    return {
      categories: categories.size,
      dataPoints: benchmarks.length,
      lastUpdate: lastUpdate ? new Date(lastUpdate).toLocaleDateString('es-ES') : '-',
    };
  }, [benchmarks]);

  // Group benchmarks by category
  const groupedBenchmarks = useMemo(() => {
    const groups: Record<string, BenchmarkPrice[]> = {};
    benchmarks.forEach(b => {
      const cat = b.cost_categories?.code || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return groups;
  }, [benchmarks]);

  const handleEdit = (benchmark: BenchmarkPrice) => {
    setEditingBenchmark(benchmark);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteBenchmark.mutate(id);
  };

  const handleFormSubmit = (data: BenchmarkCreateData) => {
    if (editingBenchmark) {
      updateBenchmark.mutate({ id: editingBenchmark.id, data });
    } else {
      createBenchmark.mutate(data);
    }
    setFormOpen(false);
    setEditingBenchmark(null);
  };

  const handleNewBenchmark = () => {
    setEditingBenchmark(null);
    setFormOpen(true);
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const isExpiringSoon = (validUntil: string) => {
    const daysUntil = (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 30;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cost-consulting')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#307177] flex items-center gap-2">
              Benchmarks de Precios
              <Badge variant="outline" className="text-xs">Admin</Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestión de referencias de precios por categoría
            </p>
          </div>
        </div>
        <Button onClick={handleNewBenchmark} className="bg-[#307177] hover:bg-[#307177]/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Benchmark
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#307177]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Datos</p>
                <p className="text-2xl font-bold text-[#32b4cd]">{stats.dataPoints}</p>
              </div>
              <Database className="h-8 w-8 text-[#32b4cd]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="text-2xl font-bold">{stats.lastUpdate}</p>
              </div>
              <Calendar className="h-8 w-8 text-[#8cb63c]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.category_id || 'all'}
              onValueChange={v => setFilters({ ...filters, category_id: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.region || 'all'}
              onValueChange={v => setFilters({ ...filters, region: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="España">España</SelectItem>
                <SelectItem value="Cataluña">Cataluña</SelectItem>
                <SelectItem value="Andalucía">Andalucía</SelectItem>
                <SelectItem value="Madrid">Madrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparator */}
      <PriceComparator benchmarks={benchmarks} />

      {/* Benchmarks Table (grouped) */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cargando benchmarks...
          </CardContent>
        </Card>
      ) : Object.keys(groupedBenchmarks).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron benchmarks. Crea el primero.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedBenchmarks).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#307177]" />
                {CATEGORY_NAMES[category] || category}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Producto</TableHead>
                  <TableHead className="w-[80px]">Unidad</TableHead>
                  <TableHead className="w-[300px]">Rango de precios</TableHead>
                  <TableHead>P50</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(benchmark => (
                  <TableRow key={benchmark.id}>
                    <TableCell className="font-medium">{benchmark.product_name}</TableCell>
                    <TableCell>{benchmark.unit}</TableCell>
                    <TableCell>
                      <BenchmarkPriceBar benchmark={benchmark} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {benchmark.price_p50.toFixed(2)}
                    </TableCell>
                    <TableCell>{benchmark.region || 'Nacional'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isExpired(benchmark.valid_until) ? (
                          <Badge variant="destructive" className="text-xs">
                            Expirado
                          </Badge>
                        ) : isExpiringSoon(benchmark.valid_until) ? (
                          <Badge className="bg-[#ffa720] text-white text-xs">
                            Expira pronto
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            hasta {new Date(benchmark.valid_until).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(benchmark)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar benchmark?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente
                                el benchmark "{benchmark.product_name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(benchmark.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))
      )}

      {/* Form Modal */}
      <BenchmarkFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        benchmark={editingBenchmark}
        onSubmit={handleFormSubmit}
        isLoading={createBenchmark.isPending || updateBenchmark.isPending}
      />
    </div>
  );
};

export default CostBenchmarksAdmin;
