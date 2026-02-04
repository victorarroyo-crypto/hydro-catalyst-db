import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, Rocket, Zap } from 'lucide-react';
import { CostOpportunity } from '@/hooks/useCostConsultingData';

interface ExecutiveSummaryCardProps {
  project: {
    total_spend_analyzed?: number | null;
    total_savings_identified?: number | null;
  };
  opportunities: CostOpportunity[];
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0€';
  return value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({ 
  project, 
  opportunities 
}) => {
  const quickWins = opportunities.filter(
    o => o.implementation_horizon === 'quick_win' || o.effort_level === 'low'
  );
  
  const totalSavings = opportunities.reduce(
    (sum, o) => sum + (o.savings_annual || 0), 
    0
  );
  
  const totalRecovery = opportunities.reduce(
    (sum, o) => sum + ((o as any).one_time_recovery || 0), 
    0
  );
  
  const topOpportunities = [...opportunities]
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    .slice(0, 3);

  return (
    <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
          Resumen Ejecutivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalSavings)}
            </p>
            <p className="text-xs text-muted-foreground">Ahorro anual identificado</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalRecovery)}
            </p>
            <p className="text-xs text-muted-foreground">Recuperación inmediata</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {opportunities.length}
            </p>
            <p className="text-xs text-muted-foreground">Oportunidades</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {quickWins.length}
            </p>
            <p className="text-xs text-muted-foreground">Quick Wins</p>
          </div>
        </div>

        <Separator />

        {/* Top 3 acciones */}
        {topOpportunities.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Top 3 Acciones Prioritarias
            </h4>
            <ol className="space-y-2">
              {topOpportunities.map((opp, i) => (
                <li 
                  key={opp.id} 
                  className="flex items-start gap-3 p-3 bg-white dark:bg-card rounded-lg border"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{opp.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {opp.description}
                    </p>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-bold whitespace-nowrap">
                    {formatCurrency(opp.savings_annual)}/año
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Quick Wins destacados */}
        {quickWins.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Quick Wins (implementar en menos de 3 meses)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickWins.slice(0, 4).map(opp => (
                  <div 
                    key={opp.id} 
                    className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <p className="font-medium text-sm line-clamp-1">{opp.title}</p>
                    <p className="text-green-600 dark:text-green-400 font-bold">
                      {formatCurrency(opp.savings_annual)}/año
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
