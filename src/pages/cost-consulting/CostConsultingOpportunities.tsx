import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Lightbulb,
  TrendingUp, 
  Zap, 
  Target,
  LayoutGrid,
  List,
  Star,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Building2,
  Bot,
  FileText,
  Receipt,
  BarChart3,
  Crosshair,
  Search,
  User,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useParams } from 'react-router-dom';
import { useCostOpportunities, useCostProject, CostOpportunity } from '@/hooks/useCostConsultingData';

// Map DB opportunity to UI display
interface DisplayOpportunity {
  id: string;
  title: string;
  category: string;
  supplier: string;
  savings: number;
  savingsPercent: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  horizon: string;
  confidence: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  status: string;
  rating: number;
  description: string;
  actions: string[];
  // Extended fields
  impactScore: number;
  effortScore: number;
  riskScore: number;
  priorityScore: number;
  oneTimeRecovery: number;
  rootCause: string | null;
  identifiedBy: string | null;
  identifiedAt: string | null;
  validatedAt: string | null;
  implementedAt: string | null;
  notes: string | null;
}

// Helper functions
const formatCurrency = (value: number): string => {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
};

const getHorizonLabel = (horizon: string): string => {
  const labels: Record<string, string> = {
    'quick_win': '⚡ Quick Win',
    'quick-win': '⚡ Quick Win',
    'short': '🕐 Corto Plazo',
    'short_term': '🕐 Corto Plazo',
    'medium': '📅 Medio Plazo',
    'medium_term': '📅 Medio Plazo',
    'long': '🎯 Largo Plazo',
    'long_term': '🎯 Largo Plazo',
  };
  return labels[horizon] || horizon;
};

const getAgentLabel = (agentId: string | null): string => {
  if (!agentId) return 'Manual';
  const labels: Record<string, string> = {
    'agent_contracts': 'Análisis de Contratos',
    'agent_invoices': 'Auditoría de Facturas',
    'agent_benchmarks': 'Benchmark de Proveedores',
    'agent_ranker': 'Priorizador',
    'text_extraction': 'Extracción Automática',
  };
  return labels[agentId] || agentId;
};

const getOriginIcon = (agentId: string | null) => {
  if (!agentId) return User;
  const icons: Record<string, any> = {
    'agent_contracts': FileText,
    'agent_invoices': Receipt,
    'agent_benchmarks': BarChart3,
    'agent_ranker': Crosshair,
    'text_extraction': Search,
  };
  return icons[agentId] || Bot;
};

const getHorizonBadgeStyle = (horizon: string) => {
  if (horizon === 'quick_win' || horizon === 'quick-win') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
  }
  if (horizon === 'short' || horizon === 'short_term') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
  }
  if (horizon === 'medium' || horizon === 'medium_term') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400';
  }
  return 'bg-muted text-muted-foreground';
};

// MetricBar component for visual metrics
const MetricBar = ({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: 'green' | 'blue' | 'red' 
}) => {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  };
  
  return (
    <div className="flex-1">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colorClasses[color])}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
};

// Metric Badge component
const MetricBadge = ({ 
  label, 
  value, 
  max = 10, 
  color 
}: { 
  label: string; 
  value: number; 
  max?: number; 
  color: 'green' | 'blue' | 'red' | 'purple' 
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };
  
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-sm font-semibold mt-1">{value}/{max}</div>
    </div>
  );
};

const mapOpportunityToDisplay = (opp: CostOpportunity): DisplayOpportunity => {
  const savingsPercent = opp.current_annual_cost && opp.savings_annual 
    ? Math.round((opp.savings_annual / opp.current_annual_cost) * 100)
    : opp.savings_pct || 0;
  
  return {
    id: opp.id,
    title: opp.title,
    category: opp.opportunity_type || 'General',
    supplier: 'Varios',
    savings: opp.savings_annual || 0,
    savingsPercent,
    impact: opp.impact_score && opp.impact_score > 70 ? 'high' : opp.impact_score && opp.impact_score > 40 ? 'medium' : 'low',
    effort: opp.effort_score && opp.effort_score > 70 ? 'high' : opp.effort_score && opp.effort_score > 40 ? 'medium' : 'low',
    horizon: opp.implementation_horizon || 'medium',
    confidence: opp.confidence === 'high' || opp.confidence === 'alta' ? 'high' : opp.confidence === 'medium' || opp.confidence === 'media' ? 'medium' : 'low',
    risk: opp.risk_score && opp.risk_score > 70 ? 'high' : opp.risk_score && opp.risk_score > 40 ? 'medium' : 'low',
    status: opp.status,
    rating: Math.min(5, Math.ceil((opp.priority_score || 50) / 20)),
    description: opp.description || '',
    actions: opp.recommended_actions?.map((a: any) => typeof a === 'string' ? a : a.action || a.description || '') || [],
    // Extended fields
    impactScore: opp.impact_score || 0,
    effortScore: opp.effort_score || 0,
    riskScore: opp.risk_score || 0,
    priorityScore: opp.priority_score || 0,
    oneTimeRecovery: 0, // Field not in current CostOpportunity type
    rootCause: null, // Field not in current CostOpportunity type
    identifiedBy: null, // Field not in current CostOpportunity type
    identifiedAt: null, // Field not in current CostOpportunity type
    validatedAt: null, // Field not in current CostOpportunity type
    implementedAt: null, // Field not in current CostOpportunity type
    notes: null, // Field not in current CostOpportunity type
  };
};

// Filter state type
interface OpportunityFilters {
  horizon: string;
  origin: string;
  status: string;
  savingsRange: string;
  hasRecovery: boolean;
}

const defaultFilters: OpportunityFilters = {
  horizon: 'all',
  origin: 'all',
  status: 'all',
  savingsRange: 'all',
  hasRecovery: false,
};

const CostConsultingOpportunities = () => {
  const { id } = useParams();
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('list');
  const [selectedOpportunity, setSelectedOpportunity] = useState<DisplayOpportunity | null>(null);
  const [filters, setFilters] = useState<OpportunityFilters>(defaultFilters);
  const [expandedSections, setExpandedSections] = useState<string[]>(['quick_win', 'short', 'medium']);

  const { data: project } = useCostProject(id);
  const { data: rawOpportunities = [], isLoading } = useCostOpportunities(id);
  
  // Map to display format
  const opportunities: DisplayOpportunity[] = rawOpportunities.map(mapOpportunityToDisplay);

  // Calculate metrics
  const totalSavingsAll = opportunities.reduce((sum, o) => sum + o.savings, 0);
  const totalRecoveryAll = opportunities.reduce((sum, o) => sum + o.oneTimeRecovery, 0);
  const quickWins = opportunities.filter(o => o.horizon === 'quick_win' || o.horizon === 'quick-win');
  const quickWinSavings = quickWins.reduce((sum, o) => sum + o.savings, 0);

  // Helper to match savings range
  const matchesSavingsRange = (savings: number, range: string): boolean => {
    switch (range) {
      case '50k+': return savings >= 50000;
      case '20-50k': return savings >= 20000 && savings < 50000;
      case '10-20k': return savings >= 10000 && savings < 20000;
      case '5-10k': return savings >= 5000 && savings < 10000;
      case '<5k': return savings < 5000;
      default: return true;
    }
  };

  // Helper to normalize horizon
  const normalizeHorizon = (horizon: string): string => {
    if (horizon === 'quick-win') return 'quick_win';
    if (horizon === 'short') return 'short_term';
    if (horizon === 'medium') return 'medium_term';
    if (horizon === 'long') return 'long_term';
    return horizon;
  };

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      // Horizon filter
      if (filters.horizon !== 'all') {
        const normalizedHorizon = normalizeHorizon(o.horizon);
        if (normalizedHorizon !== filters.horizon) return false;
      }
      // Origin filter
      if (filters.origin !== 'all' && o.identifiedBy !== filters.origin) return false;
      // Status filter
      if (filters.status !== 'all' && o.status !== filters.status) return false;
      // Savings range filter
      if (filters.savingsRange !== 'all' && !matchesSavingsRange(o.savings, filters.savingsRange)) return false;
      // Has recovery filter
      if (filters.hasRecovery && o.oneTimeRecovery <= 0) return false;
      return true;
    });
  }, [opportunities, filters]);

  // Filtered totals
  const totalSavings = filteredOpportunities.reduce((sum, o) => sum + o.savings, 0);
  const totalRecovery = filteredOpportunities.reduce((sum, o) => sum + o.oneTimeRecovery, 0);

  // Group by horizon - handle both DB values (quick_win, short_term, medium_term, long_term)
  // and legacy values (short, medium, long, corto, medio, largo)
  const groupedOpportunities = {
    quick_win: filteredOpportunities.filter(o => 
      o.horizon === 'quick_win' || o.horizon === 'quick-win'
    ),
    short: filteredOpportunities.filter(o => 
      o.horizon === 'short' || o.horizon === 'short_term' || o.horizon === 'corto'
    ),
    medium: filteredOpportunities.filter(o => 
      o.horizon === 'medium' || o.horizon === 'medium_term' || o.horizon === 'medio'
    ),
    long: filteredOpportunities.filter(o => 
      o.horizon === 'long' || o.horizon === 'long_term' || o.horizon === 'largo'
    )
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'identified':
        return <Badge variant="outline" className="bg-muted">Identificada</Badge>;
      case 'validated':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Validada</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">En progreso</Badge>;
      case 'implemented':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Implementada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEffortIndicator = (effort: string) => {
    const levels = effort === 'low' ? 1 : effort === 'medium' ? 3 : 5;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= levels ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <span className="text-green-600 dark:text-green-400">Alta</span>;
      case 'medium':
        return <span className="text-yellow-600 dark:text-yellow-400">Media</span>;
      case 'low':
        return <span className="text-red-600 dark:text-red-400">Baja</span>;
      default:
        return <span>{confidence}</span>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <span className="text-green-600 dark:text-green-400">Bajo</span>;
      case 'medium':
        return <span className="text-yellow-600 dark:text-yellow-400">Medio</span>;
      case 'high':
        return <span className="text-red-600 dark:text-red-400">Alto</span>;
      default:
        return <span>{risk}</span>;
    }
  };

  const renderStars = (rating: number) => {
    return (
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
  };

  const OpportunityCard = ({ opportunity }: { opportunity: DisplayOpportunity }) => {
    const OriginIcon = getOriginIcon(opportunity.identifiedBy);
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedOpportunity(opportunity)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <h4 className="font-semibold text-base leading-tight">{opportunity.title}</h4>
          
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {/* Origin badge */}
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <OriginIcon className="h-3 w-3" />
              {getAgentLabel(opportunity.identifiedBy)}
            </Badge>
            
            {/* Horizon badge */}
            <Badge className={cn("text-xs", getHorizonBadgeStyle(opportunity.horizon))}>
              {getHorizonLabel(opportunity.horizon)}
            </Badge>
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opportunity.description}
          </p>
          
          {/* Financial info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(opportunity.savings)}
              </span>
              <span className="text-xs text-muted-foreground">/año</span>
            </div>
            
            {opportunity.oneTimeRecovery > 0 && (
              <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                + {formatCurrency(opportunity.oneTimeRecovery)} único
              </Badge>
            )}
          </div>
          
          {/* Visual metrics */}
          <div className="flex gap-3">
            <MetricBar label="Impacto" value={opportunity.impactScore} color="green" />
            <MetricBar label="Esfuerzo" value={opportunity.effortScore} color="blue" />
            <MetricBar label="Riesgo" value={opportunity.riskScore} color="red" />
          </div>
          
          {/* Supplier if exists */}
          {opportunity.supplier && opportunity.supplier !== 'Varios' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{opportunity.supplier}</span>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Play className="h-3 w-3 mr-1" />
              Simular
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Clock className="h-3 w-3 mr-1" />
              En progreso
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MatrixView = () => {
    const getOpportunitiesForCell = (impact: string, effort: string) => {
      return filteredOpportunities.filter(o => o.impact === impact && o.effort === effort);
    };

    // Color gradient based on savings
    const getSavingsColor = (savings: number) => {
      if (savings >= 50000) return 'bg-green-700 text-white';
      if (savings >= 10000) return 'bg-green-500 text-white';
      if (savings >= 5000) return 'bg-yellow-500 text-white';
      return 'bg-gray-400 text-white';
    };

    const formatCompactCurrency = (value: number): string => {
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K€`;
      return `${value.toFixed(0)}€`;
    };

    // Quadrant labels and styles
    const getQuadrantInfo = (impact: string, effort: string) => {
      if (impact === 'high' && effort === 'low') return { 
        label: '⚡ QUICK WINS', 
        bg: 'bg-green-50 dark:bg-green-950', 
        border: 'border-green-300 dark:border-green-700',
        highlight: true
      };
      if (impact === 'high' && effort === 'high') return { 
        label: '📅 Planificar', 
        bg: 'bg-blue-50 dark:bg-blue-950', 
        border: 'border-blue-200 dark:border-blue-800' 
      };
      if (impact === 'low' && effort === 'low') return { 
        label: '📋 Si hay tiempo', 
        bg: 'bg-muted/30', 
        border: 'border-border' 
      };
      if (impact === 'low' && effort === 'high') return { 
        label: '🚫 Evitar', 
        bg: 'bg-red-50 dark:bg-red-950', 
        border: 'border-red-200 dark:border-red-800' 
      };
      return { label: '', bg: 'bg-muted/30', border: 'border-border' };
    };

    const CellContent = ({ impact, effort }: { impact: string; effort: string }) => {
      const opps = getOpportunitiesForCell(impact, effort);
      const quadrant = getQuadrantInfo(impact, effort);
      const totalSavings = opps.reduce((sum, o) => sum + o.savings, 0);
      
      return (
        <div className={`p-3 h-full min-h-[140px] rounded-lg border-2 ${quadrant.bg} ${quadrant.border} ${quadrant.highlight ? 'ring-2 ring-green-400 dark:ring-green-600' : ''}`}>
          {/* Quadrant label */}
          {quadrant.label && (
            <div className={`text-xs font-semibold mb-2 ${quadrant.highlight ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
              {quadrant.label}
            </div>
          )}
          
          {/* Counter per quadrant */}
          {opps.length > 0 && (
            <div className="text-[10px] text-muted-foreground mb-2">
              {opps.length} oportunidades · {formatCompactCurrency(totalSavings)}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {opps.map(opp => {
              const confidencePercent = opp.confidence === 'high' ? 90 : opp.confidence === 'medium' ? 60 : 30;
              
              return (
                <HoverCard key={opp.id} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div
                      className={`p-2 rounded-lg cursor-pointer hover:scale-105 transition-transform shadow-sm ${getSavingsColor(opp.savings)}`}
                      onClick={() => setSelectedOpportunity(opp)}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold">{formatCompactCurrency(opp.savings)}</span>
                        <span className="text-[10px] opacity-80 truncate max-w-[80px] text-center">
                          {opp.title}
                        </span>
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72" side="top">
                    <div className="space-y-2">
                      <p className="font-semibold">{opp.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Ahorro: {opp.savings.toLocaleString()}€/año
                        </Badge>
                        <Badge variant="outline">
                          Confianza: {confidencePercent}%
                        </Badge>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Matriz Impacto vs Esfuerzo</CardTitle>
          <CardDescription>Priorización visual de oportunidades - hover para detalles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative pb-6">
            {/* Y-axis label */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
              IMPACTO ↑
            </div>
            
            {/* X-axis label */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
              ESFUERZO →
            </div>
            
            <div className="ml-8">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center text-xs font-medium text-muted-foreground">BAJO</div>
                <div className="text-center text-xs font-medium text-muted-foreground">MEDIO</div>
                <div className="text-center text-xs font-medium text-muted-foreground">ALTO</div>
              </div>
              
              {/* Matrix grid */}
              <div className="space-y-2">
                {/* High impact row */}
                <div className="flex items-stretch gap-2">
                  <div className="w-8 flex items-center justify-end text-xs font-medium text-muted-foreground">Alto</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="high" effort="low" />
                    <CellContent impact="high" effort="medium" />
                    <CellContent impact="high" effort="high" />
                  </div>
                </div>
                
                {/* Medium impact row */}
                <div className="flex items-stretch gap-2">
                  <div className="w-8 flex items-center justify-end text-xs font-medium text-muted-foreground">Medio</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="medium" effort="low" />
                    <CellContent impact="medium" effort="medium" />
                    <CellContent impact="medium" effort="high" />
                  </div>
                </div>
                
                {/* Low impact row */}
                <div className="flex items-stretch gap-2">
                  <div className="w-8 flex items-center justify-end text-xs font-medium text-muted-foreground">Bajo</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="low" effort="low" />
                    <CellContent impact="low" effort="medium" />
                    <CellContent impact="low" effort="high" />
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-700"></div>
                  <span>&gt;50K€</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>10-50K€</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span>5-10K€</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  <span>&lt;5K€</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ListView = () => {
    const horizonLabels: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
      quick_win: { 
        title: 'Quick Wins', 
        subtitle: '0-3 meses',
        icon: <Zap className="h-5 w-5 text-green-600" />
      },
      short: { 
        title: 'Corto Plazo', 
        subtitle: '3-6 meses',
        icon: <Clock className="h-5 w-5 text-blue-600" />
      },
      medium: { 
        title: 'Medio Plazo', 
        subtitle: '6-12 meses',
        icon: <Target className="h-5 w-5 text-yellow-600" />
      },
      long: { 
        title: 'Largo Plazo', 
        subtitle: '+12 meses',
        icon: <TrendingUp className="h-5 w-5 text-purple-600" />
      }
    };

    return (
      <div className="space-y-4">
        {Object.entries(groupedOpportunities).map(([horizon, opportunities]) => {
          if (opportunities.length === 0) return null;
          const { title, subtitle, icon } = horizonLabels[horizon];
          const isExpanded = expandedSections.includes(horizon);
          const sectionSavings = opportunities.reduce((sum, o) => sum + o.savings, 0);
          
          return (
            <Collapsible key={horizon} open={isExpanded} onOpenChange={() => toggleSection(horizon)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {icon}
                        <div>
                          <CardTitle className="text-lg">{title}</CardTitle>
                          <CardDescription>{subtitle} · {opportunities.length} oportunidades</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Ahorro potencial</div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {sectionSavings.toLocaleString()}€/año
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-4">
                      {opportunities.map(opp => (
                        <OpportunityCard key={opp.id} opportunity={opp} />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/cost-consulting/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Oportunidades de Ahorro</h1>
            <p className="text-muted-foreground mt-1">{project?.name || `Análisis #${id}`}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ahorro total</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {totalSavings.toLocaleString()}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oportunidades</p>
                <p className="text-2xl font-bold">{opportunities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quick Wins</p>
                <p className="text-2xl font-bold">{quickWins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quick Win Ahorro</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {quickWinSavings.toLocaleString()}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-muted/30 rounded-lg">
        {/* Horizonte */}
        <Select value={filters.horizon} onValueChange={(v) => setFilters({...filters, horizon: v})}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Horizonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="quick_win">⚡ Quick Wins</SelectItem>
            <SelectItem value="short_term">📅 Corto (3-6m)</SelectItem>
            <SelectItem value="medium_term">📆 Medio (6-12m)</SelectItem>
            <SelectItem value="long_term">🗓️ Largo (&gt;12m)</SelectItem>
          </SelectContent>
        </Select>

        {/* Origen */}
        <Select value={filters.origin} onValueChange={(v) => setFilters({...filters, origin: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Identificado por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            <SelectItem value="agent_contracts">📄 Análisis Contratos</SelectItem>
            <SelectItem value="agent_invoices">🧾 Auditoría Facturas</SelectItem>
            <SelectItem value="agent_benchmarks">📊 Benchmark</SelectItem>
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="identified">🔍 Identificada</SelectItem>
            <SelectItem value="validated">✅ Validada</SelectItem>
            <SelectItem value="in_progress">🔄 En progreso</SelectItem>
            <SelectItem value="implemented">✨ Implementada</SelectItem>
            <SelectItem value="dismissed">❌ Descartada</SelectItem>
          </SelectContent>
        </Select>

        {/* Rango de ahorro */}
        <Select value={filters.savingsRange} onValueChange={(v) => setFilters({...filters, savingsRange: v})}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Ahorro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier €</SelectItem>
            <SelectItem value="50k+">€50K+ /año</SelectItem>
            <SelectItem value="20-50k">€20K-50K /año</SelectItem>
            <SelectItem value="10-20k">€10K-20K /año</SelectItem>
            <SelectItem value="5-10k">€5K-10K /año</SelectItem>
            <SelectItem value="<5k">Menos de €5K</SelectItem>
          </SelectContent>
        </Select>

        {/* Solo con recuperación */}
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
          <Checkbox
            id="hasRecovery"
            checked={filters.hasRecovery}
            onCheckedChange={(v) => setFilters({...filters, hasRecovery: v === true})}
          />
          <Label htmlFor="hasRecovery" className="text-sm cursor-pointer">
            Con recuperación única
          </Label>
        </div>

        {/* Reset */}
        <Button variant="ghost" size="sm" onClick={() => setFilters(defaultFilters)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Limpiar
        </Button>

        {/* View toggle */}
        <div className="ml-auto">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'matrix' | 'list')}
          >
            <ToggleGroupItem value="list" aria-label="Vista lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="matrix" aria-label="Vista matriz">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Results counter */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredOpportunities.length} de {opportunities.length} oportunidades
        </p>
        <p className="text-sm font-medium">
          Total ahorro: <span className="text-green-600 dark:text-green-400">{formatCurrency(totalSavings)}</span>
          {totalRecovery > 0 && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">+ {formatCurrency(totalRecovery)} recuperación</span>
          )}
        </p>
      </div>

      {/* Content */}
      {viewMode === 'matrix' ? <MatrixView /> : <ListView />}

      {/* Detail Sheet */}
      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedOpportunity && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg">{selectedOpportunity.title}</SheetTitle>
                  <Badge variant="secondary" className="ml-2">
                    {getHorizonLabel(selectedOpportunity.horizon)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedOpportunity.category}</Badge>
                  {getStatusBadge(selectedOpportunity.status)}
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* 1. RESUMEN FINANCIERO */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Ahorro Anual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedOpportunity.savings)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedOpportunity.savingsPercent}% del gasto en esta categoría
                      </p>
                    </CardContent>
                  </Card>

                  {selectedOpportunity.oneTimeRecovery > 0 && (
                    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Recuperación Inmediata</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(selectedOpportunity.oneTimeRecovery)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cobro único (facturas erróneas, duplicados)
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 2. ORIGEN Y CAUSA */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Origen del Hallazgo</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getAgentLabel(selectedOpportunity.identifiedBy)}</Badge>
                    {selectedOpportunity.supplier !== 'Varios' && (
                      <span className="text-sm text-muted-foreground">
                        Proveedor: <span className="font-medium text-foreground">{selectedOpportunity.supplier}</span>
                      </span>
                    )}
                  </div>

                  {selectedOpportunity.rootCause && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Causa Raíz:</p>
                      <p className="text-sm text-muted-foreground">{selectedOpportunity.rootCause}</p>
                    </div>
                  )}
                </div>

                {/* 3. DESCRIPCIÓN */}
                {selectedOpportunity.description && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedOpportunity.description}</p>
                  </div>
                )}

                {/* 4. ACCIONES RECOMENDADAS */}
                {selectedOpportunity.actions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Acciones Recomendadas</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {selectedOpportunity.actions.map((action, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{action}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 5. MÉTRICAS */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Métricas de Evaluación</h4>
                  <div className="grid grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                    <MetricBadge label="Impacto" value={selectedOpportunity.impactScore} max={10} color="green" />
                    <MetricBadge label="Esfuerzo" value={selectedOpportunity.effortScore} max={10} color="blue" />
                    <MetricBadge label="Riesgo" value={selectedOpportunity.riskScore} max={10} color="red" />
                    <MetricBadge label="Prioridad" value={selectedOpportunity.priorityScore} max={10} color="purple" />
                  </div>
                </div>

                {/* 6. TIMELINE */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Timeline</h4>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Identificada: {formatDate(selectedOpportunity.identifiedAt) || 'Reciente'}</span>
                    </div>
                    {selectedOpportunity.validatedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        <span>Validada: {formatDate(selectedOpportunity.validatedAt)}</span>
                      </div>
                    )}
                    {selectedOpportunity.implementedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        <span>Implementada: {formatDate(selectedOpportunity.implementedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. NOTAS */}
                {selectedOpportunity.notes && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Notas</h4>
                    <p className="text-sm text-muted-foreground italic">{selectedOpportunity.notes}</p>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedOpportunity.status === 'identified' && (
                    <Button className="flex-1" variant="default">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Validar Oportunidad
                    </Button>
                  )}
                  {(selectedOpportunity.status === 'identified' || selectedOpportunity.status === 'validated') && (
                    <Button className="flex-1" variant="outline">
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Implementación
                    </Button>
                  )}
                  {selectedOpportunity.status === 'in_progress' && (
                    <Button className="flex-1" variant="default">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como Implementada
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CostConsultingOpportunities;
