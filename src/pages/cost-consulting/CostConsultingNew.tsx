import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const CostConsultingNew = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cost-consulting">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nuevo Análisis de Costes</h1>
          <p className="text-muted-foreground mt-1">
            Configura los parámetros del análisis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>Datos básicos del análisis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Análisis</Label>
              <Input id="name" placeholder="Ej: Análisis Q1 2024 - Cliente X" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Input id="client" placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                placeholder="Describe el alcance y objetivos del análisis..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alcance del Análisis</CardTitle>
            <CardDescription>Define qué áreas incluir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período a Analizar</Label>
              <Input id="period" placeholder="Ej: Enero 2023 - Diciembre 2023" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categories">Categorías de Gasto</Label>
              <Textarea 
                id="categories" 
                placeholder="Lista las categorías principales de gasto a analizar..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link to="/cost-consulting">Cancelar</Link>
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Crear Análisis
        </Button>
      </div>
    </div>
  );
};

export default CostConsultingNew;
