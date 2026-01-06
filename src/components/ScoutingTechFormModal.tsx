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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { syncTechnologyInsert } from '@/lib/syncToExternal';
import { useAuth } from '@/contexts/AuthContext';
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
  paisesActua?: string;
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

interface SelectedSubcategoria {
  subcategoria_id: number;
  is_primary: boolean;
}

interface FormData {
  "Nombre de la tecnología": string;
  "Proveedor / Empresa": string;
  "País de origen": string;
  "Web de la empresa": string;
  "Email de contacto": string;
  "Tipo de tecnología": string;
  "Subcategoría": string;
  "Sector y subsector": string;
  "Aplicación principal": string;
  "Descripción técnica breve": string;
  "Ventaja competitiva clave": string;
  "Porque es innovadora": string;
  "Casos de referencia": string;
  "Paises donde actua": string;
  "Comentarios del analista": string;
  "Fecha de scouting": string;
  "Estado del seguimiento": string;
  "Grado de madurez (TRL)": number | null;
  status: string;
  quality_score: number;
  tipo_id: number | null;
  subcategoria_id: number | null;
  sector_id: string | null;
  subsector_industrial: string;
}

const SUBSECTORES_INDUSTRIALES = [
  'Alimentación y Bebidas',
  'Lácteo',
  'Textil',
  'Químico y Petroquímico',
  'Farmacéutico',
  'Papelero',
  'Metalúrgico',
  'Automoción',
  'Electrónica',
  'Energía',
  'Minería',
  'Otros'
];

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
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);
  
  // Check if user is admin or supervisor
  const canApproveToDb = profile?.role === 'admin' || profile?.role === 'supervisor';

  const [formData, setFormData] = useState<FormData>({
    "Nombre de la tecnología": '',
    "Proveedor / Empresa": '',
    "País de origen": '',
    "Web de la empresa": '',
    "Email de contacto": '',
    "Tipo de tecnología": '',
    "Subcategoría": '',
    "Sector y subsector": '',
    "Aplicación principal": '',
    "Descripción técnica breve": '',
    "Ventaja competitiva clave": '',
    "Porque es innovadora": '',
    "Casos de referencia": '',
    "Paises donde actua": '',
    "Comentarios del analista": '',
    "Fecha de scouting": new Date().toISOString().split('T')[0],
    "Estado del seguimiento": 'En evaluación',
    "Grado de madurez (TRL)": null,
    status: 'active',
    quality_score: 0,
    tipo_id: null,
    subcategoria_id: null,
    sector_id: null,
    subsector_industrial: '',
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
  const selectedTipoIds = selectedTipos.map(t => t.tipo_id);
  const filteredSubcategorias = allSubcategorias?.filter(
    (sub) => selectedTipoIds.includes(sub.tipo_id)
  ) || [];

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
        "Nombre de la tecnología": technology.name || '',
        "Proveedor / Empresa": technology.provider || '',
        "País de origen": technology.country || '',
        "Web de la empresa": technology.web || '',
        "Email de contacto": technology.email || '',
        "Tipo de tecnología": technology.suggestedType || '',
        "Subcategoría": technology.suggestedSubcategory || '',
        "Sector y subsector": '',
        "Aplicación principal": '',
        "Descripción técnica breve": technology.description || '',
        "Ventaja competitiva clave": technology.competitiveAdvantage || '',
        "Porque es innovadora": technology.relevanceReason || '',
        "Casos de referencia": '',
        "Paises donde actua": technology.paisesActua || '',
        "Comentarios del analista": '',
        "Fecha de scouting": new Date().toISOString().split('T')[0],
        "Estado del seguimiento": 'En evaluación',
        "Grado de madurez (TRL)": technology.trl || null,
        status: 'active',
        quality_score: technology.score || 0,
        tipo_id: null,
        subcategoria_id: null,
        sector_id: null,
        subsector_industrial: '',
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
      setSelectedSubcategorias([]);
    }
  }, [technology, open, tipos]);

  const handleChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If sector_id changes, update "Sector y subsector" text
      if (field === 'sector_id') {
        const selectedSector = sectores?.find(s => s.id === value);
        if (selectedSector) {
          newData["Sector y subsector"] = selectedSector.nombre;
        }
        if (value !== 'IND') {
          newData.subsector_industrial = '';
        }
      }
      
      return newData;
    });
  };

  // Handler for tipos
  const handleTipoToggle = (tipoId: number, checked: boolean) => {
    if (checked) {
      const isFirst = selectedTipos.length === 0;
      setSelectedTipos(prev => [...prev, { tipo_id: tipoId, is_primary: isFirst }]);
      
      if (isFirst) {
        const tipo = tipos?.find(t => t.id === tipoId);
        if (tipo) {
          handleChange('tipo_id', tipoId);
          handleChange('Tipo de tecnología', tipo.nombre);
        }
      }
    } else {
      const removedTipo = selectedTipos.find(t => t.tipo_id === tipoId);
      const newTipos = selectedTipos.filter(t => t.tipo_id !== tipoId);
      
      if (removedTipo?.is_primary && newTipos.length > 0) {
        newTipos[0].is_primary = true;
        const tipo = tipos?.find(t => t.id === newTipos[0].tipo_id);
        if (tipo) {
          handleChange('tipo_id', newTipos[0].tipo_id);
          handleChange('Tipo de tecnología', tipo.nombre);
        }
      } else if (newTipos.length === 0) {
        handleChange('tipo_id', null);
        handleChange('Tipo de tecnología', '');
      }
      
      setSelectedTipos(newTipos);
      
      // Remove subcategorias that belong to removed tipo
      const removedTipoSubs = allSubcategorias?.filter(s => s.tipo_id === tipoId).map(s => s.id) || [];
      setSelectedSubcategorias(prev => prev.filter(s => !removedTipoSubs.includes(s.subcategoria_id)));
    }
  };

  const handleSetPrimaryTipo = (tipoId: number) => {
    setSelectedTipos(prev => prev.map(t => ({
      ...t,
      is_primary: t.tipo_id === tipoId
    })));
    
    const tipo = tipos?.find(t => t.id === tipoId);
    if (tipo) {
      handleChange('tipo_id', tipoId);
      handleChange('Tipo de tecnología', tipo.nombre);
    }
  };

  // Handler for subcategorias
  const handleSubcategoriaToggle = (subcategoriaId: number, checked: boolean) => {
    if (checked) {
      const isFirst = selectedSubcategorias.length === 0;
      setSelectedSubcategorias(prev => [...prev, { subcategoria_id: subcategoriaId, is_primary: isFirst }]);
      
      if (isFirst) {
        const sub = allSubcategorias?.find(s => s.id === subcategoriaId);
        if (sub) {
          handleChange('subcategoria_id', subcategoriaId);
          handleChange('Subcategoría', sub.nombre);
        }
      }
    } else {
      const removedSub = selectedSubcategorias.find(s => s.subcategoria_id === subcategoriaId);
      const newSubs = selectedSubcategorias.filter(s => s.subcategoria_id !== subcategoriaId);
      
      if (removedSub?.is_primary && newSubs.length > 0) {
        newSubs[0].is_primary = true;
        const sub = allSubcategorias?.find(s => s.id === newSubs[0].subcategoria_id);
        if (sub) {
          handleChange('subcategoria_id', newSubs[0].subcategoria_id);
          handleChange('Subcategoría', sub.nombre);
        }
      } else if (newSubs.length === 0) {
        handleChange('subcategoria_id', null);
        handleChange('Subcategoría', '');
      }
      
      setSelectedSubcategorias(newSubs);
    }
  };

  const handleSetPrimarySubcategoria = (subcategoriaId: number) => {
    setSelectedSubcategorias(prev => prev.map(s => ({
      ...s,
      is_primary: s.subcategoria_id === subcategoriaId
    })));
    
    const sub = allSubcategorias?.find(s => s.id === subcategoriaId);
    if (sub) {
      handleChange('subcategoria_id', subcategoriaId);
      handleChange('Subcategoría', sub.nombre);
    }
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
      // Update the scouting queue item with form data
      const { error } = await supabase.functions.invoke('scouting-update-queue', {
        body: { 
          id: technology.id, 
          formData: {
            name: formData["Nombre de la tecnología"],
            provider: formData["Proveedor / Empresa"],
            country: formData["País de origen"],
            web: formData["Web de la empresa"],
            email: formData["Email de contacto"],
            description: formData["Descripción técnica breve"],
            competitiveAdvantage: formData["Ventaja competitiva clave"],
            relevanceReason: formData["Porque es innovadora"],
            trl: formData["Grado de madurez (TRL)"],
            score: formData.quality_score,
          }
        },
      });
      
      if (error) throw error;
      
      toast.success('Cambios guardados');
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveToDatabase = async () => {
    if (!technology || !canApproveToDb) return;
    
    if (!formData["Nombre de la tecnología"].trim()) {
      toast.error('El nombre de la tecnología es obligatorio');
      return;
    }

    if (selectedTipos.length === 0) {
      toast.error('Debes seleccionar al menos un tipo de tecnología');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        "Nombre de la tecnología": formData["Nombre de la tecnología"],
        "Proveedor / Empresa": formData["Proveedor / Empresa"] || null,
        "País de origen": formData["País de origen"] || null,
        "Web de la empresa": formData["Web de la empresa"] || null,
        "Email de contacto": formData["Email de contacto"] || null,
        "Tipo de tecnología": formData["Tipo de tecnología"],
        "Subcategoría": formData["Subcategoría"] || null,
        "Sector y subsector": formData["Sector y subsector"] || null,
        "Aplicación principal": formData["Aplicación principal"] || null,
        "Descripción técnica breve": formData["Descripción técnica breve"] || null,
        "Ventaja competitiva clave": formData["Ventaja competitiva clave"] || null,
        "Porque es innovadora": formData["Porque es innovadora"] || null,
        "Casos de referencia": formData["Casos de referencia"] || null,
        "Paises donde actua": formData["Paises donde actua"] || null,
        "Comentarios del analista": formData["Comentarios del analista"] || null,
        "Fecha de scouting": formData["Fecha de scouting"] || null,
        "Estado del seguimiento": formData["Estado del seguimiento"] || null,
        "Grado de madurez (TRL)": formData["Grado de madurez (TRL)"] || null,
        status: 'active',
        quality_score: formData.quality_score,
        tipo_id: formData.tipo_id,
        subcategoria_id: formData.subcategoria_id,
        sector_id: formData.sector_id,
        subsector_industrial: formData.subsector_industrial || null,
        updated_by: user?.id,
      };

      // Insert into technologies table
      const { data: insertedData, error } = await supabase
        .from('technologies')
        .insert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      // Insert technology_tipos relationships
      if (selectedTipos.length > 0) {
        const tiposToInsert = selectedTipos.map(t => ({
          technology_id: insertedData.id,
          tipo_id: t.tipo_id,
          is_primary: t.is_primary,
        }));
        
        await supabase.from('technology_tipos').insert(tiposToInsert);
      }

      // Insert technology_subcategorias relationships
      if (selectedSubcategorias.length > 0) {
        const subcategoriasToInsert = selectedSubcategorias.map(s => ({
          technology_id: insertedData.id,
          subcategoria_id: s.subcategoria_id,
          is_primary: s.is_primary,
        }));
        
        await supabase.from('technology_subcategorias').insert(subcategoriasToInsert);
      }

      // Sync to external Supabase
      try {
        await syncTechnologyInsert({ ...dataToSave, id: insertedData.id });
      } catch (syncError) {
        console.error('External sync failed:', syncError);
      }

      // Mark scouting item as transferred
      await supabase.functions.invoke('scouting-update-queue', {
        body: { id: technology.id, status: 'transferred' },
      });

      toast.success('Tecnología añadida a la base de datos');
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      queryClient.invalidateQueries({ queryKey: ['technologies'] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al transferir a la base de datos', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectToDatabase = async () => {
    if (!technology) return;
    
    setIsLoading(true);
    try {
      // Update status to rejected
      await supabase.functions.invoke('scouting-update-queue', {
        body: { id: technology.id, status: 'rejected' },
      });

      // Optionally sync rejected item to external DB to prevent re-identification
      // This can be implemented by adding a rejected_technologies table or flag

      toast.success('Tecnología rechazada');
      queryClient.invalidateQueries({ queryKey: ['scouting-queue'] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error al rechazar', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!technology) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <form className="space-y-6 py-4" onSubmit={(e) => e.preventDefault()}>
            {/* Información General */}
            <FormSection title="Información General">
              <div>
                <Label htmlFor="nombre" className="text-sm">
                  Nombre de la tecnología <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData["Nombre de la tecnología"]}
                  onChange={(e) => handleChange('Nombre de la tecnología', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proveedor" className="text-sm">Proveedor / Empresa</Label>
                <Input
                  id="proveedor"
                  value={formData["Proveedor / Empresa"]}
                  onChange={(e) => handleChange('Proveedor / Empresa', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pais" className="text-sm">País de origen</Label>
                <Input
                  id="pais"
                  value={formData["País de origen"]}
                  onChange={(e) => handleChange('País de origen', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trl" className="text-sm">TRL (1-9)</Label>
                <Select 
                  value={formData["Grado de madurez (TRL)"]?.toString() ?? ''} 
                  onValueChange={(v) => handleChange('Grado de madurez (TRL)', v ? parseInt(v) : null)}
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
                  value={formData["Web de la empresa"]}
                  onChange={(e) => handleChange('Web de la empresa', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email de contacto</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData["Email de contacto"]}
                  onChange={(e) => handleChange('Email de contacto', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fechaScouting" className="text-sm">Fecha de scouting</Label>
                <Input
                  id="fechaScouting"
                  type="date"
                  value={formData["Fecha de scouting"]}
                  onChange={(e) => handleChange('Fecha de scouting', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paisesActua" className="text-sm">Países donde actúa</Label>
                <Input
                  id="paisesActua"
                  value={formData["Paises donde actua"]}
                  onChange={(e) => handleChange('Paises donde actua', e.target.value)}
                  className="mt-1"
                />
              </div>
            </FormSection>

            <Separator />

            {/* Clasificación - Tipos */}
            <FormSection title="Clasificación (Taxonomía)">
              <div className="md:col-span-2">
                <Label className="text-sm">
                  Tipos de Tecnología <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona uno o más tipos. Haz clic en ⭐ para marcar como principal.
                </p>
                
                {/* Selected tipos badges */}
                {selectedTipos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTipos.map(st => {
                      const tipo = tipos?.find(t => t.id === st.tipo_id);
                      if (!tipo) return null;
                      return (
                        <Badge 
                          key={st.tipo_id} 
                          variant={st.is_primary ? "default" : "secondary"}
                          className="flex items-center gap-1 pr-1"
                        >
                          {st.is_primary && <Star className="w-3 h-3 fill-current" />}
                          <span className="font-mono text-xs mr-1">{tipo.codigo}</span>
                          {tipo.nombre}
                          {!st.is_primary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryTipo(st.tipo_id)}
                              className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                              title="Marcar como principal"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTipoToggle(st.tipo_id, false)}
                            className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* Checkbox list of tipos */}
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {tipos?.map((tipo) => {
                    const isSelected = selectedTipos.some(st => st.tipo_id === tipo.id);
                    return (
                      <div key={tipo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tipo-${tipo.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleTipoToggle(tipo.id, !!checked)}
                        />
                        <label
                          htmlFor={`tipo-${tipo.id}`}
                          className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span className="font-mono text-xs text-muted-foreground">{tipo.codigo}</span>
                          {tipo.nombre}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subcategorías */}
              <div className="md:col-span-2">
                <Label className="text-sm">Subcategorías</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {selectedTipos.length > 0 
                    ? "Selecciona una o más subcategorías. Haz clic en ⭐ para marcar como principal."
                    : "Primero selecciona al menos un tipo de tecnología"
                  }
                </p>
                
                {/* Selected subcategorias badges */}
                {selectedSubcategorias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedSubcategorias.map(ss => {
                      const sub = allSubcategorias?.find(s => s.id === ss.subcategoria_id);
                      if (!sub) return null;
                      return (
                        <Badge 
                          key={ss.subcategoria_id} 
                          variant={ss.is_primary ? "default" : "secondary"}
                          className="flex items-center gap-1 pr-1"
                        >
                          {ss.is_primary && <Star className="w-3 h-3 fill-current" />}
                          <span className="font-mono text-xs mr-1">{sub.codigo}</span>
                          {sub.nombre}
                          {!ss.is_primary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimarySubcategoria(ss.subcategoria_id)}
                              className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                              title="Marcar como principal"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSubcategoriaToggle(ss.subcategoria_id, false)}
                            className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* Checkbox list of subcategorias */}
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {selectedTipos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Primero selecciona un tipo de tecnología</p>
                  ) : filteredSubcategorias.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay subcategorías disponibles para los tipos seleccionados</p>
                  ) : (
                    filteredSubcategorias.map((sub) => {
                      const isSelected = selectedSubcategorias.some(ss => ss.subcategoria_id === sub.id);
                      const tipoParent = tipos?.find(t => t.id === sub.tipo_id);
                      return (
                        <div key={sub.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subcategoria-${sub.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSubcategoriaToggle(sub.id, !!checked)}
                          />
                          <label
                            htmlFor={`subcategoria-${sub.id}`}
                            className="text-sm flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <span className="font-mono text-xs text-muted-foreground">{sub.codigo}</span>
                            {sub.nombre}
                            {tipoParent && (
                              <span className="text-xs text-muted-foreground">({tipoParent.codigo})</span>
                            )}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sector */}
              <div>
                <Label className="text-sm">Sector</Label>
                <Select
                  value={formData.sector_id || ''}
                  onValueChange={(value) => handleChange('sector_id', value || null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar sector..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {sectores?.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{sector.id}</span>
                          {sector.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.sector_id === 'IND' && (
                <div>
                  <Label className="text-sm">Subsector Industrial</Label>
                  <Select
                    value={formData.subsector_industrial || ''}
                    onValueChange={(value) => handleChange('subsector_industrial', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar subsector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSECTORES_INDUSTRIALES.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  value={formData["Descripción técnica breve"]}
                  onChange={(e) => handleChange('Descripción técnica breve', e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ventajaCompetitiva" className="text-sm">Ventaja competitiva clave</Label>
                <Textarea
                  id="ventajaCompetitiva"
                  value={formData["Ventaja competitiva clave"]}
                  onChange={(e) => handleChange('Ventaja competitiva clave', e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="porqueInnovadora" className="text-sm">¿Por qué es innovadora?</Label>
                <Textarea
                  id="porqueInnovadora"
                  value={formData["Porque es innovadora"]}
                  onChange={(e) => handleChange('Porque es innovadora', e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="aplicacionPrincipal" className="text-sm">Aplicación principal</Label>
                <Textarea
                  id="aplicacionPrincipal"
                  value={formData["Aplicación principal"]}
                  onChange={(e) => handleChange('Aplicación principal', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="casosReferencia" className="text-sm">Casos de referencia</Label>
                <Textarea
                  id="casosReferencia"
                  value={formData["Casos de referencia"]}
                  onChange={(e) => handleChange('Casos de referencia', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </FormSection>

            <Separator />

            {/* Notas del Analista */}
            <FormSection title="Notas del Analista">
              <div className="md:col-span-2">
                <Label htmlFor="comentariosAnalista" className="text-sm">Comentarios</Label>
                <Textarea
                  id="comentariosAnalista"
                  value={formData["Comentarios del analista"]}
                  onChange={(e) => handleChange('Comentarios del analista', e.target.value)}
                  rows={3}
                  className="mt-1"
                  placeholder="Añade notas sobre tu evaluación..."
                />
              </div>
              <div>
                <Label htmlFor="estadoSeguimiento" className="text-sm">Estado del seguimiento</Label>
                <Input
                  id="estadoSeguimiento"
                  value={formData["Estado del seguimiento"]}
                  onChange={(e) => handleChange('Estado del seguimiento', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="qualityScore" className="text-sm">Puntuación de calidad (0-100)</Label>
                <Input
                  id="qualityScore"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.quality_score}
                  onChange={(e) => handleChange('quality_score', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </FormSection>
          </form>
        </div>

        <DialogFooter className="border-t pt-4 flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row w-full gap-2 sm:items-center sm:justify-between">
            {/* Save button */}
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isLoading || updateStatusMutation.isPending}
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
                onClick={handleRejectToDatabase}
                disabled={isLoading || updateStatusMutation.isPending}
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
                  disabled={isLoading || updateStatusMutation.isPending}
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
              {technology.status === 'approved' && canApproveToDb && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('review')}
                    disabled={isLoading || updateStatusMutation.isPending}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Devolver a Revisión
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApproveToDatabase}
                    disabled={isLoading || updateStatusMutation.isPending}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4 mr-1" />
                    )}
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
