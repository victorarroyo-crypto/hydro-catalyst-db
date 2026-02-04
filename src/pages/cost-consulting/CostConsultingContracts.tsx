import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Calculator,
  Flag,
  FileText,
  CreditCard,
  TrendingUp,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Skull,
  RefreshCw,
  Info
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCostContracts, useCostAllSuppliers, CostContract } from '@/hooks/useCostConsultingData';
import { ContractFormModal } from '@/components/cost-consulting/ContractFormModal';
import { FailedDocumentsAlert } from '@/components/cost-consulting/FailedDocumentsAlert';
import { deleteContract } from '@/services/costConsultingApi';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// Helper function to calculate days until contract end/renewal
const getDaysToRenewal = (endDate: string | null): number => {
  if (!endDate) return Infinity;
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Type for mapped contract display
interface DisplayContract {
  id: string;
  supplier: string;
  contractNumber: string | null;
  category: string;
  subcategory: string;
  annualValue: number;
  endDate: string | null;
  startDate: string | null;
  riskScore: number;
  riskFlags: string[];
  alertsCount: number;
  autoRenewal: boolean;
  paymentDays: number | null;
  paymentTerms: string;
  indexation: string;
  earlyPaymentDiscount: number;
  penalty: string;
  isZombie: boolean;
  benchmarkComparison: {
    price_difference_pct?: number;
  } | null;
  products: Array<{
    name: string;
    price: number;
    unit: string;
    benchmarkMin: number;
    benchmarkMax: number;
    gap: number;
  }>;
  alerts: string[];
  recommendations: string[];
}

// Map Supabase data to display format
const mapContractToDisplay = (contract: CostContract): DisplayContract => {
  const riskFlags = contract.risk_flags || [];
  const prices = contract.prices || [];
  
  // Map prices from DB to product format
  const products = prices.map((p: Record<string, unknown>) => ({
    name: (p.name as string) || 'Producto',
    price: (p.price as number) || 0,
    unit: (p.unit as string) || '€',
    benchmarkMin: (p.benchmark_min as number) || 0,
    benchmarkMax: (p.benchmark_max as number) || 0,
    gap: (p.gap as number) || 0,
  }));

  // Extract category from contract or first price item
  const contractAny = contract as unknown as Record<string, unknown>;
  const firstPrice = prices[0] as Record<string, unknown> | undefined;
  const extractedCategory = (contractAny.category as string) || (firstPrice?.category as string) || 'Contrato';
  
  // Determine if contract is zombie (high risk + no activity)
  const isZombie = (contract.risk_score || 0) >= 8 || riskFlags.includes('zombie');

  return {
    id: contract.id,
    supplier: contract.supplier_name_raw || contract.cost_suppliers?.name || 'Sin nombre',
    contractNumber: contract.contract_number,
    category: extractedCategory,
    subcategory: '',
    annualValue: contract.total_annual_value || 0,
    endDate: contract.end_date,
    startDate: contract.start_date,
    riskScore: contract.risk_score || 0,
    riskFlags,
    alertsCount: riskFlags.length,
    autoRenewal: contract.auto_renewal || false,
    paymentDays: contract.payment_days,
    paymentTerms: contract.payment_days ? `${contract.payment_days} días` : 'No especificado',
    indexation: (contractAny.indexation_type as string) || 'Fijo',
    earlyPaymentDiscount: (contractAny.early_payment_discount as number) || 0,
    penalty: 'Ver contrato',
    isZombie,
    benchmarkComparison: contract.benchmark_comparison as { price_difference_pct?: number } | null,
    products,
    alerts: riskFlags,
    recommendations: [],
  };
};

const categories = ['Químicos', 'O&M', 'Limpieza', 'Residuos', 'Canon y tasas', 'Otros'];

const getRiskBadge = (score: number) => {
  if (score <= 33) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span>{score}</span>
      </div>
    );
  } else if (score <= 66) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <span>{score}</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span>{score}</span>
      </div>
    );
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Indefinido';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};

const CostConsultingContracts = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');
  const [selectedContract, setSelectedContract] = useState<DisplayContract | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<CostContract | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  // Fetch real data from Supabase
  const { data: contracts = [], isLoading, error, refetch } = useCostContracts(id);
  const { data: suppliers = [] } = useCostAllSuppliers();

  // Map contracts to display format
  const mappedContracts = contracts.map(mapContractToDisplay);

  // Filter and sort
  const filteredContracts = mappedContracts
    .filter(contract => {
      const matchesSearch = contract.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesCategory = categoryFilter === 'all' || contract.category === categoryFilter;
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = !contract.isZombie && getDaysToRenewal(contract.endDate) >= 90;
      } else if (statusFilter === 'zombies') {
        matchesStatus = contract.isZombie;
      } else if (statusFilter === 'expiring') {
        const daysToEnd = getDaysToRenewal(contract.endDate);
        matchesStatus = daysToEnd < 90 && daysToEnd > 0;
      }
      
      // Risk filter
      let matchesRisk = true;
      if (riskFilter === 'high') {
        matchesRisk = contract.riskScore >= 8;
      } else if (riskFilter === 'medium') {
        matchesRisk = contract.riskScore >= 5 && contract.riskScore < 8;
      } else if (riskFilter === 'low') {
        matchesRisk = contract.riskScore < 5;
      }
      
      return matchesSearch && matchesCategory && matchesStatus && matchesRisk;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.annualValue - a.annualValue;
        case 'endDate':
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case 'risk':
        default:
          return b.riskScore - a.riskScore;
      }
    });

  const handleViewContract = (contract: DisplayContract) => {
    setSelectedContract(contract);
    setSheetOpen(true);
  };

  const handleEditContract = (contractId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setEditingContract(contract);
      setFormModalOpen(true);
    }
  };

  const handleDeleteContract = async (contractId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContractToDelete(contractId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contractToDelete || !id) return;
    try {
      await deleteContract(id, contractToDelete);
      toast.success('Contrato eliminado');
      refetch();
      setSheetOpen(false);
    } catch (error) {
      toast.error('Error al eliminar el contrato');
    } finally {
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  const handleFormSaved = () => {
    refetch();
    setEditingContract(null);
  };

  const openNewContractModal = () => {
    setEditingContract(null);
    setFormModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Error cargando contratos: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/cost-consulting" className="hover:text-foreground transition-colors">
            Consultoría de Costes
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/cost-consulting/${id}`} className="hover:text-foreground transition-colors">
            Análisis
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Contratos</span>
        </nav>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/cost-consulting/${id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
              <p className="text-muted-foreground mt-1">
                {filteredContracts.length} contratos · {filteredContracts.reduce((sum, c) => sum + c.annualValue, 0).toLocaleString('es-ES')}€/año
              </p>
            </div>
          </div>
          <Button onClick={openNewContractModal}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir manual
          </Button>
        </div>
      </div>

      {/* Failed Documents Alert */}
      {id && (
        <FailedDocumentsAlert
          projectId={id}
          onDocumentReprocessed={() => refetch()}
          onAddManual={(type) => {
            if (type === 'contract') openNewContractModal();
          }}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search and category */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="sr-only">Buscar proveedor o nº contrato</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedor o nº contrato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-[180px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[180px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Score riesgo</SelectItem>
                  <SelectItem value="value">Valor anual</SelectItem>
                  <SelectItem value="endDate">Fecha fin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Toggle filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <ToggleGroup 
                type="single" 
                value={statusFilter} 
                onValueChange={(v) => v && setStatusFilter(v)}
                className="justify-start"
              >
                <ToggleGroupItem value="all" size="sm">Todos</ToggleGroupItem>
                <ToggleGroupItem value="active" size="sm">Activos</ToggleGroupItem>
                <ToggleGroupItem value="zombies" size="sm" className="text-red-600">
                  <Skull className="h-3 w-3 mr-1" />
                  Zombies
                </ToggleGroupItem>
                <ToggleGroupItem value="expiring" size="sm" className="text-amber-600">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Por vencer
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <Separator orientation="vertical" className="h-8" />
            
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Riesgo</Label>
              <ToggleGroup 
                type="single" 
                value={riskFilter} 
                onValueChange={(v) => v && setRiskFilter(v)}
                className="justify-start"
              >
                <ToggleGroupItem value="all" size="sm">Todos</ToggleGroupItem>
                <ToggleGroupItem value="high" size="sm" className="text-red-600">Alto (≥8)</ToggleGroupItem>
                <ToggleGroupItem value="medium" size="sm" className="text-amber-600">Medio (5-7)</ToggleGroupItem>
                <ToggleGroupItem value="low" size="sm" className="text-green-600">Bajo (&lt;5)</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Nº Contrato</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Valor Anual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Indexación</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const daysToRenewal = getDaysToRenewal(contract.endDate);
                  const benchmarkDiff = contract.benchmarkComparison?.price_difference_pct;
                  
                  return (
                    <TableRow 
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {/* Proveedor */}
                      <TableCell 
                        className="font-medium" 
                        onClick={() => handleViewContract(contract)}
                      >
                        {contract.supplier}
                      </TableCell>
                      
                      {/* Nº Contrato */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <span className="text-sm text-muted-foreground">
                          {contract.contractNumber || '-'}
                        </span>
                      </TableCell>
                      
                      {/* Vigencia */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <span className="text-sm">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </span>
                      </TableCell>
                      
                      {/* Valor Anual */}
                      <TableCell className="text-right font-medium" onClick={() => handleViewContract(contract)}>
                        {contract.annualValue.toLocaleString('es-ES')}€
                      </TableCell>
                      
                      {/* Estado */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <div className="flex flex-wrap gap-1">
                          {contract.isZombie && (
                            <Badge variant="destructive" className="text-xs">
                              <Skull className="h-3 w-3 mr-1" />
                              Zombie
                            </Badge>
                          )}
                          {contract.autoRenewal && daysToRenewal < 90 && daysToRenewal > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Renueva en {daysToRenewal}d
                            </Badge>
                          )}
                          {!contract.isZombie && (!contract.autoRenewal || daysToRenewal >= 90) && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Riesgo */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-help",
                              contract.riskScore >= 8 && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                              contract.riskScore >= 5 && contract.riskScore < 8 && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
                              contract.riskScore < 5 && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            )}>
                              {contract.riskScore}
                            </div>
                          </TooltipTrigger>
                          {contract.riskFlags.length > 0 && (
                            <TooltipContent side="left" className="max-w-xs">
                              <div className="space-y-1">
                                {contract.riskFlags.map((flag, i) => (
                                  <p key={i} className="text-xs">• {flag}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      
                      {/* Pago */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <div className="text-sm">
                          <span>{contract.paymentDays || '-'} días</span>
                          {contract.earlyPaymentDiscount > 0 && (
                            <span className="block text-xs text-green-600 dark:text-green-400">
                              (-{contract.earlyPaymentDiscount}% pronto pago)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Indexación */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        <Badge variant="outline" className="text-xs">
                          {contract.indexation}
                        </Badge>
                      </TableCell>
                      
                      {/* Benchmark */}
                      <TableCell onClick={() => handleViewContract(contract)}>
                        {benchmarkDiff != null ? (
                          <span className={cn(
                            "font-medium text-sm",
                            benchmarkDiff > 0 && "text-red-600 dark:text-red-400",
                            benchmarkDiff < 0 && "text-green-600 dark:text-green-400",
                            benchmarkDiff === 0 && "text-muted-foreground"
                          )}>
                            {benchmarkDiff > 0 ? '+' : ''}{benchmarkDiff.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewContract(contract)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => handleEditContract(contract.id, e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => handleDeleteContract(contract.id, e)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Contract Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedContract && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedContract.supplier}
                </SheetTitle>
                <SheetDescription>
                  Contrato de {selectedContract.category.toLowerCase()}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Risk Score */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Score de Riesgo</span>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(selectedContract.riskScore)}
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>

                {/* General Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Información General
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Categoría</span>
                      <p className="font-medium">{selectedContract.category} - {selectedContract.subcategory}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor anual</span>
                      <p className="font-medium">{selectedContract.annualValue.toLocaleString('es-ES')}€</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vigencia</span>
                      <p className="font-medium">
                        {new Date(selectedContract.startDate).toLocaleDateString('es-ES')} - {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString('es-ES') : 'Indefinido'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Renovación automática</span>
                      <p className={`font-medium ${selectedContract.autoRenewal ? 'text-yellow-600' : ''}`}>
                        {selectedContract.autoRenewal ? '⚠️ SÍ' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Conditions */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Condiciones
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pago</span>
                      <p className="font-medium">{selectedContract.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Indexación</span>
                      <p className="font-medium">{selectedContract.indexation}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Penalización</span>
                      <p className="font-medium">{selectedContract.penalty}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contracted Prices */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Precios Contratados
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">Benchmark</TableHead>
                          <TableHead className="text-right">Gap</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedContract.products.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">
                              {product.price}{product.unit}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {product.benchmarkMin > 0 
                                ? `${product.benchmarkMin}-${product.benchmarkMax}${product.unit}`
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              {product.gap > 0 ? (
                                <span className="text-yellow-600 font-medium">⚠️ +{product.gap}%</span>
                              ) : product.benchmarkMin > 0 ? (
                                <span className="text-green-600">✓ OK</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Alerts */}
                {selectedContract.alerts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        Alertas
                      </h4>
                      <div className="space-y-2">
                        {selectedContract.alerts.map((alert, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 text-sm"
                          >
                            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Recommendations */}
                {selectedContract.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Acciones Recomendadas
                      </h4>
                      <div className="space-y-2">
                        {selectedContract.recommendations.map((rec, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 text-sm"
                          >
                            <span className="font-semibold text-primary">{idx + 1}.</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleEditContract(selectedContract.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar contrato
                  </Button>
                  <Button className="flex-1">
                    <Flag className="h-4 w-4 mr-2" />
                    Marcar para renegociar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Contract Form Modal */}
      <ContractFormModal
        projectId={id || ''}
        contract={editingContract}
        suppliers={suppliers}
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingContract(null);
        }}
        onSaved={handleFormSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El contrato será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CostConsultingContracts;
