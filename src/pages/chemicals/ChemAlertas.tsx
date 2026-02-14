import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Filter } from 'lucide-react';
import { useChemInvoices } from '@/components/chemicals/invoices/useChemInvoices';
import type { ChemInvoiceAlert, AlertType, AlertSeverity, AlertState } from '@/components/chemicals/invoices/types';
import { formatEURCurrency, SEVERITY_CONFIG, ALERT_STATE_CONFIG } from '@/components/chemicals/invoices/types';

// --- Type label translations ---
const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  precio_vs_contrato: 'Precio vs Contrato',
  subida_no_justificada: 'Subida No Justificada',
  bajada_no_trasladada: 'Bajada No Trasladada',
  rappel_no_cobrado: 'Rappel No Cobrado',
  recargo_no_pactado: 'Recargo No Pactado',
  formato_caro: 'Formato de Envase Caro',
  frecuencia_ineficiente: 'Frecuencia Ineficiente',
  plazo_pago_incumplido: 'Plazo de Pago Incumplido',
  error_facturacion: 'Error de Facturación',
  concentracion_cara: 'Concentración Baja (Transporte de Agua)',
  porte_excesivo: 'Coste de Transporte Excesivo',
  tendencia_alcista: 'Tendencia Alcista',
};

// --- Severity badge config ---
const SEVERITY_BADGES: Record<AlertSeverity, { emoji: string; className: string }> = {
  critica: { emoji: '🔴', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  alta: { emoji: '🟠', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  media: { emoji: '🟡', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  baja: { emoji: '⚪', className: 'bg-muted text-muted-foreground' },
};

// --- State transitions ---
const STATE_TRANSITIONS: Record<AlertState, AlertState[]> = {
  pendiente: ['revisada', 'descartada'],
  revisada: ['descartada', 'accionada'],
  descartada: ['pendiente'],
  accionada: [],
};

const STATE_BADGE_CLASS: Record<AlertState, string> = {
  pendiente: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  revisada: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  descartada: 'bg-muted text-muted-foreground',
  accionada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

// --- Component ---
export default function ChemAlertas() {
  const { projectId } = useParams();
  const { alerts, alertsLoading, updateAlert } = useChemInvoices(projectId);

  // Filters
  const [filterSeverities, setFilterSeverities] = useState<AlertSeverity[]>([]);
  const [filterTypes, setFilterTypes] = useState<AlertType[]>([]);
  const [filterEstado, setFilterEstado] = useState<'todos' | 'pendiente' | 'accionada'>('todos');
  const [filterSupplier, setFilterSupplier] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derived data
  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    alerts.forEach(a => {
      if (a.supplier_id && a.chem_suppliers?.nombre) {
        map.set(a.supplier_id, a.chem_suppliers.nombre);
      }
    });
    return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverities.length > 0 && !filterSeverities.includes(a.severidad)) return false;
      if (filterTypes.length > 0 && !filterTypes.includes(a.tipo_alerta)) return false;
      if (filterEstado === 'pendiente' && a.estado !== 'pendiente') return false;
      if (filterEstado === 'accionada' && a.estado !== 'accionada') return false;
      if (filterSupplier !== 'todos' && a.supplier_id !== filterSupplier) return false;
      return true;
    });
  }, [alerts, filterSeverities, filterTypes, filterEstado, filterSupplier]);

  const toggleSeverity = (s: AlertSeverity) => {
    setFilterSeverities(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleType = (t: AlertType) => {
    setFilterTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleChangeEstado = (alertId: string, nuevoEstado: AlertState) => {
    updateAlert({ alertId, estado: nuevoEstado });
  };

  if (alertsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Alertas ({filteredAlerts.length})
        </h2>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Severity multiselect */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Severidad</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SEVERITY_BADGES) as AlertSeverity[]).map(sev => (
                  <Badge
                    key={sev}
                    variant="outline"
                    className={`cursor-pointer text-[10px] ${filterSeverities.includes(sev) ? SEVERITY_BADGES[sev].className : 'opacity-50'}`}
                    onClick={() => toggleSeverity(sev)}
                  >
                    {SEVERITY_BADGES[sev].emoji} {SEVERITY_CONFIG[sev].label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Type multiselect */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map(tipo => (
                  <Badge
                    key={tipo}
                    variant="outline"
                    className={`cursor-pointer text-[10px] ${filterTypes.includes(tipo) ? 'bg-accent' : 'opacity-50'}`}
                    onClick={() => toggleType(tipo)}
                  >
                    {ALERT_TYPE_LABELS[tipo]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Estado radio */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Estado</label>
              <div className="flex gap-1.5">
                {(['todos', 'pendiente', 'accionada'] as const).map(e => (
                  <Badge
                    key={e}
                    variant="outline"
                    className={`cursor-pointer text-[10px] ${filterEstado === e ? 'bg-accent font-semibold' : 'opacity-60'}`}
                    onClick={() => setFilterEstado(e)}
                  >
                    {e === 'todos' ? 'Todos' : e === 'pendiente' ? 'Pendientes' : 'Accionadas'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Supplier select */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Proveedor</label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts table */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay alertas que coincidan con los filtros seleccionados.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs">Severidad</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descripción</TableHead>
                  <TableHead className="text-xs text-right">Impacto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map(alert => {
                  const isExpanded = expandedId === alert.id;
                  const sevBadge = SEVERITY_BADGES[alert.severidad];
                  const stateConfig = ALERT_STATE_CONFIG[alert.estado];
                  const transitions = STATE_TRANSITIONS[alert.estado];
                  const soporte = alert.datos_soporte;

                  return (
                    <React.Fragment key={alert.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      >
                        <TableCell className="p-2 w-8">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                          {transitions.length > 0 ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`cursor-pointer text-[10px] ${STATE_BADGE_CLASS[alert.estado]}`}>
                                  {stateConfig.label} ▾
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {transitions.map(t => (
                                  <DropdownMenuItem key={t} onClick={() => handleChangeEstado(alert.id, t)}>
                                    <Badge className={`text-[10px] mr-2 ${STATE_BADGE_CLASS[t]}`}>{ALERT_STATE_CONFIG[t].label}</Badge>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Badge className={`text-[10px] ${STATE_BADGE_CLASS[alert.estado]}`}>
                              {stateConfig.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-[10px] ${sevBadge.className}`}>
                            {sevBadge.emoji} {SEVERITY_CONFIG[alert.severidad].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-xs">{ALERT_TYPE_LABELS[alert.tipo_alerta] ?? alert.tipo_alerta}</span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px]">
                          <span className="line-clamp-2">{alert.descripcion}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold">
                          {alert.impacto_estimado_eur != null && alert.impacto_estimado_eur > 0
                            ? formatEURCurrency(alert.impacto_estimado_eur)
                            : '—'}
                        </TableCell>
                      </TableRow>

                      {/* Expandable detail */}
                      {isExpanded && soporte && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                              {Object.entries(soporte as Record<string, any>).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground font-medium min-w-[140px]">{formatSoporteKey(key)}:</span>
                                  <span className="font-mono">{formatSoporteValue(key, value)}</span>
                                </div>
                              ))}
                            </div>
                            {alert.chem_suppliers?.nombre && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Proveedor: <span className="font-medium text-foreground">{alert.chem_suppliers.nombre}</span>
                              </div>
                            )}
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
      )}
    </div>
  );
}

// --- Helpers for datos_soporte display ---
function formatSoporteKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatSoporteValue(key: string, value: any): string {
  if (value == null) return '—';
  if (typeof value === 'number') {
    if (key.includes('precio') || key.includes('coste') || key.includes('importe')) {
      return `${value.toFixed(4)} €/kg`;
    }
    if (key.includes('pct') || key.includes('porcentaje') || key.includes('diferencia')) {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    }
    if (key.includes('volumen') || key.includes('cantidad')) {
      return `${value.toLocaleString('es-ES')} kg`;
    }
    if (key.includes('concentracion')) {
      return `${value}%`;
    }
    return value.toLocaleString('es-ES');
  }
  return String(value);
}
