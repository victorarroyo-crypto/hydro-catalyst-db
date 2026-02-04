import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Pencil,
  FileSearch,
  Eye,
  Upload,
  RefreshCw,
  FileEdit,
  Brain,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ReportGeneratorModal } from '@/components/cost-consulting/ReportGeneratorModal';
import { ReviewSummaryCard } from '@/components/cost-consulting/ReviewSummaryCard';
import { DocumentReviewTable } from '@/components/cost-consulting/DocumentReviewTable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { 
  useCostProject, 
  useCostOpportunities,
  useCostDocuments
} from '@/hooks/useCostConsultingData';
import { useContractsWithDocuments, useInvoicesWithDocuments } from '@/hooks/useCostEntitiesWithDocuments';
import { useDocumentReview } from '@/hooks/useDocumentReview';
import { DocumentsManagementCard } from '@/components/cost-consulting/DocumentsManagementCard';
import { UploadMoreDocumentsModal } from '@/components/cost-consulting/UploadMoreDocumentsModal';
import { PendingDocumentsList } from '@/components/cost-consulting/PendingDocumentsList';
import { ContractFormModal } from '@/components/cost-consulting/ContractFormModal';
import { ExtractionStatsCard } from '@/components/cost-consulting/ExtractionStatsCard';
import { ExecutiveSummaryCard } from '@/components/cost-consulting/ExecutiveSummaryCard';
import { InvoiceFormModal } from '@/components/cost-consulting/InvoiceFormModal';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CostContract, CostInvoice, CostSupplier } from '@/hooks/useCostConsultingData';
import {
  ContractsReviewTable,
  InvoicesReviewTable,
  ChangeTypeConfirmDialog,
  ReviewProgressCard,
  ContractForReview,
  InvoiceForReview,
  ChangeTypeDocument,
} from '@/components/cost-consulting/review';

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

import { useExtractionProgress, EXTRACTION_STEPS, getPhaseInfo } from '@/hooks/useExtractionProgress';

const ExtractingState = ({ projectId }: { projectId: string }) => {
  const { progress_pct, current_phase } = useExtractionProgress(projectId, true);
  
  // Get current phase info
  const phaseInfo = getPhaseInfo(current_phase);
  const currentStep = phaseInfo.step >= 0 ? phaseInfo.step : 0;
  
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
              {phaseInfo.label}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{progress_pct}%</span>
          </div>
          <Progress value={progress_pct} className="h-3" />
        </div>

        <div className="space-y-3">
          {EXTRACTION_STEPS.map((stepName, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;
            
            return (
              <div 
                key={stepName} 
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
                  {stepName}
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

// Project Phases Timeline Component
const PROJECT_PHASES = [
  { id: 'draft', label: 'Borrador', icon: FileEdit },
  { id: 'uploading', label: 'Subiendo', icon: Upload },
  { id: 'extracting', label: 'Extrayendo', icon: FileSearch },
  { id: 'review', label: 'Revisión', icon: Eye },
  { id: 'analyzing', label: 'Analizando', icon: Brain },
  { id: 'completed', label: 'Completado', icon: CheckCircle },
];

const ProjectPhasesTimeline = ({ status }: { status: string }) => {
  // Map 'processing' to 'analyzing' for display purposes
  const normalizedStatus = status === 'processing' ? 'analyzing' : status;
  const currentIndex = PROJECT_PHASES.findIndex(p => p.id === normalizedStatus);

  return (
    <div className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 rounded-lg border">
      {PROJECT_PHASES.map((phase, index) => {
        const Icon = phase.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={phase.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "rounded-full p-2 transition-colors",
                isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
                isCurrent && "bg-blue-100 text-blue-600 ring-2 ring-blue-400 dark:bg-blue-900/50 dark:text-blue-400",
                isPending && "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-xs font-medium",
                isCompleted && "text-green-600 dark:text-green-400",
                isCurrent && "text-blue-600 dark:text-blue-400",
                isPending && "text-gray-400 dark:text-gray-500"
              )}>
                {phase.label}
              </span>
              {isCurrent && status !== 'completed' && status !== 'failed' && (
                <span className="text-[10px] text-blue-500 animate-pulse">
                  En progreso...
                </span>
              )}
            </div>

            {index < PROJECT_PHASES.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                index < currentIndex ? "bg-green-400 dark:bg-green-500" : "bg-gray-200 dark:bg-gray-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
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

// Review state components are now imported from src/components/cost-consulting/review/

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [showReviewTable, setShowReviewTable] = useState(false);
  
  // States for upload more documents
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  
  // Document stats from PendingDocumentsList - for data-driven pending detection
  const [documentStats, setDocumentStats] = useState<{ 
    pending: number; 
    failed: number; 
    processing: number;
    noEntities: number;
  }>({ 
    pending: 0, 
    failed: 0, 
    processing: 0,
    noEntities: 0,
  });
  
  // States for edit modals
  const [editingContract, setEditingContract] = useState<CostContract | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<CostInvoice | null>(null);
  
  // States for review actions
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [changeTypeDoc, setChangeTypeDoc] = useState<{
    doc: ChangeTypeDocument;
    type: 'contract' | 'invoice';
  } | null>(null);
  const [isChangingType, setIsChangingType] = useState(false);
  
  // Fetch project data from external Supabase
  const { data: project, isLoading: isLoadingProject } = useCostProject(id);
  const { data: contracts = [] } = useContractsWithDocuments(id);
  const { data: invoices = [] } = useInvoicesWithDocuments(id);
  const { data: opportunities = [] } = useCostOpportunities(id);
  const { data: documents = [] } = useCostDocuments(id);
  
  // Derived: show re-extract button/alert when:
  // 1. There are pending or failed documents
  // 2. OR the project failed during extraction (documents OK but entities not extracted)
  // 3. OR there are completed documents without any extracted entities
  const projectFailedDuringExtraction = project?.status === 'failed';
  const hasDocumentIssues = documentStats.pending > 0 || documentStats.failed > 0;
  const hasNoEntitiesIssue = documentStats.noEntities > 0;
  const hasExtractionIssues = hasDocumentIssues || projectFailedDuringExtraction || hasNoEntitiesIssue;
  
  // Fetch suppliers for edit modals
  const { data: suppliers = [] } = useQuery({
    queryKey: ['cost-suppliers', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await externalSupabase
        .from('cost_project_suppliers')
        .select('*')
        .eq('project_id', id);
      return (data || []) as CostSupplier[];
    },
    enabled: !!id,
  });
  
  // Document review hook for validation workflow
  const {
    allDocs,
    summary: reviewSummary,
    loading: reviewLoading,
    validateDocument,
    changeDocumentType,
    validateAll,
    allValidated,
    hasCriticalWarnings,
    refresh: refreshReview,
  } = useDocumentReview(id, user?.id, project?.status === 'review');

  // Handler for single document validation
  const handleValidateDocument = async (docType: 'contract' | 'invoice', docId: string) => {
    setIsValidating(docId);
    try {
      await validateDocument(docType, docId);
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
    } finally {
      setIsValidating(null);
    }
  };

  // Handler for validate all
  const handleValidateAll = async () => {
    setIsValidatingAll(true);
    try {
      await validateAll();
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
    } finally {
      setIsValidatingAll(false);
    }
  };

  // Handler for change type confirmation
  const handleConfirmChangeType = async () => {
    if (!changeTypeDoc) return;
    
    setIsChangingType(true);
    try {
      await changeDocumentType(changeTypeDoc.type, changeTypeDoc.doc.id);
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
      setChangeTypeDoc(null);
    } finally {
      setIsChangingType(false);
    }
  };

  // Handler for delete contract
  const handleDeleteContract = async (contractId: string) => {
    if (!id) return;
    setDeletingContractId(contractId);
    try {
      const { deleteContract } = await import('@/services/costConsultingApi');
      await deleteContract(id, contractId);
      toast.success('Contrato eliminado');
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Error al eliminar contrato');
    } finally {
      setDeletingContractId(null);
    }
  };

  // Handler for delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!id) return;
    setDeletingInvoiceId(invoiceId);
    try {
      const { deleteInvoice } = await import('@/services/costConsultingApi');
      await deleteInvoice(id, invoiceId);
      toast.success('Factura eliminada');
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Error al eliminar factura');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

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

  // Function to re-extract after uploading more documents
  const handleReExtract = async () => {
    if (!project?.id) return;

    setIsReExtracting(true);
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/cost-consulting/projects/${project.id}/extract`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al re-extraer');
      }

      toast.success('Re-extracción iniciada');
      // Refetch to see the new "extracting" status
      queryClient.invalidateQueries({ queryKey: ['cost-project', id] });

    } catch (error) {
      console.error('Error re-extracting:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la re-extracción');
    } finally {
      setIsReExtracting(false);
    }
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    // Stats will be updated by PendingDocumentsList callback
    queryClient.invalidateQueries({ queryKey: ['cost-documents', id] });
    queryClient.invalidateQueries({ queryKey: ['project-documents-list', id] });
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

      {/* Project Phases Timeline */}
      <ProjectPhasesTimeline status={project.status || 'draft'} />

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
              y valida los documentos antes de ejecutar el análisis.
            </AlertDescription>
          </Alert>

          {/* Action buttons row */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir más documentos
            </Button>
            
            {hasExtractionIssues && (
              <Button 
                onClick={handleReExtract}
                disabled={isReExtracting}
              >
                {isReExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-extrayendo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-extraer documentos
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Pending re-extraction alert */}
          {hasExtractionIssues && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                {projectFailedDuringExtraction && !hasDocumentIssues
                  ? 'Extracción fallida'
                  : hasDocumentIssues 
                    ? 'Documentos pendientes'
                    : 'Documentos sin datos extraídos'}
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {projectFailedDuringExtraction && !hasDocumentIssues && !hasNoEntitiesIssue
                  ? 'La extracción de datos falló (timeout o error). Los documentos están procesados pero no se generaron contratos/facturas. '
                  : hasDocumentIssues
                    ? documentStats.pending > 0 && documentStats.failed > 0 
                      ? `${documentStats.pending} documentos pendientes y ${documentStats.failed} con error. `
                      : documentStats.pending > 0 
                        ? `${documentStats.pending} documentos pendientes de extracción. `
                        : `${documentStats.failed} documentos con error de extracción. `
                    : hasNoEntitiesIssue
                      ? `${documentStats.noEntities} documentos procesados no generaron contratos ni facturas. Pueden ser anexos técnicos o documentos de soporte. `
                      : ''
                }
                {hasDocumentIssues && 'Ejecuta "Re-extraer documentos" para procesarlos.'}
                {!hasDocumentIssues && hasNoEntitiesIssue && 'Usa el botón de re-extracción individual en cada documento si quieres volver a intentarlo.'}
              </AlertDescription>
            </Alert>
          )}

          {/* NEW: Pending Documents List - Shows all uploaded documents with status */}
          <PendingDocumentsList 
            projectId={project.id}
            userId={user?.id}
            onDocumentDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ['cost-documents', id] });
              queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
              queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
            }}
            onStatsChange={(stats) => setDocumentStats(stats)}
          />

          {/* Review Summary Card - Document validation status */}
          <ReviewSummaryCard
            projectId={project?.id || ''}
            userId={user?.id}
            onAllValidated={() => {
              refreshReview();
              queryClient.invalidateQueries({ queryKey: ['cost-project', id] });
            }}
          />

          {/* Extraction Stats Card */}
          <ExtractionStatsCard project={{
            extraction_status: {
              contracts_found: contracts.length,
              invoices_found: invoices.length,
              suppliers_found: suppliersCount,
              errors: project.extraction_status?.errors || []
            },
            updated_at: project.created_at
          }} />

          {/* Document Review Table - Shown when user clicks "Revisar documentos" */}
          {showReviewTable && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSearch className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Revisión de Documentos</CardTitle>
                      <CardDescription>
                        Valida la clasificación de cada documento antes del análisis
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowReviewTable(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentReviewTable
                  documents={allDocs}
                  onValidate={validateDocument}
                  onChangeType={changeDocumentType}
                  loading={reviewLoading}
                />
              </CardContent>
            </Card>
          )}

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
                <ContractsReviewTable 
                  contracts={contracts as unknown as ContractForReview[]}
                  onView={(c) => setEditingContract(c as unknown as CostContract)}
                  onEdit={(c) => setEditingContract(c as unknown as CostContract)}
                  onValidate={(contractId) => handleValidateDocument('contract', contractId)}
                  onChangeType={(c) => setChangeTypeDoc({ 
                    doc: { id: c.id, supplier_name_raw: c.supplier_name_raw, contract_number: c.contract_number },
                    type: 'contract'
                  })}
                  onDelete={handleDeleteContract}
                  isValidating={isValidating}
                  isDeleting={deletingContractId}
                />
              </TabsContent>

              <TabsContent value="invoices" className="p-4">
                <InvoicesReviewTable 
                  invoices={invoices as unknown as InvoiceForReview[]}
                  onView={(i) => setEditingInvoice(i as unknown as CostInvoice)}
                  onEdit={(i) => setEditingInvoice(i as unknown as CostInvoice)}
                  onValidate={(invoiceId) => handleValidateDocument('invoice', invoiceId)}
                  onChangeType={(i) => setChangeTypeDoc({ 
                    doc: { id: i.id, supplier_name_raw: i.supplier_name_raw, invoice_number: i.invoice_number },
                    type: 'invoice'
                  })}
                  onDelete={handleDeleteInvoice}
                  isValidating={isValidating}
                  isDeleting={deletingInvoiceId}
                />
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
              disabled={isStartingAnalysis || (!allValidated && hasCriticalWarnings)}
              title={!allValidated && hasCriticalWarnings ? 'Valida los documentos con advertencias antes de continuar' : ''}
            >
              {isStartingAnalysis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {allValidated ? 'Ejecutar Análisis' : 'Validar y Ejecutar Análisis'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Extracting State */}
      {isExtracting && project?.id && (
        <ExtractingState projectId={project.id} />
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
          {/* Actions for completed state */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir más documentos
            </Button>
            
            {hasExtractionIssues && (
              <Button 
                onClick={handleReExtract}
                disabled={isReExtracting}
              >
                {isReExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-extrayendo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-extraer documentos
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Pending re-extraction alert */}
          {hasExtractionIssues && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                {projectFailedDuringExtraction && !hasDocumentIssues
                  ? 'Extracción fallida'
                  : hasDocumentIssues 
                    ? 'Documentos pendientes'
                    : 'Documentos sin datos extraídos'}
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {projectFailedDuringExtraction && !hasDocumentIssues && !hasNoEntitiesIssue
                  ? 'La extracción de datos falló (timeout o error). Los documentos están procesados pero no se generaron contratos/facturas. '
                  : hasDocumentIssues
                    ? documentStats.pending > 0 && documentStats.failed > 0 
                      ? `${documentStats.pending} documentos pendientes y ${documentStats.failed} con error. `
                      : documentStats.pending > 0 
                        ? `${documentStats.pending} documentos pendientes de extracción. `
                        : `${documentStats.failed} documentos con error de extracción. `
                    : hasNoEntitiesIssue
                      ? `${documentStats.noEntities} documentos procesados no generaron contratos ni facturas. Pueden ser anexos técnicos o documentos de soporte. `
                      : ''
                }
                {hasDocumentIssues && 'Ejecuta "Re-extraer documentos" para procesarlos.'}
                {!hasDocumentIssues && hasNoEntitiesIssue && 'Usa el botón de re-extracción individual en cada documento si quieres volver a intentarlo.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Alerts */}
          <AlertsSection alerts={alerts} />

          {/* Extraction Stats Card for Completed State */}
          <ExtractionStatsCard project={{
            extraction_status: {
              contracts_found: contracts.length,
              invoices_found: invoices.length,
              suppliers_found: suppliersCount,
              errors: project.extraction_status?.errors || []
            },
            updated_at: project.created_at
          }} />

          {/* Executive Summary for Completed Projects */}
          {project?.status === 'completed' && (
            <ExecutiveSummaryCard project={project} opportunities={opportunities} />
          )}

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

      {/* Contract Edit Modal */}
      <ContractFormModal
        projectId={project?.id || ''}
        contract={editingContract}
        suppliers={suppliers}
        open={!!editingContract}
        onClose={() => setEditingContract(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['cost-contracts', id] });
          setEditingContract(null);
        }}
      />

      {/* Invoice Edit Modal */}
      <InvoiceFormModal
        projectId={project?.id || ''}
        invoice={editingInvoice}
        suppliers={suppliers}
        contracts={contracts as CostContract[]}
        open={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['cost-invoices', id] });
          setEditingInvoice(null);
        }}
      />

      {/* Change Type Confirmation Dialog */}
      <ChangeTypeConfirmDialog
        open={!!changeTypeDoc}
        onOpenChange={(open) => !open && setChangeTypeDoc(null)}
        onConfirm={handleConfirmChangeType}
        document={changeTypeDoc?.doc || null}
        currentType={changeTypeDoc?.type || 'contract'}
        isLoading={isChangingType}
      />

      {/* Upload More Documents Modal */}
      <UploadMoreDocumentsModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        projectId={project?.id || ''}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default CostConsultingDetail;
