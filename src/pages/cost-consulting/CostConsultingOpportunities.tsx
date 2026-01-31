import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lightbulb, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const CostConsultingOpportunities = () => {
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
            <h1 className="text-3xl font-bold text-foreground">Oportunidades de Ahorro</h1>
            <p className="text-muted-foreground mt-1">Análisis #{id}</p>
          </div>
        </div>
        <Button>
          <Sparkles className="h-4 w-4 mr-2" />
          Detectar con IA
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Sin oportunidades detectadas</CardTitle>
          <CardDescription className="text-center mb-4">
            Carga contratos y facturas para que la IA identifique oportunidades de ahorro
          </CardDescription>
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar con IA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostConsultingOpportunities;
