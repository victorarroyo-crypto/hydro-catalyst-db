import React, { useState, useEffect } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Cpu, DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLLMModels, formatModelCost, isFreeModel, LLMModel } from '@/hooks/useLLMModels';
import { AI_MODELS, MODEL_PRICING } from '@/lib/aiModelPricing';

// Modelos de Lovable AI para acciones que usan el gateway de Lovable
const LOVABLE_AI_MODELS: LLMModel[] = AI_MODELS.map((m) => ({
  key: m.id,
  name: m.name,
  cost_per_query: ((MODEL_PRICING[m.id]?.input || 0.15) + (MODEL_PRICING[m.id]?.output || 0.6)) / 1000, // Estimado por query
  is_recommended: m.id === 'google/gemini-3-flash-preview',
  is_free: false,
}));

// Acciones que usan Lovable AI Gateway (en lugar de Railway)
const LOVABLE_AI_ACTIONS = ['search'];

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
  enrichment: {
    label: 'Enriquecimiento de Fichas',
    description: 'Modelo para generar y mejorar contenido de fichas tecnológicas automáticamente.',
  },
};

export const AIModelSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ActionConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch LLM models from Railway
  const { data: llmData, isLoading: modelsLoading } = useLLMModels();
  const models = llmData?.models ?? [];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await externalSupabase
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
        const { error } = await externalSupabase
          .from('ai_model_settings')
          .update({ model: setting.model, updated_at: new Date().toISOString() })
          .eq('action_type', setting.action_type);

        if (error) throw error;
      }

      // Log the action
      await externalSupabase.from('audit_logs').insert({
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

  const getModelInfo = (modelKey: string, actionType: string) => {
    const modelList = LOVABLE_AI_ACTIONS.includes(actionType) ? LOVABLE_AI_MODELS : models;
    return modelList.find((m) => m.key === modelKey);
  };

  const getModelsForAction = (actionType: string): LLMModel[] => {
    return LOVABLE_AI_ACTIONS.includes(actionType) ? LOVABLE_AI_MODELS : models;
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
          const currentModel = getModelInfo(setting.model, setting.action_type);
          const availableModels = getModelsForAction(setting.action_type);
          const isLovableAction = LOVABLE_AI_ACTIONS.includes(setting.action_type);
          return (
            <div key={setting.action_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{setting.label}</h4>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                  {isLovableAction && (
                    <p className="text-xs text-blue-600 mt-1">Usa Lovable AI Gateway</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentModel?.is_recommended && (
                    <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                  )}
                  {currentModel && isFreeModel(currentModel) && (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-600">Gratis</Badge>
                  )}
                  {currentModel && (
                    <Badge variant="outline" className="text-xs font-mono">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {formatModelCost(currentModel.cost_per_query)}
                    </Badge>
                  )}
                </div>
              </div>
              <Select
                value={setting.model}
                onValueChange={(value) => handleModelChange(setting.action_type, value)}
                disabled={!isLovableAction && modelsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={modelsLoading && !isLovableAction ? "Cargando modelos..." : "Selecciona un modelo"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.key} value={model.key}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.is_recommended && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Recomendado
                          </Badge>
                        )}
                        {isFreeModel(model) && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-600">
                            Gratis
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatModelCost(model.cost_per_query)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
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
          <p className="font-medium mb-1">Modelos disponibles:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Lovable AI (Búsqueda):</strong> Gemini 3 Flash Preview (recomendado), Gemini 2.5 Pro, GPT-5 Mini, etc.</li>
            <li><strong>Railway (Clasificación, KB, Enriquecimiento):</strong> DeepSeek, Claude Sonnet, Claude Opus.</li>
          </ul>
          <p className="text-xs mt-2 italic">* La búsqueda con IA usa el gateway de Lovable. Las demás acciones usan Railway.</p>
        </div>
      </CardContent>
    </Card>
  );
};
