import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Search, Brain, Sparkles, Globe, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDeepAdvisorConfig, getCostLevel, type ModelOption } from '@/hooks/useDeepAdvisorConfig';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { cn } from '@/lib/utils';

interface DeepAdvisorConfigPanelProps {
  variant?: 'card' | 'collapsible';
  defaultOpen?: boolean;
}

const costColors = {
  '$': 'text-green-500',
  '$$': 'text-amber-500',
  '$$$': 'text-red-500',
};

const costBgColors = {
  '$': 'bg-green-500/10 border-green-500/30 text-green-600',
  '$$': 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  '$$$': 'bg-red-500/10 border-red-500/30 text-red-600',
};

export const DeepAdvisorConfigPanel: React.FC<DeepAdvisorConfigPanelProps> = ({
  variant = 'card',
  defaultOpen = false,
}) => {
  const { advisorUser } = useAdvisorAuth();
  const userId = advisorUser?.id;
  const { config, isLoading, isError, saveConfig, isSaving } = useDeepAdvisorConfig(userId);

  // Local state for form
  const [searchModel, setSearchModel] = useState('');
  const [analysisModel, setAnalysisModel] = useState('');
  const [synthesisModel, setSynthesisModel] = useState('');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enableRag, setEnableRag] = useState(true);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from config
  useEffect(() => {
    if (config?.current) {
      setSearchModel(config.current.search_model);
      setAnalysisModel(config.current.analysis_model);
      setSynthesisModel(config.current.synthesis_model);
      setEnableWebSearch(config.current.enable_web_search);
      setEnableRag(config.current.enable_rag);
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (!config?.current) return;
    const changed =
      searchModel !== config.current.search_model ||
      analysisModel !== config.current.analysis_model ||
      synthesisModel !== config.current.synthesis_model ||
      enableWebSearch !== config.current.enable_web_search ||
      enableRag !== config.current.enable_rag;
    setHasChanges(changed);
  }, [searchModel, analysisModel, synthesisModel, enableWebSearch, enableRag, config]);

  const handleSave = () => {
    if (!userId) return;
    saveConfig({
      search_model: searchModel,
      analysis_model: analysisModel,
      synthesis_model: synthesisModel,
      enable_web_search: enableWebSearch,
      enable_rag: enableRag,
      user_id: userId,
    });
  };

  const estimatedCost = getCostLevel(config, {
    search_model: searchModel,
    analysis_model: analysisModel,
    synthesis_model: synthesisModel,
  });

  const renderModelSelect = (
    label: string,
    description: string,
    icon: React.ReactNode,
    value: string,
    onChange: (val: string) => void,
    options: ModelOption[] | undefined
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="font-medium">{label}</Label>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Select value={value} onValueChange={onChange} disabled={isLoading || isSaving}>
        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
          <SelectValue placeholder="Seleccionar modelo..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {options?.map((option) => (
            <SelectItem 
              key={option.key} 
              value={option.key}
              className="text-slate-100 focus:bg-slate-700 focus:text-white"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="flex-1">{option.name}</span>
                <span className={cn('font-mono text-sm', costColors[option.cost_indicator])}>
                  {option.cost_indicator}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const content = (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 bg-slate-700" />
          <Skeleton className="h-20 bg-slate-700" />
          <Skeleton className="h-20 bg-slate-700" />
        </div>
      ) : isError ? (
        <div className="text-center py-6 text-red-400">
          Error al cargar configuración. Reintenta más tarde.
        </div>
      ) : (
        <>
          {/* Model Selectors */}
          <div className="space-y-5">
            {renderModelSelect(
              'Modelo de Búsqueda',
              'Para RAG y búsqueda web (rápido, económico)',
              <Search className="h-4 w-4 text-blue-400" />,
              searchModel,
              setSearchModel,
              config?.phases.search.options
            )}

            {renderModelSelect(
              'Modelo de Análisis',
              'Para procesamiento por agentes (balanceado)',
              <Brain className="h-4 w-4 text-purple-400" />,
              analysisModel,
              setAnalysisModel,
              config?.phases.analysis.options
            )}

            {renderModelSelect(
              'Modelo de Síntesis',
              'Para respuesta final (máxima calidad)',
              <Sparkles className="h-4 w-4 text-amber-400" />,
              synthesisModel,
              setSynthesisModel,
              config?.phases.synthesis.options
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-2 border-t border-slate-700">
            <TooltipProvider>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-400" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="web-search" className="cursor-pointer">
                        Búsqueda Web (Tavily)
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Permite buscar información actualizada en internet para enriquecer las respuestas
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="web-search"
                  checked={enableWebSearch}
                  onCheckedChange={setEnableWebSearch}
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="rag" className="cursor-pointer">
                        Base de Conocimiento
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Utiliza la base de conocimiento interna de Vandarum con casos de estudio y documentación técnica
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="rag"
                  checked={enableRag}
                  onCheckedChange={setEnableRag}
                  disabled={isLoading || isSaving}
                />
              </div>
            </TooltipProvider>
          </div>

          {/* Cost Indicator & Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <Badge variant="outline" className={cn('px-3 py-1', costBgColors[estimatedCost.level])}>
              Coste estimado: {estimatedCost.level} ({estimatedCost.label})
            </Badge>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-[#32b4cd] hover:bg-[#2a9bb3] text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (variant === 'collapsible') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-slate-800 border-slate-700">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-700/30 transition-colors">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Settings className="h-5 w-5" />
                ⚙️ Configuración del Advisor
                <Badge variant="outline" className="ml-auto border-slate-600 text-slate-400">
                  {isOpen ? 'Cerrar' : 'Abrir'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Personaliza los modelos para cada fase
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>{content}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Settings className="h-5 w-5" />
          ⚙️ Configuración del Advisor
        </CardTitle>
        <CardDescription className="text-slate-400">
          Personaliza los modelos para cada fase
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default DeepAdvisorConfigPanel;
