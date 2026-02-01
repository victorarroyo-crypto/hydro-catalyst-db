import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft,
  ArrowRight,
  FileText, 
  Receipt, 
  Lightbulb, 
  Calculator,
  TrendingDown,
  Euro,
  AlertTriangle,
  AlertCircle,
  Download,
  Archive,
  CheckCircle2,
  Circle,
  Clock,
  Star,
  Users,
  Zap,
  ChevronRight,
  FileDown,
  Loader2,
  Building2,
  Play,
  Pencil
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ReportGeneratorModal } from '@/components/cost-consulting/ReportGeneratorModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { 
  useCostProject, 
  useCostContracts, 
  useCostInvoices, 
  useCostOpportunities,
  useCostDocuments
} from '@/hooks/useCostConsultingData';
import { DocumentsManagementCard } from '@/components/cost-consulting/DocumentsManagementCard';
import { toast } from 'sonner';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

const processingPhases = [
  { id: 1, name: 'Extrayendo documentos' },
  { id: 2, name: 'Clasificando gasto' },
  { id: 3, name: 'Analizando contratos' },
  { id: 4, name: 'Analizando facturas' },
  { id: 5, name: 'Buscando oportunidades' },
  { id: 6, name: 'Generando informe' },
];

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; hasSpinner?: boolean }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    uploading: { label: 'Subiendo...', variant: 'outline', hasSpinner: true },
    extracting: { label: 'Extrayendo...', variant: 'outline', hasSpinner: true },
    review: { label: 'En revisión', variant: 'default' },
    processing: { label: 'Procesando...', variant: 'outline', hasSpinner: true },
    analyzing: { label: 'Analizando...', variant: 'outline', hasSpinner: true },
    completed: { label: 'Completado', variant: 'default' },
    failed: { label: 'Error', variant: 'destructive' },
    archived: { label: 'Archivado', variant: 'secondary' },
  };
  const config = statusConfig[status] || statusConfig.draft;
  
  const colorClasses: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    uploading: 'bg-blue-500/10 text-blue-600 border-blue-200',
    extracting: 'bg-blue-500/10 text-blue-600 border-blue-200',
    processing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    analyzing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    review: 'bg-orange-500/10 text-orange-600 border-orange-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    failed: '',
    archived: 'bg-muted text-muted-foreground',
  };
  
  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${colorClasses[status] || ''}`}>
      {config.hasSpinner && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </Badge>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating 
              ? 'fill-yellow-400 text-yellow-400' 
              : 'fill-muted text-muted'
          }`}
        />
      ))}
    </div>
  );
};

const ProcessingState = ({ currentPhase }: { currentPhase: number }) => {
  const progress = (currentPhase / processingPhases.length) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary animate-pulse" />
          Procesando análisis...
        </CardTitle>
        <CardDescription>
          El análisis puede tardar varios minutos dependiendo de la cantidad de documentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-3">
          {processingPhases.map((phase) => {
            const isCompleted = phase.id < currentPhase;
            const isCurrent = phase.id === currentPhase;
            const isPending = phase.id > currentPhase;
            
            return (
              <div 
                key={phase.id}
                className={`flex items-center gap-3 text-sm ${
                  isPending ? 'text-muted-foreground' : ''
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {isCurrent && (
                  <Circle className="h-5 w-5 text-primary animate-pulse fill-primary" />
                )}
                {isPending && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={isCurrent ? 'font-medium text-foreground' : ''}>
                  {phase.name}
                  {isCompleted && ' ✓'}
                  {isCurrent && '...'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const ExtractingState = ({ progressPct }: { progressPct: number }) => {
  // Calculate which phase based on progress
  const currentPhaseIndex = progressPct < 25 ? 0 : progressPct < 50 ? 1 : progressPct < 75 ? 2 : 3;
  
  const phases = [
    { id: 1, name: 'Documentos cargados' },
    { id: 2, name: 'Extrayendo contratos y facturas' },
    { id: 3, name: 'Detectando proveedores' },
    { id: 4, name: 'Validando datos' },
  ];
  
  return (
    <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <div>
            <span className="text-xl">Extrayendo datos...</span>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Procesando documentos para extraer contratos, facturas y proveedores
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progressPct || 25} className="h-3" />

        <div className="space-y-3">
          {phases.map((phase, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            const isPending = index > currentPhaseIndex;
            
            return (
              <div 
                key={phase.id} 
                className={`flex items-center gap-3 text-sm ${isPending ? 'text-muted-foreground' : ''}`}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {isCurrent && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                )}
                {isPending && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={isCurrent ? 'font-medium text-foreground' : ''}>
                  {phase.name}
                  {isCompleted && ' ✓'}
                  {isCurrent && '...'}
                </span>
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Este proceso puede tardar unos minutos dependiendo del número de documentos.
          <br />La página se actualizará automáticamente cuando termine.
        </p>
      </CardContent>
    </Card>
  );
};

const analyzingPhases = [
  { id: 1, name: 'Clasificando gasto por categoría' },
  { id: 2, name: 'Analizando contratos' },
  { id: 3, name: 'Comparando con benchmarks' },
  { id: 4, name: 'Identificando oportunidades' },
  { id: 5, name: 'Calculando ahorros potenciales' },
  { id: 6, name: 'Generando recomendaciones' },
];

const AnalyzingState = ({ currentPhase, progressPct }: { currentPhase: number; progressPct: number }) => {
  const progress = progressPct || (currentPhase / analyzingPhases.length) * 100;
  
  return (
    <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
            <Loader2 className="h-6 w-6 text-yellow-600 dark:text-yellow-400 animate-spin" />
          </div>
          <div>
            <span className="text-xl">Analizando datos...</span>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Nuestros agentes de IA están procesando tus datos para identificar oportunidades de ahorro
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="h-3" />
        
        <div className="space-y-3">
          {analyzingPhases.map((phase) => {
            const isCompleted = phase.id < currentPhase;
            const isCurrent = phase.id === currentPhase;
            const isPending = phase.id > currentPhase;
            
            return (
              <div 
                key={phase.id}
                className={`flex items-center gap-3 text-sm ${isPending ? 'text-muted-foreground' : ''}`}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {isCurrent && (
                  <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                )}
                {isPending && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={isCurrent ? 'font-medium text-foreground' : ''}>
                  {phase.name}
                  {isCompleted && ' ✓'}
                  {isCurrent && '...'}
                </span>
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          El análisis multi-agente puede tardar varios minutos.
          <br />La página se actualizará automáticamente cuando termine.
        </p>
      </CardContent>
    </Card>
  );
};

interface SpendCategory {
  name: string;
  amount: number;
  percent: number;
}

const SpendMap = ({ categories }: { categories: SpendCategory[] }) => {
  const maxPercent = Math.max(...categories.map(c => c.percent));
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Mapa de Gasto</CardTitle>
        <CardDescription>Distribución por categoría</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <div key={category.name} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{category.name}</span>
              <span className="text-muted-foreground">
                {category.percent}% ({category.amount.toLocaleString('es-ES')}€)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(category.percent / maxPercent) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface DisplayOpportunity {
  id: string;
  title: string;
  savings: number;
  rating: number;
  type: string;
}

const TopOpportunities = ({ opportunities }: { opportunities: DisplayOpportunity[] }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Top Oportunidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.map((opp, index) => (
          <div 
            key={opp.id}
            className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-muted-foreground">
                  {index + 1}.
                </span>
                <StarRating rating={opp.rating} />
              </div>
              <Badge 
                variant="outline" 
                className={opp.type === 'Quick Win' 
                  ? 'bg-green-500/10 text-green-600 border-green-200' 
                  : 'bg-blue-500/10 text-blue-600 border-blue-200'
                }
              >
                {opp.type}
              </Badge>
            </div>
            <h4 className="font-medium mb-1">{opp.title}</h4>
            <p className="text-sm text-primary font-semibold mb-2">
              {opp.savings.toLocaleString('es-ES')}€/año
            </p>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Ver detalle <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
        
        <Button variant="outline" className="w-full" asChild>
          <Link to="opportunities">
            Ver todas las oportunidades
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

interface AlertItem {
  type: 'warning' | 'error';
  message: string;
}

const AlertsSection = ({ alerts }: { alerts: AlertItem[] }) => {
  if (alerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <div 
          key={index}
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            alert.type === 'error' 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {alert.message}
        </div>
      ))}
    </div>
  );
};

// Review state components
interface ContractForReview {
  id: string;
  supplier_name_raw?: string;
  contract_number?: string;
  contract_title?: string;
  start_date?: string;
  end_date?: string;
  total_annual_value?: number;
  source?: string;
}

interface InvoiceForReview {
  id: string;
  supplier_name_raw?: string;
  invoice_number?: string;
  invoice_date?: string;
  total?: number;
  source?: string;
}

const ContractsReviewTable = ({ contracts }: { contracts: ContractForReview[] }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proveedor</TableHead>
          <TableHead>Nº Contrato</TableHead>
          <TableHead>Título</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead className="text-right">Valor Anual</TableHead>
          <TableHead>Fuente</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">{contract.supplier_name_raw || '-'}</TableCell>
            <TableCell>{contract.contract_number || '-'}</TableCell>
            <TableCell>{contract.contract_title || '-'}</TableCell>
            <TableCell>
              {contract.start_date && contract.end_date
                ? `${new Date(contract.start_date).toLocaleDateString('es-ES')} - ${new Date(contract.end_date).toLocaleDateString('es-ES')}`
                : '-'}
            </TableCell>
            <TableCell className="text-right">
              {contract.total_annual_value
                ? `${contract.total_annual_value.toLocaleString('es-ES')}€`
                : '-'}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={contract.source === 'manual' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                {contract.source === 'manual' ? 'Manual' : 'Extraído'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const InvoicesReviewTable = ({ invoices }: { invoices: InvoiceForReview[] }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proveedor</TableHead>
          <TableHead>Nº Factura</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Fuente</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.supplier_name_raw || '-'}</TableCell>
            <TableCell>{invoice.invoice_number || '-'}</TableCell>
            <TableCell>
              {invoice.invoice_date
                ? new Date(invoice.invoice_date).toLocaleDateString('es-ES')
                : '-'}
            </TableCell>
            <TableCell className="text-right">
              {invoice.total
                ? `${invoice.total.toLocaleString('es-ES')}€`
                : '-'}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={invoice.source === 'manual' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                {invoice.source === 'manual' ? 'Manual' : 'Extraído'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const SuppliersReviewList = ({ projectId }: { projectId?: string }) => {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['cost-suppliers-review', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await externalSupabase
        .from('cost_project_suppliers')
        .select('id, name, trade_name, tax_id, country')
        .eq('project_id', projectId);
      return data || [];
    },
    enabled: !!projectId,
  });

  if (suppliers.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No se detectaron proveedores
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Nombre Comercial</TableHead>
          <TableHead>CIF/NIF</TableHead>
          <TableHead>País</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier: { id: string; name?: string; trade_name?: string; tax_id?: string; country?: string }) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name || '-'}</TableCell>
            <TableCell>{supplier.trade_name || '-'}</TableCell>
            <TableCell>{supplier.tax_id || '-'}</TableCell>
            <TableCell>{supplier.country || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const CostConsultingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  
  // Fetch project data from external Supabase
  const { data: project, isLoading: isLoadingProject } = useCostProject(id);
  const { data: contracts = [] } = useCostContracts(id);
  const { data: invoices = [] } = useCostInvoices(id);
  const { data: opportunities = [] } = useCostOpportunities(id);
  const { data: documents = [] } = useCostDocuments(id);

  // Extract spend by category from invoice line_items (embedded JSON, not a separate table)
  const spendByInvoiceLines = useMemo(() => {
    const catSpend: Record<string, number> = {};
    
    invoices.forEach((inv) => {
      const lineItems = inv.line_items || [];
      lineItems.forEach((item: Record<string, unknown>) => {
        const desc = ((item.description as string) || '').toLowerCase();
        const total = (item.total as number) || 0;
        
        // Infer category from description
        let category = 'Otros';
        if (desc.includes('pac') || desc.includes('polímero') || desc.includes('hipoclorito') || desc.includes('químic')) {
          category = 'Químicos';
        } else if (desc.includes('fango') || desc.includes('lodo') || desc.includes('residuo')) {
          category = 'Lodos';
        } else if (desc.includes('energía') || desc.includes('potencia') || desc.includes('kwh') || desc.includes('eléctric') || desc.includes('consumo')) {
          category = 'Energía';
        } else if (desc.includes('analítica') || desc.includes('laboratorio') || desc.includes('ensayo')) {
          category = 'Analíticas';
        } else if (desc.includes('mantenimiento') || desc.includes('reparación') || desc.includes('recambio')) {
          category = 'Mantenimiento';
        } else if (desc.includes('canon') || desc.includes('tasa') || desc.includes('o&m')) {
          category = 'O&M';
        } else if (desc.includes('impuesto')) {
          category = 'Tasas';
        }
        
        catSpend[category] = (catSpend[category] || 0) + total;
      });
    });
    
    return catSpend;
  }, [invoices]);

  // Real alerts queries
  const { data: autoRenewalContracts = [] } = useQuery({
    queryKey: ["auto-renewal-contracts", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await externalSupabase
        .from("cost_project_contracts")
        .select("id, end_date, notice_period_days")
        .eq("project_id", id)
        .eq("auto_renewal", true);
      return data?.filter(c => {
        const noticeDate = new Date(c.end_date);
        noticeDate.setDate(noticeDate.getDate() - (c.notice_period_days || 30));
        return noticeDate <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }) || [];
    },
    enabled: !!id,
  });

  const { data: invoiceIssues = [] } = useQuery({
    queryKey: ["invoice-issues", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await externalSupabase
        .from("cost_project_invoices")
        .select("id, compliance_status")
        .eq("project_id", id)
        .neq("compliance_status", "ok");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: zombieContracts = [] } = useQuery({
    queryKey: ["zombie-contracts", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await externalSupabase
        .from("cost_project_contracts")
        .select("id")
        .eq("project_id", id)
        .eq("is_zombie", true);
      return data || [];
    },
    enabled: !!id,
  });

  // Build alerts from real data
  const alerts: Array<{ type: 'warning' | 'error'; message: string }> = [];
  if (autoRenewalContracts.length > 0) {
    alerts.push({ type: 'warning', message: `${autoRenewalContracts.length} contratos con renovación automática próxima` });
  }
  if (invoiceIssues.length > 0) {
    alerts.push({ type: 'warning', message: `${invoiceIssues.length} facturas con desviaciones de precio` });
  }
  if (zombieContracts.length > 0) {
    alerts.push({ type: 'error', message: `${zombieContracts.length} contrato${zombieContracts.length > 1 ? 's' : ''} zombie detectado${zombieContracts.length > 1 ? 's' : ''}` });
  }

  // Calculate KPIs from real data
  const totalSpend = project?.total_spend_analyzed || 0;
  const potentialSavings = project?.total_savings_identified || 0;
  const savingsPercent = totalSpend > 0 ? ((potentialSavings / totalSpend) * 100).toFixed(1) : '0';
  const quickWinsCount = opportunities.filter(o => o.effort_level === 'low').length;

  // Build spend categories from invoice line items
  const totalCatSpend = Object.values(spendByInvoiceLines).reduce((a: number, b: number) => a + b, 0);
  const spendCategories = Object.entries(spendByInvoiceLines)
    .map(([name, amount]) => ({
      name,
      amount: amount as number,
      percent: totalCatSpend > 0 ? Math.round(((amount as number) / totalCatSpend) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Top opportunities
  const topOpportunities = opportunities
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    .slice(0, 3)
    .map(o => ({
      id: o.id,
      title: o.title,
      savings: o.savings_annual || 0,
      rating: Math.min(5, Math.ceil((o.impact_score || 50) / 20)),
      type: o.effort_level === 'low' ? 'Quick Win' : 'Medio plazo',
    }));

  // Document counts
  const contractsCount = documents.filter(d => d.document_type === 'contract').length || contracts.length;
  const invoicesCount = documents.filter(d => d.document_type === 'invoice').length || invoices.length;
  const suppliersCount = new Set([...contracts.map(c => c.supplier_name_raw), ...invoices.map(i => i.supplier_name_raw)].filter(Boolean)).size;

  const isReview = project?.status === 'review';
  const isExtracting = project?.status === 'extracting';
  const isAnalyzing = project?.status === 'analyzing';
  const isProcessing = project?.status === 'processing';
  const isCompleted = project?.status === 'completed';
  const isActivelyProcessing = isExtracting || isAnalyzing || isProcessing;

  // Function to start analysis from review state
  const handleStartAnalysis = async () => {
    if (!project?.id) return;

    setIsStartingAnalysis(true);
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${project.id}/analyze`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar análisis');
      }

      toast.success('Análisis iniciado correctamente');
      // Refetch to see the new "analyzing" status
      queryClient.invalidateQueries({ queryKey: ['cost-project', id] });

    } catch (error) {
      console.error('Error starting analysis:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar el análisis');
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Proyecto no encontrado</p>
            <Button asChild className="mt-4">
              <Link to="/cost-consulting">Volver a proyectos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/cost-consulting" className="hover:text-foreground transition-colors">
            Consultoría de Costes
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{project.name || 'Proyecto'}</span>
        </nav>
        
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cost-consulting">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{project.name || 'Proyecto'}</h1>
                {getStatusBadge(project.status || 'draft')}
              </div>
              <p className="text-muted-foreground mt-1">{project.client_name || 'Sin cliente'}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={isActivelyProcessing}
              onClick={() => setReportModalOpen(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button variant="outline" disabled={isActivelyProcessing}>
              <Archive className="h-4 w-4 mr-2" />
              Archivar
            </Button>
          </div>
        </div>

      {/* Report Generator Modal */}
        <ReportGeneratorModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          projectId={id || '1'}
          projectName={project.name}
        />
      </div>

      {/* Stuck Processing State - No documents uploaded */}
      {isActivelyProcessing && documents.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Error en la subida de documentos
            </CardTitle>
            <CardDescription>
              No se pudieron subir los documentos al servidor. Esto puede deberse a un 
              problema con el almacenamiento o la conexión.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Por favor, intenta crear un nuevo análisis o contacta al administrador 
              si el problema persiste.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/cost-consulting/new">Crear nuevo análisis</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/cost-consulting">Volver a proyectos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review State - Most important state in new flow */}
      {isReview && (
        <div className="space-y-6">
          {/* Informative Alert */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Revisión de datos extraídos</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              Hemos extraído los datos de tus documentos. Revisa que estén correctos
              en las pestañas de Contratos y Facturas antes de ejecutar el análisis.
            </AlertDescription>
          </Alert>

          {/* Extraction Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                  <p className="text-sm text-muted-foreground">Contratos extraídos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                  <p className="text-sm text-muted-foreground">Facturas extraídas</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suppliersCount}</p>
                  <p className="text-sm text-muted-foreground">Proveedores detectados</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs to review data */}
          <Card>
            <Tabs defaultValue="contracts" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="contracts" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Contratos ({contracts.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Facturas ({invoices.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="suppliers" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Proveedores
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contracts" className="p-4">
                {contracts.length > 0 ? (
                  <ContractsReviewTable contracts={contracts} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No se encontraron contratos en los documentos
                  </p>
                )}
              </TabsContent>

              <TabsContent value="invoices" className="p-4">
                {invoices.length > 0 ? (
                  <InvoicesReviewTable invoices={invoices} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No se encontraron facturas en los documentos
                  </p>
                )}
              </TabsContent>

              <TabsContent value="suppliers" className="p-4">
                <SuppliersReviewList projectId={project?.id} />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/cost-consulting')}>
              Volver
            </Button>
            <Button
              onClick={handleStartAnalysis}
              disabled={isStartingAnalysis}
            >
              {isStartingAnalysis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Validar y Ejecutar Análisis
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Extracting State */}
      {isExtracting && (
        <ExtractingState progressPct={project.progress_pct || 25} />
      )}

      {/* Analyzing State - Distinct from processing */}
      {project?.status === 'analyzing' && (
        <AnalyzingState 
          currentPhase={parseInt(project.current_phase || '1', 10)} 
          progressPct={project.progress_pct || 0}
        />
      )}

      {/* Processing State (legacy, for backwards compatibility) */}
      {project?.status === 'processing' && documents.length > 0 && (
        <ProcessingState currentPhase={parseInt(project.current_phase || '1', 10)} />
      )}

      {/* Completed State - Show dashboard only when analysis is done */}
      {!isActivelyProcessing && !isExtracting && !isReview && !isAnalyzing && (
        <>
          {/* Alerts */}
          <AlertsSection alerts={alerts} />

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gasto Analizado</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalSpend.toLocaleString('es-ES')}€
                </div>
                <p className="text-xs text-muted-foreground">Período analizado</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ahorro Identificado</CardTitle>
                <TrendingDown className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {potentialSavings.toLocaleString('es-ES')}€
                </div>
                <p className="text-xs text-muted-foreground">
                  {savingsPercent}% del gasto total
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
                <Lightbulb className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opportunities.length}</div>
                <p className="text-xs text-muted-foreground">Identificadas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Wins</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quickWinsCount}</div>
                <p className="text-xs text-muted-foreground">Implementación rápida</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <SpendMap categories={spendCategories} />
            </div>
            <div className="lg:col-span-2">
              <TopOpportunities opportunities={topOpportunities} />
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="contracts" asChild>
                <Link to={`/cost-consulting/${id}/contracts`}>Contratos</Link>
              </TabsTrigger>
              <TabsTrigger value="invoices" asChild>
                <Link to={`/cost-consulting/${id}/invoices`}>Facturas</Link>
              </TabsTrigger>
              <TabsTrigger value="suppliers" asChild>
                <Link to={`/cost-consulting/${id}/suppliers`}>Proveedores</Link>
              </TabsTrigger>
              <TabsTrigger value="opportunities" asChild>
                <Link to={`/cost-consulting/${id}/opportunities`}>Oportunidades</Link>
              </TabsTrigger>
              <TabsTrigger value="simulator" asChild>
                <Link to={`/cost-consulting/${id}/simulator`}>Simulador</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Document Summary Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resumen de Documentos
                  </CardTitle>
                  <CardDescription>Documentos procesados por tipo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{contractsCount}</p>
                        <p className="text-sm text-muted-foreground">Contratos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <Receipt className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{invoicesCount}</p>
                        <p className="text-sm text-muted-foreground">Facturas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <Users className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">{suppliersCount}</p>
                        <p className="text-sm text-muted-foreground">Proveedores</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Management Card */}
              {id && <DocumentsManagementCard projectId={id} />}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default CostConsultingDetail;
