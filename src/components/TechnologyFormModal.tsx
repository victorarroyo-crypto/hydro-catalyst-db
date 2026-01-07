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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { syncTechnologyUpdate, syncTechnologyInsert } from '@/lib/syncToExternal';
import { Loader2, Save, AlertTriangle, X, Star } from 'lucide-react';
import type { Technology } from '@/types/database';

interface TechnologyFormModalProps {
  technology?: Technology | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

// Move these components outside to prevent re-creation on each render
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
  const [selectedTipos, setSelectedTipos] = useState<SelectedTipo[]>([]);
  const [selectedSubcategorias, setSelectedSubcategorias] = useState<SelectedSubcategoria[]>([]);
  const isEditing = !!technology;
  
  // Check user role - analysts need approval, supervisors/admins can edit directly
  const isAnalyst = profile?.role === 'analyst';

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

  // Fetch existing technology tipos relationship
  const { data: existingTipos } = useQuery({
    queryKey: ['technology-tipos', technology?.id],
    queryFn: async () => {
      if (!technology?.id) return [];
      const { data, error } = await supabase
        .from('technology_tipos')
        .select('tipo_id, is_primary')
        .eq('technology_id', technology.id);
      if (error) throw error;
      return data as SelectedTipo[];
    },
    enabled: !!technology?.id,
  });

  // Fetch existing technology subcategorias relationship
  const { data: existingSubcategorias } = useQuery({
    queryKey: ['technology-subcategorias', technology?.id],
    queryFn: async () => {
      if (!technology?.id) return [];
      const { data, error } = await supabase
        .from('technology_subcategorias')
        .select('subcategoria_id, is_primary')
        .eq('technology_id', technology.id);
      if (error) throw error;
      return data as SelectedSubcategoria[];
    },
    enabled: !!technology?.id,
  });

  // Fetch editor profile name (updated_by)
  const { data: editorProfile } = useQuery({
    queryKey: ['editor-profile', (technology as any)?.updated_by],
    queryFn: async () => {
      const updatedBy = (technology as any)?.updated_by;
      if (!updatedBy) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', updatedBy)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(technology as any)?.updated_by,
  });

  // Fetch reviewer profile name (reviewer_id)
  const { data: reviewerProfile } = useQuery({
    queryKey: ['reviewer-profile', (technology as any)?.reviewer_id],
    queryFn: async () => {
      const reviewerId = (technology as any)?.reviewer_id;
      if (!reviewerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', reviewerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(technology as any)?.reviewer_id,
  });
  
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
    "Fecha de scouting": '',
    "Estado del seguimiento": '',
    "Grado de madurez (TRL)": null,
    status: 'active',
    quality_score: 0,
    tipo_id: null,
    subcategoria_id: null,
    sector_id: null,
    subsector_industrial: '',
  });

  // Filter subcategories based on all selected tipos (not just primary)
  const selectedTipoIds = selectedTipos.map(t => t.tipo_id);
  const filteredSubcategorias = allSubcategorias?.filter(
    (sub) => selectedTipoIds.includes(sub.tipo_id)
  ) || [];

  // Load existing tipos when editing
  useEffect(() => {
    if (existingTipos && existingTipos.length > 0) {
      setSelectedTipos(existingTipos);
    } else if ((technology as any)?.tipo_id) {
      // Fallback to legacy tipo_id if no relationship exists
      setSelectedTipos([{ tipo_id: (technology as any).tipo_id, is_primary: true }]);
    }
  }, [existingTipos, technology]);

  // Load existing subcategorias when editing
  useEffect(() => {
    if (existingSubcategorias && existingSubcategorias.length > 0) {
      setSelectedSubcategorias(existingSubcategorias);
    } else if ((technology as any)?.subcategoria_id) {
      // Fallback to legacy subcategoria_id if no relationship exists
      setSelectedSubcategorias([{ subcategoria_id: (technology as any).subcategoria_id, is_primary: true }]);
    }
  }, [existingSubcategorias, technology]);

  // Helper functions for managing multiple tipos
  const handleTipoToggle = (tipoId: number, checked: boolean) => {
    if (checked) {
      const isFirst = selectedTipos.length === 0;
      setSelectedTipos(prev => [...prev, { tipo_id: tipoId, is_primary: isFirst }]);
      
      // Update legacy field with primary tipo name
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
      
      // If we removed the primary, set first remaining as primary
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
    }
  };

  const handleSetPrimary = (tipoId: number) => {
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

  // Helper functions for managing multiple subcategorias
  const handleSubcategoriaToggle = (subcategoriaId: number, checked: boolean) => {
    if (checked) {
      const isFirst = selectedSubcategorias.length === 0;
      setSelectedSubcategorias(prev => [...prev, { subcategoria_id: subcategoriaId, is_primary: isFirst }]);
      
      // Update legacy field with primary subcategoria name
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
      
      // If we removed the primary, set first remaining as primary
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

  useEffect(() => {
    if (technology) {
      setFormData({
        "Nombre de la tecnología": technology["Nombre de la tecnología"] || '',
        "Proveedor / Empresa": technology["Proveedor / Empresa"] || '',
        "País de origen": technology["País de origen"] || '',
        "Web de la empresa": technology["Web de la empresa"] || '',
        "Email de contacto": technology["Email de contacto"] || '',
        "Tipo de tecnología": technology["Tipo de tecnología"] || '',
        "Subcategoría": technology["Subcategoría"] || '',
        "Sector y subsector": technology["Sector y subsector"] || '',
        "Aplicación principal": technology["Aplicación principal"] || '',
        "Descripción técnica breve": technology["Descripción técnica breve"] || '',
        "Ventaja competitiva clave": technology["Ventaja competitiva clave"] || '',
        "Porque es innovadora": technology["Porque es innovadora"] || '',
        "Casos de referencia": technology["Casos de referencia"] || '',
        "Paises donde actua": technology["Paises donde actua"] || '',
        "Comentarios del analista": technology["Comentarios del analista"] || '',
        "Fecha de scouting": technology["Fecha de scouting"] || '',
        "Estado del seguimiento": technology["Estado del seguimiento"] || '',
        "Grado de madurez (TRL)": technology["Grado de madurez (TRL)"],
        status: technology.status || 'active',
        quality_score: technology.quality_score || 0,
        tipo_id: (technology as any).tipo_id || null,
        subcategoria_id: (technology as any).subcategoria_id || null,
        sector_id: (technology as any).sector_id || null,
        subsector_industrial: (technology as any).subsector_industrial || '',
      });
      setEditComment('');
    } else {
      setFormData({
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
        "Fecha de scouting": '',
        "Estado del seguimiento": '',
        "Grado de madurez (TRL)": null,
        status: 'active',
        quality_score: 0,
        tipo_id: null,
        subcategoria_id: null,
        sector_id: null,
        subsector_industrial: '',
      });
      setEditComment('');
      setSelectedTipos([]);
      setSelectedSubcategorias([]);
    }
  }, [technology, open]);

  const handleChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If tipo_id changes, reset subcategoria_id and update "Tipo de tecnología" text
      if (field === 'tipo_id') {
        newData.subcategoria_id = null;
        const selectedTipo = tipos?.find(t => t.id === value);
        if (selectedTipo) {
          newData["Tipo de tecnología"] = selectedTipo.nombre;
        }
      }
      
      // If subcategoria_id changes, update "Subcategoría" text
      if (field === 'subcategoria_id') {
        const selectedSub = allSubcategorias?.find(s => s.id === value);
        if (selectedSub) {
          newData["Subcategoría"] = selectedSub.nombre;
        }
      }
      
      // If sector_id changes, update "Sector y subsector" text and clear subsector if not industrial
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData["Nombre de la tecnología"].trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El nombre de la tecnología es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTipos.length === 0 && !formData["Tipo de tecnología"].trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Debes seleccionar al menos un tipo de tecnología',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

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
      status: formData.status,
      quality_score: formData.quality_score,
      tipo_id: formData.tipo_id,
      subcategoria_id: formData.subcategoria_id,
      sector_id: formData.sector_id,
      subsector_industrial: formData.subsector_industrial || null,
    };

    try {
      if (isEditing && technology) {
        if (isAnalyst) {
          // Analysts create edit proposals
          const { error } = await supabase
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
          // Supervisors/Admins can edit directly - also record as reviewer
          const { error } = await supabase
            .from('technologies')
            .update({
              ...dataToSave,
              updated_by: user?.id,
              reviewer_id: user?.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', technology.id);

          if (error) throw error;

          // Update technology_tipos relationship
          // First delete existing
          await supabase
            .from('technology_tipos')
            .delete()
            .eq('technology_id', technology.id);

          // Then insert new ones
          if (selectedTipos.length > 0) {
            const tiposToInsert = selectedTipos.map(t => ({
              technology_id: technology.id,
              tipo_id: t.tipo_id,
              is_primary: t.is_primary,
            }));
            
            const { error: tiposError } = await supabase
              .from('technology_tipos')
              .insert(tiposToInsert);
            
            if (tiposError) console.error('Error saving tipos:', tiposError);
          }

          // Update technology_subcategorias relationship
          // First delete existing
          await supabase
            .from('technology_subcategorias')
            .delete()
            .eq('technology_id', technology.id);

          // Then insert new ones
          if (selectedSubcategorias.length > 0) {
            const subcategoriasToInsert = selectedSubcategorias.map(s => ({
              technology_id: technology.id,
              subcategoria_id: s.subcategoria_id,
              is_primary: s.is_primary,
            }));
            
            const { error: subcategoriasError } = await supabase
              .from('technology_subcategorias')
              .insert(subcategoriasToInsert);
            
            if (subcategoriasError) console.error('Error saving subcategorias:', subcategoriasError);
          }

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
          // Analysts create proposal for new technology (technology_id = null)
          const { error } = await supabase
            .from('technology_edits')
            .insert([{
              technology_id: null,
              proposed_changes: JSON.parse(JSON.stringify(dataToSave)),
              original_data: null,
              status: 'pending' as const,
              edit_type: 'create',
              comments: editComment || 'Sugerencia de nueva tecnología',
              created_by: user?.id!,
            }]);

          if (error) throw error;

          toast({
            title: 'Propuesta enviada',
            description: 'Tu sugerencia de nueva tecnología ha sido enviada para revisión',
          });
        } else {
          // Admin/Supervisor: Create directly
          const { data: insertedData, error } = await supabase
            .from('technologies')
            .insert({
              ...dataToSave,
              updated_by: user?.id,
            })
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
            
            const { error: tiposError } = await supabase
              .from('technology_tipos')
              .insert(tiposToInsert);
            
            if (tiposError) console.error('Error saving tipos:', tiposError);
          }

          // Insert technology_subcategorias relationships
          if (selectedSubcategorias.length > 0) {
            const subcategoriasToInsert = selectedSubcategorias.map(s => ({
              technology_id: insertedData.id,
              subcategoria_id: s.subcategoria_id,
              is_primary: s.is_primary,
            }));
            
            const { error: subcategoriasError } = await supabase
              .from('technology_subcategorias')
              .insert(subcategoriasToInsert);
            
            if (subcategoriasError) console.error('Error saving subcategorias:', subcategoriasError);
          }

          // Sync to external Supabase
          try {
            await syncTechnologyInsert({ ...dataToSave, id: insertedData.id });
          } catch (syncError) {
            console.error('External sync failed:', syncError);
          }

          toast({
            title: 'Tecnología creada',
            description: 'La nueva tecnología se ha añadido correctamente',
          });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: errorMessage,
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
          <DialogTitle className="text-xl font-display">
            {isEditing ? 'Editar Tecnología' : 'Nueva Tecnología'}
          </DialogTitle>
          {isAnalyst && (
            <DialogDescription>
              {isEditing 
                ? 'Tu edición será enviada para revisión antes de publicarse.'
                : 'Tu sugerencia de nueva tecnología será revisada antes de crearse.'
              }
            </DialogDescription>
          )}
        </DialogHeader>

        {isAnalyst && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-sm">
              {isEditing 
                ? 'Como analista, tus cambios serán revisados por un supervisor o administrador antes de aplicarse.'
                : 'Como analista, tu propuesta de nueva tecnología será revisada por un supervisor o administrador antes de crearse.'
              }
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* General Info */}
          <FormSection title="Información General">
            <FormField 
              label="Nombre de la tecnología" 
              field="Nombre de la tecnología" 
              value={formData["Nombre de la tecnología"]}
              onChange={handleChange}
              required 
              fullWidth 
            />
            <FormField 
              label="Proveedor / Empresa" 
              field="Proveedor / Empresa" 
              value={formData["Proveedor / Empresa"]}
              onChange={handleChange}
            />
            <div>
              <Label htmlFor="pais-origen" className="text-sm">País de origen</Label>
              <Select
                value={formData["País de origen"] || ''}
                onValueChange={(value) => handleChange("País de origen", value)}
              >
                <SelectTrigger id="pais-origen" className="mt-1">
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
            <FormField 
              label="Web de la empresa" 
              field="Web de la empresa" 
              value={formData["Web de la empresa"]}
              onChange={handleChange}
              type="url" 
            />
            <FormField 
              label="Email de contacto" 
              field="Email de contacto" 
              value={formData["Email de contacto"]}
              onChange={handleChange}
              type="text" 
            />
          </FormSection>

          {/* Taxonomy Classification */}
          <FormSection title="Clasificación (Nueva Taxonomía)">
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
                            onClick={() => handleSetPrimary(st.tipo_id)}
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
              {formData.sector_id && sectores && (
                <p className="text-xs text-muted-foreground mt-1">
                  {sectores.find(s => s.id === formData.sector_id)?.descripcion}
                </p>
              )}
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
                  <SelectContent className="bg-popover z-50">
                    {SUBSECTORES_INDUSTRIALES.map((subsector) => (
                      <SelectItem key={subsector} value={subsector}>
                        {subsector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FormSection>

          {/* Legacy Classification (read-only hint) */}
          <FormSection title="Clasificación (Campos Legacy)">
            <FormField 
              label="Tipo de tecnología (texto)" 
              field="Tipo de tecnología" 
              value={formData["Tipo de tecnología"]}
              onChange={handleChange}
            />
            <FormField 
              label="Subcategoría (texto)" 
              field="Subcategoría" 
              value={formData["Subcategoría"]}
              onChange={handleChange}
            />
            <FormField 
              label="Sector y subsector (texto)" 
              field="Sector y subsector" 
              value={formData["Sector y subsector"]}
              onChange={handleChange}
            />
            <FormField 
              label="Aplicación principal" 
              field="Aplicación principal" 
              value={formData["Aplicación principal"]}
              onChange={handleChange}
            />
            
            <div>
              <Label className="text-sm">Grado de madurez (TRL)</Label>
              <Select
                value={formData["Grado de madurez (TRL)"]?.toString() || ''}
                onValueChange={(value) => handleChange("Grado de madurez (TRL)", value ? parseInt(value) : null)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar TRL" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {TRL_OPTIONS.map((trl) => (
                    <SelectItem key={trl} value={trl.toString()}>
                      TRL {trl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          status.value === 'active' ? 'bg-green-500' : 
                          status.value === 'inactive' ? 'bg-gray-400' : 'bg-yellow-500'
                        }`} />
                        {status.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          {/* Description */}
          <FormSection title="Descripción">
            <FormTextarea 
              label="Descripción técnica breve" 
              field="Descripción técnica breve" 
              value={formData["Descripción técnica breve"]}
              onChange={handleChange}
              rows={4} 
            />
          </FormSection>

          {/* Differentiation */}
          <FormSection title="Diferenciación">
            <FormTextarea 
              label="Ventaja competitiva clave" 
              field="Ventaja competitiva clave" 
              value={formData["Ventaja competitiva clave"]}
              onChange={handleChange}
            />
            <FormTextarea 
              label="Por qué es innovadora" 
              field="Porque es innovadora" 
              value={formData["Porque es innovadora"]}
              onChange={handleChange}
            />
          </FormSection>

          {/* References */}
          <FormSection title="Referencias">
            <FormTextarea 
              label="Casos de referencia" 
              field="Casos de referencia" 
              value={formData["Casos de referencia"]}
              onChange={handleChange}
            />
            <FormTextarea 
              label="Países donde actúa" 
              field="Paises donde actua" 
              value={formData["Paises donde actua"]}
              onChange={handleChange}
            />
          </FormSection>

          {/* Internal */}
          <FormSection title="Información Interna">
            <FormTextarea 
              label="Comentarios del analista" 
              field="Comentarios del analista" 
              value={formData["Comentarios del analista"]}
              onChange={handleChange}
            />
            <FormField 
              label="Fecha de scouting" 
              field="Fecha de scouting" 
              value={formData["Fecha de scouting"]}
              onChange={handleChange}
              type="date" 
            />
            <FormField 
              label="Estado del seguimiento" 
              field="Estado del seguimiento" 
              value={formData["Estado del seguimiento"]}
              onChange={handleChange}
            />
            <FormField 
              label="Quality Score" 
              field="quality_score" 
              value={formData.quality_score}
              onChange={handleChange}
              type="number" 
            />
          </FormSection>

          {/* Audit Info - only show when editing */}
          {isEditing && technology && (
            <FormSection title="Información de Auditoría">
              <div>
                <Label className="text-sm text-muted-foreground">Última edición por</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                  {editorProfile?.full_name || 'No disponible'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Fecha de última edición</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                  {(technology as any)?.updated_at 
                    ? new Date((technology as any).updated_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'No disponible'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Revisado/Aprobado por</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                  {reviewerProfile?.full_name || 'No disponible'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Fecha de revisión/aprobación</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                  {(technology as any)?.reviewed_at 
                    ? new Date((technology as any).reviewed_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'No disponible'}
                </div>
              </div>
            </FormSection>
          )}

          {/* Edit comment for analysts */}
          {isEditing && isAnalyst && (
            <div className="space-y-2">
              <Label htmlFor="edit-comment" className="text-sm font-semibold">
                Comentario de la edición (opcional)
              </Label>
              <Textarea
                id="edit-comment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Explica brevemente los cambios realizados..."
                rows={2}
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isAnalyst && isEditing ? 'Enviando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing 
                    ? (isAnalyst ? 'Enviar para revisión' : 'Guardar cambios')
                    : 'Crear tecnología'
                  }
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
