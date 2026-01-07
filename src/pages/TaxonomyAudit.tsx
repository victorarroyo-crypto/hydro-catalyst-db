import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, AlertTriangle, CheckCircle2, Filter, Zap, FileText } from 'lucide-react';
import { useTaxonomyAudit, UnclassifiedTechnology } from '@/hooks/useTaxonomyAudit';
import { toast } from 'sonner';
import { generateTaxonomyDocumentation } from '@/lib/generateTaxonomyDocumentation';

const TaxonomyAudit: React.FC = () => {
  const {
    tipos,
    subcategorias,
    sectores,
    unclassified,
    frequentUnmapped,
    stats,
    isLoading,
    assignTaxonomy,
    bulkAssignSubcategoria,
  } = useTaxonomyAudit();

  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState<'all' | 'tipo' | 'subcategoria' | 'sector'>('all');
  const [selectedTech, setSelectedTech] = useState<UnclassifiedTechnology | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState(false);

  // Filtered unclassified list
  const filteredUnclassified = useMemo(() => {
    return unclassified.filter(tech => {
      const matchesSearch = search === '' || 
        tech.nombre.toLowerCase().includes(search.toLowerCase()) ||
        tech.subcategoria_texto?.toLowerCase().includes(search.toLowerCase());
      
      const matchesMissing = filterMissing === 'all' || tech.missing.includes(filterMissing);
      
      return matchesSearch && matchesMissing;
    });
  }, [unclassified, search, filterMissing]);

  // Get subcategorias for a given tipo
  const getSubcategoriasForTipo = (tipoId: number | null) => {
    if (!tipoId) return subcategorias;
    return subcategorias.filter(s => s.tipo_id === tipoId);
  };

  // Suggest subcategoria based on text
  const suggestSubcategoria = (tech: UnclassifiedTechnology) => {
    if (!tech.subcategoria_texto) return null;
    const text = tech.subcategoria_texto.toLowerCase();
    
    // Find matching subcategoria
    const match = subcategorias.find(s => 
      s.nombre.toLowerCase().includes(text) ||
      text.includes(s.nombre.toLowerCase()) ||
      s.codigo.toLowerCase() === text
    );
    
    return match;
  };

  // Handle individual assignment
  const handleAssign = async (
    techId: string,
    field: 'tipo_id' | 'subcategoria_id' | 'sector_id',
    value: string
  ) => {
    setAssigningId(techId);
    try {
      const updates: any = {};
      if (field === 'tipo_id') {
        updates.tipo_id = parseInt(value);
      } else if (field === 'subcategoria_id') {
        updates.subcategoria_id = parseInt(value);
      } else {
        updates.sector_id = value;
      }
      
      await assignTaxonomy(techId, updates);
      toast.success('Taxonomía asignada correctamente');
    } catch (error) {
      toast.error('Error al asignar taxonomía');
    } finally {
      setAssigningId(null);
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async (textMatch: string, subcategoriaId: number) => {
    try {
      await bulkAssignSubcategoria(textMatch, subcategoriaId);
      toast.success(`Subcategoría asignada a todas las tecnologías con "${textMatch}"`);
    } catch (error) {
      toast.error('Error en asignación masiva');
    }
  };

  // Generate documentation
  const handleGenerateDoc = async () => {
    setGeneratingDoc(true);
    try {
      await generateTaxonomyDocumentation();
      toast.success('Documento de taxonomía generado');
    } catch (error) {
      toast.error('Error al generar documento');
    } finally {
      setGeneratingDoc(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completionPercent = stats ? Math.round((stats.fullyClassified / stats.total) * 100) : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoría de Taxonomía</h1>
          <p className="text-muted-foreground">
            Revisa y corrige la clasificación de tecnologías
          </p>
        </div>
        <Button onClick={handleGenerateDoc} disabled={generatingDoc}>
          {generatingDoc ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Generar Documento
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clasificación Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{completionPercent}%</span>
              <Progress value={completionPercent} className="flex-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.fullyClassified} de {stats?.total} tecnologías
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Sin Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-yellow-600">{stats?.missingTipo}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Sin Subcategoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-orange-600">{stats?.missingSubcategoria}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Sin Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-600">{stats?.missingSector}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unclassified" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unclassified">
            Tecnologías Sin Clasificar ({unclassified.length})
          </TabsTrigger>
          <TabsTrigger value="frequent">
            Subcategorías Frecuentes ({frequentUnmapped.length})
          </TabsTrigger>
          <TabsTrigger value="catalog">
            Catálogo de Taxonomía
          </TabsTrigger>
        </TabsList>

        {/* Unclassified Technologies Tab */}
        <TabsContent value="unclassified" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tecnología..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterMissing} onValueChange={(v: any) => setFilterMissing(v)}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los campos</SelectItem>
                    <SelectItem value="tipo">Sin Tipo</SelectItem>
                    <SelectItem value="subcategoria">Sin Subcategoría</SelectItem>
                    <SelectItem value="sector">Sin Sector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Tecnología</TableHead>
                      <TableHead>Tipo (texto)</TableHead>
                      <TableHead>Subcategoría (texto)</TableHead>
                      <TableHead>Falta</TableHead>
                      <TableHead>Asignar Tipo</TableHead>
                      <TableHead>Asignar Subcategoría</TableHead>
                      <TableHead>Asignar Sector</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnclassified.slice(0, 100).map(tech => {
                      const suggestion = suggestSubcategoria(tech);
                      const availableSubcats = getSubcategoriasForTipo(tech.tipo_id);
                      
                      return (
                        <TableRow key={tech.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {tech.nombre}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {tech.tipo_texto}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {tech.subcategoria_texto || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {tech.missing.map(m => (
                                <Badge key={m} variant="outline" className="text-xs">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tech.missing.includes('tipo') ? (
                              <Select
                                onValueChange={v => handleAssign(tech.id, 'tipo_id', v)}
                                disabled={assigningId === tech.id}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue placeholder="Tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {tipos.map(t => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                      {t.codigo} - {t.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {tech.missing.includes('subcategoria') ? (
                              <div className="flex items-center gap-1">
                                <Select
                                  onValueChange={v => handleAssign(tech.id, 'subcategoria_id', v)}
                                  disabled={assigningId === tech.id}
                                >
                                  <SelectTrigger className="w-40 h-8 text-xs">
                                    <SelectValue placeholder="Subcategoría..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableSubcats.map(s => (
                                      <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.codigo} - {s.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {suggestion && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2"
                                    onClick={() => handleAssign(tech.id, 'subcategoria_id', suggestion.id.toString())}
                                    title={`Sugerencia: ${suggestion.nombre}`}
                                  >
                                    <Zap className="h-3 w-3 text-yellow-500" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {tech.missing.includes('sector') ? (
                              <Select
                                onValueChange={v => handleAssign(tech.id, 'sector_id', v)}
                                disabled={assigningId === tech.id}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue placeholder="Sector..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {sectores.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredUnclassified.length > 100 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Mostrando 100 de {filteredUnclassified.length} tecnologías. Usa el buscador para filtrar.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frequent Unmapped Tab */}
        <TabsContent value="frequent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subcategorías de Texto Libre Más Frecuentes</CardTitle>
              <CardDescription>
                Estas subcategorías aparecen frecuentemente pero no están mapeadas al catálogo oficial.
                Puedes asignarlas en lote.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcategoría (texto)</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Mapear a...</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {frequentUnmapped.map((item, idx) => (
                      <FrequentRow
                        key={idx}
                        item={item}
                        subcategorias={subcategorias}
                        onBulkAssign={handleBulkAssign}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tipos.map(tipo => {
              const tipoSubcats = subcategorias.filter(s => s.tipo_id === tipo.id);
              return (
                <Card key={tipo.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Badge>{tipo.codigo}</Badge>
                      {tipo.nombre}
                    </CardTitle>
                    <CardDescription>{tipo.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {tipoSubcats.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Sin subcategorías definidas
                        </p>
                      ) : (
                        tipoSubcats.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs font-mono">
                              {sub.codigo}
                            </Badge>
                            <span>{sub.nombre}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for frequent row to manage local state
const FrequentRow: React.FC<{
  item: { value: string; count: number };
  subcategorias: { id: number; codigo: string; nombre: string }[];
  onBulkAssign: (text: string, subcatId: number) => Promise<void>;
}> = ({ item, subcategorias, onBulkAssign }) => {
  const [selectedSubcat, setSelectedSubcat] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedSubcat) return;
    setAssigning(true);
    try {
      await onBulkAssign(item.value, parseInt(selectedSubcat));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{item.value}</TableCell>
      <TableCell>
        <Badge variant="secondary">{item.count}</Badge>
      </TableCell>
      <TableCell>
        <Select value={selectedSubcat} onValueChange={setSelectedSubcat}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Seleccionar subcategoría..." />
          </SelectTrigger>
          <SelectContent>
            {subcategorias.map(s => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.codigo} - {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          disabled={!selectedSubcat || assigning}
          onClick={handleAssign}
        >
          {assigning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Asignar a Todas'
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default TaxonomyAudit;
