import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ExternalLink,
  Building2,
  MapPin,
  Cpu,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Globe,
  Tag,
  Database,
} from 'lucide-react';
import { TRLBadge } from '@/components/TRLBadge';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';

interface ExtractedTechnology {
  id: string;
  study_id: string;
  technology_name: string;
  provider: string | null;
  country: string | null;
  web: string | null;
  trl: number | null;
  type_suggested: string | null;
  subcategory_suggested: string | null;
  brief_description: string | null;
  applications: string[] | null;
  confidence_score: number | null;
  already_in_db: boolean | null;
  existing_technology_id: string | null;
  inclusion_reason: string | null;
  source: string | null;
  added_at: string;
}

interface Props {
  technology: ExtractedTechnology;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToScoutingQueue?: (tech: ExtractedTechnology) => void;
}

export default function ExtractedTechDetailModal({ 
  technology, 
  open, 
  onOpenChange,
  onSendToScoutingQueue
}: Props) {
  const tech = technology;
  
  // Count filled fields to show completeness
  const filledFields = [
    tech.technology_name,
    tech.provider,
    tech.country,
    tech.web,
    tech.trl,
    tech.type_suggested,
    tech.subcategory_suggested,
    tech.brief_description,
    tech.applications?.length,
  ].filter(Boolean).length;
  
  const totalFields = 9;
  const completenessPercent = Math.round((filledFields / totalFields) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">{tech.technology_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {tech.provider && (
                  <>
                    <Building2 className="w-4 h-4" />
                    {tech.provider}
                  </>
                )}
                {tech.country && (
                  <>
                    <MapPin className="w-4 h-4 ml-2" />
                    {tech.country}
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={tech.confidence_score && tech.confidence_score > 0.8 ? "default" : "secondary"}>
                <Sparkles className="w-3 h-3 mr-1" />
                {Math.round((tech.confidence_score || 0.8) * 100)}% confianza
              </Badge>
              {tech.already_in_db && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Ya en BD
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Completeness indicator */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Información de la ficha</span>
                  <span className={completenessPercent >= 70 ? 'text-green-600' : completenessPercent >= 40 ? 'text-amber-600' : 'text-red-600'}>
                    {completenessPercent}% completo
                  </span>
                </div>
                <div className="w-full h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${completenessPercent >= 70 ? 'bg-green-500' : completenessPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${completenessPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Descripción Técnica
              </h4>
              {tech.brief_description ? (
                <p className="text-sm">{tech.brief_description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Sin descripción disponible
                </p>
              )}
            </div>

            <Separator />

            {/* Classification */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tipo de Tecnología
                </h4>
                {tech.type_suggested ? (
                  <Badge variant="secondary">{tech.type_suggested}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Sin clasificar</span>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Subcategoría</h4>
                {tech.subcategory_suggested ? (
                  <Badge variant="outline">{tech.subcategory_suggested}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Sin clasificar</span>
                )}
              </div>
            </div>

            {/* TRL */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Nivel de Madurez (TRL)</h4>
              {tech.trl ? (
                <TRLBadge trl={tech.trl} />
              ) : (
                <span className="text-sm text-muted-foreground italic">Sin TRL definido</span>
              )}
            </div>

            {/* Applications */}
            {tech.applications && tech.applications.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Aplicaciones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tech.applications.map((app, i) => (
                      <Badge key={i} variant="outline">{app}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Inclusion reason */}
            {tech.inclusion_reason && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Razón de Inclusión (IA)
                  </h4>
                  <p className="text-sm">{tech.inclusion_reason}</p>
                </div>
              </>
            )}

            {/* Web */}
            <Separator />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Sitio Web
              </h4>
              {tech.web ? (
                <a 
                  href={tech.web} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {tech.web}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Sin web disponible
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {tech.already_in_db && tech.existing_technology_id ? (
            <Button 
              className="flex-1"
              onClick={() => window.open(`/technologies?id=${tech.existing_technology_id}`, '_blank')}
            >
              <Database className="w-4 h-4 mr-2" />
              Ver en Base de Datos
            </Button>
          ) : (
            <Button 
              className="flex-1"
              onClick={() => {
                onSendToScoutingQueue?.(tech);
                onOpenChange(false);
              }}
            >
              <Cpu className="w-4 h-4 mr-2" />
              Enviar a Scouting Queue
            </Button>
          )}
          
          {tech.web && (
            <Button 
              variant="outline"
              onClick={() => window.open(tech.web!, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Web
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
