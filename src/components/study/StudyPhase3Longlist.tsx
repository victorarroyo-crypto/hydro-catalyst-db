import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { externalSupabase } from '@/integrations/supabase/externalClient';
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
  Eye,
  Sparkles,
  Globe,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { exportLonglistToExcel } from '@/lib/exportLonglistExcel';
import { LonglistTechDetailModal } from './LonglistTechDetailModal';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

import type { StudyLonglistItem } from '@/hooks/useScoutingStudies';

type LonglistItem = StudyLonglistItem;

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

type GenerationState = 'idle' | 'generating_db' | 'generating_web' | 'completed' | 'error';

export default function StudyPhase3Longlist({ studyId, study }: Props) {
  const queryClient = useQueryClient();
  const { data: longlist, isLoading } = useStudyLonglist(studyId);
  const { data: solutions } = useStudySolutions(studyId);
  const addToLonglist = useAddToLonglist();
  const removeFromLonglist = useRemoveFromLonglist();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'database' | 'manual'>('database');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<LonglistItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [webSearchSessionId, setWebSearchSessionId] = useState<string | null>(null);

  // Realtime subscription for longlist updates
  useEffect(() => {
    if (!studyId) return;

    const channel = externalSupabase
      .channel(`study_longlist_${studyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_longlist',
          filter: `study_id=eq.${studyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
        }
      )
      .subscribe();

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, [studyId, queryClient]);

  // Watch for web search session completion
  useEffect(() => {
    if (!webSearchSessionId || generationState !== 'generating_web') return;

    const channel = externalSupabase
      .channel(`session_${webSearchSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_sessions',
          filter: `id=eq.${webSearchSessionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'completed') {
            setGenerationState('completed');
            toast.success('Búsqueda web completada');
          } else if (newStatus === 'failed') {
            setGenerationState('completed'); // Still show DB results
            toast.error('La búsqueda web falló, pero las tecnologías de BD están disponibles');
          }
        }
      )
      .subscribe();

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      if (generationState === 'generating_web') {
        setGenerationState('completed');
        toast.info('Búsqueda web: tiempo de espera agotado. Tecnologías de BD disponibles.');
      }
    }, 5 * 60 * 1000);

    return () => {
      externalSupabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [webSearchSessionId, generationState]);

  const [manualEntry, setManualEntry] = useState({
    technology_name: '',
    provider: '',
    country: '',
    trl: null as number | null,
    brief_description: '',
    inclusion_reason: '',
    solution_id: null as string | null,
  });

  // Generate longlist mutation
  const generateLonglist = useMutation({
    mutationFn: async (triggerRailway: boolean) => {
      const { data: { session } } = await externalSupabase.auth.getSession();
      if (!session) throw new Error('No authenticated');

      const response = await externalSupabase.functions.invoke('generate-longlist', {
        body: {
          study_id: studyId,
          problem_statement: study.problem_statement,
          context: study.context,
          objectives: study.objectives,
          constraints: study.constraints,
          min_trl: 7,
          max_results: 50,
          trigger_railway: triggerRailway,
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-longlist', studyId] });
      
      if (data.railway?.triggered) {
        setWebSearchSessionId(data.railway.session_id);
        setGenerationState('generating_web');
        toast.success(`${data.database_results.inserted} tecnologías de BD añadidas. Buscando en web...`);
      } else {
        setGenerationState('completed');
        toast.success(`${data.database_results.inserted} tecnologías añadidas de la base de datos`);
      }
    },
    onError: (error) => {
      console.error('Generate longlist error:', error);
      setGenerationState('error');
      toast.error('Error al generar longlist');
    }
  });

  const handleGenerateLonglist = () => {
    if (!study.problem_statement) {
      toast.error('El estudio debe tener un problema definido');
      return;
    }
    setGenerationState('generating_db');
    generateLonglist.mutate(true); // Trigger both DB and Railway
  };

  const handleRetryWebSearch = () => {
    setGenerationState('generating_db');
    generateLonglist.mutate(true);
  };

  // Search technologies from database (manual add)
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['tech-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await externalSupabase
        .from('technologies')
        .select('id, nombre, proveedor, pais, trl, descripcion')
        .or(`nombre.ilike.%${searchTerm}%,proveedor.ilike.%${searchTerm}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  const handleAddFromDatabase = async (tech: any) => {
    if (longlist?.some(item => item.existing_technology_id === tech.id)) {
      return;
    }
    
    await addToLonglist.mutateAsync({
      study_id: studyId,
      existing_technology_id: tech.id,
      technology_name: tech.nombre,
      provider: tech.proveedor,
      country: tech.pais,
      trl: tech.trl,
      brief_description: tech.descripcion,
      source: 'database',
      already_in_db: true,
    });
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

  // Separate items by source
  const dbItems = longlist?.filter(item => item.source === 'database' || item.existing_technology_id) || [];
  const webItems = longlist?.filter(item => item.source === 'ai_session' || item.source === 'ai_extracted') || [];
  const manualItems = longlist?.filter(item => item.source === 'manual') || [];
  const alreadyAddedIds = new Set(longlist?.map(item => item.existing_technology_id).filter(Boolean));

  const hasGeneratedBefore = longlist && longlist.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 3: Lista Larga</h2>
          <p className="text-sm text-muted-foreground">
            Genera automáticamente una lista de tecnologías candidatas o añádelas manualmente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => longlist && exportLonglistToExcel(longlist as any, study.name)}
            disabled={!longlist || longlist.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button
            onClick={handleGenerateLonglist}
            disabled={generationState === 'generating_db' || generationState === 'generating_web' || !study.problem_statement}
            className="gap-2"
          >
            {(generationState === 'generating_db' || generationState === 'generating_web') ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {generationState === 'generating_db' ? 'Buscando en BD...' : 'Buscando en web...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {hasGeneratedBefore ? 'Regenerar Longlist' : 'Generar Longlist'}
              </>
            )}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Manual
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
                                <p className="font-medium">{tech.nombre}</p>
                                <p className="text-sm text-muted-foreground">
                                  {tech.proveedor}
                                </p>
                                {tech.pais && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {tech.pais}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {tech.trl && (
                                  <Badge variant="outline">TRL {tech.trl}</Badge>
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
      </div>

      {/* Status indicator during generation */}
      {generationState === 'generating_web' && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900">
                <Globe className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Buscando tecnologías adicionales en la web...
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Este proceso puede tardar 3-5 minutos. Las tecnologías se añadirán automáticamente.
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!longlist || longlist.length === 0) && generationState === 'idle' ? (
        <Card className="p-8 text-center">
          <List className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Lista larga vacía</h3>
          <p className="text-muted-foreground mb-4">
            Genera automáticamente una lista de tecnologías basada en el problema del estudio
          </p>
          <Button onClick={handleGenerateLonglist} disabled={!study.problem_statement}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generar Longlist
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section: BD Vandarum */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                BD Vandarum
              </h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {dbItems.length} tecnologías
              </Badge>
            </div>
            
            {dbItems.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground border-dashed">
                No hay tecnologías de la base de datos
              </Card>
            ) : (
              <div className="grid gap-2">
                {dbItems.map((item, idx) => (
                  <TechnologyCard
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    variant="database"
                    onView={() => {
                      setSelectedItem(item);
                      setIsDetailOpen(true);
                    }}
                    onRemove={() => handleRemove(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section: Web Scout */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Web Scout
              </h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {webItems.length} tecnologías
              </Badge>
              {generationState === 'generating_web' && (
                <Badge variant="outline" className="gap-1 border-green-300 text-green-700">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando...
                </Badge>
              )}
            </div>
            
            {webItems.length === 0 && generationState !== 'generating_web' ? (
              <Card className="p-4 border-dashed">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    No hay tecnologías de búsqueda web
                  </span>
                  {hasGeneratedBefore && (
                    <Button variant="ghost" size="sm" onClick={handleRetryWebSearch}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Buscar en web
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid gap-2">
                {webItems.map((item, idx) => (
                  <TechnologyCard
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    variant="web"
                    onView={() => {
                      setSelectedItem(item);
                      setIsDetailOpen(true);
                    }}
                    onRemove={() => handleRemove(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section: Manual entries */}
          {manualItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  Añadidas Manualmente
                </h3>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {manualItems.length} tecnologías
                </Badge>
              </div>
              
              <div className="grid gap-2">
                {manualItems.map((item, idx) => (
                  <TechnologyCard
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    variant="manual"
                    onView={() => {
                      setSelectedItem(item);
                      setIsDetailOpen(true);
                    }}
                    onRemove={() => handleRemove(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <LonglistTechDetailModal
        item={selectedItem as any}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        studyId={studyId}
        studyName={study.name}
      />
    </div>
  );
}

// Technology Card component with variant styles
interface TechnologyCardProps {
  item: LonglistItem;
  index: number;
  variant: 'database' | 'web' | 'manual';
  onView: () => void;
  onRemove: () => void;
}

function TechnologyCard({ item, index, variant, onView, onRemove }: TechnologyCardProps) {
  const variantStyles = {
    database: {
      border: 'border-l-4 border-l-blue-500',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: <Database className="w-3 h-3" />,
      label: 'BD',
    },
    web: {
      border: 'border-l-4 border-l-green-500',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: <Globe className="w-3 h-3" />,
      label: 'Web',
    },
    manual: {
      border: 'border-l-4 border-l-orange-500',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      icon: <PenLine className="w-3 h-3" />,
      label: 'Manual',
    },
  };

  const style = variantStyles[variant];

  return (
    <Card className={`group ${style.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium shrink-0">
              {index}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{item.technology_name}</h4>
                {item.existing_technology_id && (
                  <span title="Vinculada a BD">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  </span>
                )}
              </div>
              {item.provider && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.provider}</span>
                </div>
              )}
              {item.brief_description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.brief_description}
                </p>
              )}
              {variant === 'web' && item.web && (
                <a
                  href={item.web.startsWith('http') ? item.web : `https://${item.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  Visitar web del proveedor
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.country && (
              <Badge variant="outline" className="hidden sm:flex">
                <MapPin className="w-3 h-3 mr-1" />
                {item.country}
              </Badge>
            )}
            {item.trl && (
              <Badge variant="secondary">TRL {item.trl}</Badge>
            )}
            <Badge className={style.badge}>
              {style.icon}
              <span className="ml-1">{style.label}</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Ver</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
