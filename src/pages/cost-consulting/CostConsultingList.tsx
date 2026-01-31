import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, TrendingDown, Building2, BarChart3, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

const CostConsultingList = () => {
  // TODO: Replace with actual data from cost_consulting_projects table
  const projects: any[] = [];
  const hasProjects = projects.length > 0;

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
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ahorro Identificado</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Benchmarks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
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

      {/* Projects Grid - only show if there are projects */}
      {hasProjects && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Project cards will go here */}
        </div>
      )}
    </div>
  );
};

export default CostConsultingList;
