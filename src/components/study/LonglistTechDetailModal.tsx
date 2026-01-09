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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Mail,
  FileText, 
  Lightbulb, 
  Trophy,
  Users,
  MessageSquare,
  Calendar,
  Tag,
  Edit,
  Save,
  X,
  Loader2,
  Database,
  ExternalLink,
  Lock,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import { generateLonglistWordDocument } from '@/lib/generateLonglistWordDocument';
import type { Tables } from '@/integrations/supabase/types';

type LonglistItem = Tables<'study_longlist'>;

interface LonglistTechDetailModalProps {
  item: LonglistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyName?: string;
}

export const LonglistTechDetailModal: React.FC<LonglistTechDetailModalProps> = ({
  item,
  open,
  onOpenChange,
  studyId,
  studyName = 'Estudio',
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
    ventaja_competitiva: '',
    innovacion: '',
    casos_referencia: '',
    paises_actua: '',
    sector: '',
    email: '',
  });

  // Determine if already linked to database
  const isLinkedToDB = item?.already_in_db || !!item?.existing_technology_id;

  // Fetch fresh data from technologies table when linked to DB
  const { data: linkedTechnology, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['linked-technology', item?.existing_technology_id],
    queryFn: async () => {
      if (!item?.existing_technology_id) return null;
      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('id', item.existing_technology_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!item?.existing_technology_id && open,
  });

  React.useEffect(() => {
    if (item && !isLinkedToDB) {
      const extendedItem = item as any;
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
        ventaja_competitiva: extendedItem.ventaja_competitiva || '',
        innovacion: extendedItem.innovacion || '',
        casos_referencia: extendedItem.casos_referencia || '',
        paises_actua: extendedItem.paises_actua || '',
        sector: extendedItem.sector || '',
        email: extendedItem.email || '',
      });
    }
  }, [item, isLinkedToDB]);

  if (!item) return null;

  const handleSave = async () => {
    if (isLinkedToDB) return; // Prevent saving if linked to DB
    
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
        paises_actua: editData.paises_actua,
        sector: editData.sector,
        ventaja_competitiva: editData.ventaja_competitiva,
        innovacion: editData.innovacion,
        casos_referencia: editData.casos_referencia,
        email: editData.email,
      } as any)
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
    if (isLinkedToDB) {
      toast({
        title: 'Ya existe en BD',
        description: 'Esta tecnología ya está vinculada a la base de datos',
      });
      return;
    }

    setIsSendingToDB(true);

    const extendedItem = item as any;
    const { data: insertedTech, error } = await supabase
      .from('technologies')
      .insert({
        'Nombre de la tecnología': editData.technology_name || item.technology_name,
        'Proveedor / Empresa': editData.provider || item.provider,
        'País de origen': editData.country || item.country,
        'Paises donde actua': editData.paises_actua || extendedItem.paises_actua || null,
        'Web de la empresa': editData.web || item.web,
        'Email de contacto': editData.email || extendedItem.email || null,
        'Grado de madurez (TRL)': editData.trl ?? item.trl,
        'Descripción técnica breve': editData.brief_description || item.brief_description,
        'Tipo de tecnología': editData.type_suggested || item.type_suggested || 'Por clasificar',
        'Subcategoría': editData.subcategory_suggested || item.subcategory_suggested,
        'Sector y subsector': editData.sector || extendedItem.sector || null,
        'Aplicación principal': (editData.applications || item.applications)?.join(', '),
        'Ventaja competitiva clave': editData.ventaja_competitiva || extendedItem.ventaja_competitiva || null,
        'Porque es innovadora': editData.innovacion || extendedItem.innovacion || null,
        'Casos de referencia': editData.casos_referencia || extendedItem.casos_referencia || null,
        'Comentarios del analista': editData.inclusion_reason || item.inclusion_reason,
        status: 'en_revision',
        review_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      setIsSendingToDB(false);
      toast({
        title: 'Error',
        description: 'No se pudo enviar a la base de datos',
        variant: 'destructive',
      });
      return;
    }

    const { error: updateError } = await supabase
      .from('study_longlist')
      .update({
        existing_technology_id: insertedTech.id,
        already_in_db: true,
      })
      .eq('id', item.id);

    setIsSendingToDB(false);

    if (updateError) {
      console.error('Error linking to longlist:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['technologies'] });
    queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
    toast({
      title: 'Enviado a BD',
      description: 'La tecnología está vinculada y pendiente de revisión',
    });
    onOpenChange(false);
  };

  const technologyLikeObject = {
    id: item.id,
    nombre: item.technology_name,
    proveedor: item.provider || '',
    pais: item.country || '',
    trl_estimado: item.trl,
    descripcion: item.brief_description || '',
    tipo_sugerido: item.type_suggested || 'Por clasificar',
    subcategoria: item.subcategory_suggested || '',
    web: item.web || '',
    aplicacion_principal: item.applications?.join(', ') || '',
    sector: '',
    ventaja_competitiva: '',
    innovacion: '',
    casos_referencia: '',
    paises_actua: '',
    comentarios_analista: item.inclusion_reason || '',
  };

  const handleEnrichmentComplete = (enrichedData: Record<string, any>) => {
    if (isLinkedToDB) return; // Prevent enrichment if linked to DB
    
    setEditData(prev => ({
      ...prev,
      brief_description: enrichedData.descripcion || prev.brief_description,
      inclusion_reason: enrichedData.comentarios_analista || prev.inclusion_reason,
      ventaja_competitiva: enrichedData.ventaja_competitiva || prev.ventaja_competitiva,
      innovacion: enrichedData.innovacion || prev.innovacion,
      casos_referencia: enrichedData.casos_referencia || prev.casos_referencia,
      paises_actua: enrichedData.paises_actua || prev.paises_actua,
      sector: enrichedData.sector || prev.sector,
      applications: enrichedData.aplicacion_principal 
        ? enrichedData.aplicacion_principal.split(',').map((s: string) => s.trim()).filter(Boolean)
        : prev.applications,
    }));
    
    setTimeout(() => {
      handleSave();
    }, 500);
  };

  // InfoRow component that shows empty state
  const InfoRow = ({ icon: Icon, label, value, isLink = false, showEmpty = true }: {
    icon: React.ElementType; 
    label: string; 
    value: string | null | undefined; 
    isLink?: boolean;
    showEmpty?: boolean;
  }) => {
    if (!value && !showEmpty) return null;
    
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {!value ? (
            <p className="text-sm text-muted-foreground/50 italic">Sin información</p>
          ) : isLink ? (
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

  // Choose data source based on whether linked to DB
  const displayData = isLinkedToDB && linkedTechnology ? {
    technology_name: linkedTechnology['Nombre de la tecnología'],
    provider: linkedTechnology['Proveedor / Empresa'],
    country: linkedTechnology['País de origen'],
    paises_actua: linkedTechnology['Paises donde actua'],
    web: linkedTechnology['Web de la empresa'],
    email: linkedTechnology['Email de contacto'],
    trl: linkedTechnology['Grado de madurez (TRL)'],
    brief_description: linkedTechnology['Descripción técnica breve'],
    type_suggested: linkedTechnology['Tipo de tecnología'],
    subcategory_suggested: linkedTechnology['Subcategoría'],
    sector: linkedTechnology['Sector y subsector'],
    applications: linkedTechnology['Aplicación principal']?.split(',').map((s: string) => s.trim()) || [],
    ventaja_competitiva: linkedTechnology['Ventaja competitiva clave'],
    innovacion: linkedTechnology['Porque es innovadora'],
    casos_referencia: linkedTechnology['Casos de referencia'],
    inclusion_reason: linkedTechnology['Comentarios del analista'],
    status: linkedTechnology.status,
    review_status: linkedTechnology.review_status,
    created_at: linkedTechnology.created_at,
  } : {
    technology_name: item.technology_name,
    provider: item.provider,
    country: item.country,
    paises_actua: (item as any).paises_actua || editData.paises_actua,
    web: item.web,
    email: (item as any).email || editData.email,
    trl: item.trl,
    brief_description: item.brief_description,
    type_suggested: item.type_suggested,
    subcategory_suggested: item.subcategory_suggested,
    sector: (item as any).sector || editData.sector,
    applications: item.applications || [],
    ventaja_competitiva: (item as any).ventaja_competitiva || editData.ventaja_competitiva,
    innovacion: (item as any).innovacion || editData.innovacion,
    casos_referencia: (item as any).casos_referencia || editData.casos_referencia,
    inclusion_reason: item.inclusion_reason,
    status: null,
    review_status: null,
    created_at: item.added_at,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="longlist-tech-detail-description">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-display mb-2">
                {displayData.technology_name}
              </DialogTitle>
              <DialogDescription id="longlist-tech-detail-description" className="sr-only">
                Detalles de la tecnología {displayData.technology_name}
              </DialogDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <TRLBadge trl={displayData.trl} />
                {isLinkedToDB && (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Vinculada a BD
                  </Badge>
                )}
                {displayData.status && (
                  <Badge variant="secondary">{displayData.status}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLoadingLinked && isLinkedToDB ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Download Word Button - Always visible */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  generateLonglistWordDocument(displayData as any, studyName);
                  toast({
                    title: 'Generando documento',
                    description: 'La ficha Word se está generando...',
                  });
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Word
              </Button>
              
              {/* Edit buttons - Only show if NOT linked to DB */}
              {!isLinkedToDB && (
                <>
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  <AIEnrichmentButton 
                    technology={technologyLikeObject as any}
                    onEnrichmentComplete={handleEnrichmentComplete}
                  />
                </>
              )}
            </div>

            {/* Read-only notice when linked to DB */}
            {isLinkedToDB && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Esta ficha está vinculada a la base de datos. Los datos se muestran en solo lectura.
                </span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-auto p-0 h-auto"
                  onClick={() => window.open(`/technologies?id=${item.existing_technology_id}`, '_blank')}
                >
                  Ver en BD
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}

            {isEditing && !isLinkedToDB ? (
              /* Edit Mode - All fields matching TechnologyDetailModal */
              <div className="space-y-6 py-4">
                {/* Información General */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Información General
                  </h3>
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
                      <Label>Países donde actúa</Label>
                      <Input
                        value={editData.paises_actua}
                        onChange={(e) => setEditData({ ...editData, paises_actua: e.target.value })}
                        placeholder="Ej: España, Francia, Alemania"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Web de la Empresa</Label>
                      <Input
                        value={editData.web}
                        onChange={(e) => setEditData({ ...editData, web: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email de Contacto</Label>
                      <Input
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Clasificación */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Clasificación
                  </h3>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sector</Label>
                      <Input
                        value={editData.sector}
                        onChange={(e) => setEditData({ ...editData, sector: e.target.value })}
                        placeholder="Ej: Industria / Agua"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>TRL (Grado de Madurez)</Label>
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
                  <div className="space-y-2">
                    <Label>Aplicación Principal</Label>
                    <Input
                      value={editData.applications?.join(', ') || ''}
                      onChange={(e) => setEditData({ ...editData, applications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Separar con comas: Aplicación 1, Aplicación 2"
                    />
                  </div>
                </div>

                {/* Descripción Técnica */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Descripción Técnica
                  </h3>
                  <div className="space-y-2">
                    <Label>Descripción Técnica Breve</Label>
                    <Textarea
                      value={editData.brief_description}
                      onChange={(e) => setEditData({ ...editData, brief_description: e.target.value })}
                      rows={4}
                      placeholder="Descripción detallada de la tecnología..."
                    />
                  </div>
                </div>

                {/* Diferenciación */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Diferenciación
                  </h3>
                  <div className="space-y-2">
                    <Label>Ventaja Competitiva Clave</Label>
                    <Textarea
                      value={editData.ventaja_competitiva}
                      onChange={(e) => setEditData({ ...editData, ventaja_competitiva: e.target.value })}
                      rows={2}
                      placeholder="¿Qué hace única a esta tecnología?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Por qué es Innovadora</Label>
                    <Textarea
                      value={editData.innovacion}
                      onChange={(e) => setEditData({ ...editData, innovacion: e.target.value })}
                      rows={2}
                      placeholder="¿Qué la hace innovadora?"
                    />
                  </div>
                </div>

                {/* Referencias */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Referencias
                  </h3>
                  <div className="space-y-2">
                    <Label>Casos de Referencia</Label>
                    <Textarea
                      value={editData.casos_referencia}
                      onChange={(e) => setEditData({ ...editData, casos_referencia: e.target.value })}
                      rows={2}
                      placeholder="Implementaciones o casos de uso conocidos"
                    />
                  </div>
                </div>

                {/* Información Interna */}
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Información Interna
                  </h3>
                  <div className="space-y-2">
                    <Label>Comentarios del Analista</Label>
                    <Textarea
                      value={editData.inclusion_reason}
                      onChange={(e) => setEditData({ ...editData, inclusion_reason: e.target.value })}
                      rows={3}
                      placeholder="Notas internas sobre esta tecnología..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode - Same structure as TechnologyDetailModal with ALL fields */
              <>
                {/* Información General */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Información General
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <InfoRow icon={Building2} label="Proveedor / Empresa" value={displayData.provider} />
                    <InfoRow icon={MapPin} label="País de origen" value={displayData.country} />
                    <InfoRow icon={Globe} label="Países donde actúa" value={displayData.paises_actua} />
                    <InfoRow icon={Globe} label="Web de la empresa" value={displayData.web} isLink />
                    <InfoRow icon={Mail} label="Email de contacto" value={displayData.email} />
                  </div>
                </div>

                <Separator />

                {/* Clasificación */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Clasificación
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <InfoRow icon={Tag} label="Tipo de tecnología" value={displayData.type_suggested} />
                    <InfoRow icon={Tag} label="Subcategoría" value={displayData.subcategory_suggested} />
                    <InfoRow icon={Tag} label="Sector" value={displayData.sector} />
                    {displayData.applications && displayData.applications.length > 0 && (
                      <div className="flex items-start gap-3 py-2">
                        <Lightbulb className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Aplicaciones</p>
                          <div className="flex flex-wrap gap-1">
                            {displayData.applications.map((app, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{app}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Descripción Técnica */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Descripción Técnica
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                    {displayData.brief_description || <span className="italic text-muted-foreground/60">Sin descripción</span>}
                  </p>
                </div>

                {/* Diferenciación */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Diferenciación
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <InfoRow icon={Trophy} label="Ventaja competitiva clave" value={displayData.ventaja_competitiva} />
                    <InfoRow icon={Lightbulb} label="Por qué es innovadora" value={displayData.innovacion} />
                  </div>
                </div>

                {/* Referencias */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Referencias
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <InfoRow icon={Users} label="Casos de referencia" value={displayData.casos_referencia} />
                  </div>
                </div>

                {/* Información Interna */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Información Interna
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <InfoRow icon={MessageSquare} label="Comentarios del analista" value={displayData.inclusion_reason} />
                    <InfoRow icon={Calendar} label="Fecha de adición" value={new Date(displayData.created_at).toLocaleDateString('es-ES')} />
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-4 border-t flex justify-between">
                  <span>Fuente: {isLinkedToDB ? 'Base de datos' : item.source === 'database' ? 'Base de datos' : item.source === 'ai' ? 'IA' : 'Manual'}</span>
                  {item.confidence_score && !isLinkedToDB && (
                    <span>Confianza: {Math.round(item.confidence_score * 100)}%</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {isLinkedToDB ? (
            <Button 
              onClick={() => window.open(`/technologies?id=${item.existing_technology_id}`, '_blank')}
              className="gap-2"
            >
              <Database className="w-4 h-4" />
              Ver en Base de Datos
            </Button>
          ) : (
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
