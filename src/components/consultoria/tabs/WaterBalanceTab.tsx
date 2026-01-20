import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Droplets, 
  TrendingDown, 
  Recycle, 
  Euro,
  Download,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { API_URL } from '@/lib/api';

interface WaterBalanceData {
  total_input: number;
  total_output: number;
  inputs: Array<{
    source: string;
    volume: number;
    unit: string;
    cost_annual?: number;
  }>;
  outputs: Array<{
    destination: string;
    volume: number;
    unit: string;
  }>;
  by_area?: Array<{
    area: string;
    volume: number;
    percentage: number;
    cost_annual: number;
  }>;
  kpis?: {
    efficiency: number;
    reuse_rate: number;
    loss_rate: number;
    cost_per_m3: number;
  };
}

interface WaterBalanceTabProps {
  projectId: string;
}

const KPICard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}> = ({ icon: Icon, label, value, unit, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">
            {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const WaterBalanceTab: React.FC<WaterBalanceTabProps> = ({ projectId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['water-balance', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/water-balance`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.water_balance as WaterBalanceData | null;
    },
    enabled: !!projectId,
  });

  const handleExportCSV = () => {
    if (!data) return;
    
    let csv = 'Tipo,Fuente/Destino,Volumen (m³/día),Costo Anual (€)\n';
    
    data.inputs.forEach(input => {
      csv += `Entrada,${input.source},${input.volume},${input.cost_annual || ''}\n`;
    });
    
    data.outputs.forEach(output => {
      csv += `Salida,${output.destination},${output.volume},\n`;
    });
    
    if (data.by_area) {
      csv += '\nÁrea,Volumen (m³/día),Porcentaje,Costo Anual (€)\n';
      data.by_area.forEach(area => {
        csv += `${area.area},${area.volume},${area.percentage}%,${area.cost_annual}\n`;
      });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'balance_hidrico.csv';
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Droplets className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h4 className="font-medium mb-2">Sin datos de balance hídrico</h4>
          <p className="text-muted-foreground">
            Ejecuta un análisis para calcular el balance hídrico del proyecto
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis = data.kpis || {
    efficiency: 0,
    reuse_rate: 0,
    loss_rate: 0,
    cost_per_m3: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Balance Hídrico</h3>
          <p className="text-sm text-muted-foreground">
            Flujos de entrada y salida de agua en la planta
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Droplets}
          label="Eficiencia"
          value={kpis.efficiency}
          unit="%"
          color="bg-blue-500/10 text-blue-500"
        />
        <KPICard
          icon={Recycle}
          label="Tasa de Reúso"
          value={kpis.reuse_rate}
          unit="%"
          color="bg-green-500/10 text-green-500"
        />
        <KPICard
          icon={TrendingDown}
          label="Pérdidas"
          value={kpis.loss_rate}
          unit="%"
          color="bg-red-500/10 text-red-500"
        />
        <KPICard
          icon={Euro}
          label="Costo por m³"
          value={`€${kpis.cost_per_m3.toFixed(2)}`}
          color="bg-purple-500/10 text-purple-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Entradas de Agua
            </CardTitle>
            <CardDescription>
              Total: {data.total_input.toLocaleString('es-ES')} m³/día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Volumen</TableHead>
                  <TableHead className="text-right">Costo/año</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inputs.map((input, i) => (
                  <TableRow key={i}>
                    <TableCell>{input.source}</TableCell>
                    <TableCell className="text-right">
                      {input.volume.toLocaleString('es-ES')} {input.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {input.cost_annual 
                        ? `€${input.cost_annual.toLocaleString('es-ES')}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              Salidas de Agua
            </CardTitle>
            <CardDescription>
              Total: {data.total_output.toLocaleString('es-ES')} m³/día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Volumen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outputs.map((output, i) => (
                  <TableRow key={i}>
                    <TableCell>{output.destination}</TableCell>
                    <TableCell className="text-right">
                      {output.volume.toLocaleString('es-ES')} {output.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* By Area */}
      {data.by_area && data.by_area.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Consumo (m³/día)</TableHead>
                  <TableHead className="text-right">% del Total</TableHead>
                  <TableHead className="text-right">Costo Anual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_area.map((area, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{area.area}</TableCell>
                    <TableCell className="text-right">
                      {area.volume.toLocaleString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">{area.percentage}%</TableCell>
                    <TableCell className="text-right">
                      €{area.cost_annual.toLocaleString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
