import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Brain, Zap, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIEnrichmentButtonProps {
  technology: {
    id: string;
    nombre: string;
    proveedor: string;
    web: string;
    pais: string;
    tipo_sugerido: string;
    subcategoria: string;
    sector: string;
    descripcion: string;
    aplicacion_principal: string;
    ventaja_competitiva: string;
    innovacion: string;
    trl_estimado: number | null;
    casos_referencia: string;
    paises_actua: string;
    comentarios_analista: string;
  };
  onEnrichmentComplete: (enrichedData: Record<string, string | number>) => void;
  disabled?: boolean;
}

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
    name: 'Gemini Flash Lite',
    description: 'Rápido y económico',
    icon: <Zap className="w-4 h-4" />,
    tier: 'fast',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini Flash',
    description: 'Equilibrio velocidad/calidad',
    icon: <Sparkles className="w-4 h-4" />,
    tier: 'balanced',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini Pro',
    description: 'Máxima calidad',
    icon: <Brain className="w-4 h-4" />,
    tier: 'premium',
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    description: 'Premium OpenAI',
    icon: <Brain className="w-4 h-4" />,
    tier: 'premium',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Buen balance',
    icon: <Sparkles className="w-4 h-4" />,
    tier: 'balanced',
  },
];

const ENRICHABLE_FIELDS = [
  { id: 'descripcion', label: 'Descripción técnica breve' },
  { id: 'aplicacion_principal', label: 'Aplicación principal' },
  { id: 'ventaja_competitiva', label: 'Ventaja competitiva clave' },
  { id: 'innovacion', label: 'Por qué es innovadora' },
  { id: 'casos_referencia', label: 'Casos de referencia' },
  { id: 'paises_actua', label: 'Países donde actúa' },
  { id: 'comentarios_analista', label: 'Comentarios del analista' },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'fast':
      return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'balanced':
      return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'premium':
      return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTierLabel = (tier: string) => {
  switch (tier) {
    case 'fast':
      return 'Rápido';
    case 'balanced':
      return 'Equilibrado';
    case 'premium':
      return 'Premium';
    default:
      return tier;
  }
};

export const AIEnrichmentButton: React.FC<AIEnrichmentButtonProps> = ({
  technology,
  onEnrichmentComplete,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    ENRICHABLE_FIELDS.map(f => f.id)
  );

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFields.length === ENRICHABLE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(ENRICHABLE_FIELDS.map(f => f.id));
    }
  };

  const handleEnrich = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo para enriquecer');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-technology', {
        body: {
          technology: {
            id: technology.id,
            nombre: technology.nombre,
            proveedor: technology.proveedor,
            web: technology.web,
            pais: technology.pais,
            tipo_sugerido: technology.tipo_sugerido,
            subcategoria: technology.subcategoria,
            sector: technology.sector,
            descripcion: technology.descripcion,
            aplicacion_principal: technology.aplicacion_principal,
            ventaja_competitiva: technology.ventaja_competitiva,
            innovacion: technology.innovacion,
            trl_estimado: technology.trl_estimado,
            casos_referencia: technology.casos_referencia,
            paises_actua: technology.paises_actua,
            comentarios_analista: technology.comentarios_analista,
          },
          model: selectedModel,
          fieldsToEnrich: selectedFields,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      toast.success('Ficha enriquecida con IA', {
        description: `Modelo: ${data.model} | Tiempo: ${(data.responseTimeMs / 1000).toFixed(1)}s`,
      });

      onEnrichmentComplete(data.enrichedData);
      setOpen(false);

    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Error al enriquecer', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Enriquecer con IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Enriquecer Ficha con IA
            </DialogTitle>
            <DialogDescription>
              La IA analizará la información disponible (incluyendo la web) para completar los campos seleccionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        {model.icon}
                        <span>{model.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 text-xs ${getTierColor(model.tier)}`}
                        >
                          {getTierLabel(model.tier)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModelInfo && (
                <p className="text-xs text-muted-foreground">
                  {selectedModelInfo.description}
                </p>
              )}
            </div>

            {/* Field Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Campos a enriquecer</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="text-xs h-6"
                >
                  {selectedFields.length === ENRICHABLE_FIELDS.length 
                    ? 'Deseleccionar todos' 
                    : 'Seleccionar todos'
                  }
                </Button>
              </div>
              
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {ENRICHABLE_FIELDS.map(field => {
                  const hasContent = !!technology[field.id as keyof typeof technology];
                  return (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => handleFieldToggle(field.id)}
                      />
                      <label
                        htmlFor={`field-${field.id}`}
                        className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                      >
                        {field.label}
                        {hasContent && (
                          <Badge variant="outline" className="text-xs">
                            Con contenido
                          </Badge>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Los campos con contenido serán mejorados y ampliados.
              </p>
            </div>

            {/* Technology Info Summary */}
            <div className="bg-muted/50 rounded-md p-3 space-y-1">
              <p className="text-sm font-medium">{technology.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {technology.proveedor}
                {technology.web && ` • ${technology.web}`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEnrich} disabled={isLoading || selectedFields.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enriqueciendo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enriquecer ({selectedFields.length} campos)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
