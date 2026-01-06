import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Cpu, Sparkles, Zap, Brain, Rocket, DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModelPricing, formatPricePerMillion } from '@/lib/aiModelPricing';

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tier: 'fast' | 'balanced' | 'premium';
}

const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'El más rápido y económico.',
    icon: <Zap className="w-4 h-4" />,
    tier: 'fast',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Equilibrio entre velocidad y calidad.',
    icon: <Sparkles className="w-4 h-4" />,
    tier: 'balanced',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Máxima calidad en razonamiento.',
    icon: <Brain className="w-4 h-4" />,
    tier: 'premium',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Próxima generación. Experimental.',
    icon: <Rocket className="w-4 h-4" />,
    tier: 'premium',
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    description: 'Modelo premium de OpenAI.',
    icon: <Brain className="w-4 h-4" />,
    tier: 'premium',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Buen balance costo-rendimiento.',
    icon: <Sparkles className="w-4 h-4" />,
    tier: 'balanced',
  },
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'El más rápido de OpenAI.',
    icon: <Zap className="w-4 h-4" />,
    tier: 'fast',
  },
];

interface ActionConfig {
  id: string;
  action_type: string;
  model: string;
  label: string;
  description: string;
}

const ACTION_LABELS: Record<string, { label: string; description: string }> = {
  classification: {
    label: 'Clasificación de Tecnologías',
    description: 'Modelo usado para clasificar tecnologías automáticamente según la taxonomía.',
  },
  search: {
    label: 'Búsqueda con IA',
    description: 'Modelo para buscar tecnologías usando lenguaje natural.',
  },
  knowledge_base: {
    label: 'Base de Conocimiento',
    description: 'Modelo para responder preguntas usando documentos cargados.',
  },
};

export const AIModelSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ActionConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('*')
        .order('action_type');

      if (error) throw error;

      const formattedSettings = (data || []).map((item) => ({
        id: item.id,
        action_type: item.action_type,
        model: item.model,
        label: ACTION_LABELS[item.action_type]?.label || item.action_type,
        description: ACTION_LABELS[item.action_type]?.description || '',
      }));

      setSettings(formattedSettings);
    } catch (error: any) {
      console.error('Error loading AI settings:', error);
      toast({
        title: 'Error al cargar configuración',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (actionType: string, newModel: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.action_type === actionType ? { ...s, model: newModel } : s))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('ai_model_settings')
          .update({ model: setting.model, updated_at: new Date().toISOString() })
          .eq('action_type', setting.action_type);

        if (error) throw error;
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'UPDATE_AI_MODEL_SETTINGS',
        entity_type: 'ai_model_settings',
        details: { settings: settings.map((s) => ({ action: s.action_type, model: s.model })) },
      });

      toast({
        title: 'Configuración guardada',
        description: 'Los modelos de IA han sido actualizados correctamente.',
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getModelInfo = (modelId: string) => {
    return AVAILABLE_MODELS.find((m) => m.id === modelId);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'fast':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Económico</Badge>;
      case 'balanced':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Equilibrado</Badge>;
      case 'premium':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">Premium</Badge>;
      default:
        return null;
    }
  };

  const getModelPrice = (modelId: string) => {
    const pricing = getModelPricing(modelId);
    return `$${pricing.input.toFixed(2)}/$${pricing.output.toFixed(2)}/M`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          Modelos de IA
        </CardTitle>
        <CardDescription>
          Selecciona qué modelo de inteligencia artificial usar para cada acción.
          Los modelos premium ofrecen mayor precisión pero tienen un costo más alto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          {settings.map((setting) => {
            const currentModel = getModelInfo(setting.model);
            const currentPrice = getModelPrice(setting.model);
            return (
              <div key={setting.action_type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{setting.label}</h4>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentModel && getTierBadge(currentModel.tier)}
                    <Badge variant="outline" className="text-xs font-mono">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {currentPrice}
                    </Badge>
                  </div>
                </div>
              <Select
                value={setting.model}
                onValueChange={(value) => handleModelChange(setting.action_type, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un modelo" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Google Gemini
                  </div>
                  {AVAILABLE_MODELS.filter((m) => m.id.startsWith('google/')).map((model) => {
                    const modelPrice = getModelPricing(model.id);
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.icon}
                          <div className="flex-1">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {model.description}
                            </span>
                          </div>
                          <span className="text-xs text-green-600 font-mono">
                            ${modelPrice.input.toFixed(2)}/M
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    OpenAI GPT
                  </div>
                  {AVAILABLE_MODELS.filter((m) => m.id.startsWith('openai/')).map((model) => {
                    const modelPrice = getModelPricing(model.id);
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.icon}
                          <div className="flex-1">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {model.description}
                            </span>
                          </div>
                          <span className="text-xs text-green-600 font-mono">
                            ${modelPrice.input.toFixed(2)}/M
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">Recomendaciones:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Clasificación:</strong> Gemini 2.5 Flash (~$0.001/tecnología) o Pro para mayor precisión.</li>
            <li><strong>Búsqueda:</strong> Gemini 2.5 Flash es ideal para respuestas rápidas (~$0.002/consulta).</li>
            <li><strong>Base de Conocimiento:</strong> Gemini Pro o GPT-5 para contextos largos (~$0.01/consulta).</li>
          </ul>
          <p className="text-xs mt-2 italic">* Precios por millón de tokens (input/output). Costes reales pueden variar.</p>
        </div>
      </CardContent>
    </Card>
  );
};
