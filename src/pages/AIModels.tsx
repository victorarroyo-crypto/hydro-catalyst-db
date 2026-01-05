import React from 'react';
import { AIModelSettings } from '@/components/settings/AIModelSettings';
import { Cpu, Info, Zap, Sparkles, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AIModels: React.FC = () => {
  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary" />
          Configuración de Modelos IA
        </h1>
        <p className="text-muted-foreground">
          Selecciona qué modelo de inteligencia artificial usar para cada funcionalidad
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            Tipos de modelos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Modelos Rápidos</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">Rápido</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Menor latencia y coste. Ideales para tareas simples como clasificación básica.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Modelos Equilibrados</span>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">Equilibrado</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Buen balance entre velocidad y calidad. Recomendados para uso general.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Modelos Premium</span>
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-xs">Premium</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Máxima calidad en razonamiento y comprensión. Mayor coste pero resultados superiores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AIModelSettings />
    </div>
  );
};

export default AIModels;
