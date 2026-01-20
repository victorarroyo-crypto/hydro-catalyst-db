import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save, FileCheck, Target, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api';
import TemplateSelectorCard, { Template } from '@/components/consultoria/TemplateSelectorCard';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
  client_name: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  client_contact: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  project_type: z.enum(['diagnosis', 'optimization', 'new_plant', 'audit', 'feasibility']).optional(),
  industry_sector: z.enum(['Alimentario', 'Bebidas', 'Textil', 'Químico', 'Farmacéutico', 'Papelero', 'Metalúrgico', 'Automotriz', 'Otro']).optional(),
  plant_name: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  plant_location: z.string().trim().max(300, 'Máximo 300 caracteres').optional(),
  plant_capacity_m3_day: z.coerce.number().min(0, 'Debe ser un número positivo').optional().or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const projectTypeLabels: Record<string, string> = {
  diagnosis: 'Diagnóstico',
  optimization: 'Optimización',
  new_plant: 'Nueva Planta',
  audit: 'Auditoría',
  feasibility: 'Estudio de Viabilidad',
};

const industrySectors = [
  'Alimentario',
  'Bebidas',
  'Textil',
  'Químico',
  'Farmacéutico',
  'Papelero',
  'Metalúrgico',
  'Automotriz',
  'Otro',
];

interface CreateProjectResponse {
  success: boolean;
  project: { id: string; [key: string]: unknown };
  message: string;
}

export default function ConsultoriaNuevo() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // Template details state
  interface RecommendedDoc {
    name: string;
    description?: string;
  }
  const [recommendedDocs, setRecommendedDocs] = useState<RecommendedDoc[]>([]);
  const [keyKpis, setKeyKpis] = useState<string[]>([]);
  const [loadingTemplateDetails, setLoadingTemplateDetails] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects/templates`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  // Fetch template details when selected
  useEffect(() => {
    if (!selectedTemplate) {
      setRecommendedDocs([]);
      setKeyKpis([]);
      return;
    }
    
    const fetchTemplateDetails = async () => {
      setLoadingTemplateDetails(true);
      try {
        const response = await fetch(`${API_URL}/api/projects/templates/${selectedTemplate}`);
        if (response.ok) {
          const data = await response.json();
          setRecommendedDocs(data.recommended_documents || []);
          setKeyKpis(data.key_kpis || []);
        }
      } catch (error) {
        console.error('Error fetching template details:', error);
      } finally {
        setLoadingTemplateDetails(false);
      }
    };
    fetchTemplateDetails();
  }, [selectedTemplate]);

  // Get selected template data
  const selectedTemplateData = templates.find(t => t.sector_id === selectedTemplate);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      client_name: '',
      client_contact: '',
      project_type: undefined,
      industry_sector: undefined,
      plant_name: '',
      plant_location: '',
      plant_capacity_m3_day: '',
    },
  });

  // Update industry_sector when template is selected
  useEffect(() => {
    if (selectedTemplateData) {
      const sectorMap: Record<string, string> = {
        food: 'Alimentario',
        alimentario: 'Alimentario',
        beverage: 'Bebidas',
        bebidas: 'Bebidas',
        textile: 'Textil',
        textil: 'Textil',
        chemical: 'Químico',
        quimico: 'Químico',
        pharmaceutical: 'Farmacéutico',
        farmaceutico: 'Farmacéutico',
        paper: 'Papelero',
        papelero: 'Papelero',
        metalurgico: 'Metalúrgico',
        automotive: 'Automotriz',
        automotriz: 'Automotriz',
      };
      const normalizedId = selectedTemplateData.sector_id.toLowerCase();
      const matchedSector = Object.entries(sectorMap).find(([key]) => 
        normalizedId.includes(key)
      );
      if (matchedSector) {
        form.setValue('industry_sector', matchedSector[1] as any);
      }
    }
  }, [selectedTemplateData, form]);

  const createProject = async (data: ProjectFormData): Promise<CreateProjectResponse> => {
    // Build payload matching the Railway API contract
    const payload = {
      name: data.name,
      description: data.description || undefined,
      client_name: data.client_name || undefined,
      client_contact: data.client_contact || undefined,
      industry_sector: data.industry_sector || undefined,
      plant_name: data.plant_name || undefined,
      plant_location: data.plant_location || undefined,
      plant_capacity_m3_day: data.plant_capacity_m3_day === '' ? undefined : data.plant_capacity_m3_day,
    };

    // Always POST to Railway external API
    const response = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle FastAPI validation errors with field location
      if (errorData.detail && Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((e: any) => {
          const field = e.loc?.slice(-1)[0] || 'campo';
          return `${field}: ${e.msg || 'Error de validación'}`;
        }).join(', ');
        throw new Error(messages);
      }
      throw new Error(errorData.message || errorData.detail || 'Error al crear el proyecto');
    }

    return response.json();
  };

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      toast({
        title: 'Proyecto creado',
        description: data.message || 'El proyecto se ha creado correctamente',
      });
      // Navigate to the project detail page using the ID from response
      navigate(`/consultoria/projects/${data.project.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/consultoria')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Proyecto</h1>
          <p className="text-muted-foreground">Crea un nuevo proyecto de consultoría industrial</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecciona el Sector Industrial</CardTitle>
              <CardDescription>
                Elige una plantilla para preconfigurar el proyecto con documentos recomendados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <TemplateSelectorCard
                      key={template.sector_id}
                      template={template}
                      selected={selectedTemplate === template.sector_id}
                      onSelect={() => setSelectedTemplate(
                        selectedTemplate === template.sector_id ? null : template.sector_id
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No hay plantillas disponibles. Puedes continuar sin seleccionar una.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Template Details: Documents and KPIs */}
          {selectedTemplate && (
            <>
              {loadingTemplateDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Recommended Documents */}
                  {recommendedDocs.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                        <FileCheck className="inline mr-2 h-4 w-4" />
                        Documentos recomendados para este sector:
                      </h4>
                      <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                        {recommendedDocs.map((doc, i) => (
                          <li key={i} className="flex items-center">
                            <Circle className="h-2 w-2 mr-2 fill-current flex-shrink-0" />
                            {typeof doc === 'string' ? doc : doc.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key KPIs */}
                  {keyKpis.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
                        <Target className="inline mr-2 h-4 w-4" />
                        KPIs a monitorear:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {keyKpis.map((kpi, i) => (
                          <Badge key={i} variant="secondary" className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                            {kpi}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
              <CardDescription>Datos básicos del proyecto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Proyecto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Optimización EDAR Planta Norte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe brevemente el alcance y objetivos del proyecto..."
                        className="min-h-24 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="project_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Proyecto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(projectTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry_sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector Industrial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona sector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industrySectors.map((sector) => (
                            <SelectItem key={sector} value={sector}>
                              {sector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cliente</CardTitle>
              <CardDescription>Información del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="client_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa o persona" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Email o teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Planta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planta / Instalación</CardTitle>
              <CardDescription>Datos de la planta industrial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plant_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Planta</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: EDAR Norte" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plant_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input placeholder="Ciudad, País" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="plant_capacity_m3_day"
                render={({ field }) => (
                  <FormItem className="sm:max-w-xs">
                    <FormLabel>Capacidad (m³/día)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Ej: 5000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/consultoria')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {selectedTemplate ? 'Crear con Plantilla' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
