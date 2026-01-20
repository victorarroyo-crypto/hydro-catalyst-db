import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  AlertTriangle, 
  AlertCircle,
  Info,
  CheckCircle,
  Bot,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_URL } from '@/lib/api';

interface Finding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation?: string;
  impact?: string;
  detected_by?: string;
  created_at: string;
}

interface FindingsTabProps {
  projectId: string;
}

const severityConfig = {
  critical: { 
    label: 'Crítico', 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    badgeClass: 'bg-red-500 text-white'
  },
  high: { 
    label: 'Alto', 
    icon: AlertCircle, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    badgeClass: 'bg-orange-500 text-white'
  },
  medium: { 
    label: 'Medio', 
    icon: Info, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    badgeClass: 'bg-yellow-500 text-white'
  },
  low: { 
    label: 'Bajo', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    badgeClass: 'bg-green-500 text-white'
  },
};

const categoryLabels: Record<string, string> = {
  ptar: 'PTAR',
  cooling: 'Torres de Refrigeración',
  boilers: 'Calderas',
  ro: 'Ósmosis Inversa',
  general: 'General',
  efficiency: 'Eficiencia',
  regulatory: 'Regulatorio',
  cost: 'Costos',
};

export const FindingsTab: React.FC<FindingsTabProps> = ({ projectId }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['findings', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/findings`);
      if (!res.ok) return { findings: [], summary: { total: 0, by_severity: {} } };
      return res.json() as Promise<{
        findings: Finding[];
        summary: { total: number; by_severity: Record<string, number> };
      }>;
    },
    enabled: !!projectId,
  });

  const findings = data?.findings || [];
  const summary = data?.summary || { total: 0, by_severity: {} };

  // Filter findings
  const filteredFindings = findings.filter((finding) => {
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && finding.category !== categoryFilter) return false;
    return true;
  });

  // Get unique categories
  const categories = [...new Set(findings.map((f) => f.category))];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{summary.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        {Object.entries(severityConfig).map(([key, config]) => (
          <Card key={key} className={config.bgColor}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${config.color}`}>
                {summary.by_severity?.[key] || 0}
              </p>
              <p className="text-sm text-muted-foreground">{config.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las severidades</SelectItem>
            <SelectItem value="critical">🔴 Crítico</SelectItem>
            <SelectItem value="high">🟠 Alto</SelectItem>
            <SelectItem value="medium">🟡 Medio</SelectItem>
            <SelectItem value="low">🟢 Bajo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(severityFilter !== 'all' || categoryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSeverityFilter('all');
              setCategoryFilter('all');
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-2">Sin hallazgos</h4>
            <p className="text-muted-foreground">
              {findings.length === 0
                ? 'Ejecuta un análisis para identificar hallazgos y oportunidades'
                : 'No hay hallazgos que coincidan con los filtros seleccionados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const config = severityConfig[finding.severity] || severityConfig.medium;
            const Icon = config.icon;

            return (
              <Card key={finding.id} className={`${config.borderColor} border-l-4`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={config.badgeClass}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline">
                            {categoryLabels[finding.category] || finding.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <h4 className="font-semibold">{finding.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>
                      
                      {finding.recommendation && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50">
                          <p className="text-sm">
                            <strong>Recomendación:</strong> {finding.recommendation}
                          </p>
                        </div>
                      )}
                      
                      {finding.impact && (
                        <p className="text-sm">
                          <strong>Impacto potencial:</strong>{' '}
                          <span className="text-green-600">{finding.impact}</span>
                        </p>
                      )}
                      
                      {finding.detected_by && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          Detectado por: {finding.detected_by}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
