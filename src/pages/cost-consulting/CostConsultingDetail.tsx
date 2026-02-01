import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Loader2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ReportGeneratorModal } from '@/components/cost-consulting/ReportGeneratorModal';
import { useQuery } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { 
  useCostProject, 
  useCostContracts, 
  useCostInvoices, 
  useCostOpportunities,
  useCostDocuments
} from '@/hooks/useCostConsultingData';

const processingPhases = [
  { id: 1, name: 'Extrayendo documentos' },
  { id: 2, name: 'Clasificando gasto' },
  { id: 3, name: 'Analizando contratos' },
  { id: 4, name: 'Analizando facturas' },
  { id: 5, name: 'Buscando oportunidades' },
  { id: 6, name: 'Generando informe' },
];

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    uploading: { label: 'Subiendo docs', variant: 'default' },
    processing: { label: 'Procesando', variant: 'default' },
    analyzing: { label: 'Analizando', variant: 'default' },
    review: { label: 'En revisión', variant: 'outline' },
    completed: { label: 'Completado', variant: 'default' },
    archived: { label: 'Archivado', variant: 'secondary' },
  };
  const config = statusConfig[status] || statusConfig.draft;
  
  const colorClasses: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    uploading: 'bg-blue-500/10 text-blue-600 border-blue-200',
    processing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    analyzing: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    review: 'bg-orange-500/10 text-orange-600 border-orange-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    archived: 'bg-muted text-muted-foreground',
  };
  
  return (
    <Badge variant={config.variant} className={colorClasses[status]}>
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

const CostConsultingDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Fetch project data from external Supabase
  const { data: project, isLoading: isLoadingProject } = useCostProject(id);
  const { data: contracts = [] } = useCostContracts(id);
  const { data: invoices = [] } = useCostInvoices(id);
  const { data: opportunities = [] } = useCostOpportunities(id);
  const { data: documents = [] } = useCostDocuments(id);

  // Fetch invoice lines for accurate spend map by category
  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoice-lines-spend-map', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await externalSupabase
        .from('cost_project_invoice_lines')
        .select(`
          id, category, total,
          cost_project_invoices!inner(project_id)
        `)
        .eq('cost_project_invoices.project_id', id);
      return data || [];
    },
    enabled: !!id,
  });

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

  // Build spend categories from invoice LINES (more accurate category breakdown)
  const spendByCategory = invoiceLines.reduce((acc: Record<string, number>, line: any) => {
    const cat = line.category || 'Otros';
    acc[cat] = (acc[cat] || 0) + (line.total || 0);
    return acc;
  }, {});
  
  const totalCatSpend = Object.values(spendByCategory).reduce((a, b) => a + b, 0);
  const spendCategories = Object.entries(spendByCategory)
    .map(([name, amount]) => ({
      name,
      amount,
      percent: totalCatSpend > 0 ? Math.round((amount / totalCatSpend) * 100) : 0,
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

  const isProcessing = project?.status === 'processing' || project?.status === 'analyzing';

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
              disabled={isProcessing}
              onClick={() => setReportModalOpen(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button variant="outline" disabled={isProcessing}>
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

      {/* Processing State */}
      {isProcessing && (
        <ProcessingState currentPhase={parseInt(project.current_phase || '1', 10)} />
      )}

      {/* Completed State */}
      {!isProcessing && (
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos Analizados
                  </CardTitle>
                  <CardDescription>Resumen de documentos procesados</CardDescription>
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default CostConsultingDetail;
