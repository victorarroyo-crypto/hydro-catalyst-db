import { useState } from 'react';
import { Plus, Search, Filter, Radar, Globe, Building2, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Scouting = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Radar className="w-8 h-8 text-primary" />
            Scouting Tecnológico
          </h1>
          <p className="text-muted-foreground mt-1">
            Descubre y rastrea nuevas tecnologías emergentes en el sector del agua
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Búsqueda
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tecnologías, empresas, tendencias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sectores</SelectItem>
                <SelectItem value="tratamiento">Tratamiento</SelectItem>
                <SelectItem value="distribucion">Distribución</SelectItem>
                <SelectItem value="monitorizacion">Monitorización</SelectItem>
                <SelectItem value="eficiencia">Eficiencia</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las regiones</SelectItem>
                <SelectItem value="europa">Europa</SelectItem>
                <SelectItem value="america">América</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Más filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tecnologías Rastreadas</CardDescription>
            <CardTitle className="text-2xl">247</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nuevas este mes</CardDescription>
            <CardTitle className="text-2xl text-primary">+18</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Empresas Monitoreadas</CardDescription>
            <CardTitle className="text-2xl">89</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas Activas</CardDescription>
            <CardTitle className="text-2xl text-amber-500">12</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Discoveries */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Descubrimientos Recientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'HydroSense AI',
              company: 'WaterTech Solutions',
              country: 'Alemania',
              sector: 'Monitorización',
              date: '2024-01-03',
              description: 'Sistema de detección de fugas basado en IA con sensores acústicos avanzados.',
            },
            {
              name: 'BioMembrane Pro',
              company: 'CleanWater Inc.',
              country: 'Estados Unidos',
              sector: 'Tratamiento',
              date: '2024-01-02',
              description: 'Membranas biológicas de nueva generación para filtración de microplásticos.',
            },
            {
              name: 'AquaGrid Smart',
              company: 'Nordic Water Systems',
              country: 'Suecia',
              sector: 'Distribución',
              date: '2024-01-01',
              description: 'Red inteligente de distribución con optimización en tiempo real.',
            },
          ].map((tech, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{tech.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" />
                      {tech.company}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{tech.sector}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{tech.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {tech.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {tech.date}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State Message */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Configura tus fuentes de scouting</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Conecta bases de datos de patentes, publicaciones científicas y feeds de noticias 
            para automatizar el descubrimiento de nuevas tecnologías.
          </p>
          <Button variant="outline">Configurar Fuentes</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Scouting;
