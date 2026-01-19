import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Droplets, ArrowDown, ArrowUp, Recycle, TrendingUp } from 'lucide-react';
import { WaterBalance } from '@/types/scenarioDesigner';

interface ScenarioBalanceCardProps {
  balance: WaterBalance | null;
  isCalculating?: boolean;
}

const ScenarioBalanceCard: React.FC<ScenarioBalanceCardProps> = ({
  balance,
  isCalculating = false,
}) => {
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return `${num.toFixed(1)}%`;
  };

  if (!balance && !isCalculating) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            Balance Hídrico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Configure los trenes de tratamiento para calcular el balance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            Balance Hídrico
          </span>
          {isCalculating && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Calculando...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balance && (
          <>
            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="font-medium">{formatNumber(balance.total_input_m3_day)} m³/día</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Salida</p>
                  <p className="font-medium">{formatNumber(balance.total_output_m3_day)} m³/día</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Recycle className="h-4 w-4 text-teal-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Reciclada</p>
                  <p className="font-medium">{formatNumber(balance.total_recycled_m3_day)} m³/día</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pérdidas</p>
                  <p className="font-medium">{formatNumber(balance.total_losses_m3_day)} m³/día</p>
                </div>
              </div>
            </div>

            {/* Efficiency indicators */}
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Tasa reciclaje</p>
                <p className="text-lg font-bold text-teal-600">
                  {formatPercent(balance.recycling_rate)}
                </p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Eficiencia</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatPercent(balance.efficiency)}
                </p>
              </div>
            </div>

            {/* Comparison vs baseline */}
            {balance.comparison_vs_baseline && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  vs Baseline
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      +{formatNumber(balance.comparison_vs_baseline.water_savings_m3)} m³/día
                    </span>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    {formatPercent(balance.comparison_vs_baseline.water_savings_percent)} ahorro
                  </Badge>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioBalanceCard;
