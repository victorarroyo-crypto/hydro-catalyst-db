import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const CostConsultingContracts = () => {
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
            <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">Análisis #{id}</p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Contrato
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No hay contratos</CardTitle>
          <CardDescription className="text-center mb-4">
            Sube contratos para analizar términos, precios y condiciones
          </CardDescription>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Contrato
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostConsultingContracts;
