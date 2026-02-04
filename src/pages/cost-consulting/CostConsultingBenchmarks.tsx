import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Upload, 
  Shield, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Loader2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface BenchmarkCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  itemCount: number;
}

interface BenchmarkPrice {
  id: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  unit: string;
  region: string;
  priceP10: number;
  priceP25: number;
  priceP50: number;
  priceP75: number;
  priceP90: number;
  source: string;
  validFrom: string;
  validUntil: string;
  updatedAt: string;
}

// Mock data - in production this would come from the backend
const mockCategories: BenchmarkCategory[] = [
  { id: '1', code: 'QUIM-COAG', name: 'Químicos - Coagulantes', description: 'Coagulantes para tratamiento de agua', itemCount: 8 },
  { id: '2', code: 'QUIM-FLOC', name: 'Químicos - Floculantes', description: 'Floculantes y polímeros', itemCount: 5 },
  { id: '3', code: 'QUIM-BIOC', name: 'Químicos - Biocidas', description: 'Biocidas y desinfectantes', itemCount: 6 },
  { id: '4', code: 'RESID-LODO', name: 'Residuos - Lodos', description: 'Gestión de lodos EDAR', itemCount: 4 },
  { id: '5', code: 'ENERG', name: 'Energía', description: 'Costes energéticos', itemCount: 3 },
  { id: '6', code: 'MANT', name: 'Mantenimiento', description: 'Servicios de mantenimiento', itemCount: 7 },
];

const mockPrices: BenchmarkPrice[] = [
  { id: '1', categoryId: '1', categoryName: 'Químicos - Coagulantes', productName: 'Policloruro de Aluminio (PAC)', unit: '€/kg', region: 'Nacional', priceP10: 0.28, priceP25: 0.32, priceP50: 0.38, priceP75: 0.45, priceP90: 0.52, source: 'Estudio mercado 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-01-15' },
  { id: '2', categoryId: '1', categoryName: 'Químicos - Coagulantes', productName: 'Sulfato de Aluminio', unit: '€/kg', region: 'Nacional', priceP10: 0.15, priceP25: 0.18, priceP50: 0.22, priceP75: 0.28, priceP90: 0.35, source: 'Estudio mercado 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-01-15' },
  { id: '3', categoryId: '1', categoryName: 'Químicos - Coagulantes', productName: 'Cloruro Férrico', unit: '€/kg', region: 'Nacional', priceP10: 0.20, priceP25: 0.25, priceP50: 0.30, priceP75: 0.38, priceP90: 0.45, source: 'Estudio mercado 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-01-15' },
  { id: '4', categoryId: '2', categoryName: 'Químicos - Floculantes', productName: 'Poliacrilamida Aniónica', unit: '€/kg', region: 'Nacional', priceP10: 2.50, priceP25: 3.00, priceP50: 3.50, priceP75: 4.20, priceP90: 5.00, source: 'Estudio mercado 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-01-15' },
  { id: '5', categoryId: '4', categoryName: 'Residuos - Lodos', productName: 'Gestión lodos EDAR (20% MS)', unit: '€/ton', region: 'Nacional', priceP10: 35, priceP25: 42, priceP50: 50, priceP75: 62, priceP90: 75, source: 'Estudio mercado 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-01-15' },
  { id: '6', categoryId: '5', categoryName: 'Energía', productName: 'Electricidad industrial (punta)', unit: '€/kWh', region: 'Nacional', priceP10: 0.12, priceP25: 0.14, priceP50: 0.16, priceP75: 0.19, priceP90: 0.22, source: 'OMIE 2024', validFrom: '2024-01-01', validUntil: '2024-12-31', updatedAt: '2024-02-01' },
];

const CostConsultingBenchmarks = () => {
  const [activeTab, setActiveTab] = useState('prices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [addPriceModalOpen, setAddPriceModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '' });
  const [priceForm, setPriceForm] = useState({
    categoryId: '',
    productName: '',
    unit: '€/kg',
    region: 'Nacional',
    priceP10: '',
    priceP25: '',
    priceP50: '',
    priceP75: '',
    priceP90: '',
    source: '',
    validFrom: '',
    validUntil: '',
  });

  // State for data (in production, use React Query)
  const [categories, setCategories] = useState<BenchmarkCategory[]>(mockCategories);
  const [prices, setPrices] = useState<BenchmarkPrice[]>(mockPrices);

  // Filtered prices
  const filteredPrices = useMemo(() => {
    return prices.filter(p => {
      const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [prices, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(() => ({
    categories: categories.length,
    dataPoints: prices.length,
    lastUpdate: prices.length > 0 
      ? new Date(Math.max(...prices.map(p => new Date(p.updatedAt).getTime()))).toLocaleDateString('es-ES')
      : '-'
  }), [categories, prices]);

  // Handlers
  const handleAddCategory = () => {
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      toast.error('El código y nombre son obligatorios');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      const newCategory: BenchmarkCategory = {
        id: String(Date.now()),
        code: categoryForm.code,
        name: categoryForm.name,
        description: categoryForm.description,
        itemCount: 0
      };
      setCategories(prev => [...prev, newCategory]);
      setCategoryForm({ code: '', name: '', description: '' });
      setAddCategoryModalOpen(false);
      toast.success('Categoría creada correctamente');
      setIsSubmitting(false);
    }, 500);
  };

  const handleAddPrice = () => {
    if (!priceForm.categoryId || !priceForm.productName.trim() || !priceForm.priceP50) {
      toast.error('Categoría, producto y precio P50 son obligatorios');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      const category = categories.find(c => c.id === priceForm.categoryId);
      const newPrice: BenchmarkPrice = {
        id: String(Date.now()),
        categoryId: priceForm.categoryId,
        categoryName: category?.name || '',
        productName: priceForm.productName,
        unit: priceForm.unit,
        region: priceForm.region,
        priceP10: parseFloat(priceForm.priceP10) || 0,
        priceP25: parseFloat(priceForm.priceP25) || 0,
        priceP50: parseFloat(priceForm.priceP50) || 0,
        priceP75: parseFloat(priceForm.priceP75) || 0,
        priceP90: parseFloat(priceForm.priceP90) || 0,
        source: priceForm.source || 'Manual',
        validFrom: priceForm.validFrom || new Date().toISOString().split('T')[0],
        validUntil: priceForm.validUntil || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setPrices(prev => [...prev, newPrice]);
      
      // Update category item count
      setCategories(prev => prev.map(c => 
        c.id === priceForm.categoryId 
          ? { ...c, itemCount: c.itemCount + 1 }
          : c
      ));
      
      setPriceForm({
        categoryId: '',
        productName: '',
        unit: '€/kg',
        region: 'Nacional',
        priceP10: '',
        priceP25: '',
        priceP50: '',
        priceP75: '',
        priceP90: '',
        source: '',
        validFrom: '',
        validUntil: '',
      });
      setAddPriceModalOpen(false);
      toast.success('Precio añadido correctamente');
      setIsSubmitting(false);
    }, 500);
  };

  const handleDeletePrice = (priceId: string) => {
    const price = prices.find(p => p.id === priceId);
    setPrices(prev => prev.filter(p => p.id !== priceId));
    if (price) {
      setCategories(prev => prev.map(c => 
        c.id === price.categoryId 
          ? { ...c, itemCount: Math.max(0, c.itemCount - 1) }
          : c
      ));
    }
    toast.success('Precio eliminado');
  };

  const handleDeleteCategory = (categoryId: string) => {
    const hasItems = prices.some(p => p.categoryId === categoryId);
    if (hasItems) {
      toast.error('No se puede eliminar una categoría con precios asociados');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    toast.success('Categoría eliminada');
  };

  const handleImport = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success('Importación simulada - en producción procesaría el archivo Excel');
      setImportModalOpen(false);
      setIsSubmitting(false);
    }, 1500);
  };

  // Price range visualization
  const PriceRangeBar = ({ p10, p25, p50, p75, p90, currentPrice }: { 
    p10: number; p25: number; p50: number; p75: number; p90: number; currentPrice?: number 
  }) => {
    const range = p90 - p10;
    const getPosition = (value: number) => ((value - p10) / range) * 100;
    
    return (
      <div className="relative h-4 w-full min-w-[120px]">
        {/* Full range background */}
        <div className="absolute inset-0 bg-muted rounded-full" />
        
        {/* Green zone: P10-P25 (cheap) */}
        <div 
          className="absolute h-full bg-green-400 dark:bg-green-600 rounded-l-full"
          style={{ left: '0%', width: `${getPosition(p25)}%` }}
        />
        
        {/* Orange zone: P25-P75 (standard) */}
        <div 
          className="absolute h-full bg-amber-400 dark:bg-amber-600"
          style={{ left: `${getPosition(p25)}%`, width: `${getPosition(p75) - getPosition(p25)}%` }}
        />
        
        {/* Red zone: P75-P90 (expensive) */}
        <div 
          className="absolute h-full bg-red-400 dark:bg-red-600 rounded-r-full"
          style={{ left: `${getPosition(p75)}%`, width: `${100 - getPosition(p75)}%` }}
        />
        
        {/* P50 marker */}
        <div 
          className="absolute h-full w-0.5 bg-foreground"
          style={{ left: `${getPosition(p50)}%` }}
        />
        
        {/* Current price marker if provided */}
        {currentPrice !== undefined && (
          <div 
            className="absolute -top-1 w-3 h-3 bg-primary rounded-full border-2 border-background shadow"
            style={{ left: `calc(${Math.min(100, Math.max(0, getPosition(currentPrice)))}% - 6px)`, top: '2px' }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Benchmarks</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona datos de referencia para comparativas de mercado
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Solo Admin
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button onClick={() => activeTab === 'categories' ? setAddCategoryModalOpen(true) : setAddPriceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'categories' ? 'Nueva Categoría' : 'Nuevo Precio'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Puntos de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dataPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastUpdate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prices">
            <BarChart3 className="h-4 w-4 mr-2" />
            Precios ({prices.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            Categorías ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar productos..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead className="text-center">Rango P10-P90</TableHead>
                    <TableHead className="text-right">P50 (Mediana)</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No hay precios que mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrices.map(price => (
                      <TableRow key={price.id}>
                        <TableCell className="font-medium">{price.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{price.categoryName}</Badge>
                        </TableCell>
                        <TableCell>{price.unit}</TableCell>
                        <TableCell>{price.region}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <PriceRangeBar 
                              p10={price.priceP10}
                              p25={price.priceP25}
                              p50={price.priceP50}
                              p75={price.priceP75}
                              p90={price.priceP90}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{price.priceP10.toFixed(2)}</span>
                              <span>{price.priceP90.toFixed(2)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {price.priceP50.toFixed(2)} {price.unit.replace('€/', '')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(price.validFrom).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} - 
                          {new Date(price.validUntil).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeletePrice(price.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-green-400 dark:bg-green-600 rounded" />
              <span className="text-muted-foreground">P10-P25 (Económico)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-amber-400 dark:bg-amber-600 rounded" />
              <span className="text-muted-foreground">P25-P75 (Mercado)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-red-400 dark:bg-red-600 rounded" />
              <span className="text-muted-foreground">P75-P90 (Premium)</span>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Productos</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono text-sm">{category.code}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{category.itemCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={category.itemCount > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Category Modal */}
      <Dialog open={addCategoryModalOpen} onOpenChange={setAddCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Crea una nueva categoría para organizar los precios de benchmark
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input 
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="QUIM-COAG"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input 
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Químicos - Coagulantes"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input 
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Price Modal */}
      <Dialog open={addPriceModalOpen} onOpenChange={setAddPriceModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo precio de benchmark</DialogTitle>
            <DialogDescription>
              Añade un nuevo punto de referencia de precios
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select 
                  value={priceForm.categoryId}
                  onValueChange={(value) => setPriceForm(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Input 
                  value={priceForm.productName}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="Nombre del producto"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select 
                  value={priceForm.unit}
                  onValueChange={(value) => setPriceForm(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="€/kg">€/kg</SelectItem>
                    <SelectItem value="€/ton">€/ton</SelectItem>
                    <SelectItem value="€/L">€/L</SelectItem>
                    <SelectItem value="€/m³">€/m³</SelectItem>
                    <SelectItem value="€/kWh">€/kWh</SelectItem>
                    <SelectItem value="€/hora">€/hora</SelectItem>
                    <SelectItem value="€/unidad">€/unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Región</Label>
                <Select 
                  value={priceForm.region}
                  onValueChange={(value) => setPriceForm(prev => ({ ...prev, region: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nacional">Nacional</SelectItem>
                    <SelectItem value="Norte">Norte</SelectItem>
                    <SelectItem value="Sur">Sur</SelectItem>
                    <SelectItem value="Este">Este</SelectItem>
                    <SelectItem value="Oeste">Oeste</SelectItem>
                    <SelectItem value="Centro">Centro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuente</Label>
                <Input 
                  value={priceForm.source}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="Ej: Estudio mercado 2024"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Rango de precios (Percentiles)
                <Badge variant="outline" className="text-xs">P10-P25-P50-P75-P90</Badge>
              </Label>
              <div className="grid grid-cols-5 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-green-600">P10 (Mínimo)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={priceForm.priceP10}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, priceP10: e.target.value }))}
                    placeholder="0.00"
                    className="text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-green-600">P25</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={priceForm.priceP25}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, priceP25: e.target.value }))}
                    placeholder="0.00"
                    className="text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">P50 (Mediana) *</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={priceForm.priceP50}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, priceP50: e.target.value }))}
                    placeholder="0.00"
                    className="text-right font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600">P75</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={priceForm.priceP75}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, priceP75: e.target.value }))}
                    placeholder="0.00"
                    className="text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600">P90 (Máximo)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={priceForm.priceP90}
                    onChange={(e) => setPriceForm(prev => ({ ...prev, priceP90: e.target.value }))}
                    placeholder="0.00"
                    className="text-right"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Válido desde</Label>
                <Input 
                  type="date"
                  value={priceForm.validFrom}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido hasta</Label>
                <Input 
                  type="date"
                  value={priceForm.validUntil}
                  onChange={(e) => setPriceForm(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPriceModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPrice} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Añadir precio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar desde Excel
            </DialogTitle>
            <DialogDescription>
              Sube un archivo Excel con los datos de benchmark
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Arrastra un archivo Excel aquí o haz clic para seleccionar
              </p>
              <Button variant="outline" size="sm">
                Seleccionar archivo
              </Button>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-muted-foreground">
                <p className="font-medium">Formato esperado:</p>
                <p>Columnas: Categoría, Producto, Unidad, Región, P10, P25, P50, P75, P90, Fuente, Válido desde, Válido hasta</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CostConsultingBenchmarks;
