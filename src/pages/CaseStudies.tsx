import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { syncTechnologyInsert, syncCaseStudyDelete } from '@/lib/syncToExternal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  Search, 
  MapPin, 
  Building2, 
  Tag,
  Calendar,
  ExternalLink,
  Trash2,
  Loader2,
  RotateCcw,
  Globe,
  Mail,
  FileText,
  Lightbulb,
  Trophy,
  MessageSquare,
  Users,
  Edit,
} from 'lucide-react';
import { TRLBadge } from '@/components/TRLBadge';

interface CaseStudy {
  id: string;
  name: string;
  description: string | null;
  entity_type: string | null;
  country: string | null;
  sector: string | null;
  technology_types: string[] | null;
  original_data: Record<string, unknown> | null;
  source_technology_id: string | null;
  created_at: string;
}

const CaseStudies: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseStudy | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    entity_type: '',
    country: '',
    sector: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  // Fetch case studies
  const { data: caseStudies, isLoading } = useQuery({
    queryKey: ['case-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos_de_estudio')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CaseStudy[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('casos_de_estudio')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      // Sync deletion to external
      try {
        await syncCaseStudyDelete(id);
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      setSelectedCase(null);
      toast({ title: 'Caso de estudio eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Restore to technology
  const handleRestoreToTechnology = async () => {
    if (!selectedCase?.original_data) {
      toast({
        title: 'Error',
        description: 'No hay datos originales para restaurar',
        variant: 'destructive',
      });
      return;
    }

    setIsRestoring(true);
    
    const originalData = selectedCase.original_data as Record<string, unknown>;
    
    // Reconstruct the technology from original data with proper type casting
    const technologyData = {
      "Nombre de la tecnología": String(originalData["Nombre de la tecnología"] || selectedCase.name),
      "Proveedor / Empresa": originalData["Proveedor / Empresa"] as string | null,
      "País de origen": (originalData["País de origen"] || selectedCase.country) as string | null,
      "Web de la empresa": originalData["Web de la empresa"] as string | null,
      "Email de contacto": originalData["Email de contacto"] as string | null,
      "Tipo de tecnología": String(originalData["Tipo de tecnología"] || (selectedCase.technology_types?.[0] || 'Sin clasificar')),
      "Subcategoría": originalData["Subcategoría"] as string | null,
      "Sector y subsector": (originalData["Sector y subsector"] || selectedCase.sector) as string | null,
      "Aplicación principal": originalData["Aplicación principal"] as string | null,
      "Descripción técnica breve": (originalData["Descripción técnica breve"] || selectedCase.description) as string | null,
      "Ventaja competitiva clave": originalData["Ventaja competitiva clave"] as string | null,
      "Porque es innovadora": originalData["Porque es innovadora"] as string | null,
      "Casos de referencia": originalData["Casos de referencia"] as string | null,
      "Paises donde actua": originalData["Paises donde actua"] as string | null,
      "Comentarios del analista": originalData["Comentarios del analista"] as string | null,
      "Fecha de scouting": originalData["Fecha de scouting"] as string | null,
      "Estado del seguimiento": originalData["Estado del seguimiento"] as string | null,
      "Grado de madurez (TRL)": originalData["Grado de madurez (TRL)"] as number | null,
      quality_score: (originalData.quality_score as number) || 0,
      status: (originalData.status as string) || 'active',
      sector_id: originalData.sector_id as string | null,
      tipo_id: originalData.tipo_id as number | null,
      subcategoria_id: originalData.subcategoria_id as number | null,
      subsector_industrial: originalData.subsector_industrial as string | null,
    };

    // Insert back into technologies
    const { data: insertedTech, error: insertError } = await supabase
      .from('technologies')
      .insert([technologyData])
      .select()
      .single();

    if (insertError) {
      setIsRestoring(false);
      toast({
        title: 'Error',
        description: 'No se pudo restaurar la tecnología: ' + insertError.message,
        variant: 'destructive',
      });
      return;
    }

    // Sync to external
    try {
      await syncTechnologyInsert({ ...technologyData, id: insertedTech.id });
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    // Delete from case studies
    const { error: deleteError } = await supabase
      .from('casos_de_estudio')
      .delete()
      .eq('id', selectedCase.id);

    // Sync deletion to external
    try {
      await syncCaseStudyDelete(selectedCase.id);
    } catch (syncError) {
      console.error('External sync failed:', syncError);
    }

    setIsRestoring(false);
    setShowRestoreConfirm(false);

    if (deleteError) {
      toast({
        title: 'Advertencia',
        description: 'Tecnología restaurada pero no se pudo eliminar el caso de estudio',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      setSelectedCase(null);
      toast({
        title: 'Restaurado a tecnologías',
        description: 'El caso de estudio ha sido restaurado como tecnología',
      });
    }
  };

  const handleEditClick = (caseStudy: CaseStudy) => {
    setEditingCase(caseStudy);
    setEditForm({
      name: caseStudy.name,
      description: caseStudy.description || '',
      entity_type: caseStudy.entity_type || '',
      country: caseStudy.country || '',
      sector: caseStudy.sector || '',
    });
    setShowEditModal(true);
    setSelectedCase(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCase) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('casos_de_estudio')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        entity_type: editForm.entity_type || null,
        country: editForm.country || null,
        sector: editForm.sector || null,
      })
      .eq('id', editingCase.id);
    
    setIsSaving(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['case-studies'] });
      setShowEditModal(false);
      setEditingCase(null);
      toast({
        title: 'Guardado',
        description: 'Los cambios se han guardado correctamente',
      });
    }
  };

  // Get unique countries and entity types for filters
  const countries = [...new Set(caseStudies?.map(c => c.country).filter(Boolean) || [])].sort();
  const entityTypes = [...new Set(caseStudies?.map(c => c.entity_type).filter(Boolean) || [])].sort();

  // Filter case studies
  const filteredCases = caseStudies?.filter(caseStudy => {
    const matchesSearch = !searchQuery || 
      caseStudy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseStudy.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = countryFilter === 'all' || caseStudy.country === countryFilter;
    const matchesEntityType = entityTypeFilter === 'all' || caseStudy.entity_type === entityTypeFilter;

    return matchesSearch && matchesCountry && matchesEntityType;
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Casos de Estudio</h1>
            <p className="text-muted-foreground">
              Proyectos municipales, corporaciones y casos de implementación
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {caseStudies?.length || 0} casos
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos de estudio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country!}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay casos de estudio</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery || countryFilter !== 'all' || entityTypeFilter !== 'all'
                ? 'No se encontraron casos que coincidan con los filtros.'
                : 'Los casos de estudio aparecerán aquí cuando se muevan desde tecnologías.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((caseStudy) => (
            <Card 
              key={caseStudy.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedCase(caseStudy)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {caseStudy.name}
                  </CardTitle>
                  {caseStudy.entity_type && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {caseStudy.entity_type}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  {caseStudy.country && (
                    <>
                      <MapPin className="w-3 h-3" />
                      {caseStudy.country}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {caseStudy.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {caseStudy.description}
                  </p>
                )}
                {caseStudy.technology_types && caseStudy.technology_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {caseStudy.technology_types.slice(0, 3).map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {caseStudy.technology_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{caseStudy.technology_types.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedCase && !showRestoreConfirm} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-display mb-2">
                      {selectedCase.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCase.original_data?.["Grado de madurez (TRL)"] && (
                        <TRLBadge trl={selectedCase.original_data["Grado de madurez (TRL)"] as number} />
                      )}
                      {selectedCase.entity_type && (
                        <Badge variant="secondary">{selectedCase.entity_type}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Action buttons */}
                {isInternalUser && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditClick(selectedCase)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    {selectedCase.original_data && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowRestoreConfirm(true)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar a tecnologías
                      </Button>
                    )}
                  </div>
                )}

                {/* General Info */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Información General
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    {selectedCase.original_data?.["Proveedor / Empresa"] && (
                      <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Proveedor / Empresa</p>
                          <p className="text-sm">{String(selectedCase.original_data["Proveedor / Empresa"])}</p>
                        </div>
                      </div>
                    )}
                    {selectedCase.country && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">País de origen</p>
                          <p className="text-sm">{selectedCase.country}</p>
                        </div>
                      </div>
                    )}
                    {selectedCase.original_data?.["Web de la empresa"] && (
                      <div className="flex items-start gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Web</p>
                          <a 
                            href={String(selectedCase.original_data["Web de la empresa"])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {String(selectedCase.original_data["Web de la empresa"])}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    {selectedCase.original_data?.["Email de contacto"] && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm">{String(selectedCase.original_data["Email de contacto"])}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Classification */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Clasificación
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    {selectedCase.technology_types && selectedCase.technology_types.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCase.technology_types.map((type, i) => (
                          <Badge key={i} variant="default">{type}</Badge>
                        ))}
                      </div>
                    )}
                    {selectedCase.sector && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Sector:</span>
                        <Badge variant="outline">{selectedCase.sector}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedCase.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Descripción Técnica
                      </h3>
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                        {selectedCase.description}
                      </p>
                    </div>
                  </>
                )}

                {/* Differentiation */}
                {(selectedCase.original_data?.["Ventaja competitiva clave"] || selectedCase.original_data?.["Porque es innovadora"]) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Diferenciación
                      </h3>
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        {selectedCase.original_data?.["Ventaja competitiva clave"] && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Ventaja competitiva clave</p>
                            <p className="text-sm">{String(selectedCase.original_data["Ventaja competitiva clave"])}</p>
                          </div>
                        )}
                        {selectedCase.original_data?.["Porque es innovadora"] && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Por qué es innovadora</p>
                            <p className="text-sm">{String(selectedCase.original_data["Porque es innovadora"])}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Cases of reference */}
                {selectedCase.original_data?.["Casos de referencia"] && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Casos de Referencia
                      </h3>
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                        {String(selectedCase.original_data["Casos de referencia"])}
                      </p>
                    </div>
                  </>
                )}

                {/* Analyst Comments */}
                {selectedCase.original_data?.["Comentarios del analista"] && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comentarios del Analista
                      </h3>
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                        {String(selectedCase.original_data["Comentarios del analista"])}
                      </p>
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Creado: {new Date(selectedCase.created_at).toLocaleDateString('es-ES')}
                  </span>
                  
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedCase.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-green-600" />
              Restaurar a Tecnologías
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-3">
              <p>
                Al confirmar, este caso de estudio se convertirá de nuevo en una <strong>tecnología</strong> y:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Se recuperarán todos los datos originales</li>
                <li>Aparecerá en el catálogo de tecnologías</li>
                <li>Se eliminará de casos de estudio</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreToTechnology}
              disabled={isRestoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Confirmar y restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Caso de Estudio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-entity-type">Tipo de entidad</Label>
                <Input
                  id="edit-entity-type"
                  value={editForm.entity_type}
                  onChange={(e) => setEditForm({ ...editForm, entity_type: e.target.value })}
                  placeholder="municipal, technology, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">País</Label>
                <Input
                  id="edit-country"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sector">Sector</Label>
              <Input
                id="edit-sector"
                value={editForm.sector}
                onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editForm.name}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseStudies;
