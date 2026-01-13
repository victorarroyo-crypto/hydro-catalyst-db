import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { useCaseStudyModels, getDefaultModel } from '@/hooks/useCaseStudyModels';

interface LLMSelectorProps {
  value: string;
  onChange: (key: string) => void;
}

export function LLMSelector({ value, onChange }: LLMSelectorProps) {
  const { data, isLoading, isError } = useCaseStudyModels();

  const models = data?.models || [];
  const defaultKey = data?.default_key || getDefaultModel();

  // Set default value if not set
  useEffect(() => {
    if (!value && defaultKey) {
      onChange(defaultKey);
    }
  }, [value, defaultKey, onChange]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Modelo de IA</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando modelos...</span>
        </div>
      </div>
    );
  }

  if (isError || models.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Modelo de IA</Label>
        <div className="text-sm text-muted-foreground py-2">
          Usando modelo por defecto (Claude Sonnet)
        </div>
      </div>
    );
  }

  const selectedModel = models.find(m => m.key === value);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Modelo de IA</Label>
      <Select value={value || defaultKey} onValueChange={onChange}>
        <SelectTrigger className="w-full h-9">
          <SelectValue placeholder="Selecciona un modelo" />
        </SelectTrigger>
        <SelectContent className="z-[200]">
          {models.map((model) => (
            <SelectItem key={model.key} value={model.key}>
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium">{model.name}</span>
                <div className="flex items-center gap-1 ml-auto">
                  {model.is_recommended && (
                    <Badge variant="default" className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-0">
                      <Sparkles className="h-3 w-3 mr-0.5" />
                      Recomendado
                    </Badge>
                  )}
                  {model.cost_per_query <= 0.005 && (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5">
                      <Zap className="h-3 w-3 mr-0.5" />
                      Económico
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-1">
                    ~${model.cost_per_query.toFixed(3)}/doc
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Show description of selected model */}
      {selectedModel && (
        <p className="text-xs text-muted-foreground">
          {selectedModel.description}
        </p>
      )}
    </div>
  );
}
