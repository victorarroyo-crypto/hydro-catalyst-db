import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Users,
  AlertTriangle,
  Star,
} from 'lucide-react';
import {
  useCostAdminSuppliers,
  useCostPendingSuppliers,
  useSupplierMutations,
} from '@/hooks/useCostAdminData';
import { Supplier, SupplierFilters, SUPPLIER_CATEGORIES, SupplierCategory } from '@/types/costConsulting';
import { SupplierDetailSheet } from '@/components/cost-consulting/admin/SupplierDetailSheet';
import { ExtendedSupplierFormModal } from '@/components/cost-consulting/admin/ExtendedSupplierFormModal';

const CostSuppliersAdmin = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SupplierFilters>({
    search: '',
    categoria: undefined,
    verified: 'all',
    activo: 'all',
  });
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useCostAdminSuppliers(filters);
  const { data: pendingSuppliers = [] } = useCostPendingSuppliers();
  const { createSupplier, updateSupplier, deleteSupplier } = useSupplierMutations();

  // Calculate stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const verified = suppliers.filter(s => s.verified).length;
    const pending = pendingSuppliers.length;
    const inactive = suppliers.filter(s => !s.activo).length;
    return { total, verified, pending, inactive };
  }, [suppliers, pendingSuppliers]);

  const handleRowClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSheetOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
    setSheetOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSupplier.mutate(id);
  };

  const handleFormSubmit = (data: Partial<Supplier>) => {
    if (editingSupplier) {
      updateSupplier.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplier.mutate(data as any);
    }
    setFormOpen(false);
    setEditingSupplier(null);
  };

  const handleNewSupplier = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const getRatingAvg = (supplier: Supplier) => {
    if (!supplier.rating) return null;
    const { calidad, servicio, precio, cumplimiento } = supplier.rating;
    return ((calidad + servicio + precio + cumplimiento) / 4).toFixed(1);
  };

  // Group suppliers by category for grouped view
  const groupedSuppliers = useMemo(() => {
    const groups: Record<string, Supplier[]> = {};
    suppliers.forEach(s => {
      const cat = s.categoria || 'sin_categoria';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [suppliers]);

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
              Administración de Proveedores
              <Badge variant="outline" className="text-xs">Admin</Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestión completa de proveedores y verificación
            </p>
          </div>
        </div>
        <Button onClick={handleNewSupplier} className="bg-[#307177] hover:bg-[#307177]/90">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-[#307177]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verificados</p>
                <p className="text-2xl font-bold text-[#8cb63c]">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#8cb63c]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-[#ffa720]">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-[#ffa720]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-muted-foreground" />
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
                placeholder="Buscar por nombre, CIF..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.categoria || 'all'}
              onValueChange={v => setFilters({ ...filters, categoria: v === 'all' ? undefined : v as SupplierCategory })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(SUPPLIER_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.verified === 'all' ? 'all' : String(filters.verified)}
              onValueChange={v => setFilters({ ...filters, verified: v === 'all' ? 'all' : v === 'true' })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Verificado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Verificados</SelectItem>
                <SelectItem value="false">No verificados</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.activo === 'all' ? 'all' : String(filters.activo)}
              onValueChange={v => setFilters({ ...filters, activo: v === 'all' ? 'all' : v === 'true' })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <Users className="h-4 w-4 mr-2" />
            Todos ({suppliers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Pendientes ({pendingSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="by-category">Por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando proveedores...
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron proveedores
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map(supplier => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(supplier)}
                    >
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.tax_id || '-'}</TableCell>
                      <TableCell>
                        {supplier.categoria ? (
                          <Badge variant="outline">
                            {SUPPLIER_CATEGORIES[supplier.categoria]}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.verified ? (
                          <Badge className="bg-[#8cb63c] text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-[#ffa720] text-[#ffa720]">
                            <Clock className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.activo ? (
                          <Badge variant="secondary">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{supplier.region || '-'}</TableCell>
                      <TableCell>
                        {supplier.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-[#ffa720] text-[#ffa720]" />
                            {getRatingAvg(supplier)}
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proveedores Pendientes de Verificación</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>Fecha creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay proveedores pendientes de verificación
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingSuppliers.map(supplier => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.source === 'extracted' ? 'secondary' : 'outline'}>
                          {supplier.source === 'extracted' ? 'Extraído' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>{supplier.tax_id || '-'}</TableCell>
                      <TableCell>
                        {supplier.created_at 
                          ? new Date(supplier.created_at).toLocaleDateString('es-ES')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRowClick(supplier)}
                        >
                          Verificar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="by-category" className="mt-4 space-y-4">
          {Object.entries(groupedSuppliers).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {SUPPLIER_CATEGORIES[category as SupplierCategory] || 'Sin categoría'}
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableBody>
                  {items.map(supplier => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(supplier)}
                    >
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.tax_id || '-'}</TableCell>
                      <TableCell>{supplier.region || '-'}</TableCell>
                      <TableCell>
                        {supplier.verified ? (
                          <CheckCircle className="h-4 w-4 text-[#8cb63c]" />
                        ) : (
                          <Clock className="h-4 w-4 text-[#ffa720]" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <SupplierDetailSheet
        supplier={selectedSupplier}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      <ExtendedSupplierFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editingSupplier}
        onSubmit={handleFormSubmit}
        isLoading={createSupplier.isPending || updateSupplier.isPending}
      />
    </div>
  );
};

export default CostSuppliersAdmin;
