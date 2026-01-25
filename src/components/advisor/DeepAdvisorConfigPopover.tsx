import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Search, Brain, Sparkles, Globe, Database, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDeepAdvisorConfig, getCostLevel, hasInvalidModels, type ModelOption } from '@/hooks/useDeepAdvisorConfig';
import { cn } from '@/lib/utils';

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

export const DeepAdvisorConfigPopover: React.FC = () => {
  const { config, isLoading, isError, saveConfig, isSaving } = useDeepAdvisorConfig();
  const invalidModels = hasInvalidModels(config);

  // Local state for form
  const [searchModel, setSearchModel] = useState('');
  const [analysisModel, setAnalysisModel] = useState('');
  const [synthesisModel, setSynthesisModel] = useState('');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enableRag, setEnableRag] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    saveConfig({
      search_model: searchModel,
      analysis_model: analysisModel,
      synthesis_model: synthesisModel,
      enable_web_search: enableWebSearch,
      enable_rag: enableRag,
    });
  };

  const handleReset = () => {
    if (!config) return;
    setSearchModel(config.phases.search.default);
    setAnalysisModel(config.phases.analysis.default);
    setSynthesisModel(config.phases.synthesis.default);
    setEnableWebSearch(true);
    setEnableRag(true);
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-xs font-medium text-slate-200">{label}</Label>
      </div>
      <Select value={value} onValueChange={onChange} disabled={isLoading || isSaving}>
        <SelectTrigger className="h-8 text-xs bg-slate-900/50 border-slate-600 text-slate-100">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 z-[9999]">
          {options?.map((option) => (
            <SelectItem 
              key={option.key} 
              value={option.key}
              className="text-xs text-slate-100 focus:bg-slate-700 focus:text-white"
            >
              <div className="flex items-center gap-2">
                <span>{option.name}</span>
                <span className={cn('font-mono text-[10px]', costColors[option.cost_indicator])}>
                  {option.cost_indicator}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 relative"
              >
                <Settings className="w-4 h-4" />
                {hasChanges && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Configuración de modelos</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent 
        className="w-80 bg-slate-800 border-slate-700 p-4 z-[9999]" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-100">⚙️ Configuración</h4>
            <Badge variant="outline" className={cn('text-[10px] px-2', costBgColors[estimatedCost.level])}>
              {estimatedCost.level}
            </Badge>
          </div>

          {invalidModels && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>Hay modelos inválidos configurados. Se usarán los predeterminados.</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : isError ? (
            <div className="text-center py-4 text-red-400 text-xs">
              Error al cargar configuración
            </div>
          ) : (
            <>
              {/* Model Selectors */}
              <div className="space-y-3">
                {renderModelSelect(
                  'Búsqueda',
                  'RAG y web',
                  <Search className="h-3 w-3 text-blue-400" />,
                  searchModel,
                  setSearchModel,
                  config?.phases.search.options
                )}

                {renderModelSelect(
                  'Análisis',
                  'Agentes',
                  <Brain className="h-3 w-3 text-purple-400" />,
                  analysisModel,
                  setAnalysisModel,
                  config?.phases.analysis.options
                )}

                {renderModelSelect(
                  'Síntesis',
                  'Respuesta final',
                  <Sparkles className="h-3 w-3 text-amber-400" />,
                  synthesisModel,
                  setSynthesisModel,
                  config?.phases.synthesis.options
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-green-400" />
                    <Label htmlFor="web-search-pop" className="text-xs text-slate-300 cursor-pointer">
                      Búsqueda Web
                    </Label>
                  </div>
                  <Switch
                    id="web-search-pop"
                    checked={enableWebSearch}
                    onCheckedChange={setEnableWebSearch}
                    disabled={isLoading || isSaving}
                    className="scale-75"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-cyan-400" />
                    <Label htmlFor="rag-pop" className="text-xs text-slate-300 cursor-pointer">
                      Base de Conocimiento
                    </Label>
                  </div>
                  <Switch
                    id="rag-pop"
                    checked={enableRag}
                    onCheckedChange={setEnableRag}
                    disabled={isLoading || isSaving}
                    className="scale-75"
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                size="sm"
                className="w-full bg-[#32b4cd] hover:bg-[#2a9bb3] text-white text-xs h-8"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>

              {/* Reset Button */}
              <Button
                variant="ghost"
                onClick={handleReset}
                size="sm"
                className="w-full text-xs h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restablecer configuración
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DeepAdvisorConfigPopover;
