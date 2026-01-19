import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useUpdateScoutingItem,
  useChangeScoutingStatus,
  useApproveToTechnologies,
  useMoveToRejected 
} from '@/hooks/useScoutingData';
import { QueueItemUI, ScoutingFormData } from '@/types/scouting';
import { 
  Loader2, 
  Save, 
  X, 
  Star,
  Send,
  Rocket,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import { TaxonomyCascadeSelector } from '@/components/taxonomy/TaxonomyCascadeSelector';
import { TaxonomySelections } from '@/hooks/useTaxonomy3Levels';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScoutingTechFormModalProps {
  technology: QueueItemUI | null;
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

const PAISES = [
  'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda', 'Arabia Saudita', 'Argelia', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Bélgica', 'Belice', 'Benín',
  'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana', 'Brasil', 'Brunéi', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá', 'Catar', 'Chad', 'Chile', 'China', 'Chipre',
  'Colombia', 'Comoras', 'Corea del Norte', 'Corea del Sur', 'Costa de Marfil', 'Costa Rica', 'Croacia', 'Cuba', 'Dinamarca', 'Dominica',
  'Ecuador', 'Egipto', 'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea', 'Eslovaquia', 'Eslovenia', 'España', 'Estados Unidos', 'Estonia',
  'Etiopía', 'Filipinas', 'Finlandia', 'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada',
  'Grecia', 'Guatemala', 'Guinea', 'Guinea Ecuatorial', 'Guinea-Bisáu', 'Guyana', 'Haití', 'Honduras', 'Hungría', 'India',
  'Indonesia', 'Irak', 'Irán', 'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia', 'Jamaica',
  'Japón', 'Jordania', 'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto', 'Letonia',
  'Líbano', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburgo', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui',
  'Maldivas', 'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'México', 'Micronesia', 'Moldavia', 'Mónaco',
  'Mongolia', 'Montenegro', 'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria', 'Noruega',
  'Nueva Zelanda', 'Omán', 'Países Bajos', 'Pakistán', 'Palaos', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay', 'Perú', 'Polonia',
  'Portugal', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República del Congo', 'República Democrática del Congo', 'República Dominicana', 'Ruanda', 'Rumania', 'Rusia',
  'Samoa', 'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona',
  'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Suazilandia', 'Sudáfrica', 'Sudán', 'Sudán del Sur', 'Suecia', 'Suiza',
  'Surinam', 'Tailandia', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo', 'Tonga', 'Trinidad y Tobago', 'Túnez', 'Turkmenistán',
  'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay', 'Uzbekistán', 'Vanuatu', 'Vaticano', 'Venezuela', 'Vietnam',
  'Yemen', 'Yibuti', 'Zambia', 'Zimbabue'
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
    case 'review': return 'En revisión';
    case 'pending_approval': return 'Pendiente aprobación';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    default: return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'review': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'pending_approval': return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
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
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // New 3-level taxonomy state
  const [taxonomySelections, setTaxonomySelections] = useState<TaxonomySelections>({
    categorias: [],
    tipos: [],
    subcategorias: [],
  });
  
  // Mutations - using hooks that connect to external DB
  const updateItemMutation = useUpdateScoutingItem();
  const changeStatusMutation = useChangeScoutingStatus();
  const approveToDbMutation = useApproveToTechnologies();
  const moveToRejectedMutation = useMoveToRejected();
  
  const isLoading = updateItemMutation.isPending || changeStatusMutation.isPending || 
                    approveToDbMutation.isPending || moveToRejectedMutation.isPending;
  
  // User role checks
  const isSupervisorOrAdmin = profile?.role === 'supervisor' || profile?.role === 'admin';
  const userId = user?.id || '';
  const userEmail = user?.email || 'unknown';

  const [formData, setFormData] = useState<ScoutingFormData>({
    nombre: '',
    proveedor: '',
    web: '',
    pais: '',
    email: '',
    tipo_sugerido: '',
    subcategoria: '',
    sector: '',
    subsector: '',
    descripcion: '',
    aplicacion_principal: '',
    ventaja_competitiva: '',
    innovacion: '',
    trl_estimado: null,
    casos_referencia: '',
    paises_actua: '',
    comentarios_analista: '',
  });

  // Fetch taxonomy data
  const { data: tipos } = useQuery({
    queryKey: ['taxonomy-tipos'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
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
      const { data, error } = await externalSupabase
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
      const { data, error } = await externalSupabase
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

  // Initialize form when technology changes
  useEffect(() => {
    if (technology && open) {
      setFormData({
        nombre: technology.name || '',
        proveedor: technology.provider || '',
        web: technology.web || '',
        pais: technology.country || '',
        email: technology.email || '',
        tipo_sugerido: technology.suggestedType || '',
        subcategoria: technology.suggestedSubcategory || '',
        sector: technology.sector || '',
        subsector: technology.subsector || '',
        descripcion: technology.description || '',
        aplicacion_principal: technology.aplicacionPrincipal || '',
        ventaja_competitiva: technology.competitiveAdvantage || '',
        innovacion: technology.innovacion || '',
        trl_estimado: technology.trl || null,
        casos_referencia: technology.casosReferencia || '',
        paises_actua: technology.paisesActua || '',
        comentarios_analista: technology.comentariosAnalista || '',
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

  const handleChange = (field: keyof ScoutingFormData, value: string | number | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If sector changes, update subsector if needed
      if (field === 'sector' && value !== 'IND') {
        newData.subsector = '';
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
          handleChange('tipo_sugerido', tipo.nombre);
        }
      }
    } else {
      const removedTipo = selectedTipos.find(t => t.tipo_id === tipoId);
      const newTipos = selectedTipos.filter(t => t.tipo_id !== tipoId);
      
      if (removedTipo?.is_primary && newTipos.length > 0) {
        newTipos[0].is_primary = true;
        const tipo = tipos?.find(t => t.id === newTipos[0].tipo_id);
        if (tipo) {
          handleChange('tipo_sugerido', tipo.nombre);
        }
      } else if (newTipos.length === 0) {
        handleChange('tipo_sugerido', '');
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
      handleChange('tipo_sugerido', tipo.nombre);
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
          handleChange('subcategoria', sub.nombre);
        }
      }
    } else {
      const removedSub = selectedSubcategorias.find(s => s.subcategoria_id === subcategoriaId);
      const newSubs = selectedSubcategorias.filter(s => s.subcategoria_id !== subcategoriaId);
      
      if (removedSub?.is_primary && newSubs.length > 0) {
        newSubs[0].is_primary = true;
        const sub = allSubcategorias?.find(s => s.id === newSubs[0].subcategoria_id);
        if (sub) {
          handleChange('subcategoria', sub.nombre);
        }
      } else if (newSubs.length === 0) {
        handleChange('subcategoria', '');
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
      handleChange('subcategoria', sub.nombre);
    }
  };

  // Save changes to scouting_queue
  const handleSave = async () => {
    if (!technology) return;
    
    updateItemMutation.mutate({
      id: technology.id,
      updates: formData,
    }, {
      onSuccess: () => {
        onSuccess?.();
      }
    });
  };

  // Send to approval (analyst action)
  const handleSendToApproval = () => {
    if (!technology) return;
    
    changeStatusMutation.mutate({
      id: technology.id,
      status: 'pending_approval',
      reviewedBy: userId, // UUID del usuario
    }, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      }
    });
  };

  // Approve to database (supervisor/admin action)
  const handleApproveToDb = () => {
    if (!technology) return;
    
    approveToDbMutation.mutate({
      scoutingId: technology.id,
      approvedBy: userEmail,
      approverId: user?.id,
    }, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      }
    });
  };

  // Send back to review (supervisor/admin action)
  const handleBackToReview = () => {
    if (!technology) return;
    
    changeStatusMutation.mutate({
      id: technology.id,
      status: 'review',
    }, {
      onSuccess: () => {
        onSuccess?.();
      }
    });
  };

  // Reject technology
  const handleConfirmRejection = () => {
    if (!technology || !rejectionReason.trim()) {
      toast.error('Debes indicar una razón de rechazo');
      return;
    }
    
    const stage = isSupervisorOrAdmin ? 'supervisor' : 'analyst';
    
    moveToRejectedMutation.mutate({
      scoutingId: technology.id,
      rejectionReason: rejectionReason.trim(),
      rejectedBy: userId, // UUID del usuario
      rejectionStage: stage,
    }, {
      onSuccess: () => {
        setRejectionDialog(false);
        setRejectionReason('');
        onSuccess?.();
        onOpenChange(false);
      }
    });
  };

  // Handler for AI enrichment - now auto-saves to DB
  const handleEnrichmentComplete = (enrichedData: Record<string, string | number>) => {
    if (!technology) return;
    
    const updated = { ...formData };
    
    if (enrichedData.descripcion) {
      updated.descripcion = enrichedData.descripcion as string;
    }
    if (enrichedData.aplicacion_principal) {
      updated.aplicacion_principal = enrichedData.aplicacion_principal as string;
    }
    if (enrichedData.ventaja_competitiva) {
      updated.ventaja_competitiva = enrichedData.ventaja_competitiva as string;
    }
    if (enrichedData.innovacion) {
      updated.innovacion = enrichedData.innovacion as string;
    }
    if (enrichedData.casos_referencia) {
      updated.casos_referencia = enrichedData.casos_referencia as string;
    }
    if (enrichedData.comentarios_analista) {
      updated.comentarios_analista = enrichedData.comentarios_analista as string;
    }
    if (enrichedData.trl_estimado && typeof enrichedData.trl_estimado === 'number') {
      updated.trl_estimado = enrichedData.trl_estimado;
    }
    if (enrichedData.paises_actua) {
      updated.paises_actua = enrichedData.paises_actua as string;
    }
    
    setFormData(updated);
    
    // Auto-save to DB after enrichment
    updateItemMutation.mutate({
      id: technology.id,
      updates: updated,
    }, {
      onSuccess: () => {
        toast.success('Enriquecimiento guardado en la base de datos');
      },
      onError: () => {
        toast.error('Los datos se aplicaron al formulario pero no se guardaron');
      }
    });
  };

  if (!technology) return null;

  return (
    <>
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
              <div className="flex items-center gap-2">
                <AIEnrichmentButton
                  technology={{
                    id: technology.id,
                    nombre: formData.nombre,
                    proveedor: formData.proveedor,
                    web: formData.web,
                    pais: formData.pais,
                    tipo_sugerido: formData.tipo_sugerido,
                    subcategoria: formData.subcategoria,
                    sector: formData.sector,
                    descripcion: formData.descripcion,
                    aplicacion_principal: formData.aplicacion_principal,
                    ventaja_competitiva: formData.ventaja_competitiva,
                    innovacion: formData.innovacion,
                    trl_estimado: formData.trl_estimado,
                    casos_referencia: formData.casos_referencia,
                    paises_actua: formData.paises_actua,
                    comentarios_analista: formData.comentarios_analista,
                  }}
                  onEnrichmentComplete={handleEnrichmentComplete}
                  disabled={isLoading}
                />
                <Badge className={getStatusColor(technology.status)}>
                  {getStatusLabel(technology.status)}
                </Badge>
              </div>
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
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="proveedor" className="text-sm">
                    Proveedor / Empresa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="proveedor"
                    value={formData.proveedor}
                    onChange={(e) => handleChange('proveedor', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="web" className="text-sm">
                    Web de la empresa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="web"
                    type="url"
                    value={formData.web}
                    onChange={(e) => handleChange('web', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pais" className="text-sm">País de origen</Label>
                  <Select
                    value={formData.pais || ''}
                    onValueChange={(value) => handleChange('pais', value)}
                  >
                    <SelectTrigger id="pais" className="mt-1">
                      <SelectValue placeholder="Seleccionar país" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAISES.map((pais) => (
                        <SelectItem key={pais} value={pais}>
                          {pais}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm">Email de contacto</Label>
                  <Input
                    id="email"
                    type="text"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="mt-1"
                    placeholder="ejemplo@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="trl" className="text-sm">TRL estimado (1-9)</Label>
                  <Select 
                    value={formData.trl_estimado?.toString() ?? ''} 
                    onValueChange={(v) => handleChange('trl_estimado', v ? parseInt(v) : null)}
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
              </FormSection>

              <Separator />

              {/* Clasificación - Nueva Taxonomía 3 Niveles */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                  Clasificación (Taxonomía 3 Niveles)
                </h3>
                <TaxonomyCascadeSelector
                  value={taxonomySelections}
                  onChange={(newSelections) => {
                    setTaxonomySelections(newSelections);
                    // Update legacy fields for compatibility
                    if (newSelections.tipos.length > 0) {
                      handleChange('tipo_sugerido', newSelections.tipos[0]);
                    }
                    if (newSelections.subcategorias.length > 0) {
                      handleChange('subcategoria', newSelections.subcategorias[0]);
                    }
                  }}
                  disabled={isLoading}
                />

                {/* Sector - keeping for compatibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Sector</Label>
                    <Select
                      value={formData.sector || ''}
                      onValueChange={(value) => handleChange('sector', value || '')}
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

                  {formData.sector === 'IND' && (
                    <div>
                      <Label className="text-sm">Subsector Industrial</Label>
                      <Select
                        value={formData.subsector || ''}
                        onValueChange={(value) => handleChange('subsector', value)}
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
                </div>
              </div>

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
                    value={formData.ventaja_competitiva}
                    onChange={(e) => handleChange('ventaja_competitiva', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="innovacion" className="text-sm">¿Por qué es innovadora?</Label>
                  <Textarea
                    id="innovacion"
                    value={formData.innovacion}
                    onChange={(e) => handleChange('innovacion', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="aplicacionPrincipal" className="text-sm">Aplicación principal</Label>
                  <Textarea
                    id="aplicacionPrincipal"
                    value={formData.aplicacion_principal}
                    onChange={(e) => handleChange('aplicacion_principal', e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="casosReferencia" className="text-sm">Casos de referencia</Label>
                  <Textarea
                    id="casosReferencia"
                    value={formData.casos_referencia}
                    onChange={(e) => handleChange('casos_referencia', e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="paisesActua" className="text-sm">Países donde actúa</Label>
                  <Textarea
                    id="paisesActua"
                    value={formData.paises_actua}
                    onChange={(e) => handleChange('paises_actua', e.target.value)}
                    rows={2}
                    className="mt-1"
                    placeholder="Lista los países donde opera la tecnología..."
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
                    value={formData.comentarios_analista}
                    onChange={(e) => handleChange('comentarios_analista', e.target.value)}
                    rows={3}
                    className="mt-1"
                    placeholder="Añade notas sobre tu evaluación..."
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
                disabled={isLoading}
              >
                {updateItemMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cambios
              </Button>

              {/* Status actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Reject button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setRejectionDialog(true)}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rechazar
                </Button>

                {/* Actions for 'review' status */}
                {technology.status === 'review' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSendToApproval}
                    disabled={isLoading}
                  >
                    {changeStatusMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    Enviar a Aprobación
                  </Button>
                )}

                {/* Actions for 'pending_approval' status (supervisor/admin) */}
                {technology.status === 'pending_approval' && isSupervisorOrAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToReview}
                      disabled={isLoading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Devolver a Revisión
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleApproveToDb}
                      disabled={isLoading}
                    >
                      {approveToDbMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4 mr-1" />
                      )}
                      Aprobar a BD
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar tecnología</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de rechazar <strong>"{technology.name}"</strong>. 
              Esta acción moverá la tecnología a la lista de rechazadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm">
              Razón del rechazo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Indica el motivo por el que se rechaza esta tecnología..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRejection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectionReason.trim() || moveToRejectedMutation.isPending}
            >
              {moveToRejectedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Confirmar rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
