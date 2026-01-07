import { useState, useRef } from 'react';
import { useStudyResearch, useAddResearch, useDeleteResearch, ScoutingStudy, StudyResearch } from '@/hooks/useScoutingStudies';
import { useAIStudySession } from '@/hooks/useAIStudySession';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ExternalLink,
  FileText,
  BookOpen,
  Globe,
  Newspaper,
  ScrollText,
  Star,
  Loader2,
  Sparkles,
  Upload,
  Link,
  File,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import AISessionPanel from './AISessionPanel';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

const SOURCE_TYPES = [
  { value: 'paper', label: 'Paper Científico', icon: BookOpen },
  { value: 'report', label: 'Informe Técnico', icon: FileText },
  { value: 'article', label: 'Artículo', icon: Newspaper },
  { value: 'patent', label: 'Patente', icon: ScrollText },
  { value: 'website', label: 'Sitio Web', icon: Globe },
  { value: 'other', label: 'Otro', icon: FileText },
];

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.rtf';
const MAX_FILE_SIZE_MB = 50;

export default function StudyPhase1Research({ studyId, study }: Props) {
  const { data: research, isLoading } = useStudyResearch(studyId);
  const addResearch = useAddResearch();
  const deleteResearch = useDeleteResearch();
  const aiSession = useAIStudySession(studyId);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [newResearch, setNewResearch] = useState({
    title: '',
    source_type: 'paper' as StudyResearch['source_type'],
    source_url: '',
    authors: '',
    summary: '',
    key_findings: [''],
    relevance_score: 3,
  });

  const handleStartAIResearch = () => {
    aiSession.startSession('research', {
      problem_statement: study.problem_statement,
      objectives: study.objectives,
      context: study.context,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > MAX_FILE_SIZE_MB) {
        toast({
          title: 'Archivo demasiado grande',
          description: `El archivo no puede superar ${MAX_FILE_SIZE_MB}MB. Tu archivo tiene ${sizeMB.toFixed(1)}MB.`,
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!newResearch.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setNewResearch(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleAddResearch = async () => {
    if (!newResearch.title.trim()) return;
    
    try {
      setIsUploading(true);
      let knowledgeDocId: string | null = null;
      let sourceUrl = newResearch.source_url;

      // If file mode and file selected, upload it
      if (sourceMode === 'file' && selectedFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        // Generate unique file path
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${studyId}/${Date.now()}-${selectedFile.name}`;
        
        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('knowledge-documents')
          .upload(fileName, selectedFile);
        
        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('knowledge-documents')
          .getPublicUrl(fileName);

        // Create knowledge document entry
        const { data: docData, error: docError } = await supabase
          .from('knowledge_documents')
          .insert({
            name: selectedFile.name,
            file_path: fileName,
            file_size: selectedFile.size,
            mime_type: selectedFile.type,
            status: 'pending',
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (docError) throw docError;
        knowledgeDocId = docData.id;
        sourceUrl = urlData.publicUrl;

        // Trigger processing
        supabase.functions.invoke('process-knowledge-document', {
          body: { documentId: docData.id },
        }).catch(console.error); // Fire and forget
      }

      await addResearch.mutateAsync({
        study_id: studyId,
        ...newResearch,
        source_url: sourceUrl,
        knowledge_doc_id: knowledgeDocId,
        key_findings: newResearch.key_findings.filter(f => f.trim()),
      });

      setIsAddOpen(false);
      resetForm();
      toast({ 
        title: 'Fuente añadida', 
        description: selectedFile ? 'El documento se está procesando en segundo plano' : undefined 
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNewResearch({
      title: '',
      source_type: 'paper',
      source_url: '',
      authors: '',
      summary: '',
      key_findings: [''],
      relevance_score: 3,
    });
    setSelectedFile(null);
    setSourceMode('url');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSourceIcon = (type: string | null) => {
    const source = SOURCE_TYPES.find(s => s.value === type);
    return source?.icon ?? FileText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Session Panel */}
      <AISessionPanel
        state={{
          isActive: aiSession.isActive,
          isStarting: aiSession.isStarting,
          currentPhase: aiSession.currentPhase,
          progress: aiSession.progress,
          status: aiSession.status,
          error: aiSession.error,
          logs: aiSession.logs,
        }}
        onStart={handleStartAIResearch}
        onCancel={aiSession.cancelSession}
        isStarting={aiSession.isStarting}
        title="Investigación Automática"
        description="Busca papers, artículos e informes relevantes para el problema"
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 1: Investigación Bibliográfica</h2>
          <p className="text-sm text-muted-foreground">
            Recopila información para caracterizar el problema y el estado del arte
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Fuente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Añadir Fuente de Investigación</DialogTitle>
                <DialogDescription>
                  Documenta una fuente bibliográfica relevante para el estudio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={newResearch.title}
                    onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })}
                    placeholder="Título del documento o artículo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Fuente</Label>
                    <Select
                      value={newResearch.source_type ?? 'paper'}
                      onValueChange={(value) => setNewResearch({ ...newResearch, source_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Relevancia (1-5)</Label>
                    <Select
                      value={String(newResearch.relevance_score)}
                      onValueChange={(value) => setNewResearch({ ...newResearch, relevance_score: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} - {n === 1 ? 'Baja' : n === 3 ? 'Media' : n === 5 ? 'Alta' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Source input - URL or File */}
                <div className="space-y-2">
                  <Label>Fuente</Label>
                  <Tabs value={sourceMode} onValueChange={(v) => setSourceMode(v as 'url' | 'file')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url" className="flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        URL
                      </TabsTrigger>
                      <TabsTrigger value="file" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Archivo
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="mt-2">
                      <Input
                        value={newResearch.source_url}
                        onChange={(e) => setNewResearch({ ...newResearch, source_url: e.target.value })}
                        placeholder="https://..."
                        type="url"
                      />
                    </TabsContent>
                    <TabsContent value="file" className="mt-2">
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPTED_FILE_TYPES}
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          {selectedFile ? (
                            <>
                              <File className="w-5 h-5 text-primary" />
                              <span className="text-sm font-medium">{selectedFile.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                PDF, Word, TXT (máx. {MAX_FILE_SIZE_MB}MB)
                              </span>
                            </>
                          )}
                        </label>
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            Quitar archivo
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <Label>Autores</Label>
                  <Input
                    value={newResearch.authors}
                    onChange={(e) => setNewResearch({ ...newResearch, authors: e.target.value })}
                    placeholder="Nombres de los autores"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumen</Label>
                  <Textarea
                    value={newResearch.summary}
                    onChange={(e) => setNewResearch({ ...newResearch, summary: e.target.value })}
                    placeholder="Resumen del contenido relevante"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hallazgos Clave</Label>
                  {newResearch.key_findings.map((finding, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={finding}
                        onChange={(e) => {
                          const updated = [...newResearch.key_findings];
                          updated[idx] = e.target.value;
                          setNewResearch({ ...newResearch, key_findings: updated });
                        }}
                        placeholder={`Hallazgo ${idx + 1}`}
                      />
                      {idx === newResearch.key_findings.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setNewResearch({
                            ...newResearch,
                            key_findings: [...newResearch.key_findings, ''],
                          })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddResearch}
                  disabled={
                    !newResearch.title.trim() || 
                    addResearch.isPending || 
                    isUploading ||
                    (sourceMode === 'file' && !selectedFile && !newResearch.source_url)
                  }
                >
                  {(addResearch.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? 'Subiendo...' : 'Añadir'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {research?.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin fuentes de investigación</h3>
          <p className="text-muted-foreground mb-4">
            Añade artículos, papers, informes y otras fuentes para caracterizar el problema
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Primera Fuente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {research?.map((item) => {
            const SourceIcon = getSourceIcon(item.source_type);
            
            const handleViewSource = async (e: React.MouseEvent) => {
              // For storage URLs on non-public buckets, generate a signed URL
              // The knowledge-documents bucket is public, so we just open directly
              // Only intercept if there's a specific issue with the URL
              if (item.knowledge_doc_id && item.source_url?.includes('/object/public/')) {
                // It's already a public URL, let it open directly
                return;
              }
              
              // For private bucket URLs, generate a signed URL
              if (item.knowledge_doc_id && item.source_url?.includes('supabase.co/storage')) {
                e.preventDefault();
                try {
                  // Extract file path from the URL
                  const urlParts = item.source_url.split('/knowledge-documents/');
                  if (urlParts.length > 1) {
                    const filePath = decodeURIComponent(urlParts[1]);
                    const { data, error } = await supabase.storage
                      .from('knowledge-documents')
                      .createSignedUrl(filePath, 3600); // 1 hour expiry
                    
                    if (data?.signedUrl) {
                      window.open(data.signedUrl, '_blank');
                    } else {
                      console.error('Error getting signed URL:', error);
                      toast({
                        title: 'Error',
                        description: 'No se pudo abrir el documento',
                        variant: 'destructive',
                      });
                    }
                  }
                } catch (err) {
                  console.error('Error opening document:', err);
                }
              }
            };

            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <SourceIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        {item.authors && (
                          <CardDescription>{item.authors}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.ai_extracted && (
                        <Badge variant="secondary">
                          <Sparkles className="w-3 h-3 mr-1" />
                          IA
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (item.relevance_score ?? 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                  )}
                  {item.key_findings && item.key_findings.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Hallazgos Clave
                      </h4>
                      <ul className="space-y-1">
                        {item.key_findings.map((finding, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Añadido {format(new Date(item.created_at), "d MMM yyyy", { locale: es })}
                    </span>
                    <div className="flex items-center gap-3">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleViewSource}
                          className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                        >
                          Ver fuente <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="flex items-center gap-1 text-destructive hover:underline cursor-pointer">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar fuente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará "{item.title}" y su documento asociado. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                // Extract file path from source_url if it's a storage URL
                                let filePath: string | null = null;
                                if (item.source_url?.includes('supabase.co/storage')) {
                                  const urlParts = item.source_url.split('/knowledge-documents/');
                                  if (urlParts.length > 1) {
                                    filePath = decodeURIComponent(urlParts[1]);
                                  }
                                }
                                deleteResearch.mutate({
                                  researchId: item.id,
                                  studyId,
                                  knowledgeDocId: item.knowledge_doc_id,
                                  filePath,
                                });
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
