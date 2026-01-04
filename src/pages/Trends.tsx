import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { syncTechnologyInsert, syncTrendDelete } from "@/lib/syncToExternal";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Lightbulb, Tag, Calendar, RotateCcw, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface TechnologicalTrend {
  id: string;
  name: string;
  description: string | null;
  technology_type: string;
  subcategory: string | null;
  sector: string | null;
  created_at: string;
  source_technology_id: string | null;
  original_data: Record<string, unknown> | null;
}

const Trends = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrend, setSelectedTrend] = useState<TechnologicalTrend | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [trendToRestore, setTrendToRestore] = useState<TechnologicalTrend | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrend, setEditingTrend] = useState<TechnologicalTrend | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    technology_type: '',
    subcategory: '',
    sector: '',
    // Original data fields
    proveedor: '',
    pais_origen: '',
    web: '',
    email: '',
    ventaja_competitiva: '',
    porque_innovadora: '',
    casos_referencia: '',
    comentarios_analista: '',
    aplicacion_principal: '',
    paises_actua: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  // Subscribe to real-time updates
  useRealtimeSubscription({
    tables: ['technological_trends', 'technologies'],
    queryKeys: [['technological-trends'], ['technologies']],
  });

  const { data: trends, isLoading } = useQuery({
    queryKey: ['technological-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technological_trends')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TechnologicalTrend[];
    },
    enabled: !!user,
  });

  // Mutation to restore trend as technology
  const restoreMutation = useMutation({
    mutationFn: async (trend: TechnologicalTrend) => {
      // Use original_data if available, otherwise fallback to trend's basic info
      const originalData = trend.original_data as Record<string, unknown> | null;
      
      const technologyData = originalData ? {
        "Nombre de la tecnología": originalData["Nombre de la tecnología"] as string || trend.name,
        "Proveedor / Empresa": originalData["Proveedor / Empresa"] as string | null,
        "País de origen": originalData["País de origen"] as string | null,
        "Web de la empresa": originalData["Web de la empresa"] as string | null,
        "Email de contacto": originalData["Email de contacto"] as string | null,
        "Tipo de tecnología": originalData["Tipo de tecnología"] as string || trend.technology_type,
        "Subcategoría": originalData["Subcategoría"] as string | null || trend.subcategory,
        "Sector y subsector": originalData["Sector y subsector"] as string | null || trend.sector,
        "Aplicación principal": originalData["Aplicación principal"] as string | null,
        "Descripción técnica breve": originalData["Descripción técnica breve"] as string | null || trend.description,
        "Ventaja competitiva clave": originalData["Ventaja competitiva clave"] as string | null,
        "Porque es innovadora": originalData["Porque es innovadora"] as string | null,
        "Casos de referencia": originalData["Casos de referencia"] as string | null,
        "Paises donde actua": originalData["Paises donde actua"] as string | null,
        "Comentarios del analista": originalData["Comentarios del analista"] as string | null,
        "Fecha de scouting": originalData["Fecha de scouting"] as string | null,
        "Estado del seguimiento": originalData["Estado del seguimiento"] as string | null,
        "Grado de madurez (TRL)": originalData["Grado de madurez (TRL)"] as number | null,
        quality_score: originalData.quality_score as number | null,
        status: 'en_revision',
        review_status: 'pending',
        sector_id: originalData.sector_id as string | null,
        tipo_id: originalData.tipo_id as number | null,
        subcategoria_id: originalData.subcategoria_id as number | null,
        subsector_industrial: originalData.subsector_industrial as string | null,
      } : {
        "Nombre de la tecnología": trend.name,
        "Descripción técnica breve": trend.description,
        "Tipo de tecnología": trend.technology_type,
        "Subcategoría": trend.subcategory,
        "Sector y subsector": trend.sector,
        status: 'en_revision',
        review_status: 'pending',
      };

      // Insert back into technologies with all original data
      const { data: insertedTech, error: insertError } = await supabase
        .from('technologies')
        .insert(technologyData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Sync to external Supabase
      try {
        await syncTechnologyInsert({ ...technologyData, id: insertedTech.id });
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }

      // Then delete from trends
      const { error: deleteError } = await supabase
        .from('technological_trends')
        .delete()
        .eq('id', trend.id);

      if (deleteError) throw deleteError;

      // Sync deletion to external
      try {
        await syncTrendDelete(trend.id);
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technological-trends'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      setSelectedTrend(null);
      setShowRestoreConfirm(false);
      setTrendToRestore(null);
      toast({
        title: 'Restaurada como tecnología',
        description: 'La tendencia ha sido restaurada y sincronizada con Supabase externo',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo restaurar la tecnología',
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (trend: TechnologicalTrend) => {
    setEditingTrend(trend);
    const od = trend.original_data || {};
    setEditForm({
      name: trend.name,
      description: trend.description || '',
      technology_type: trend.technology_type,
      subcategory: trend.subcategory || '',
      sector: trend.sector || '',
      proveedor: String(od["Proveedor / Empresa"] || ''),
      pais_origen: String(od["País de origen"] || ''),
      web: String(od["Web de la empresa"] || ''),
      email: String(od["Email de contacto"] || ''),
      ventaja_competitiva: String(od["Ventaja competitiva clave"] || ''),
      porque_innovadora: String(od["Porque es innovadora"] || ''),
      casos_referencia: String(od["Casos de referencia"] || ''),
      comentarios_analista: String(od["Comentarios del analista"] || ''),
      aplicacion_principal: String(od["Aplicación principal"] || ''),
      paises_actua: String(od["Paises donde actua"] || ''),
    });
    setShowEditModal(true);
    setSelectedTrend(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTrend) return;
    
    setIsSaving(true);
    
    // Update original_data with new values
    const updatedOriginalData = {
      ...(editingTrend.original_data || {}),
      "Nombre de la tecnología": editForm.name,
      "Descripción técnica breve": editForm.description || null,
      "Tipo de tecnología": editForm.technology_type,
      "Subcategoría": editForm.subcategory || null,
      "Sector y subsector": editForm.sector || null,
      "Proveedor / Empresa": editForm.proveedor || null,
      "País de origen": editForm.pais_origen || null,
      "Web de la empresa": editForm.web || null,
      "Email de contacto": editForm.email || null,
      "Ventaja competitiva clave": editForm.ventaja_competitiva || null,
      "Porque es innovadora": editForm.porque_innovadora || null,
      "Casos de referencia": editForm.casos_referencia || null,
      "Comentarios del analista": editForm.comentarios_analista || null,
      "Aplicación principal": editForm.aplicacion_principal || null,
      "Paises donde actua": editForm.paises_actua || null,
    };
    
    const { error } = await supabase
      .from('technological_trends')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        technology_type: editForm.technology_type,
        subcategory: editForm.subcategory || null,
        sector: editForm.sector || null,
        original_data: updatedOriginalData,
      })
      .eq('id', editingTrend.id);
    
    setIsSaving(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['technological-trends'] });
      setShowEditModal(false);
      setEditingTrend(null);
      toast({
        title: 'Guardado',
        description: 'Los cambios se han guardado correctamente',
      });
    }
  };

  const handleRestoreClick = (trend: TechnologicalTrend) => {
    setTrendToRestore(trend);
    setShowRestoreConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tendencias Tecnológicas</h1>
          <p className="text-muted-foreground">
            Categorías y tendencias identificadas en el sector del tratamiento de agua
          </p>
        </div>
      </div>

      {trends && trends.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No hay tendencias tecnológicas registradas aún.
              <br />
              Las tecnologías que son categorías o tendencias pueden moverse aquí desde su ficha.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trends?.map((trend) => (
            <Card 
              key={trend.id} 
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => setSelectedTrend(trend)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-tight">{trend.name}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {trend.technology_type}
                  </Badge>
                  {trend.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {trend.subcategory}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {trend.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {trend.description}
                  </p>
                )}
                {trend.sector && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Sector:</span> {trend.sector}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Detail Modal */}
      <Dialog open={!!selectedTrend} onOpenChange={(open) => !open && setSelectedTrend(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTrend && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-display mb-2">
                      {selectedTrend.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedTrend.technology_type}</Badge>
                      {selectedTrend.subcategory && (
                        <Badge variant="outline">{selectedTrend.subcategory}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Description */}
                {selectedTrend.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Descripción
                    </h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      {selectedTrend.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Classification */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Clasificación
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Tipo de tecnología</p>
                        <p className="text-sm">{selectedTrend.technology_type}</p>
                      </div>
                    </div>
                    {selectedTrend.subcategory && (
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Subcategoría</p>
                          <p className="text-sm">{selectedTrend.subcategory}</p>
                        </div>
                      </div>
                    )}
                    {selectedTrend.sector && (
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Sector</p>
                          <p className="text-sm">{selectedTrend.sector}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isInternalUser && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(selectedTrend)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreClick(selectedTrend)}
                        disabled={restoreMutation.isPending}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar como tecnología
                      </Button>
                    </div>
                  </>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-4 border-t flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Registrado: {new Date(selectedTrend.created_at).toLocaleDateString('es-ES')}</span>
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
              <RotateCcw className="w-5 h-5 text-primary" />
              Restaurar como Tecnología
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-3">
              <p>
                Al confirmar, esta tendencia se convertirá de nuevo en una <strong>tecnología</strong> y:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Aparecerá en el catálogo de tecnologías</li>
                <li>Se eliminará de la sección de Tendencias</li>
                <li>Se recuperarán todos los datos originales (TRL, proveedor, etc.) si estaban guardados</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => trendToRestore && restoreMutation.mutate(trendToRestore)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
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
              Editar Tendencia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo de tecnología *</Label>
              <Input
                id="edit-type"
                value={editForm.technology_type}
                onChange={(e) => setEditForm({ ...editForm, technology_type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subcategory">Subcategoría</Label>
                <Input
                  id="edit-subcategory"
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                />
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

            <Separator />

            {/* Company Info */}
            <h4 className="text-sm font-semibold text-muted-foreground">Información de la empresa</h4>
            
            <div className="space-y-2">
              <Label htmlFor="edit-proveedor">Proveedor / Empresa</Label>
              <Input
                id="edit-proveedor"
                value={editForm.proveedor}
                onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pais">País de origen</Label>
                <Input
                  id="edit-pais"
                  value={editForm.pais_origen}
                  onChange={(e) => setEditForm({ ...editForm, pais_origen: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paises">Países donde actúa</Label>
                <Input
                  id="edit-paises"
                  value={editForm.paises_actua}
                  onChange={(e) => setEditForm({ ...editForm, paises_actua: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-web">Web</Label>
                <Input
                  id="edit-web"
                  value={editForm.web}
                  onChange={(e) => setEditForm({ ...editForm, web: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email de contacto</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Descriptions */}
            <h4 className="text-sm font-semibold text-muted-foreground">Descripciones</h4>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción técnica</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-aplicacion">Aplicación principal</Label>
              <Textarea
                id="edit-aplicacion"
                value={editForm.aplicacion_principal}
                onChange={(e) => setEditForm({ ...editForm, aplicacion_principal: e.target.value })}
                rows={2}
              />
            </div>

            <Separator />

            {/* Differentiation */}
            <h4 className="text-sm font-semibold text-muted-foreground">Diferenciación</h4>

            <div className="space-y-2">
              <Label htmlFor="edit-ventaja">Ventaja competitiva clave</Label>
              <Textarea
                id="edit-ventaja"
                value={editForm.ventaja_competitiva}
                onChange={(e) => setEditForm({ ...editForm, ventaja_competitiva: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-innovadora">Por qué es innovadora</Label>
              <Textarea
                id="edit-innovadora"
                value={editForm.porque_innovadora}
                onChange={(e) => setEditForm({ ...editForm, porque_innovadora: e.target.value })}
                rows={2}
              />
            </div>

            <Separator />

            {/* References and Comments */}
            <h4 className="text-sm font-semibold text-muted-foreground">Referencias y comentarios</h4>

            <div className="space-y-2">
              <Label htmlFor="edit-casos">Casos de referencia</Label>
              <Textarea
                id="edit-casos"
                value={editForm.casos_referencia}
                onChange={(e) => setEditForm({ ...editForm, casos_referencia: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-comentarios">Comentarios del analista</Label>
              <Textarea
                id="edit-comentarios"
                value={editForm.comentarios_analista}
                onChange={(e) => setEditForm({ ...editForm, comentarios_analista: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editForm.name || !editForm.technology_type}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trends;
