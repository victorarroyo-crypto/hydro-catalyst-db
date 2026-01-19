import React, { useState } from 'react';
import { Droplets, Euro, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WaterBalance {
  intake_m3_day?: number;
  discharge_m3_day?: number;
  reuse_m3_day?: number;
  reuse_percent?: number;
  water_reduction_percent?: number;
  calculated_at?: string;
}

interface FinancialSummary {
  capex?: number;
  opex_annual?: number;
  annual_savings?: number;
  payback_months?: number;
}

interface ProjectScenario {
  id: string;
  name: string;
  water_balance?: WaterBalance;
  financial_summary?: FinancialSummary;
  [key: string]: unknown;
}

interface ScenarioSummaryPanelProps {
  scenario: ProjectScenario;
  onRecalculateBalance: () => Promise<void>;
  onRecalculateFinancials: () => Promise<void>;
}

const ScenarioSummaryPanel: React.FC<ScenarioSummaryPanelProps> = ({
  scenario,
  onRecalculateBalance,
  onRecalculateFinancials,
}) => {
  const [recalculating, setRecalculating] = useState<'balance' | 'financials' | null>(null);

  const handleRecalculateBalance = async () => {
    setRecalculating('balance');
    try {
      await onRecalculateBalance();
      toast.success('Balance hídrico recalculado');
    } catch (error) {
      console.error('Error recalculating balance:', error);
      toast.error('Error al recalcular balance');
    } finally {
      setRecalculating(null);
    }
  };

  const handleRecalculateFinancials = async () => {
    setRecalculating('financials');
    try {
      await onRecalculateFinancials();
      toast.success('Financieros recalculados');
    } catch (error) {
      console.error('Error recalculating financials:', error);
      toast.error('Error al recalcular financieros');
    } finally {
      setRecalculating(null);
    }
  };

  const balance = scenario.water_balance || {};
  const financials = scenario.financial_summary || {};

  return (
    <div className="space-y-4">
      {/* Balance Hídrico */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Balance Hídrico
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculateBalance}
              disabled={recalculating !== null}
            >
              {recalculating === 'balance' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Captación</p>
              <p className="font-medium">{balance.intake_m3_day || 0} m³/día</p>
            </div>
            <div>
              <p className="text-muted-foreground">Vertido</p>
              <p className="font-medium">{balance.discharge_m3_day || 0} m³/día</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reúso</p>
              <p className="font-medium text-green-600">
                {balance.reuse_m3_day || 0} m³/día ({balance.reuse_percent || 0}%)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Reducción</p>
              <p className="font-medium text-blue-600">
                {balance.water_reduction_percent || 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financieros */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-500" />
              Resumen Financiero
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculateFinancials}
              disabled={recalculating !== null}
            >
              {recalculating === 'financials' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">CAPEX</p>
              <p className="font-medium">
                {(financials.capex || 0).toLocaleString('es-ES')} €
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">OPEX anual</p>
              <p className="font-medium">
                {(financials.opex_annual || 0).toLocaleString('es-ES')} €
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ahorro anual</p>
              <p className="font-medium text-green-600">
                {(financials.annual_savings || 0).toLocaleString('es-ES')} €
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payback</p>
              <p className="font-medium text-blue-600">
                {financials.payback_months || 0} meses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de última actualización */}
      {balance.calculated_at && (
        <p className="text-xs text-muted-foreground text-center">
          Última actualización: {new Date(balance.calculated_at).toLocaleString('es-ES')}
        </p>
      )}
    </div>
  );
};

export default ScenarioSummaryPanel;
