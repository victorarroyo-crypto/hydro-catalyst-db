import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExternalLink,
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
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { TRLBadge } from '@/components/TRLBadge';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  // Extended fields
  paises_actua?: string | null;
  email?: string | null;
  sector?: string | null;
  ventaja_competitiva?: string | null;
  innovacion?: string | null;
  casos_referencia?: string | null;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tech = technology;
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToDB, setIsSendingToDB] = useState(false);

  // Determine if already linked to database
  const isLinkedToDB = tech.already_in_db || !!tech.existing_technology_id;

  // Fetch fresh data from technologies table when linked to DB
  const { data: linkedTechnology, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['linked-technology', tech.existing_technology_id],
    queryFn: async () => {
      if (!tech.existing_technology_id) return null;
      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('id', tech.existing_technology_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tech.existing_technology_id && open,
  });
  
  const [editData, setEditData] = useState({
    technology_name: tech.technology_name || '',
    provider: tech.provider || '',
    country: tech.country || '',
    trl: tech.trl,
    brief_description: tech.brief_description || '',
    inclusion_reason: tech.inclusion_reason || '',
    web: tech.web || '',
    applications: tech.applications || [],
    type_suggested: tech.type_suggested || '',
    subcategory_suggested: tech.subcategory_suggested || '',
    ventaja_competitiva: tech.ventaja_competitiva || '',
    innovacion: tech.innovacion || '',
    casos_referencia: tech.casos_referencia || '',
    paises_actua: tech.paises_actua || '',
    sector: tech.sector || '',
    email: tech.email || '',
  });

  React.useEffect(() => {
    if (tech && !isLinkedToDB) {
      setEditData({
        technology_name: tech.technology_name || '',
        provider: tech.provider || '',
        country: tech.country || '',
        trl: tech.trl,
        brief_description: tech.brief_description || '',
        inclusion_reason: tech.inclusion_reason || '',
        web: tech.web || '',
        applications: tech.applications || [],
        type_suggested: tech.type_suggested || '',
        subcategory_suggested: tech.subcategory_suggested || '',
        ventaja_competitiva: tech.ventaja_competitiva || '',
        innovacion: tech.innovacion || '',
        casos_referencia: tech.casos_referencia || '',
        paises_actua: tech.paises_actua || '',
        sector: tech.sector || '',
        email: tech.email || '',
      });
    }
  }, [tech, isLinkedToDB]);

  const handleSave = async () => {
    if (isLinkedToDB) return;
    
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
      .eq('id', tech.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', tech.study_id] });
      queryClient.invalidateQueries({ queryKey: ['study-solutions', tech.study_id] });
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

    const { data: insertedTech, error } = await supabase
      .from('technologies')
      .insert({
        'Nombre de la tecnología': editData.technology_name || tech.technology_name,
        'Proveedor / Empresa': editData.provider || tech.provider,
        'País de origen': editData.country || tech.country,
        'Paises donde actua': editData.paises_actua || tech.paises_actua || null,
        'Web de la empresa': editData.web || tech.web,
        'Email de contacto': editData.email || tech.email || null,
        'Grado de madurez (TRL)': editData.trl ?? tech.trl,
        'Descripción técnica breve': editData.brief_description || tech.brief_description,
        'Tipo de tecnología': editData.type_suggested || tech.type_suggested || 'Por clasificar',
        'Subcategoría': editData.subcategory_suggested || tech.subcategory_suggested,
        'Sector y subsector': editData.sector || tech.sector || null,
        'Aplicación principal': (editData.applications || tech.applications)?.join(', '),
        'Ventaja competitiva clave': editData.ventaja_competitiva || tech.ventaja_competitiva || null,
        'Porque es innovadora': editData.innovacion || tech.innovacion || null,
        'Casos de referencia': editData.casos_referencia || tech.casos_referencia || null,
        'Comentarios del analista': editData.inclusion_reason || tech.inclusion_reason,
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

    // Update the longlist entry to link to DB
    const { error: updateError } = await supabase
      .from('study_longlist')
      .update({
        existing_technology_id: insertedTech.id,
        already_in_db: true,
      })
      .eq('id', tech.id);

    setIsSendingToDB(false);

    if (updateError) {
      console.error('Error linking to longlist:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['technologies'] });
    queryClient.invalidateQueries({ queryKey: ['study-longlist', tech.study_id] });
    queryClient.invalidateQueries({ queryKey: ['study-solutions', tech.study_id] });
    toast({
      title: 'Enviado a BD',
      description: 'La tecnología está vinculada y pendiente de revisión',
    });
    onOpenChange(false);
  };

  const technologyLikeObject = {
    id: tech.id,
    nombre: tech.technology_name,
    proveedor: tech.provider || '',
    pais: tech.country || '',
    trl_estimado: tech.trl,
    descripcion: tech.brief_description || '',
    tipo_sugerido: tech.type_suggested || 'Por clasificar',
    subcategoria: tech.subcategory_suggested || '',
    web: tech.web || '',
    aplicacion_principal: tech.applications?.join(', ') || '',
    sector: tech.sector || '',
    ventaja_competitiva: tech.ventaja_competitiva || '',
    innovacion: tech.innovacion || '',
    casos_referencia: tech.casos_referencia || '',
    paises_actua: tech.paises_actua || '',
    comentarios_analista: tech.inclusion_reason || '',
  };

  const handleEnrichmentComplete = (enrichedData: Record<string, any>) => {
    if (isLinkedToDB) return;
    
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
    technology_name: tech.technology_name,
    provider: tech.provider,
    country: tech.country,
    paises_actua: tech.paises_actua || editData.paises_actua,
    web: tech.web,
    email: tech.email || editData.email,
    trl: tech.trl,
    brief_description: tech.brief_description,
    type_suggested: tech.type_suggested,
    subcategory_suggested: tech.subcategory_suggested,
    sector: tech.sector || editData.sector,
    applications: tech.applications || [],
    ventaja_competitiva: tech.ventaja_competitiva || editData.ventaja_competitiva,
    innovacion: tech.innovacion || editData.innovacion,
    casos_referencia: tech.casos_referencia || editData.casos_referencia,
    inclusion_reason: tech.inclusion_reason,
    status: null,
    review_status: null,
    created_at: tech.added_at,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="extracted-tech-detail-description">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-display mb-2">
                {displayData.technology_name}
              </DialogTitle>
              <DialogDescription id="extracted-tech-detail-description" className="sr-only">
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
                {tech.confidence_score && !isLinkedToDB && (
                  <Badge variant="secondary">
                    {Math.round(tech.confidence_score * 100)}% confianza
                  </Badge>
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
            {/* Action Buttons - Only show if NOT linked to DB */}
            {!isLinkedToDB && (
              <div className="flex gap-2 flex-wrap">
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
              </div>
            )}

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
                  onClick={() => window.open(`/technologies?id=${tech.existing_technology_id}`, '_blank')}
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
              /* View Mode - Same structure as TechnologyDetailModal */
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
                  <span>Fuente: {isLinkedToDB ? 'Base de datos' : tech.source === 'database' ? 'Base de datos' : tech.source === 'ai' ? 'IA' : 'Manual'}</span>
                  {tech.confidence_score && !isLinkedToDB && (
                    <span>Confianza: {Math.round(tech.confidence_score * 100)}%</span>
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
              onClick={() => window.open(`/technologies?id=${tech.existing_technology_id}`, '_blank')}
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
}
