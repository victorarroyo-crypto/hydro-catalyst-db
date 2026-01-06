import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Save, 
  X, 
  Star,
  ChevronRight,
  ArrowLeft,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  name: string;
  provider: string;
  country: string;
  score: number;
  trl: number;
  status: string;
  created_at?: string;
  description?: string;
  web?: string;
  email?: string;
  suggestedType?: string;
  suggestedSubcategory?: string;
  competitiveAdvantage?: string;
  relevanceReason?: string;
  sourceUrl?: string;
}

interface ScoutingTechFormModalProps {
  technology: QueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TaxonomyTipo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface TaxonomySubcategoria {
  id: number;
  tipo_id: number;
  codigo: string;
  nombre: string;
}

interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface SelectedTipo {
  tipo_id: number;
  is_primary: boolean;
}

interface FormData {
  nombre: string;
  proveedor: string;
  pais: string;
  web: string;
  email: string;
  descripcion: string;
  ventajaCompetitiva: string;
  porqueInnovadora: string;
  aplicacionPrincipal: string;
  casosReferencia: string;
  comentariosAnalista: string;
  trl: number | null;
  tipoSugerido: string;
  subcategoriaSugerida: string;
  sectorId: string | null;
  subsectorIndustrial: string;
}

// Form Section Component
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-foreground border-b pb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'review': return 'En revisión';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
    case 'review': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'approved': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ScoutingTechFormModal: React.FC<ScoutingTechFormModalProps> = ({
  technology,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    proveedor: '',
    pais: '',
    web: '',
    email: '',
    descripcion: '',
    ventajaCompetitiva: '',
    porqueInnovadora: '',
    aplicacionPrincipal: '',
    casosReferencia: '',
    comentariosAnalista: '',
    trl: null,
    tipoSugerido: '',
    subcategoriaSugerida: '',
    sectorId: null,
    subsectorIndustrial: '',
  });

  // Fetch taxonomy data
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_tipos')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomyTipo[];
    },
  });

  const { data: allSubcategorias } = useQuery({
    queryKey: ['taxonomy-subcategorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_subcategorias')
        .select('*')
        .order('codigo');
      if (error) throw error;
      return data as TaxonomySubcategoria[];
    },
  });

  const { data: sectores } = useQuery({
    queryKey: ['taxonomy-sectores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_sectores')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as TaxonomySector[];
    },
  });

  // Filter subcategorias based on selected tipos
  const availableSubcategorias = allSubcategorias?.filter(sub => 
    selectedTipos.some(t => t.tipo_id === sub.tipo_id)
  ) ?? [];

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('scouting-update-queue', {
        body: { id, status },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Error al actualizar');
      return data.result;
    },
    onSuccess: (_, variables) => {
      toast.success(`Tecnología movida a "${getStatusLabel(variables.status)}"`);
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    },
  });

  // Initialize form when technology changes
  useEffect(() => {
    if (technology && open) {
      setFormData({
        nombre: technology.name || '',
        proveedor: technology.provider || '',
        pais: technology.country || '',
        web: technology.web || '',
        email: technology.email || '',
        descripcion: technology.description || '',
        ventajaCompetitiva: technology.competitiveAdvantage || '',
        porqueInnovadora: technology.relevanceReason || '',
        aplicacionPrincipal: '',
        casosReferencia: '',
        comentariosAnalista: '',
        trl: technology.trl || null,
        tipoSugerido: technology.suggestedType || '',
        subcategoriaSugerida: technology.suggestedSubcategory || '',
        sectorId: null,
        subsectorIndustrial: '',
      });

      // Try to match suggested type with taxonomy
      if (technology.suggestedType && tipos) {
        const matchedTipo = tipos.find(t => 
          t.codigo === technology.suggestedType || 
          t.nombre.toLowerCase().includes(technology.suggestedType?.toLowerCase() || '')
        );
        if (matchedTipo) {
          setSelectedTipos([{ tipo_id: matchedTipo.id, is_primary: true }]);
        } else {
          setSelectedTipos([]);
        }
      } else {
        setSelectedTipos([]);
      }
    }
  }, [technology, open, tipos]);

  const handleChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTipoToggle = (tipoId: number, checked: boolean) => {
    if (checked) {
      const isFirst = selectedTipos.length === 0;
      setSelectedTipos(prev => [...prev, { tipo_id: tipoId, is_primary: isFirst }]);
    } else {
      const wasRemoved = selectedTipos.find(t => t.tipo_id === tipoId);
      let newTipos = selectedTipos.filter(t => t.tipo_id !== tipoId);
      
      if (wasRemoved?.is_primary && newTipos.length > 0) {
        newTipos = newTipos.map((t, i) => ({
          ...t,
          is_primary: i === 0
        }));
      }
      
      setSelectedTipos(newTipos);
    }
  };

  const handleSetPrimaryTipo = (tipoId: number) => {
    setSelectedTipos(prev => prev.map(t => ({
      ...t,
      is_primary: t.tipo_id === tipoId
    })));
  };

  const handleStatusChange = (newStatus: string) => {
    if (technology) {
      updateStatusMutation.mutate({ id: technology.id, status: newStatus });
    }
  };

  const handleSave = async () => {
    if (!technology) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement save to backend when API supports it
      // For now, just show a success message
      toast.success('Cambios guardados localmente');
      setIsLoading(false);
    } catch (error) {
      toast.error('Error al guardar');
      setIsLoading(false);
    }
  };

  if (!technology) return null;

  const primaryTipo = selectedTipos.find(t => t.is_primary);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">Editar Ficha de Tecnología</DialogTitle>
              <DialogDescription>
                Completa y revisa la información antes de aprobar
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(technology.status)}>
              {getStatusLabel(technology.status)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form className="space-y-6 py-4">
            {/* Información General */}
            <FormSection title="Información General">
              <div>
                <Label htmlFor="nombre" className="text-sm">
                  Nombre de la tecnología <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proveedor" className="text-sm">Proveedor / Empresa</Label>
                <Input
                  id="proveedor"
                  value={formData.proveedor}
                  onChange={(e) => handleChange('proveedor', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pais" className="text-sm">País de origen</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => handleChange('pais', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trl" className="text-sm">TRL (1-9)</Label>
                <Select 
                  value={formData.trl?.toString() ?? ''} 
                  onValueChange={(v) => handleChange('trl', v ? parseInt(v) : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar TRL" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((trl) => (
                      <SelectItem key={trl} value={trl.toString()}>
                        TRL {trl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="web" className="text-sm">Web de la empresa</Label>
                <Input
                  id="web"
                  type="url"
                  value={formData.web}
                  onChange={(e) => handleChange('web', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email de contacto</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="mt-1"
                />
              </div>
            </FormSection>

            <Separator />

            {/* Clasificación */}
            <FormSection title="Clasificación">
              <div className="md:col-span-2">
                <Label className="text-sm">Tipos de tecnología <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona uno o más tipos. Haz clic en ⭐ para marcar como principal.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tipos?.map(tipo => {
                    const isSelected = selectedTipos.some(t => t.tipo_id === tipo.id);
                    const isPrimary = selectedTipos.find(t => t.tipo_id === tipo.id)?.is_primary;
                    
                    return (
                      <div
                        key={tipo.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/50 border-border hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          id={`tipo-${tipo.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleTipoToggle(tipo.id, !!checked)}
                        />
                        <label 
                          htmlFor={`tipo-${tipo.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {tipo.codigo} - {tipo.nombre}
                        </label>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryTipo(tipo.id)}
                            className={`ml-1 ${isPrimary ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                          >
                            <Star className={`w-4 h-4 ${isPrimary ? 'fill-yellow-500' : ''}`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subcategorías */}
              {availableSubcategorias.length > 0 && (
                <div className="md:col-span-2">
                  <Label className="text-sm">Subcategorías disponibles</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableSubcategorias.map(sub => (
                      <Badge key={sub.id} variant="outline">
                        {sub.codigo} - {sub.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="sectorId" className="text-sm">Sector</Label>
                <Select 
                  value={formData.sectorId ?? ''} 
                  onValueChange={(v) => handleChange('sectorId', v || null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectores?.map(sector => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.sectorId === 'IND' && (
                <div>
                  <Label htmlFor="subsectorIndustrial" className="text-sm">Subsector Industrial</Label>
                  <Input
                    id="subsectorIndustrial"
                    value={formData.subsectorIndustrial}
                    onChange={(e) => handleChange('subsectorIndustrial', e.target.value)}
                    className="mt-1"
                    placeholder="Especificar subsector"
                  />
                </div>
              )}
            </FormSection>

            <Separator />

            {/* Detalles Técnicos */}
            <FormSection title="Detalles Técnicos">
              <div className="md:col-span-2">
                <Label htmlFor="descripcion" className="text-sm">Descripción técnica breve</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ventajaCompetitiva" className="text-sm">Ventaja competitiva clave</Label>
                <Textarea
                  id="ventajaCompetitiva"
                  value={formData.ventajaCompetitiva}
                  onChange={(e) => handleChange('ventajaCompetitiva', e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="porqueInnovadora" className="text-sm">¿Por qué es innovadora?</Label>
                <Textarea
                  id="porqueInnovadora"
                  value={formData.porqueInnovadora}
                  onChange={(e) => handleChange('porqueInnovadora', e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="aplicacionPrincipal" className="text-sm">Aplicación principal</Label>
                <Textarea
                  id="aplicacionPrincipal"
                  value={formData.aplicacionPrincipal}
                  onChange={(e) => handleChange('aplicacionPrincipal', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="casosReferencia" className="text-sm">Casos de referencia</Label>
                <Textarea
                  id="casosReferencia"
                  value={formData.casosReferencia}
                  onChange={(e) => handleChange('casosReferencia', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </FormSection>

            <Separator />

            {/* Comentarios del Analista */}
            <FormSection title="Notas del Analista">
              <div className="md:col-span-2">
                <Label htmlFor="comentariosAnalista" className="text-sm">Comentarios</Label>
                <Textarea
                  id="comentariosAnalista"
                  value={formData.comentariosAnalista}
                  onChange={(e) => handleChange('comentariosAnalista', e.target.value)}
                  rows={3}
                  className="mt-1"
                  placeholder="Añade notas sobre tu evaluación..."
                />
              </div>
            </FormSection>
          </form>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 flex-col gap-4">
          <div className="flex flex-col sm:flex-row w-full gap-2 sm:items-center sm:justify-between">
            {/* Save button */}
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>

            {/* Status actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Reject */}
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => handleStatusChange('rejected')}
                disabled={updateStatusMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Rechazar
              </Button>

              {/* Approve - moves to supervisor review */}
              {(technology.status === 'pending' || technology.status === 'review') && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => handleStatusChange('approved')}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-1" />
                  )}
                  Sugerir Aprobación
                </Button>
              )}

              {/* Transfer to DB - for supervisor/admin on approved items */}
              {technology.status === 'approved' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('review')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Devolver a Revisión
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      toast.info('Transferencia a BD principal en desarrollo');
                    }}
                  >
                    <Rocket className="w-4 h-4 mr-1" />
                    Aprobar y Añadir a BD
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
