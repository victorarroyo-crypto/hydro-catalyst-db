import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useStudyLonglist,
  useAddToLonglist,
  useRemoveFromLonglist,
  useStudySolutions,
  ScoutingStudy,
} from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  List,
  Database,
  PenLine,
  Trash2,
  Search,
  Loader2,
  MapPin,
  Building2,
} from 'lucide-react';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

export default function StudyPhase3Longlist({ studyId, study }: Props) {
  const { data: longlist, isLoading } = useStudyLonglist(studyId);
  const { data: solutions } = useStudySolutions(studyId);
  const addToLonglist = useAddToLonglist();
  const removeFromLonglist = useRemoveFromLonglist();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'database' | 'manual'>('database');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  
  const [manualEntry, setManualEntry] = useState({
    technology_name: '',
    provider: '',
    country: '',
    trl: null as number | null,
    brief_description: '',
    inclusion_reason: '',
    solution_id: null as string | null,
  });

  // Search technologies from database
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['tech-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from('technologies')
        .select('id, "Nombre de la tecnología", "Proveedor / Empresa", "País de origen", "Grado de madurez (TRL)", "Descripción técnica breve"')
        .or(`"Nombre de la tecnología".ilike.%${searchTerm}%,"Proveedor / Empresa".ilike.%${searchTerm}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  const handleAddFromDatabase = async (tech: any) => {
    // Check if already in longlist
    if (longlist?.some(item => item.technology_id === tech.id)) {
      return;
    }
    
    await addToLonglist.mutateAsync({
      study_id: studyId,
      technology_id: tech.id,
      technology_name: tech['Nombre de la tecnología'],
      provider: tech['Proveedor / Empresa'],
      country: tech['País de origen'],
      trl: tech['Grado de madurez (TRL)'],
      brief_description: tech['Descripción técnica breve'],
      source: 'database',
    });
    setSelectedTech(null);
    setSearchTerm('');
  };

  const handleAddManual = async () => {
    if (!manualEntry.technology_name.trim()) return;
    await addToLonglist.mutateAsync({
      study_id: studyId,
      ...manualEntry,
      source: 'manual',
    });
    setIsAddOpen(false);
    setManualEntry({
      technology_name: '',
      provider: '',
      country: '',
      trl: null,
      brief_description: '',
      inclusion_reason: '',
      solution_id: null,
    });
  };

  const handleRemove = async (id: string) => {
    await removeFromLonglist.mutateAsync({ id, studyId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const alreadyAddedIds = new Set(longlist?.map(item => item.technology_id).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 3: Lista Larga</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona tecnologías candidatas de la base de datos o añádelas manualmente
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Añadir Tecnología
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Añadir Tecnología a Lista Larga</DialogTitle>
              <DialogDescription>
                Busca en la base de datos o añade manualmente
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'database' | 'manual')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="database" className="gap-2">
                  <Database className="w-4 h-4" />
                  Desde Base de Datos
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <PenLine className="w-4 h-4" />
                  Entrada Manual
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="database" className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o proveedor..."
                    className="pl-10"
                  />
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {searching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {searchResults?.map((tech) => {
                    const isAdded = alreadyAddedIds.has(tech.id);
                    return (
                      <Card 
                        key={tech.id} 
                        className={`cursor-pointer transition-colors ${
                          isAdded ? 'opacity-50' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => !isAdded && handleAddFromDatabase(tech)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{tech['Nombre de la tecnología']}</p>
                              <p className="text-sm text-muted-foreground">
                                {tech['Proveedor / Empresa']}
                              </p>
                              {tech['País de origen'] && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {tech['País de origen']}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {tech['Grado de madurez (TRL)'] && (
                                <Badge variant="outline">TRL {tech['Grado de madurez (TRL)']}</Badge>
                              )}
                              {isAdded && (
                                <Badge variant="secondary">Ya añadida</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {searchTerm.length >= 2 && !searching && searchResults?.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No se encontraron tecnologías
                    </p>
                  )}
                  {searchTerm.length < 2 && (
                    <p className="text-center text-muted-foreground py-4">
                      Escribe al menos 2 caracteres para buscar
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Tecnología *</Label>
                    <Input
                      value={manualEntry.technology_name}
                      onChange={(e) => setManualEntry({ ...manualEntry, technology_name: e.target.value })}
                      placeholder="Nombre de la tecnología"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proveedor / Empresa</Label>
                    <Input
                      value={manualEntry.provider}
                      onChange={(e) => setManualEntry({ ...manualEntry, provider: e.target.value })}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>País de Origen</Label>
                    <Input
                      value={manualEntry.country}
                      onChange={(e) => setManualEntry({ ...manualEntry, country: e.target.value })}
                      placeholder="País"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TRL</Label>
                    <Select
                      value={manualEntry.trl?.toString() ?? ''}
                      onValueChange={(v) => setManualEntry({ ...manualEntry, trl: v ? Number(v) : null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar TRL" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <SelectItem key={n} value={String(n)}>TRL {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {solutions && solutions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vinculada a Solución</Label>
                    <Select
                      value={manualEntry.solution_id ?? ''}
                      onValueChange={(v) => setManualEntry({ ...manualEntry, solution_id: v || null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar solución (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {solutions.map(sol => (
                          <SelectItem key={sol.id} value={sol.id}>
                            {sol.category}: {sol.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Descripción Breve</Label>
                  <Textarea
                    value={manualEntry.brief_description}
                    onChange={(e) => setManualEntry({ ...manualEntry, brief_description: e.target.value })}
                    placeholder="Descripción de la tecnología"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razón de Inclusión</Label>
                  <Textarea
                    value={manualEntry.inclusion_reason}
                    onChange={(e) => setManualEntry({ ...manualEntry, inclusion_reason: e.target.value })}
                    placeholder="Por qué se incluye esta tecnología en el estudio"
                    rows={2}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            {addMode === 'manual' && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddManual}
                  disabled={!manualEntry.technology_name.trim() || addToLonglist.isPending}
                >
                  {addToLonglist.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Añadir
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {longlist?.length === 0 ? (
        <Card className="p-8 text-center">
          <List className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Lista larga vacía</h3>
          <p className="text-muted-foreground mb-4">
            Añade tecnologías candidatas desde la base de datos o manualmente
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Primera Tecnología
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {longlist?.map((item, idx) => (
            <Card key={item.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.technology_name}</h4>
                      {item.provider && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {item.provider}
                        </div>
                      )}
                      {item.brief_description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.brief_description}
                        </p>
                      )}
                      {item.inclusion_reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{item.inclusion_reason}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.country && (
                      <Badge variant="outline">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.country}
                      </Badge>
                    )}
                    {item.trl && (
                      <Badge variant="secondary">TRL {item.trl}</Badge>
                    )}
                    <Badge variant={item.source === 'database' ? 'default' : 'outline'}>
                      {item.source === 'database' ? 'BD' : 'Manual'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
