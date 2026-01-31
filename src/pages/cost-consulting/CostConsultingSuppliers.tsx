import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  Building2, 
  Search, 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  X,
  ExternalLink,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';

// Mock data
const mockSuppliers = [
  {
    id: '1',
    name: 'Química Industrial SL',
    cif: 'B12345678',
    categories: ['Químicos - Coagulantes', 'Químicos - Floculantes'],
    verified: true,
    projects: 3,
    reputation: 4,
    region: 'Cataluña',
    web: 'www.quimicaindustrial.es',
    size: 'grande',
    certifications: ['ISO 9001', 'ISO 14001'],
    avgPriceVsBenchmark: -5,
    invoiceCount: 24,
    totalSpend: 135000
  },
  {
    id: '2',
    name: 'Mantenimientos SA',
    cif: 'A87654321',
    categories: ['O&M - Mantenimiento preventivo'],
    verified: true,
    projects: 2,
    reputation: 3,
    region: 'Madrid',
    web: 'www.mantenimientossa.com',
    size: 'pyme',
    certifications: ['ISO 9001'],
    avgPriceVsBenchmark: 2,
    invoiceCount: 12,
    totalSpend: 72000
  },
  {
    id: '3',
    name: 'Residuos del Norte SL',
    cif: 'B55667788',
    categories: ['Residuos - Lodos', 'Residuos - Transporte'],
    verified: true,
    projects: 1,
    reputation: 4,
    region: 'País Vasco',
    web: 'www.residuosnorte.es',
    size: 'pyme',
    certifications: ['ISO 9001', 'ISO 14001', 'OHSAS 18001'],
    avgPriceVsBenchmark: -8,
    invoiceCount: 8,
    totalSpend: 35000
  }
];

const pendingSuppliers = [
  {
    id: 'p1',
    name: 'Química del Sur SL',
    cif: 'B12345678',
    suggestedCategory: 'Químicos',
    detectedIn: 'Proyecto Lácteos Norte',
    web: 'www.quimicadelsur.es'
  },
  {
    id: 'p2',
    name: 'Transportes Rápidos SA',
    cif: 'A87654321',
    suggestedCategory: 'Residuos - Transporte',
    detectedIn: 'Proyecto Química Levante',
    web: null
  },
  {
    id: 'p3',
    name: 'Servicios Técnicos Levante',
    cif: 'B99887766',
    suggestedCategory: 'O&M',
    detectedIn: 'Proyecto Alimentaria Sur',
    web: 'www.stlevante.com'
  },
  {
    id: 'p4',
    name: 'Gestión Ambiental 2000',
    cif: 'B11223344',
    suggestedCategory: 'Residuos - Gestión',
    detectedIn: 'Proyecto Farmacéutica Centro',
    web: 'www.gestionambiental2000.es'
  },
  {
    id: 'p5',
    name: 'Limpieza Industrial Norte',
    cif: 'A55443322',
    suggestedCategory: 'Limpieza',
    detectedIn: 'Proyecto Lácteos Norte',
    web: null
  }
];

const categories = [
  'Químicos - Coagulantes',
  'Químicos - Floculantes',
  'Químicos - Biocidas',
  'Químicos - pH',
  'Residuos - Lodos',
  'Residuos - Transporte',
  'Residuos - Gestión',
  'O&M - Mantenimiento preventivo',
  'O&M - Mantenimiento correctivo',
  'Energía',
  'Limpieza',
  'Análisis - Laboratorio'
];

const priceHistory = [
  { date: 'Ene 2024', price: 0.35, benchmark: 0.32 },
  { date: 'Feb 2024', price: 0.36, benchmark: 0.33 },
  { date: 'Mar 2024', price: 0.35, benchmark: 0.32 },
  { date: 'Abr 2024', price: 0.38, benchmark: 0.34 },
  { date: 'May 2024', price: 0.38, benchmark: 0.35 }
];

const CostConsultingSuppliers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<typeof mockSuppliers[0] | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [supplierToVerify, setSupplierToVerify] = useState<typeof pendingSuppliers[0] | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Form state for verification
  const [verifyForm, setVerifyForm] = useState({
    name: '',
    cif: '',
    region: '',
    web: '',
    size: '',
    certifications: [] as string[],
    notes: ''
  });

  const openVerifyModal = (supplier: typeof pendingSuppliers[0]) => {
    setSupplierToVerify(supplier);
    setVerifyForm({
      name: supplier.name,
      cif: supplier.cif,
      region: '',
      web: supplier.web || '',
      size: 'pyme',
      certifications: [],
      notes: ''
    });
    setSelectedCategories([supplier.suggestedCategory]);
    setVerifyModalOpen(true);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleCertification = (cert: string) => {
    setVerifyForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const renderStars = (rating: number) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
          }`}
        />
      ))}
    </div>
  );

  const filteredSuppliers = mockSuppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedSuppliers = filteredSuppliers.filter(s => s.verified);

  // Group suppliers by category
  const suppliersByCategory: Record<string, typeof mockSuppliers> = {};
  filteredSuppliers.forEach(supplier => {
    supplier.categories.forEach(cat => {
      const mainCat = cat.split(' - ')[0];
      if (!suppliersByCategory[mainCat]) {
        suppliersByCategory[mainCat] = [];
      }
      if (!suppliersByCategory[mainCat].find(s => s.id === supplier.id)) {
        suppliersByCategory[mainCat].push(supplier);
      }
    });
  });

  const SupplierTable = ({ suppliers }: { suppliers: typeof mockSuppliers }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Categorías</TableHead>
          <TableHead className="text-center">Verificado</TableHead>
          <TableHead className="text-center">Proyectos</TableHead>
          <TableHead className="text-center">Reputación</TableHead>
          <TableHead className="text-center">vs Benchmark</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map(supplier => (
          <TableRow 
            key={supplier.id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => setSelectedSupplier(supplier)}
          >
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {supplier.categories.slice(0, 2).map(cat => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {cat.split(' - ')[0]}
                  </Badge>
                ))}
                {supplier.categories.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{supplier.categories.length - 2}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-center">
              {supplier.verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">{supplier.projects}</TableCell>
            <TableCell className="text-center">
              {supplier.reputation > 0 ? renderStars(supplier.reputation) : '-'}
            </TableCell>
            <TableCell className="text-center">
              {supplier.avgPriceVsBenchmark < 0 ? (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {supplier.avgPriceVsBenchmark}%
                </span>
              ) : supplier.avgPriceVsBenchmark > 0 ? (
                <span className="text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  +{supplier.avgPriceVsBenchmark}%
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation();
                setSelectedSupplier(supplier);
              }}>
                Ver
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y compara proveedores de servicios de agua
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Proveedor
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar proveedores..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos ({mockSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verificados ({verifiedSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pendientes ({pendingSuppliers.length})
            {pendingSuppliers.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="category">
            Por Categoría
          </TabsTrigger>
        </TabsList>

        {/* All Suppliers */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <SupplierTable suppliers={filteredSuppliers} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verified Suppliers */}
        <TabsContent value="verified" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <SupplierTable suppliers={verifiedSuppliers} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Verification */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="bg-yellow-50 dark:bg-yellow-950/30 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-lg">Pendientes de Verificación ({pendingSuppliers.length})</CardTitle>
              </div>
              <CardDescription>
                Proveedores detectados automáticamente en proyectos que necesitan verificación
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {pendingSuppliers.map(supplier => (
                <Card key={supplier.id} className="border-yellow-200 dark:border-yellow-900">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{supplier.name}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Detectado en: </span>
                            <span className="font-medium">{supplier.detectedIn}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CIF: </span>
                            <span className="font-medium">{supplier.cif}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Categoría sugerida: </span>
                            <Badge variant="outline">{supplier.suggestedCategory}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Web: </span>
                            {supplier.web ? (
                              <a href={`https://${supplier.web}`} target="_blank" rel="noopener noreferrer" 
                                 className="text-primary hover:underline inline-flex items-center gap-1">
                                {supplier.web}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground italic">No encontrada</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openVerifyModal(supplier)}>
                          Verificar
                        </Button>
                        <Button size="sm" variant="ghost">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category */}
        <TabsContent value="category" className="mt-4 space-y-4">
          {Object.entries(suppliersByCategory).map(([category, suppliers]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{category}</span>
                  <Badge variant="secondary">{suppliers.length} proveedores</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SupplierTable suppliers={suppliers} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Verify Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verificar: {supplierToVerify?.name}</DialogTitle>
            <DialogDescription>
              Completa la información del proveedor para añadirlo a la base de datos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Data */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Datos Detectados</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input 
                    value={verifyForm.name} 
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CIF</Label>
                  <Input 
                    value={verifyForm.cif} 
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, cif: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Categorías (selecciona las que apliquen)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox 
                      id={cat} 
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <Label htmlFor={cat} className="text-sm font-normal cursor-pointer">
                      {cat}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Ubicación</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Región</Label>
                  <Select 
                    value={verifyForm.region} 
                    onValueChange={(value) => setVerifyForm(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="andalucia">Andalucía</SelectItem>
                      <SelectItem value="cataluna">Cataluña</SelectItem>
                      <SelectItem value="madrid">Madrid</SelectItem>
                      <SelectItem value="valencia">C. Valenciana</SelectItem>
                      <SelectItem value="pais_vasco">País Vasco</SelectItem>
                      <SelectItem value="galicia">Galicia</SelectItem>
                      <SelectItem value="castilla_leon">Castilla y León</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Web</Label>
                  <Input 
                    value={verifyForm.web} 
                    onChange={(e) => setVerifyForm(prev => ({ ...prev, web: e.target.value }))}
                    placeholder="www.ejemplo.es"
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Clasificación</h4>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select 
                  value={verifyForm.size} 
                  onValueChange={(value) => setVerifyForm(prev => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro (&lt;10 empleados)</SelectItem>
                    <SelectItem value="pyme">PYME (10-250 empleados)</SelectItem>
                    <SelectItem value="grande">Grande (&gt;250 empleados)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Certificaciones</Label>
                <div className="flex flex-wrap gap-4">
                  {['ISO 9001', 'ISO 14001', 'OHSAS 18001'].map(cert => (
                    <div key={cert} className="flex items-center space-x-2">
                      <Checkbox 
                        id={cert} 
                        checked={verifyForm.certifications.includes(cert)}
                        onCheckedChange={() => toggleCertification(cert)}
                      />
                      <Label htmlFor={cert} className="text-sm font-normal cursor-pointer">
                        {cert}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                value={verifyForm.notes}
                onChange={(e) => setVerifyForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el proveedor..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive">
              Rechazar
            </Button>
            <Button>
              Verificar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Sheet */}
      <Sheet open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedSupplier && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedSupplier.verified ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </div>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedSupplier.name}
                </SheetTitle>
                <SheetDescription>
                  CIF: {selectedSupplier.cif}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* General Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Región:</span>
                      <span className="font-medium">{selectedSupplier.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamaño:</span>
                      <Badge variant="outline">{selectedSupplier.size === 'grande' ? 'Grande' : 'PYME'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Web:</span>
                      {selectedSupplier.web && (
                        <a href={`https://${selectedSupplier.web}`} target="_blank" rel="noopener noreferrer"
                           className="text-primary hover:underline inline-flex items-center gap-1">
                          {selectedSupplier.web}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Reputación:</span>
                      {renderStars(selectedSupplier.reputation)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificaciones:</span>
                      <div className="flex gap-1">
                        {selectedSupplier.certifications.map(cert => (
                          <Badge key={cert} variant="secondary" className="text-xs">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Categorías que Sirve</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.categories.map(cat => (
                        <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Projects */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Proyectos donde Aparece
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {['Proyecto Lácteos Norte', 'Proyecto Química Levante', 'Proyecto Alimentaria Sur']
                        .slice(0, selectedSupplier.projects)
                        .map((project, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{project}</span>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Price History */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Historial de Precios
                    </CardTitle>
                    <CardDescription>
                      Basado en {selectedSupplier.invoiceCount} facturas analizadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {priceHistory.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">{entry.date}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{entry.price}€/kg</span>
                            <span className={entry.price > entry.benchmark ? 'text-red-600' : 'text-green-600'}>
                              vs {entry.benchmark}€
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmark */}
                <Card className={selectedSupplier.avgPriceVsBenchmark < 0 
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30' 
                  : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                }>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Benchmarking vs Mercado</div>
                        <div className={`text-2xl font-bold ${
                          selectedSupplier.avgPriceVsBenchmark < 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {selectedSupplier.avgPriceVsBenchmark < 0 ? '' : '+'}
                          {selectedSupplier.avgPriceVsBenchmark}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Gasto total: {selectedSupplier.totalSpend.toLocaleString()}€
                        </div>
                      </div>
                      {selectedSupplier.avgPriceVsBenchmark < 0 ? (
                        <TrendingDown className="h-10 w-10 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingUp className="h-10 w-10 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CostConsultingSuppliers;
