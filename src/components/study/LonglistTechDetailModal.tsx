import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TRLBadge } from '@/components/TRLBadge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  MapPin, 
  Globe, 
  FileText, 
  Lightbulb, 
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Database,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import type { Tables } from '@/integrations/supabase/types';

type LonglistItem = Tables<'study_longlist'>;

interface LonglistTechDetailModalProps {
  item: LonglistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
}

export const LonglistTechDetailModal: React.FC<LonglistTechDetailModalProps> = ({
  item,
  open,
  onOpenChange,
  studyId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToDB, setIsSendingToDB] = useState(false);
  
  const [editData, setEditData] = useState({
    technology_name: '',
    provider: '',
    country: '',
    trl: null as number | null,
    brief_description: '',
    inclusion_reason: '',
    web: '',
    applications: [] as string[],
    type_suggested: '',
    subcategory_suggested: '',
  });

  React.useEffect(() => {
    if (item) {
      setEditData({
        technology_name: item.technology_name || '',
        provider: item.provider || '',
        country: item.country || '',
        trl: item.trl,
        brief_description: item.brief_description || '',
        inclusion_reason: item.inclusion_reason || '',
        web: item.web || '',
        applications: item.applications || [],
        type_suggested: item.type_suggested || '',
        subcategory_suggested: item.subcategory_suggested || '',
      });
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('study_longlist')
      .update({
        technology_name: editData.technology_name,
        provider: editData.provider,
        country: editData.country,
        trl: editData.trl,
        brief_description: editData.brief_description,
        inclusion_reason: editData.inclusion_reason,
        web: editData.web,
        applications: editData.applications,
        type_suggested: editData.type_suggested,
        subcategory_suggested: editData.subcategory_suggested,
      })
      .eq('id', item.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      toast({
        title: 'Guardado',
        description: 'Los cambios se han guardado correctamente',
      });
      setIsEditing(false);
    }
  };

  const handleSendToDatabase = async () => {
    setIsSendingToDB(true);

    // Insert into technologies table with proper format
    const { error } = await supabase
      .from('technologies')
      .insert({
        'Nombre de la tecnología': editData.technology_name || item.technology_name,
        'Proveedor / Empresa': editData.provider || item.provider,
        'País de origen': editData.country || item.country,
        'Grado de madurez (TRL)': editData.trl ?? item.trl,
        'Descripción técnica breve': editData.brief_description || item.brief_description,
        'Tipo de tecnología': editData.type_suggested || item.type_suggested || 'Por clasificar',
        'Subcategoría': editData.subcategory_suggested || item.subcategory_suggested,
        'Web de la empresa': editData.web || item.web,
        'Aplicación principal': (editData.applications || item.applications)?.join(', '),
        'Comentarios del analista': editData.inclusion_reason || item.inclusion_reason,
        status: 'en_revision',
        review_status: 'pending',
      });

    setIsSendingToDB(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar a la base de datos',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      toast({
        title: 'Enviado a BD',
        description: 'La tecnología está pendiente de revisión en la base de datos',
      });
      onOpenChange(false);
    }
  };

  // Convert longlist item to a technology-like object for the AIEnrichmentButton
  const technologyLikeObject = {
    id: item.id,
    'Nombre de la tecnología': item.technology_name,
    'Proveedor / Empresa': item.provider,
    'País de origen': item.country,
    'Grado de madurez (TRL)': item.trl,
    'Descripción técnica breve': item.brief_description,
    'Tipo de tecnología': item.type_suggested || 'Por clasificar',
    'Subcategoría': item.subcategory_suggested,
    'Web de la empresa': item.web,
    'Aplicación principal': item.applications?.join(', '),
    created_at: item.added_at,
    updated_at: item.added_at,
  };

  const handleEnrichmentComplete = (enrichedData: Record<string, any>) => {
    // Map enriched data back to our edit format
    setEditData(prev => ({
      ...prev,
      technology_name: enrichedData['Nombre de la tecnología'] || prev.technology_name,
      provider: enrichedData['Proveedor / Empresa'] || prev.provider,
      country: enrichedData['País de origen'] || prev.country,
      trl: enrichedData['Grado de madurez (TRL)'] ?? prev.trl,
      brief_description: enrichedData['Descripción técnica breve'] || prev.brief_description,
      type_suggested: enrichedData['Tipo de tecnología'] || prev.type_suggested,
      subcategory_suggested: enrichedData['Subcategoría'] || prev.subcategory_suggested,
      web: enrichedData['Web de la empresa'] || prev.web,
      inclusion_reason: enrichedData['Comentarios del analista'] || prev.inclusion_reason,
    }));
    
    // Auto-save after enrichment
    setTimeout(() => {
      handleSave();
    }, 500);
  };

  const InfoRow = ({ icon: Icon, label, value, isLink = false }: {
    icon: React.ElementType; 
    label: string; 
    value: string | null | undefined; 
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
                {item.technology_name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detalles de la tecnología {item.technology_name} en la lista larga
              </DialogDescription>
              <div className="flex items-center gap-2 flex-wrap">
                {item.trl && <TRLBadge trl={item.trl} />}
                <Badge variant={item.source === 'database' ? 'default' : 'outline'}>
                  {item.source === 'database' ? 'Desde BD' : item.source === 'ai' ? 'IA' : 'Manual'}
                </Badge>
                {item.already_in_db && (
                  <Badge variant="secondary">
                    <Database className="w-3 h-3 mr-1" />
                    En BD
                  </Badge>
                )}
                {item.confidence_score && (
                  <Badge variant="outline">
                    Confianza: {Math.round(item.confidence_score * 100)}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AIEnrichmentButton 
                technology={technologyLikeObject as any}
                onEnrichmentComplete={handleEnrichmentComplete}
              />
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Guardar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {isEditing ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Tecnología</Label>
                <Input
                  value={editData.technology_name}
                  onChange={(e) => setEditData({ ...editData, technology_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor / Empresa</Label>
                <Input
                  value={editData.provider}
                  onChange={(e) => setEditData({ ...editData, provider: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>País de Origen</Label>
                <Input
                  value={editData.country}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>TRL</Label>
                <Select
                  value={editData.trl?.toString() ?? ''}
                  onValueChange={(v) => setEditData({ ...editData, trl: v ? Number(v) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar TRL" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <SelectItem key={n} value={String(n)}>TRL {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Tecnología</Label>
                <Input
                  value={editData.type_suggested}
                  onChange={(e) => setEditData({ ...editData, type_suggested: e.target.value })}
                  placeholder="Ej: Procesos industriales"
                />
              </div>
              <div className="space-y-2">
                <Label>Subcategoría</Label>
                <Input
                  value={editData.subcategory_suggested}
                  onChange={(e) => setEditData({ ...editData, subcategory_suggested: e.target.value })}
                  placeholder="Ej: Tratamiento de aguas"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Web de la Empresa</Label>
              <Input
                value={editData.web}
                onChange={(e) => setEditData({ ...editData, web: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción Técnica Breve</Label>
              <Textarea
                value={editData.brief_description}
                onChange={(e) => setEditData({ ...editData, brief_description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Razón de Inclusión / Comentarios</Label>
              <Textarea
                value={editData.inclusion_reason}
                onChange={(e) => setEditData({ ...editData, inclusion_reason: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            {/* Provider & Location Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <InfoRow 
                  icon={Building2} 
                  label="Proveedor / Empresa" 
                  value={item.provider} 
                />
                <InfoRow 
                  icon={MapPin} 
                  label="País de Origen" 
                  value={item.country} 
                />
                <InfoRow 
                  icon={Globe} 
                  label="Web" 
                  value={item.web} 
                  isLink 
                />
              </div>
              <div>
                <InfoRow 
                  icon={Lightbulb} 
                  label="Tipo de Tecnología" 
                  value={item.type_suggested} 
                />
                <InfoRow 
                  icon={FileText} 
                  label="Subcategoría" 
                  value={item.subcategory_suggested} 
                />
                <InfoRow 
                  icon={Calendar} 
                  label="Añadida el" 
                  value={new Date(item.added_at).toLocaleDateString('es-ES')} 
                />
              </div>
            </div>

            <Separator />

            {/* Description Section */}
            {item.brief_description && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción Técnica
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {item.brief_description}
                </p>
              </div>
            )}

            {/* Applications */}
            {item.applications && item.applications.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Aplicaciones
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.applications.map((app, idx) => (
                    <Badge key={idx} variant="outline">{app}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusion Reason */}
            {item.inclusion_reason && (
              <div>
                <h4 className="text-sm font-medium mb-2">Razón de Inclusión</h4>
                <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3">
                  "{item.inclusion_reason}"
                </p>
              </div>
            )}

            {/* Source Info */}
            {item.source_research_id && (
              <div className="text-xs text-muted-foreground">
                Fuente: Investigación del estudio
              </div>
            )}
          </div>
        )}

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!item.already_in_db && (
            <Button 
              onClick={handleSendToDatabase}
              disabled={isSendingToDB}
              className="gap-2"
            >
              {isSendingToDB ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Añadir a BD (Pendiente Revisión)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
