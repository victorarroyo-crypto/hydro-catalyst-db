import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import type { ChemInvoiceAlert, AlertSeverity, AlertState } from './types';
import { SEVERITY_CONFIG, ALERT_STATE_CONFIG, formatEURCurrency } from './types';

interface Props {
  alerts: ChemInvoiceAlert[];
  loading: boolean;
  onUpdateAlert: (args: { alertId: string; estado: string }) => void;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  precio_vs_contrato: 'Precio vs contrato',
  subida_no_justificada: 'Subida no justificada',
  bajada_no_trasladada: 'Bajada no trasladada',
  rappel_no_cobrado: 'Rappel no cobrado',
  recargo_no_pactado: 'Recargo no pactado',
  formato_caro: 'Formato caro',
  frecuencia_ineficiente: 'Frecuencia ineficiente',
  plazo_pago_incumplido: 'Plazo pago incumplido',
  error_facturacion: 'Error facturación',
  concentracion_cara: 'Concentración cara',
  porte_excesivo: 'Porte excesivo',
  tendencia_alcista: 'Tendencia alcista',
};

export function ChemInvoiceAlerts({ alerts, loading, onUpdateAlert }: Props) {
  const [filterSeveridad, setFilterSeveridad] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeveridad !== 'all' && a.severidad !== filterSeveridad) return false;
      if (filterEstado !== 'all' && a.estado !== filterEstado) return false;
      return true;
    });
  }, [alerts, filterSeveridad, filterEstado]);

  const totalImpacto = useMemo(() => {
    return alerts
      .filter(a => a.estado === 'pendiente')
      .reduce((s, a) => s + (a.impacto_estimado_eur || 0), 0);
  }, [alerts]);

  const pendientes = alerts.filter(a => a.estado === 'pendiente').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
          <p className="text-sm text-muted-foreground">No hay alertas de facturación. Ejecuta el análisis para detectar oportunidades.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {pendientes} alertas pendientes de {alerts.length} total
        </span>
        {totalImpacto > 0 && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3">
            Ahorro potencial: {formatEURCurrency(totalImpacto)}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterSeveridad} onValueChange={setFilterSeveridad}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="revisada">Revisada</SelectItem>
            <SelectItem value="descartada">Descartada</SelectItem>
            <SelectItem value="accionada">Accionada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const sevConfig = SEVERITY_CONFIG[alert.severidad];
          const stateConfig = ALERT_STATE_CONFIG[alert.estado];
          return (
            <Card key={alert.id} className={`${sevConfig.border}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] ${sevConfig.color}`}>{sevConfig.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {ALERT_TYPE_LABELS[alert.tipo_alerta] || alert.tipo_alerta}
                    </Badge>
                    {alert.chem_suppliers?.nombre && (
                      <span className="text-xs text-muted-foreground">{alert.chem_suppliers.nombre}</span>
                    )}
                  </div>
                  <Badge className={`text-[10px] ${stateConfig.color}`}>{stateConfig.label}</Badge>
                </div>

                <p className="text-sm">{alert.descripcion}</p>

                {alert.impacto_estimado_eur != null && alert.impacto_estimado_eur > 0 && (
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Impacto estimado: {formatEURCurrency(alert.impacto_estimado_eur)}
                  </p>
                )}

                {alert.estado === 'pendiente' && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateAlert({ alertId: alert.id, estado: 'revisada' })}>
                      <Eye className="w-3 h-3 mr-1" /> Revisar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground" onClick={() => onUpdateAlert({ alertId: alert.id, estado: 'descartada' })}>
                      <XCircle className="w-3 h-3 mr-1" /> Descartar
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onUpdateAlert({ alertId: alert.id, estado: 'accionada' })}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Accionar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
