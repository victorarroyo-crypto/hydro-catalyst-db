import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calculator, Play } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const CostConsultingSimulator = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/cost-consulting/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Simulador de Escenarios</h1>
            <p className="text-muted-foreground mt-1">Análisis #{id}</p>
          </div>
        </div>
        <Button>
          <Play className="h-4 w-4 mr-2" />
          Ejecutar Simulación
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Simulador de Escenarios</CardTitle>
          <CardDescription className="text-center mb-4 max-w-md">
            Modela diferentes escenarios de optimización y compara el impacto 
            de cada estrategia en los costes totales
          </CardDescription>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Crear Escenario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostConsultingSimulator;
