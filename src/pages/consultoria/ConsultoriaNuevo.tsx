import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const projectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
  client_name: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  client_contact: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  project_type: z.enum(['diagnosis', 'optimization', 'new_plant', 'audit', 'feasibility']).optional(),
  industry_sector: z.enum(['Alimentario', 'Textil', 'Químico', 'Farmacéutico', 'Papelero', 'Metalúrgico', 'Otro']).optional(),
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
  'Textil',
  'Químico',
  'Farmacéutico',
  'Papelero',
  'Metalúrgico',
  'Otro',
];

const createProject = async (data: ProjectFormData): Promise<{ id: string }> => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_API_URL no está configurada');
  }

  const payload = {
    ...data,
    plant_capacity_m3_day: data.plant_capacity_m3_day === '' ? null : data.plant_capacity_m3_day,
  };

  const response = await fetch(`${apiUrl}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al crear el proyecto');
  }

  return response.json();
};

export default function ConsultoriaNuevo() {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      toast({
        title: 'Proyecto creado',
        description: 'El proyecto se ha creado correctamente',
      });
      navigate(`/consultoria/${data.id}`);
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
              Crear Proyecto
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
