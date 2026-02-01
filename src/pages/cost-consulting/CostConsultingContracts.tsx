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
  Loader2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCostContracts, CostContract } from '@/hooks/useCostConsultingData';

// Type for mapped contract display
interface DisplayContract {
  id: string;
  supplier: string;
  category: string;
  subcategory: string;
  annualValue: number;
  endDate: string | null;
  startDate: string | null;
  riskScore: number;
  alertsCount: number;
  autoRenewal: boolean;
  paymentTerms: string;
  indexation: string;
  penalty: string;
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

  return {
    id: contract.id,
    supplier: contract.supplier_name_raw || contract.cost_suppliers?.name || 'Sin nombre',
    category: extractedCategory,
    subcategory: '',
    annualValue: contract.total_annual_value || 0,
    endDate: contract.end_date,
    startDate: contract.start_date,
    riskScore: contract.risk_score || 0,
    alertsCount: riskFlags.length,
    autoRenewal: contract.auto_renewal || false,
    paymentTerms: contract.payment_days ? `${contract.payment_days} días` : 'No especificado',
    indexation: 'Ver contrato',
    penalty: 'Ver contrato',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');
  const [selectedContract, setSelectedContract] = useState<DisplayContract | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch real data from Supabase
  const { data: contracts = [], isLoading, error } = useCostContracts(id);

  // Map contracts to display format
  const mappedContracts = contracts.map(mapContractToDisplay);

  // Filter and sort
  const filteredContracts = mappedContracts
    .filter(contract => {
      const matchesSearch = contract.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || contract.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'alerts' && contract.alertsCount > 0) ||
        (statusFilter === 'zombies' && contract.riskScore >= 90);
      return matchesSearch && matchesCategory && matchesStatus;
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="sr-only">Buscar proveedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedor..."
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="alerts">Con alertas</SelectItem>
                  <SelectItem value="zombies">Zombies</SelectItem>
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
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Valor Anual</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="text-center">Alertas</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow 
                  key={contract.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewContract(contract)}
                >
                  <TableCell className="font-medium">{contract.supplier}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{contract.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {contract.annualValue.toLocaleString('es-ES')}€
                  </TableCell>
                  <TableCell>
                    <span className={!contract.endDate ? 'text-muted-foreground' : ''}>
                      {formatDate(contract.endDate)}
                    </span>
                  </TableCell>
                  <TableCell>{getRiskBadge(contract.riskScore)}</TableCell>
                  <TableCell className="text-center">
                    {contract.alertsCount > 0 ? (
                      <Badge variant="destructive" className="min-w-[24px]">
                        {contract.alertsCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                  <Button variant="outline" className="flex-1">
                    <Calculator className="h-4 w-4 mr-2" />
                    Simular cambio
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
    </div>
  );
};

export default CostConsultingContracts;
