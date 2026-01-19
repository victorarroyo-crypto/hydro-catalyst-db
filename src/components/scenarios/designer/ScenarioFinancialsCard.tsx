import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { FinancialSummary } from '@/types/scenarioDesigner';

interface ScenarioFinancialsCardProps {
  financials: FinancialSummary | null;
  isCalculating?: boolean;
}

const ScenarioFinancialsCard: React.FC<ScenarioFinancialsCardProps> = ({
  financials,
  isCalculating = false,
}) => {
  const formatCurrency = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return `${num.toFixed(1)}%`;
  };

  const formatYears = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return `${num.toFixed(1)} años`;
  };

  if (!financials && !isCalculating) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Configure el escenario para ver el análisis financiero
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
            <DollarSign className="h-4 w-4 text-green-500" />
            Resumen Financiero
          </span>
          {isCalculating && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Calculando...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {financials && (
          <>
            {/* Main financial metrics */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">CAPEX Total</p>
                <p className="font-semibold text-lg">{formatCurrency(financials.total_capex)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">OPEX Anual</p>
                <p className="font-semibold">{formatCurrency(financials.annual_opex)}</p>
              </div>
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Ahorro Anual</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(financials.annual_savings)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className="font-medium">{formatYears(financials.payback_years)}</p>
                </div>
              </div>
            </div>

            {/* ROI and advanced metrics */}
            <div className="border-t pt-3 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className="text-lg font-bold text-green-600">
                  {formatPercent(financials.roi_percent)}
                </p>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">VAN (10 años)</p>
                <p className="text-sm font-bold text-blue-600">
                  {formatCurrency(financials.npv_10y)}
                </p>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">TIR</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatPercent(financials.irr_percent)}
                </p>
              </div>
            </div>

            {/* Comparison vs baseline */}
            {financials.comparison_vs_baseline && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  vs Baseline
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {financials.comparison_vs_baseline.additional_capex >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-red-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-green-500" />
                    )}
                    <div>
                      <p className="text-muted-foreground">CAPEX Adic.</p>
                      <p className={financials.comparison_vs_baseline.additional_capex >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(financials.comparison_vs_baseline.additional_capex)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <div>
                      <p className="text-muted-foreground">Ahorro Adic.</p>
                      <p className="text-green-600">
                        {formatCurrency(financials.comparison_vs_baseline.additional_savings)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">ROI Inc.</p>
                      <p className="text-blue-600">
                        {formatPercent(financials.comparison_vs_baseline.incremental_roi)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioFinancialsCard;
