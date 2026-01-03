import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TRLBadge } from '@/components/TRLBadge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Tag, 
  FileText, 
  Lightbulb, 
  Trophy,
  Users,
  MessageSquare,
  Calendar,
  Star,
  Edit,
  Plus,
  ExternalLink
} from 'lucide-react';
import type { Technology } from '@/types/database';

interface TechnologyDetailModalProps {
  technology: Technology | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const TechnologyDetailModal: React.FC<TechnologyDetailModalProps> = ({
  technology,
  open,
  onOpenChange,
  onEdit,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isFavoriting, setIsFavoriting] = useState(false);

  if (!technology) return null;

  // Check if user has internal role (can see internal information)
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);
  const canEdit = isInternalUser;

  const handleAddFavorite = async () => {
    if (!user) return;
    
    setIsFavoriting(true);
    const { error } = await supabase.from('user_favorites').insert({
      user_id: user.id,
      technology_id: technology.id,
    });
    setIsFavoriting(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Ya está en favoritos',
          description: 'Esta tecnología ya está en tu lista de favoritos',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo añadir a favoritos',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Añadido a favoritos',
        description: 'La tecnología se ha añadido a tu lista de favoritos',
      });
    }
  };

  const InfoRow = ({ icon: Icon, label, value, isLink = false }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null; 
    isLink?: boolean;
  }) => {
    if (!value) return null;
    
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {isLink ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              {value}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm text-foreground">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-display mb-2">
                {technology["Nombre de la tecnología"]}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <TRLBadge trl={technology["Grado de madurez (TRL)"]} />
                {technology.status && (
                  <Badge variant="outline">{technology.status}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Añadir a proyecto
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddFavorite}
              disabled={isFavoriting}
            >
              <Star className="w-4 h-4 mr-2" />
              Favorito
            </Button>
          </div>

          {/* General Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Información General
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Building2} label="Proveedor / Empresa" value={technology["Proveedor / Empresa"]} />
              <InfoRow icon={MapPin} label="País de origen" value={technology["País de origen"]} />
              <InfoRow icon={Globe} label="Web de la empresa" value={technology["Web de la empresa"]} isLink />
              <InfoRow icon={Mail} label="Email de contacto" value={technology["Email de contacto"]} />
            </div>
          </div>

          <Separator />

          {/* Classification */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Clasificación
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
              <InfoRow icon={Tag} label="Tipo de tecnología" value={technology["Tipo de tecnología"]} />
              <InfoRow icon={Tag} label="Subcategoría" value={technology["Subcategoría"]} />
              <InfoRow icon={Tag} label="Sector y subsector" value={technology["Sector y subsector"]} />
              <InfoRow icon={Tag} label="Aplicación principal" value={technology["Aplicación principal"]} />
            </div>
          </div>

          {/* Description */}
          {technology["Descripción técnica breve"] && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción Técnica
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                  {technology["Descripción técnica breve"]}
                </p>
              </div>
            </>
          )}

          {/* Differentiation */}
          {(technology["Ventaja competitiva clave"] || technology["Porque es innovadora"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Diferenciación
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={Trophy} label="Ventaja competitiva clave" value={technology["Ventaja competitiva clave"]} />
                  <InfoRow icon={Lightbulb} label="Por qué es innovadora" value={technology["Porque es innovadora"]} />
                </div>
              </div>
            </>
          )}

          {/* References */}
          {(technology["Casos de referencia"] || technology["Paises donde actua"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Referencias
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={Trophy} label="Casos de referencia" value={technology["Casos de referencia"]} />
                  <InfoRow icon={MapPin} label="Países donde actúa" value={technology["Paises donde actua"]} />
                </div>
              </div>
            </>
          )}

          {/* Internal - Only visible to internal users */}
          {isInternalUser && (technology["Comentarios del analista"] || technology["Fecha de scouting"] || technology["Estado del seguimiento"]) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Información Interna
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <InfoRow icon={MessageSquare} label="Comentarios del analista" value={technology["Comentarios del analista"]} />
                  <InfoRow icon={Calendar} label="Fecha de scouting" value={technology["Fecha de scouting"]} />
                  <InfoRow icon={Tag} label="Estado del seguimiento" value={technology["Estado del seguimiento"]} />
                </div>
              </div>
            </>
          )}

          {/* Metadata - Only visible to internal users */}
          {isInternalUser && (
            <div className="text-xs text-muted-foreground pt-4 border-t flex justify-between">
              <span>Quality Score: {technology.quality_score ?? '—'}</span>
              <span>Actualizado: {new Date(technology.updated_at).toLocaleDateString('es-ES')}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
