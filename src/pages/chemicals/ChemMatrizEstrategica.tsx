import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight, Target, Handshake, Package, CheckCircle2, AlertTriangle, ClipboardList, FileText } from 'lucide-react';
import { formatEURCurrency } from '@/components/chemicals/invoices/types';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

// --- Types ---
interface StrategyItem {
  product_id: string;
  nombre: string;
  familia_quimica: string;
  clasificacion_pareto: string;
  gasto_anual: number;
  ahorro_potencial: number;
  alertas_detectadas: string[];
  contrato_flexible: boolean;
  estrategia_recomendada: string;
  razon: string;
  acciones: string[];
}

interface StrategyMatrix {
  strategy_matrix: StrategyItem[];
  resumen: Record<string, number>;
  total_productos: number;
  total_ahorro_potencial: number;
}

// --- Strategy config ---
type StrategyKey = 'licitar' | 'negociar' | 'negociar_condiciones' | 'consolidar' | 'mantener' | 'clasificar';

const STRATEGY_CONFIG: Record<StrategyKey, {
  label: string;
  icon: React.ReactNode;
  emoji: string;
  bgClass: string;
  borderClass: string;
}> = {
  licitar: {
    label: 'Licitar',
    icon: <Target className="w-4 h-4" />,
    emoji: '🎯',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  negociar: {
    label: 'Negociar',
    icon: <Handshake className="w-4 h-4" />,
    emoji: '🤝',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-800',
  },
  negociar_condiciones: {
    label: 'Negociar Condiciones',
    icon: <ClipboardList className="w-4 h-4" />,
    emoji: '📋',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
  },
  consolidar: {
    label: 'Consolidar',
    icon: <Package className="w-4 h-4" />,
    emoji: '📦',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  mantener: {
    label: 'Mantener',
    icon: <CheckCircle2 className="w-4 h-4" />,
    emoji: '✅',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    borderClass: 'border-green-200 dark:border-green-800',
  },
  clasificar: {
    label: 'Sin clasificar',
    icon: <AlertTriangle className="w-4 h-4" />,
    emoji: '⚠️',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
  },
};

const STRATEGY_ORDER: StrategyKey[] = ['licitar', 'negociar', 'negociar_condiciones', 'consolidar', 'mantener', 'clasificar'];

const PARETO_COLORS: Record<string, string> = {
  commodity: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'semi-especialidad': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  especialidad: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  sin_clasificar: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

// --- Component ---
export default function ChemMatrizEstrategica() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [checkedActions, setCheckedActions] = useState<Record<string, Set<number>>>({});

  const { data, isLoading, error } = useQuery<StrategyMatrix>({
    queryKey: ['chem-strategy-matrix', projectId],
    queryFn: async () => {
      const res = await fetch(`${RAILWAY_URL}/api/chem-consulting/projects/${projectId}/strategy-matrix`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error generando matriz estratégica');
      const json = await res.json();
      return json;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAction = (productId: string, actionIdx: number) => {
    setCheckedActions(prev => {
      const set = new Set(prev[productId] || []);
      if (set.has(actionIdx)) set.delete(actionIdx);
      else set.add(actionIdx);
      return { ...prev, [productId]: set };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground py-24">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-orange-400" />
        <p className="text-sm">Error al cargar la matriz estratégica.</p>
        <p className="text-xs mt-1">{(error as Error)?.message}</p>
      </div>
    );
  }

  const { strategy_matrix, resumen, total_ahorro_potencial } = data;

  // Group items by strategy
  const grouped = STRATEGY_ORDER.reduce<Record<StrategyKey, StrategyItem[]>>((acc, key) => {
    acc[key] = strategy_matrix.filter(item => item.estrategia_recomendada === key);
    return acc;
  }, {} as any);

  // Summary cards
  const summaryCards = STRATEGY_ORDER.filter(k => (resumen[k] ?? grouped[k].length) > 0).map(key => {
    const config = STRATEGY_CONFIG[key];
    const count = resumen[key] ?? grouped[key].length;
    return { key, config, count };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen de Estrategias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {summaryCards.map(({ key, config, count }) => (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgClass} ${config.borderClass}`}
              >
                <span className="text-base">{config.emoji}</span>
                <span className="text-sm font-medium">{config.label}:</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Ahorro Potencial Total: <span className="font-bold text-foreground">{formatEURCurrency(total_ahorro_potencial)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Grouped strategy tables */}
      <TooltipProvider>
        {STRATEGY_ORDER.map(strategyKey => {
          const items = grouped[strategyKey];
          if (!items || items.length === 0) return null;
          const config = STRATEGY_CONFIG[strategyKey];

          return (
            <Card key={strategyKey} className={`border ${config.borderClass}`}>
              <CardHeader className={`pb-2 ${config.bgClass}`}>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-base">{config.emoji}</span>
                  {config.label.toUpperCase()}
                  <Badge variant="outline" className="ml-auto text-[10px]">{items.length} productos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs">Pareto</TableHead>
                      <TableHead className="text-xs text-right">Gasto Anual</TableHead>
                      <TableHead className="text-xs text-right">Ahorro Pot.</TableHead>
                      <TableHead className="text-xs text-center">Alertas</TableHead>
                      <TableHead className="text-xs text-center">Acciones</TableHead>
                      {strategyKey === 'licitar' && <TableHead className="text-xs w-20" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => {
                      const isExpanded = expandedProducts.has(item.product_id);
                      const paretoClass = PARETO_COLORS[item.clasificacion_pareto] || PARETO_COLORS.sin_clasificar;
                      const checked = checkedActions[item.product_id] || new Set<number>();

                      return (
                        <React.Fragment key={item.product_id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(item.product_id)}
                          >
                            <TableCell className="p-2 w-8">
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">{item.nombre}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">{item.razon}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge className={`text-[10px] ${paretoClass}`}>
                                {item.clasificacion_pareto?.replace(/_/g, ' ') || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">{formatEURCurrency(item.gasto_anual)}</TableCell>
                            <TableCell className="text-xs text-right font-mono font-semibold">
                              {item.ahorro_potencial > 0 ? formatEURCurrency(item.ahorro_potencial) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {item.alertas_detectadas.length > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="text-[10px]">{item.alertas_detectadas.length}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {item.alertas_detectadas.join(', ')}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge variant="outline" className="text-[10px]">{item.acciones.length}</Badge>
                            </TableCell>
                            {strategyKey === 'licitar' && (
                              <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] gap-1"
                                  onClick={() => navigate(`/quimicos/${projectId}/rfqs?producto=${item.product_id}`)}
                                >
                                  <FileText className="w-3 h-3" />
                                  Crear RFQ
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>

                          {/* Expanded actions checklist */}
                          {isExpanded && (
                            <TableRow className="bg-muted/20">
                              <TableCell colSpan={strategyKey === 'licitar' ? 8 : 7} className="p-4">
                                <div className="space-y-3">
                                  {/* Razón */}
                                  <div className="text-xs">
                                    <span className="font-medium text-muted-foreground">Razón: </span>
                                    <span>{item.razon}</span>
                                  </div>

                                  {/* Familia */}
                                  {item.familia_quimica && (
                                    <div className="text-xs">
                                      <span className="font-medium text-muted-foreground">Familia química: </span>
                                      <span>{item.familia_quimica}</span>
                                    </div>
                                  )}

                                  {/* Contrato flexible */}
                                  <div className="text-xs">
                                    <span className="font-medium text-muted-foreground">Contrato flexible: </span>
                                    <span>{item.contrato_flexible ? 'Sí' : 'No'}</span>
                                  </div>

                                  {/* Actions checklist */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Acciones recomendadas:</p>
                                    <div className="space-y-1.5">
                                      {item.acciones.map((accion, idx) => (
                                        <label key={idx} className="flex items-start gap-2 text-xs cursor-pointer">
                                          <Checkbox
                                            checked={checked.has(idx)}
                                            onCheckedChange={() => toggleAction(item.product_id, idx)}
                                            className="mt-0.5"
                                          />
                                          <span className={checked.has(idx) ? 'line-through text-muted-foreground' : ''}>
                                            {accion}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Alertas */}
                                  {item.alertas_detectadas.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Alertas:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {item.alertas_detectadas.map((alerta, idx) => (
                                          <Badge key={idx} variant="destructive" className="text-[10px]">{alerta}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
