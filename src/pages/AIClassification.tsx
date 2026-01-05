import React from 'react';
import { AIClassificationPanel } from '@/components/AIClassificationPanel';
import { Brain, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AIClassification: React.FC = () => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" />
          Clasificación con IA
        </h1>
        <p className="text-muted-foreground">
          Clasifica automáticamente tecnologías según la taxonomía usando inteligencia artificial
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            La clasificación con IA analiza el nombre, descripción y aplicación de cada tecnología 
            para asignarle automáticamente:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Tipo de tecnología:</strong> Categoría principal (ej. Tratamiento físico, Membranas)</li>
            <li><strong>Subcategoría:</strong> Clasificación más específica dentro del tipo</li>
            <li><strong>Sector:</strong> Municipal, Industrial o Ambos</li>
          </ul>
          <p className="pt-2">
            El proceso es por lotes y puede tomar unos segundos por cada grupo de tecnologías.
          </p>
        </CardContent>
      </Card>

      <AIClassificationPanel />
    </div>
  );
};

export default AIClassification;
