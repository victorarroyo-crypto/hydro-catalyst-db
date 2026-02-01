import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Receipt,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Eye,
  Download,
  Flag,
  CalendarIcon,
  TrendingUp,
  Euro,
  FileWarning,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { useCostInvoices, CostInvoice } from '@/hooks/useCostConsultingData';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';

// Types for mapped invoice data
interface InvoiceIssue {
  type: string;
  severity: string;
  title: string;
  description?: string;
  impact: number;
  product?: string;
  contracted?: number;
  invoiced?: number;
  unit?: string;
  deviation?: number;
  expected?: string;
  note?: string;
}

interface DisplayInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplier: string;
  category: string;
  total: number;
  compliance: string;
  issuesCount: number;
  linkedContract: string | null;
  issues: InvoiceIssue[];
  recoverableAmount: number;
}

const getComplianceBadge = (compliance: string, issuesCount: number) => {
  switch (compliance) {
    case 'ok':
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-green-600 text-sm">OK</span>
        </div>
      );
    case 'warning':
      return (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-600 text-sm">{issuesCount} issue</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 text-sm">{issuesCount} issues</span>
        </div>
      );
    default:
      return null;
  }
};

const CostConsultingInvoices = () => {
  const { id } = useParams();
  const { data: rawInvoices = [], isLoading } = useCostInvoices(id);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<DisplayInvoice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<string>('');

  // Extract line items from invoices for trend analysis
  // Note: line_items are embedded JSON in cost_project_invoices, not a separate table
  const invoiceLines = useMemo(() => {
    const lines: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      unit: string;
      total: number;
      category: string;
      invoice_date: string;
    }> = [];
    
    rawInvoices.forEach((inv, invIdx) => {
      const lineItems = inv.line_items || [];
      lineItems.forEach((item: Record<string, unknown>, idx: number) => {
        if (item.unit_price != null) {
          lines.push({
            id: `${inv.id}-${idx}`,
            description: (item.description as string) || '',
            quantity: (item.quantity as number) || 0,
            unit_price: item.unit_price as number,
            unit: (item.unit as string) || '€',
            total: (item.total as number) || 0,
            // Infer category from description if not provided
            category: inferCategoryFromDescription((item.description as string) || ''),
            invoice_date: inv.invoice_date || '',
          });
        }
      });
    });
    
    return lines;
  }, [rawInvoices]);

  // Helper function to infer category from line item description
  function inferCategoryFromDescription(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('pac') || desc.includes('polímero') || desc.includes('hipoclorito') || desc.includes('químic')) {
      return 'Químicos';
    }
    if (desc.includes('fango') || desc.includes('lodo') || desc.includes('residuo')) {
      return 'Lodos';
    }
    if (desc.includes('energía') || desc.includes('potencia') || desc.includes('kwh') || desc.includes('eléctric')) {
      return 'Energía';
    }
    if (desc.includes('analítica') || desc.includes('laboratorio') || desc.includes('ensayo')) {
      return 'Analíticas';
    }
    if (desc.includes('mantenimiento') || desc.includes('reparación') || desc.includes('recambio')) {
      return 'Mantenimiento';
    }
    if (desc.includes('canon') || desc.includes('tasa')) {
      return 'O&M';
    }
    return 'Otros';
  }

  // Map raw invoices to display format
  const invoices: DisplayInvoice[] = rawInvoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number || 'Sin número',
    date: inv.invoice_date || '',
    supplier: inv.supplier_name_raw || inv.cost_suppliers?.name || 'Sin proveedor',
    category: inv.category || 'Otros',
    total: inv.total || 0,
    compliance: inv.compliance_status || 'ok',
    issuesCount: Array.isArray(inv.compliance_issues) ? inv.compliance_issues.length : 0,
    linkedContract: null,
    issues: (inv.compliance_issues || []).map((issue: Record<string, unknown>) => ({
      type: (issue.type as string) || 'unknown',
      severity: (issue.severity as string) || 'warning',
      title: (issue.title as string) || (issue.description as string) || 'Issue detectado',
      description: issue.description as string | undefined,
      impact: (issue.amount as number) || 0,
      product: issue.product as string | undefined,
      contracted: issue.contracted as number | undefined,
      invoiced: issue.invoiced as number | undefined,
      unit: issue.unit as string | undefined,
      deviation: issue.deviation as number | undefined,
      expected: issue.expected as string | undefined,
      note: issue.note as string | undefined,
    })),
    recoverableAmount: (inv.compliance_issues || []).reduce(
      (sum: number, i: Record<string, unknown>) => sum + ((i.amount as number) || 0), 0
    ),
  }));

  // Derive suppliers and categories from actual data
  const suppliers = [...new Set(invoices.map(i => i.supplier))].filter(Boolean);
  const categories = [...new Set(invoices.map(i => i.category))].filter(Boolean);

  // Available categories for trend chart (from extracted line items)
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, { count: number; unit: string }>();
    invoiceLines.forEach((line) => {
      const cat = line.category;
      const existing = catMap.get(cat);
      if (existing) {
        existing.count++;
      } else {
        catMap.set(cat, { count: 1, unit: line.unit || '€' });
      }
    });
    return Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [invoiceLines]);

  // Auto-select first category if none selected
  useEffect(() => {
    if (!selectedTrendCategory && availableCategories.length > 0) {
      setSelectedTrendCategory(availableCategories[0].name);
    }
  }, [availableCategories, selectedTrendCategory]);

  // Calculate trend data for selected category
  const { trendData, categoryUnit } = useMemo(() => {
    if (!selectedTrendCategory || invoiceLines.length === 0) {
      return { trendData: [], categoryUnit: '€' };
    }
    
    const categoryLines = invoiceLines.filter(
      (line) => line.category === selectedTrendCategory
    );
    
    if (categoryLines.length === 0) {
      return { trendData: [], categoryUnit: '€' };
    }
    
    const unit = categoryLines[0]?.unit || '€/ud';
    
    // Group by month
    const grouped = categoryLines.reduce((acc: Record<string, { prices: number[]; date: string }>, line) => {
      const date = line.invoice_date;
      const unitPrice = line.unit_price;
      if (!date || !unitPrice) return acc;
      
      const monthKey = date.substring(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = { prices: [], date: monthKey };
      }
      acc[monthKey].prices.push(unitPrice);
      return acc;
    }, {});
    
    // Calculate baseline from first month for contract range estimation
    const sortedMonths = Object.keys(grouped).sort();
    const baselinePrice = sortedMonths.length > 0 
      ? grouped[sortedMonths[0]].prices.reduce((a, b) => a + b, 0) / grouped[sortedMonths[0]].prices.length
      : 0;
    
    const data = Object.values(grouped)
      .map((g) => {
        const avgPrice = g.prices.reduce((a, b) => a + b, 0) / g.prices.length;
        const contractMin = baselinePrice * 0.95;
        const contractMax = baselinePrice * 1.05;
        const isAnomaly = avgPrice > contractMax * 1.1 || avgPrice < contractMin * 0.9;
        
        return {
          month: new Date(g.date + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          sortKey: g.date,
          price: Number(avgPrice.toFixed(3)),
          contractMin: Number(contractMin.toFixed(3)),
          contractMax: Number(contractMax.toFixed(3)),
          isAnomaly,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    return { trendData: data, categoryUnit: unit };
  }, [invoiceLines, selectedTrendCategory]);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSupplier = supplierFilter === 'all' || invoice.supplier === supplierFilter;
    const matchesCompliance = complianceFilter === 'all' || 
      (complianceFilter === 'ok' && invoice.compliance === 'ok') ||
      (complianceFilter === 'issues' && invoice.compliance !== 'ok');
    const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter;
    return matchesSupplier && matchesCompliance && matchesCategory;
  });

  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const invoicesWithIssues = filteredInvoices.filter(inv => inv.issuesCount > 0).length;
  const recoverableAmount = filteredInvoices.reduce((sum, inv) => sum + inv.recoverableAmount, 0);

  const handleViewInvoice = (invoice: DisplayInvoice) => {
    setSelectedInvoice(invoice);
    setSheetOpen(true);
  };

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
          <span className="text-foreground font-medium">Facturas</span>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/cost-consulting/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
            <p className="text-muted-foreground mt-1">Análisis de compliance y detección de anomalías</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Analizadas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">En el período</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString('es-ES')}€</div>
            <p className="text-xs text-muted-foreground">Suma de facturas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Issues</CardTitle>
            <FileWarning className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{invoicesWithIssues}</div>
            <p className="text-xs text-muted-foreground">Requieren revisión</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recuperable</CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{recoverableAmount.toLocaleString('es-ES')}€</div>
            <p className="text-xs text-muted-foreground">Importe cuestionable</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yy', { locale: es })} -{' '}
                        {format(dateRange.to, 'dd/MM/yy', { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                    )
                  ) : (
                    <span className="text-muted-foreground">Período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <div className="w-[200px]">
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[180px]">
              <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Compliance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="issues">Con issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[160px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendencia de Precios - {selectedTrendCategory || 'Selecciona categoría'}
            </CardTitle>
            <CardDescription>
              Evolución del precio facturado vs contratado ({categoryUnit})
            </CardDescription>
          </div>
          {availableCategories.length > 0 && (
            <div className="w-[200px]">
              <Select value={selectedTrendCategory} onValueChange={setSelectedTrendCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(3)} ${categoryUnit}`]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="contractMax" 
                      stackId="1"
                      stroke="none" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="contractMin" 
                      stackId="2"
                      stroke="none" 
                      fill="hsl(var(--background))" 
                      fillOpacity={1}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isAnomaly) {
                          return (
                            <circle cx={cx} cy={cy} r={6} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2} />
                          );
                        }
                        return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Precio facturado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-primary/10" />
                  <span className="text-muted-foreground">Rango contratado (±5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Anomalía detectada</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Sin datos de tendencia para {selectedTrendCategory || 'esta categoría'}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Se necesitan facturas con líneas de detalle y precios unitarios
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.date), 'dd/MM', { locale: es })}
                  </TableCell>
                  <TableCell>{invoice.supplier}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {invoice.total.toLocaleString('es-ES')}€
                  </TableCell>
                  <TableCell>
                    {getComplianceBadge(invoice.compliance, invoice.issuesCount)}
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

      {/* Invoice Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {selectedInvoice.invoiceNumber}
                </SheetTitle>
                <SheetDescription>
                  Detalle de factura y compliance check
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Invoice Data */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Datos Factura
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Proveedor</span>
                      <p className="font-medium">{selectedInvoice.supplier}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha</span>
                      <p className="font-medium">
                        {format(new Date(selectedInvoice.date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-medium text-lg">{selectedInvoice.total.toLocaleString('es-ES')}€</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contrato vinculado</span>
                      <p className="font-medium text-primary">{selectedInvoice.linkedContract}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Compliance Check */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    {selectedInvoice.compliance === 'ok' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    Compliance Check
                  </h4>
                  
                  {selectedInvoice.issues.length === 0 ? (
                    <div className="p-4 rounded-lg bg-green-500/10 text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Factura sin incidencias - todos los datos coinciden con el contrato</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedInvoice.issues.map((issue, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 rounded-lg ${
                            issue.severity === 'error' 
                              ? 'bg-red-500/10 border border-red-200' 
                              : 'bg-yellow-500/10 border border-yellow-200'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {issue.severity === 'error' ? (
                              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                            )}
                            <span className={`font-semibold ${
                              issue.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                              {issue.title.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="ml-7 space-y-1 text-sm">
                            {'product' in issue && (
                              <>
                                <p><span className="text-muted-foreground">Producto:</span> {issue.product}</p>
                                <p><span className="text-muted-foreground">Contratado:</span> {issue.contracted}{issue.unit}</p>
                                <p><span className="text-muted-foreground">Facturado:</span> {issue.invoiced}{issue.unit}</p>
                                <p className="font-medium text-red-600">
                                  Diferencia: +{issue.deviation}% ({issue.impact}€ sobrecargo)
                                </p>
                              </>
                            )}
                            {'description' in issue && (
                              <p>{issue.description}</p>
                            )}
                            {'expected' in issue && (
                              <>
                                <p><span className="text-muted-foreground">Esperado:</span> {issue.expected}</p>
                                <p><span className="text-muted-foreground">Facturado:</span> {issue.invoiced}</p>
                              </>
                            )}
                            {'note' in issue && (
                              <p className="text-muted-foreground italic mt-2">{issue.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {selectedInvoice.recoverableAmount > 0 && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <h4 className="font-semibold mb-2">Resumen</h4>
                      <p className="text-lg font-bold text-primary">
                        Importe cuestionable: {selectedInvoice.recoverableAmount.toLocaleString('es-ES')}€
                      </p>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar detalle
                  </Button>
                  <Button className="flex-1" disabled={selectedInvoice.compliance === 'ok'}>
                    <Flag className="h-4 w-4 mr-2" />
                    Marcar como reclamada
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

export default CostConsultingInvoices;
