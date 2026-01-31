import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ArrowRight
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

// Mock data for opportunities
const mockOpportunities = [
  {
    id: '1',
    title: 'Renegociar precio PAC',
    category: 'Químicos',
    supplier: 'Química Industrial SL',
    savings: 4500,
    savingsPercent: 10,
    impact: 'high',
    effort: 'low',
    horizon: 'quick_win',
    confidence: 'high',
    risk: 'low',
    status: 'identified',
    rating: 5,
    description: 'El precio actual (0.38€/kg) está 9% por encima del benchmark de mercado (0.28-0.35€/kg).',
    actions: ['Solicitar ofertas alternativas', 'Preparar análisis comparativo', 'Negociar antes de renovación']
  },
  {
    id: '2',
    title: 'Eliminar contrato zombie O&M',
    category: 'O&M',
    supplier: 'Servicios Técnicos SA',
    savings: 2400,
    savingsPercent: 100,
    impact: 'medium',
    effort: 'low',
    horizon: 'quick_win',
    confidence: 'high',
    risk: 'low',
    status: 'validated',
    rating: 5,
    description: 'Contrato de mantenimiento de equipos que ya no existen en la planta.',
    actions: ['Verificar inventario de equipos', 'Enviar carta de cancelación']
  },
  {
    id: '3',
    title: 'Optimizar términos de pago',
    category: 'General',
    supplier: 'Varios',
    savings: 800,
    savingsPercent: 2,
    impact: 'low',
    effort: 'medium',
    horizon: 'quick_win',
    confidence: 'medium',
    risk: 'low',
    status: 'identified',
    rating: 3,
    description: 'Negociar pronto pago con descuento del 2% en proveedores principales.',
    actions: ['Identificar proveedores con margen', 'Proponer descuento por pronto pago']
  },
  {
    id: '4',
    title: 'Cambiar gestor de residuos',
    category: 'Residuos',
    supplier: 'Residuos del Norte SL',
    savings: 3200,
    savingsPercent: 15,
    impact: 'high',
    effort: 'high',
    horizon: 'medium',
    confidence: 'medium',
    risk: 'medium',
    status: 'identified',
    rating: 4,
    description: 'Existen alternativas en el mercado con precios más competitivos y mejor servicio.',
    actions: ['Solicitar ofertas de 3+ gestores', 'Evaluar requisitos legales', 'Planificar transición']
  },
  {
    id: '5',
    title: 'Consolidar proveedores químicos',
    category: 'Químicos',
    supplier: 'Múltiples',
    savings: 1500,
    savingsPercent: 5,
    impact: 'medium',
    effort: 'high',
    horizon: 'medium',
    confidence: 'medium',
    risk: 'low',
    status: 'identified',
    rating: 3,
    description: 'Consolidar 4 proveedores en 2 para obtener mejores condiciones por volumen.',
    actions: ['Analizar compatibilidad de productos', 'Negociar contratos marco']
  },
  {
    id: '6',
    title: 'Renegociar contrato energía',
    category: 'Energía',
    supplier: 'Energía Plus SA',
    savings: 5200,
    savingsPercent: 8,
    impact: 'high',
    effort: 'high',
    horizon: 'short',
    confidence: 'high',
    risk: 'medium',
    status: 'in_progress',
    rating: 4,
    description: 'El contrato actual tiene condiciones desfavorables comparado con el mercado actual.',
    actions: ['Solicitar ofertas de comercializadoras', 'Analizar consumos', 'Negociar nuevo contrato']
  }
];

const CostConsultingOpportunities = () => {
  const { id } = useParams();
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('list');
  const [selectedOpportunity, setSelectedOpportunity] = useState<typeof mockOpportunities[0] | null>(null);
  const [horizonFilter, setHorizonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState<string[]>(['quick_win', 'short', 'medium']);

  // Calculate metrics
  const totalSavings = mockOpportunities.reduce((sum, o) => sum + o.savings, 0);
  const quickWins = mockOpportunities.filter(o => o.horizon === 'quick_win');
  const quickWinSavings = quickWins.reduce((sum, o) => sum + o.savings, 0);

  // Filter opportunities
  const filteredOpportunities = mockOpportunities.filter(o => {
    if (horizonFilter !== 'all' && o.horizon !== horizonFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && o.category !== categoryFilter) return false;
    return true;
  });

  // Group by horizon
  const groupedOpportunities = {
    quick_win: filteredOpportunities.filter(o => o.horizon === 'quick_win'),
    short: filteredOpportunities.filter(o => o.horizon === 'short'),
    medium: filteredOpportunities.filter(o => o.horizon === 'medium'),
    long: filteredOpportunities.filter(o => o.horizon === 'long')
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

  const OpportunityCard = ({ opportunity }: { opportunity: typeof mockOpportunities[0] }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedOpportunity(opportunity)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {renderStars(opportunity.rating)}
            <span className="font-medium">{opportunity.title}</span>
          </div>
          {getStatusBadge(opportunity.status)}
        </div>
        
        <div className="text-sm text-muted-foreground mb-3">
          {opportunity.category} · {opportunity.supplier}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-sm text-muted-foreground">Ahorro</div>
            <div className="font-semibold text-lg text-green-600 dark:text-green-400">
              {opportunity.savings.toLocaleString()}€/año
              <span className="text-sm font-normal ml-1">({opportunity.savingsPercent}%)</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Esfuerzo</div>
            {getEffortIndicator(opportunity.effort)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-muted-foreground">Confianza: </span>
            {getConfidenceBadge(opportunity.confidence)}
          </div>
          <div>
            <span className="text-muted-foreground">Riesgo: </span>
            {getRiskBadge(opportunity.risk)}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {opportunity.description}
        </p>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Play className="h-3 w-3 mr-1" />
            Simular escenarios
          </Button>
          <Button size="sm" variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Marcar en progreso
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MatrixView = () => {
    const getOpportunitiesForCell = (impact: string, effort: string) => {
      return filteredOpportunities.filter(o => o.impact === impact && o.effort === effort);
    };

    const CellContent = ({ impact, effort }: { impact: string; effort: string }) => {
      const opps = getOpportunitiesForCell(impact, effort);
      const isQuickWin = impact === 'high' && effort === 'low';
      const isAvoid = impact === 'low' && effort === 'high';
      
      return (
        <div className={`p-3 h-full min-h-[100px] rounded-lg border ${
          isQuickWin ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
          isAvoid ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
          'bg-muted/30 border-border'
        }`}>
          {isQuickWin && (
            <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" /> Quick Win
            </div>
          )}
          {isAvoid && (
            <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Evitar
            </div>
          )}
          
          <div className="space-y-2">
            {opps.map(opp => (
              <div
                key={opp.id}
                className="p-2 bg-background rounded border cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setSelectedOpportunity(opp)}
              >
                <div className="text-xs font-medium truncate">{opp.title}</div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {opp.savings.toLocaleString()}€
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Matriz Impacto vs Esfuerzo</CardTitle>
          <CardDescription>Priorización visual de oportunidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Y-axis label */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
              IMPACTO
            </div>
            
            {/* X-axis label */}
            <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
              ESFUERZO
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
                <div className="flex items-center gap-2">
                  <div className="w-6 text-xs font-medium text-muted-foreground text-right">Alto</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="high" effort="low" />
                    <CellContent impact="high" effort="medium" />
                    <CellContent impact="high" effort="high" />
                  </div>
                </div>
                
                {/* Medium impact row */}
                <div className="flex items-center gap-2">
                  <div className="w-6 text-xs font-medium text-muted-foreground text-right">Medio</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="medium" effort="low" />
                    <CellContent impact="medium" effort="medium" />
                    <CellContent impact="medium" effort="high" />
                  </div>
                </div>
                
                {/* Low impact row */}
                <div className="flex items-center gap-2">
                  <div className="w-6 text-xs font-medium text-muted-foreground text-right">Bajo</div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <CellContent impact="low" effort="low" />
                    <CellContent impact="low" effort="medium" />
                    <CellContent impact="low" effort="high" />
                  </div>
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
            <p className="text-muted-foreground mt-1">Análisis #{id}</p>
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
                <p className="text-2xl font-bold">{mockOpportunities.length}</p>
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

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={horizonFilter} onValueChange={setHorizonFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Horizonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="quick_win">Quick Win</SelectItem>
              <SelectItem value="short">Corto plazo</SelectItem>
              <SelectItem value="medium">Medio plazo</SelectItem>
              <SelectItem value="long">Largo plazo</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="renegotiation">Renegociación</SelectItem>
              <SelectItem value="change_supplier">Cambio proveedor</SelectItem>
              <SelectItem value="consolidation">Consolidación</SelectItem>
              <SelectItem value="elimination">Eliminación</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="identified">Identificada</SelectItem>
              <SelectItem value="validated">Validada</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="implemented">Implementada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Químicos">Químicos</SelectItem>
              <SelectItem value="Residuos">Residuos</SelectItem>
              <SelectItem value="O&M">O&M</SelectItem>
              <SelectItem value="Energía">Energía</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
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

      {/* Content */}
      {viewMode === 'matrix' ? <MatrixView /> : <ListView />}

      {/* Detail Sheet */}
      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOpportunity && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedOpportunity.rating)}
                </div>
                <SheetTitle>{selectedOpportunity.title}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedOpportunity.category}</Badge>
                  {getStatusBadge(selectedOpportunity.status)}
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Supplier */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Proveedor</h4>
                  <p className="font-medium">{selectedOpportunity.supplier}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Ahorro estimado</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {selectedOpportunity.savings.toLocaleString()}€/año
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ({selectedOpportunity.savingsPercent}% del gasto)
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Esfuerzo</div>
                      {getEffortIndicator(selectedOpportunity.effort)}
                      <div className="text-sm text-muted-foreground mt-2">
                        {selectedOpportunity.effort === 'low' ? 'Bajo' : 
                         selectedOpportunity.effort === 'medium' ? 'Medio' : 'Alto'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Confidence & Risk */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Confianza</h4>
                    <p className="font-medium">{getConfidenceBadge(selectedOpportunity.confidence)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Riesgo</h4>
                    <p className="font-medium">{getRiskBadge(selectedOpportunity.risk)}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Descripción</h4>
                  <p className="text-sm">{selectedOpportunity.description}</p>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Acciones recomendadas</h4>
                  <ul className="space-y-2">
                    {selectedOpportunity.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Simular escenarios
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Marcar en progreso
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

export default CostConsultingOpportunities;
