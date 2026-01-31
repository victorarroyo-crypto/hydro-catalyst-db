import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BarChart3, Upload, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CostConsultingBenchmarks = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Benchmarks</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona datos de referencia para comparativas de mercado
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Solo Admin
          </Badge>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Importar Datos
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Puntos de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Sin datos de benchmark</CardTitle>
          <CardDescription className="text-center mb-4 max-w-md">
            Importa datos de mercado para establecer referencias de precios 
            y métricas comparativas del sector agua
          </CardDescription>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Categoría
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostConsultingBenchmarks;
