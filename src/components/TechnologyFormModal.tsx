import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { syncTechnologyUpdate, syncTechnologyInsert } from '@/lib/syncToExternal';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { AIEnrichmentButton } from '@/components/AIEnrichmentButton';
import { TaxonomyCascadeSelector } from '@/components/taxonomy/TaxonomyCascadeSelector';
import { TaxonomySelections } from '@/hooks/useTaxonomy3Levels';
import type { Technology } from '@/types/database';

interface TechnologyFormModalProps {
  technology?: Technology | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface TaxonomySector {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface FormData {
  nombre: string;
  proveedor: string;
  pais: string;
  web: string;
  email: string;
  tipo: string;
  sector: string;
  aplicacion: string;
  descripcion: string;
  ventaja: string;
  innovacion: string;
  casos_referencia: string;
  paises_actua: string;
  comentarios: string;
  fecha_scouting: string;
  estado_seguimiento: string;
  trl: number | null;
  status: string;
  quality_score: number;
  sector_id: string | null;
  subsector_industrial: string;
}

const TRL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'en_revision', label: 'En revisión' }
];

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

// Helper components
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-foreground border-b pb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

interface FormFieldProps {
  label: string;
  field: keyof FormData;
  value: string | number | null;
  onChange: (field: keyof FormData, value: string | number | null) => void;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'date' | 'number';
  fullWidth?: boolean;
}

const FormField = ({ 
  label, 
  field, 
  value,
  onChange,
  required = false,
  type = 'text',
  fullWidth = false,
}: FormFieldProps) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <Label htmlFor={field} className="text-sm">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Input
      id={field}
      type={type}
      value={(value as string) || ''}
      onChange={(e) => onChange(field, type === 'number' ? Number(e.target.value) : e.target.value)}
      className="mt-1"
    />
  </div>
);

interface FormTextareaProps {
  label: string;
  field: keyof FormData;
  value: string | number | null;
  onChange: (field: keyof FormData, value: string | number | null) => void;
  rows?: number;
}

const FormTextarea = ({ 
  label, 
  field,
  value,
  onChange,
  rows = 3,
}: FormTextareaProps) => (
  <div className="md:col-span-2">
    <Label htmlFor={field} className="text-sm">{label}</Label>
    <Textarea
      id={field}
      value={(value as string) || ''}
      onChange={(e) => onChange(field, e.target.value)}
      rows={rows}
      className="mt-1"
    />
  </div>
);

export const TechnologyFormModal: React.FC<TechnologyFormModalProps> = ({
  technology,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [editComment, setEditComment] = useState('');
  const isEditing = !!technology;
  
  // New 3-level taxonomy state
  const [taxonomySelections, setTaxonomySelections] = useState<TaxonomySelections>({
    categorias: [],
    tipos: [],
    subcategorias: [],
  });
  
  // Check user role - analysts need approval, supervisors/admins can edit directly
  const isAnalyst = profile?.role === 'analyst';

  // Fetch sector data for the sector selector
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

  // Fetch editor profile name (updated_by)
  const { data: editorProfile } = useQuery({
    queryKey: ['editor-profile', technology?.updated_by],
    queryFn: async () => {
      const updatedBy = technology?.updated_by;
      if (!updatedBy) return null;
      const { data, error } = await externalSupabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', updatedBy)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!technology?.updated_by,
  });

  // Fetch reviewer profile name (reviewer_id)
  const { data: reviewerProfile } = useQuery({
    queryKey: ['reviewer-profile', technology?.reviewer_id],
    queryFn: async () => {
      const reviewerId = technology?.reviewer_id;
      if (!reviewerId) return null;
      const { data, error } = await externalSupabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', reviewerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!technology?.reviewer_id,
  });
  
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    proveedor: '',
    pais: '',
    web: '',
    email: '',
    tipo: '',
    sector: '',
    aplicacion: '',
    descripcion: '',
    ventaja: '',
    innovacion: '',
    casos_referencia: '',
    paises_actua: '',
    comentarios: '',
    fecha_scouting: '',
    estado_seguimiento: '',
    trl: null,
    status: 'active',
    quality_score: 0,
    sector_id: null,
    subsector_industrial: '',
  });

  // Load data when editing
  useEffect(() => {
    if (technology) {
      setFormData({
        nombre: technology.nombre || '',
        proveedor: technology.proveedor || '',
        pais: technology.pais || '',
        web: technology.web || '',
        email: technology.email || '',
        tipo: technology.tipo || '',
        sector: technology.sector || '',
        aplicacion: technology.aplicacion || '',
        descripcion: technology.descripcion || '',
        ventaja: technology.ventaja || '',
        innovacion: technology.innovacion || '',
        casos_referencia: technology.casos_referencia || '',
        paises_actua: technology.paises_actua || '',
        comentarios: technology.comentarios || '',
        fecha_scouting: technology.fecha_scouting || '',
        estado_seguimiento: technology.estado_seguimiento || '',
        trl: technology.trl,
        status: technology.status || 'active',
        quality_score: technology.quality_score || 0,
        sector_id: technology.sector_id || null,
        subsector_industrial: technology.subsector_industrial || '',
      });
      
      // Load taxonomy arrays if they exist
      setTaxonomySelections({
        categorias: technology.categorias || [],
        tipos: technology.tipos || [],
        subcategorias: technology.subcategorias || [],
      });
      
      setEditComment('');
    } else {
      setFormData({
        nombre: '',
        proveedor: '',
        pais: '',
        web: '',
        email: '',
        tipo: '',
        sector: '',
        aplicacion: '',
        descripcion: '',
        ventaja: '',
        innovacion: '',
        casos_referencia: '',
        paises_actua: '',
        comentarios: '',
        fecha_scouting: '',
        estado_seguimiento: '',
        trl: null,
        status: 'active',
        quality_score: 0,
        sector_id: null,
        subsector_industrial: '',
      });
      setTaxonomySelections({
        categorias: [],
        tipos: [],
        subcategorias: [],
      });
      setEditComment('');
    }
  }, [technology, open]);

  const handleChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If sector_id changes, update "sector" text and clear subsector if not industrial
      if (field === 'sector_id') {
        const selectedSector = sectores?.find(s => s.id === value);
        if (selectedSector) {
          newData.sector = selectedSector.nombre;
        }
        if (value !== 'IND') {
          newData.subsector_industrial = '';
        }
      }
      
      return newData;
    });
  };

  // Update legacy text fields when taxonomy selections change
  useEffect(() => {
    // Update "tipo" with first tipo
    if (taxonomySelections.tipos.length > 0) {
      setFormData(prev => ({
        ...prev,
        tipo: taxonomySelections.tipos[0],
      }));
    }
  }, [taxonomySelections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El nombre de la tecnología es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (taxonomySelections.categorias.length === 0) {
      toast({
        title: 'Campo requerido',
        description: 'Debes seleccionar al menos una categoría',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Data to save includes new taxonomy arrays - using snake_case
    const dataToSave = {
      nombre: formData.nombre,
      proveedor: formData.proveedor || null,
      pais: formData.pais || null,
      web: formData.web || null,
      email: formData.email || null,
      tipo: formData.tipo || null,
      sector: formData.sector || null,
      aplicacion: formData.aplicacion || null,
      descripcion: formData.descripcion || null,
      ventaja: formData.ventaja || null,
      innovacion: formData.innovacion || null,
      casos_referencia: formData.casos_referencia || null,
      paises_actua: formData.paises_actua || null,
      comentarios: formData.comentarios || null,
      fecha_scouting: formData.fecha_scouting || null,
      estado_seguimiento: formData.estado_seguimiento || null,
      trl: formData.trl || null,
      status: formData.status,
      // New taxonomy arrays
      categorias: taxonomySelections.categorias,
      tipos: taxonomySelections.tipos,
      subcategorias: taxonomySelections.subcategorias,
    };

    try {
      if (isEditing && technology) {
        if (isAnalyst) {
          // Analysts create edit proposals
          const { error } = await externalSupabase
            .from('technology_edits')
            .insert([{
              technology_id: technology.id,
              proposed_changes: JSON.parse(JSON.stringify(dataToSave)),
              original_data: JSON.parse(JSON.stringify(technology)),
              status: 'pending' as const,
              comments: editComment || null,
              created_by: user?.id!,
            }]);

          if (error) throw error;

          toast({
            title: 'Propuesta enviada',
            description: 'Tu edición ha sido enviada para revisión. Un supervisor la aprobará.',
          });
        } else {
          // Supervisors/Admins can edit directly
          const { error } = await externalSupabase
            .from('technologies')
            .update(dataToSave)
            .eq('id', technology.id);

          if (error) throw error;

          // Sync to external Supabase
          try {
            await syncTechnologyUpdate(technology.id, dataToSave);
          } catch (syncError) {
            console.error('External sync failed:', syncError);
          }

          toast({
            title: 'Tecnología actualizada',
            description: 'Los cambios se han guardado correctamente',
          });
        }
      } else {
        // Creating new technology
        if (isAnalyst) {
          // Analysts create proposal for new technology
          const { error } = await externalSupabase
            .from('technology_edits')
            .insert([{
              technology_id: null,
              proposed_changes: JSON.parse(JSON.stringify(dataToSave)),
              original_data: null,
              status: 'pending' as const,
              comments: editComment || 'Nueva tecnología propuesta',
              created_by: user?.id!,
            }]);

          if (error) throw error;

          toast({
            title: 'Propuesta enviada',
            description: 'Tu nueva tecnología ha sido enviada para revisión.',
          });
        } else {
          // Supervisors/Admins can create directly
          const { data: newTech, error } = await externalSupabase
            .from('technologies')
            .insert([{
              ...dataToSave,
              created_by: user?.id,
            }])
            .select()
            .single();

          if (error) throw error;

          // Sync to external Supabase
          if (newTech) {
            try {
              await syncTechnologyInsert(newTech);
            } catch (syncError) {
              console.error('External sync failed:', syncError);
            }
          }

          toast({
            title: 'Tecnología creada',
            description: 'La nueva tecnología se ha guardado correctamente',
          });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving technology:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la tecnología',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tecnología' : 'Nueva Tecnología'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los campos que desees actualizar' 
              : 'Completa los datos de la nueva tecnología'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Analyst warning */}
          {isAnalyst && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Como analista, tus cambios serán enviados para aprobación antes de publicarse.
              </AlertDescription>
            </Alert>
          )}

          {/* AI Enrichment */}
          {isEditing && technology && (
            <div className="flex justify-end">
              <AIEnrichmentButton
                technology={{
                  id: technology.id,
                  nombre: formData.nombre,
                  proveedor: formData.proveedor,
                  web: formData.web,
                  pais: formData.pais,
                  tipo: formData.tipo,
                  subcategoria: taxonomySelections.subcategorias[0] || '',
                  sector: formData.sector,
                  descripcion: formData.descripcion,
                  aplicacion: formData.aplicacion,
                  ventaja: formData.ventaja,
                  innovacion: formData.innovacion,
                  trl: formData.trl ?? null,
                  casos_referencia: formData.casos_referencia,
                  paises_actua: formData.paises_actua,
                  comentarios: formData.comentarios,
                }}
                onEnrichmentComplete={(enriched) => {
                  setFormData(prev => ({
                    ...prev,
                    descripcion: typeof enriched.descripcion === 'string' ? enriched.descripcion : prev.descripcion,
                    aplicacion: typeof enriched.aplicacion === 'string' ? enriched.aplicacion : prev.aplicacion,
                    ventaja: typeof enriched.ventaja === 'string' ? enriched.ventaja : prev.ventaja,
                    innovacion: typeof enriched.innovacion === 'string' ? enriched.innovacion : prev.innovacion,
                    casos_referencia: typeof enriched.casos_referencia === 'string' ? enriched.casos_referencia : prev.casos_referencia,
                    paises_actua: typeof enriched.paises_actua === 'string' ? enriched.paises_actua : prev.paises_actua,
                    comentarios: typeof enriched.comentarios === 'string' ? enriched.comentarios : prev.comentarios,
                    trl: typeof enriched.trl === 'number' ? enriched.trl : prev.trl,
                  }));
                }}
              />
            </div>
          )}

          {/* General Info */}
          <FormSection title="Información General">
            <FormField
              label="Nombre de la tecnología"
              field="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              fullWidth
            />
            <FormField
              label="Proveedor / Empresa"
              field="proveedor"
              value={formData.proveedor}
              onChange={handleChange}
            />
            <div>
              <Label className="text-sm">País de origen</Label>
              <Select
                value={formData.pais}
                onValueChange={(v) => handleChange('pais', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField
              label="Web de la empresa"
              field="web"
              value={formData.web}
              onChange={handleChange}
              type="url"
            />
            <FormField
              label="Email de contacto"
              field="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
            />
          </FormSection>

          {/* Classification */}
          <FormSection title="Clasificación">
            <div className="md:col-span-2">
              <TaxonomyCascadeSelector
                value={taxonomySelections}
                onChange={setTaxonomySelections}
              />
            </div>
            <div>
              <Label className="text-sm">Sector</Label>
              <Select
                value={formData.sector_id || ''}
                onValueChange={(v) => handleChange('sector_id', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectores?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.sector_id === 'IND' && (
              <div>
                <Label className="text-sm">Subsector Industrial</Label>
                <Select
                  value={formData.subsector_industrial}
                  onValueChange={(v) => handleChange('subsector_industrial', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona subsector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSECTORES_INDUSTRIALES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm">TRL (Nivel de Madurez)</Label>
              <Select
                value={formData.trl?.toString() || ''}
                onValueChange={(v) => handleChange('trl', v ? parseInt(v) : null)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona TRL" />
                </SelectTrigger>
                <SelectContent>
                  {TRL_OPTIONS.map(t => (
                    <SelectItem key={t} value={t.toString()}>TRL {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange('status', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          {/* Description */}
          <FormSection title="Descripción Técnica">
            <FormTextarea
              label="Descripción técnica breve"
              field="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={4}
            />
            <FormTextarea
              label="Aplicación principal"
              field="aplicacion"
              value={formData.aplicacion}
              onChange={handleChange}
            />
          </FormSection>

          {/* Differentiation */}
          <FormSection title="Diferenciación e Innovación">
            <FormTextarea
              label="Ventaja competitiva clave"
              field="ventaja"
              value={formData.ventaja}
              onChange={handleChange}
            />
            <FormTextarea
              label="Por qué es innovadora"
              field="innovacion"
              value={formData.innovacion}
              onChange={handleChange}
            />
          </FormSection>

          {/* References */}
          <FormSection title="Referencias">
            <FormTextarea
              label="Casos de referencia"
              field="casos_referencia"
              value={formData.casos_referencia}
              onChange={handleChange}
            />
            <FormField
              label="Países donde actúa"
              field="paises_actua"
              value={formData.paises_actua}
              onChange={handleChange}
              fullWidth
            />
          </FormSection>

          {/* Internal Notes */}
          <FormSection title="Notas del Analista">
            <FormTextarea
              label="Comentarios del analista"
              field="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
            />
            <FormField
              label="Fecha de scouting"
              field="fecha_scouting"
              value={formData.fecha_scouting}
              onChange={handleChange}
              type="date"
            />
            <FormField
              label="Estado del seguimiento"
              field="estado_seguimiento"
              value={formData.estado_seguimiento}
              onChange={handleChange}
            />
          </FormSection>

          {/* Analyst comment for proposals */}
          {isAnalyst && (
            <div>
              <Label className="text-sm">Comentario para el revisor</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Explica los cambios realizados..."
                rows={2}
                className="mt-1"
              />
            </div>
          )}

          {/* Audit info (only for editing) */}
          {isEditing && technology && (
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
              <p>Creado: {technology.created_at ? new Date(technology.created_at).toLocaleString('es-ES') : '—'}</p>
              <p>Última modificación: {technology.updated_at ? new Date(technology.updated_at).toLocaleString('es-ES') : '—'}</p>
              {editorProfile?.full_name && (
                <p>Modificado por: {editorProfile.full_name}</p>
              )}
              {technology.review_status && technology.review_status !== 'none' && (
                <p>
                  Estado de revisión: {technology.review_status}
                  {reviewerProfile?.full_name && ` (${reviewerProfile.full_name})`}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isAnalyst ? 'Enviar para aprobación' : (isEditing ? 'Guardar cambios' : 'Crear tecnología')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
