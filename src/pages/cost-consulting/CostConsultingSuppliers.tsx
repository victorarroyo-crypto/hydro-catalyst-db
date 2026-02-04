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
  BarChart3,
  Loader2
} from 'lucide-react';
import { useCostAllSuppliers, CostSupplier } from '@/hooks/useCostConsultingData';
import { createSupplier, updateSupplier, deleteSupplier } from '@/services/costConsultingApi';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

// UI display type for suppliers
interface DisplaySupplier {
  id: string;
  name: string;
  cif: string | null;
  categories: string[];
  verified: boolean;
  projects: number;
  reputation: number;
  region: string | null;
  web: string | null;
  size: string | null;
  certifications: string[];
  avgPriceVsBenchmark: number;
  invoiceCount: number;
  totalSpend: number;
}

const mapSupplierToDisplay = (supplier: CostSupplier): DisplaySupplier => ({
  id: supplier.id,
  name: supplier.name,
  cif: supplier.tax_id,
  categories: [],
  verified: supplier.verified,
  projects: 0,
  reputation: supplier.reputation_score || 0,
  region: supplier.region,
  web: null,
  size: supplier.company_size,
  certifications: supplier.certifications || [],
  avgPriceVsBenchmark: supplier.price_competitiveness === 'below' ? -5 : supplier.price_competitiveness === 'above' ? 5 : 0,
  invoiceCount: 0,
  totalSpend: 0
});

const CostConsultingSuppliers = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<DisplaySupplier | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierToVerify, setSupplierToVerify] = useState<DisplaySupplier | null>(null);
  
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

  // Form state for adding new supplier
  const [addForm, setAddForm] = useState({
    name: '',
    tradeName: '',
    cif: '',
    country: 'España',
    region: '',
    web: '',
    email: '',
    phone: '',
    contactPerson: '',
    size: 'pyme'
  });

  const { data: rawSuppliers = [], isLoading, refetch } = useCostAllSuppliers();
  
  // Map to display format
  const suppliers: DisplaySupplier[] = rawSuppliers.map(mapSupplierToDisplay);
  const pendingSuppliers: DisplaySupplier[] = suppliers.filter(s => !s.verified);

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

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedSuppliers = filteredSuppliers.filter(s => s.verified);

  // Group suppliers by category
  const suppliersByCategory: Record<string, DisplaySupplier[]> = {};
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

  // === HANDLERS ===
  
  const handleAddSupplier = async () => {
    if (!addForm.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createSupplier({
        name: addForm.name,
        trade_name: addForm.tradeName || undefined,
        tax_id: addForm.cif || undefined,
        country: addForm.country,
        region: addForm.region || undefined,
        web: addForm.web || undefined,
        email: addForm.email || undefined,
        phone: addForm.phone || undefined,
        contact_person: addForm.contactPerson || undefined,
        company_size: addForm.size || undefined,
      });
      
      toast.success('Proveedor añadido correctamente');
      setAddModalOpen(false);
      setAddForm({
        name: '',
        tradeName: '',
        cif: '',
        country: 'España',
        region: '',
        web: '',
        email: '',
        phone: '',
        contactPerson: '',
        size: 'pyme'
      });
      queryClient.invalidateQueries({ queryKey: ['cost-all-suppliers'] });
      refetch();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Error al añadir el proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySupplier = async () => {
    if (!supplierToVerify) return;
    
    setIsSubmitting(true);
    try {
      await updateSupplier(supplierToVerify.id, {
        name: verifyForm.name,
        tax_id: verifyForm.cif || undefined,
        region: verifyForm.region || undefined,
        web: verifyForm.web || undefined,
        company_size: verifyForm.size || undefined,
      });
      
      toast.success('Proveedor verificado correctamente');
      setVerifyModalOpen(false);
      setSupplierToVerify(null);
      queryClient.invalidateQueries({ queryKey: ['cost-all-suppliers'] });
      refetch();
    } catch (error) {
      console.error('Error verifying supplier:', error);
      toast.error('Error al verificar el proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSupplier = async (supplierId: string) => {
    setIsSubmitting(true);
    try {
      await deleteSupplier(supplierId);
      toast.success('Proveedor rechazado y eliminado');
      setVerifyModalOpen(false);
      setSupplierToVerify(null);
      queryClient.invalidateQueries({ queryKey: ['cost-all-suppliers'] });
      refetch();
    } catch (error) {
      console.error('Error rejecting supplier:', error);
      toast.error('Error al rechazar el proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVerifyModal = (supplier: DisplaySupplier) => {
    setSupplierToVerify(supplier);
    setVerifyForm({
      name: supplier.name,
      cif: supplier.cif || '',
      region: supplier.region || '',
      web: supplier.web || '',
      size: supplier.size || 'pyme',
      certifications: supplier.certifications,
      notes: ''
    });
    setVerifyModalOpen(true);
  };

  const SupplierTable = ({ suppliers }: { suppliers: DisplaySupplier[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>CIF</TableHead>
          <TableHead className="text-center">Verificado</TableHead>
          <TableHead className="text-center">Región</TableHead>
          <TableHead className="text-center">Reputación</TableHead>
          <TableHead className="text-center">vs Benchmark</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No hay proveedores que mostrar
            </TableCell>
          </TableRow>
        ) : (
          suppliers.map(supplier => (
            <TableRow 
              key={supplier.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedSupplier(supplier)}
            >
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell className="text-muted-foreground">{supplier.cif || '-'}</TableCell>
              <TableCell className="text-center">
                {supplier.verified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600 mx-auto" />
                )}
              </TableCell>
              <TableCell className="text-center">{supplier.region || '-'}</TableCell>
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
          ))
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        <Button onClick={() => setAddModalOpen(true)}>
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
            Todos ({suppliers.length})
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
              {pendingSuppliers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay proveedores pendientes de verificación
                </p>
              ) : (
                pendingSuppliers.map(supplier => (
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
                              <span className="text-muted-foreground">Región: </span>
                              <span className="font-medium">{supplier.region || 'Sin especificar'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CIF: </span>
                              <span className="font-medium">{supplier.cif || 'Sin CIF'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tamaño: </span>
                              <Badge variant="outline">{supplier.size || 'Sin especificar'}</Badge>
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
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRejectSupplier(supplier.id)}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Supplier Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir nuevo proveedor</DialogTitle>
            <DialogDescription>
              Introduce los datos del proveedor para añadirlo a la base de datos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input 
                  value={addForm.name} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre comercial</Label>
                <Input 
                  value={addForm.tradeName} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, tradeName: e.target.value }))}
                  placeholder="Nombre comercial"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CIF</Label>
                <Input 
                  value={addForm.cif} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, cif: e.target.value }))}
                  placeholder="B12345678"
                />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Input 
                  value={addForm.country} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Región</Label>
                <Select 
                  value={addForm.region} 
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, region: value }))}
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
                  value={addForm.web} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, web: e.target.value }))}
                  placeholder="www.ejemplo.es"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={addForm.email} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contacto@ejemplo.es"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  value={addForm.phone} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+34 900 000 000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Persona de contacto</Label>
                <Input 
                  value={addForm.contactPerson} 
                  onChange={(e) => setAddForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select 
                  value={addForm.size} 
                  onValueChange={(value) => setAddForm(prev => ({ ...prev, size: value }))}
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSupplier} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Añadir proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verificar proveedor</DialogTitle>
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
                        id={`verify-${cert}`} 
                        checked={verifyForm.certifications.includes(cert)}
                        onCheckedChange={() => toggleCertification(cert)}
                      />
                      <Label htmlFor={`verify-${cert}`} className="text-sm font-normal cursor-pointer">
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
            <Button 
              variant="destructive" 
              onClick={() => supplierToVerify && handleRejectSupplier(supplierToVerify.id)}
              disabled={isSubmitting}
            >
              Rechazar
            </Button>
            <Button onClick={handleVerifySupplier} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                  CIF: {selectedSupplier.cif || 'No especificado'}
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
                      <span className="font-medium">{selectedSupplier.region || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamaño:</span>
                      <Badge variant="outline">{selectedSupplier.size === 'grande' ? 'Grande' : selectedSupplier.size === 'micro' ? 'Micro' : 'PYME'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Web:</span>
                      {selectedSupplier.web ? (
                        <a href={`https://${selectedSupplier.web}`} target="_blank" rel="noopener noreferrer"
                           className="text-primary hover:underline inline-flex items-center gap-1">
                          {selectedSupplier.web}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Reputación:</span>
                      {selectedSupplier.reputation > 0 ? renderStars(selectedSupplier.reputation) : <span className="text-muted-foreground">Sin valorar</span>}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificaciones:</span>
                      <div className="flex gap-1">
                        {selectedSupplier.certifications.length > 0 ? (
                          selectedSupplier.certifications.map(cert => (
                            <Badge key={cert} variant="secondary" className="text-xs">{cert}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmark */}
                <Card className={selectedSupplier.avgPriceVsBenchmark < 0 
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30' 
                  : selectedSupplier.avgPriceVsBenchmark > 0
                    ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                    : ''
                }>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Benchmarking vs Mercado</div>
                        <div className={`text-2xl font-bold ${
                          selectedSupplier.avgPriceVsBenchmark < 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : selectedSupplier.avgPriceVsBenchmark > 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                        }`}>
                          {selectedSupplier.avgPriceVsBenchmark === 0 
                            ? 'Sin datos' 
                            : `${selectedSupplier.avgPriceVsBenchmark < 0 ? '' : '+'}${selectedSupplier.avgPriceVsBenchmark}%`
                          }
                        </div>
                      </div>
                      {selectedSupplier.avgPriceVsBenchmark !== 0 && (
                        selectedSupplier.avgPriceVsBenchmark < 0 ? (
                          <TrendingDown className="h-10 w-10 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingUp className="h-10 w-10 text-red-600 dark:text-red-400" />
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                {!selectedSupplier.verified && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => openVerifyModal(selectedSupplier)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verificar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleRejectSupplier(selectedSupplier.id)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CostConsultingSuppliers;
