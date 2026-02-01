import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, TrendingDown, Building2, BarChart3, Coins, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';

interface CostProject {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  total_spend_analyzed: number;
  total_savings_identified: number;
  opportunities_count: number;
  contracts_count: number;
  invoices_count: number;
  created_at: string;
  cost_verticals: {
    name: string;
    icon: string | null;
  } | null;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'outline' },
    uploading: { label: 'Subiendo', variant: 'secondary' },
    processing: { label: 'Procesando', variant: 'secondary' },
    analyzing: { label: 'Analizando', variant: 'default' },
    review: { label: 'En revisión', variant: 'default' },
    completed: { label: 'Completado', variant: 'default' },
    archived: { label: 'Archivado', variant: 'outline' },
  };
  
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const CostConsultingList = () => {
  const { advisorUser } = useAdvisorAuth();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['cost-consulting-projects', advisorUser?.id],
    queryFn: async () => {
      if (!advisorUser?.id) return [];
      const { data, error } = await supabase
        .from('cost_consulting_projects')
        .select(`
          *,
          cost_verticals (name, icon)
        `)
        .eq('user_id', advisorUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CostProject[];
    },
    enabled: !!advisorUser?.id,
  });

  const hasProjects = projects.length > 0;

  // Calculate totals
  const totalSavings = projects.reduce((sum, p) => sum + (p.total_savings_identified || 0), 0);
  const totalOpportunities = projects.reduce((sum, p) => sum + (p.opportunities_count || 0), 0);
  const totalSuppliers = new Set(projects.map(p => p.client_name).filter(Boolean)).size;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consultoría de Costes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona análisis de costes y optimización para tus clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/cost-consulting/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Análisis
          </Link>
        </Button>
      </div>

      {/* Stats Cards - only show if there are projects */}
      {hasProjects && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análisis Activos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorro Identificado</CardTitle>
              <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSavings)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpportunities}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSuppliers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!hasProjects && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-6 mb-6">
              <Coins className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Aún no tienes análisis de costes
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Sube tus contratos y facturas para identificar oportunidades de ahorro
            </p>
            <Button size="lg" asChild>
              <Link to="/cost-consulting/new">
                <Plus className="h-5 w-5 mr-2" />
                Crear primer análisis
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {hasProjects && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.client_name && (
                      <CardDescription>{project.client_name}</CardDescription>
                    )}
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                {project.cost_verticals?.name && (
                  <Badge variant="outline" className="w-fit mt-2">
                    {project.cost_verticals.name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Gasto analizado</p>
                    <p className="font-semibold">{formatCurrency(project.total_spend_analyzed || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ahorro identificado</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(project.total_savings_identified || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.opportunities_count || 0} oportunidades</span>
                  <span>{project.contracts_count || 0} contratos</span>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/cost-consulting/${project.id}`}>
                    Ver análisis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CostConsultingList;
