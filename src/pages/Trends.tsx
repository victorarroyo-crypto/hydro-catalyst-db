import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Loader2, TrendingUp, Upload, FileText, Download, RefreshCw, 
  Trash2, Search, ChevronDown, ChevronRight, Sparkles, X,
  CheckCircle, Clock, AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
} from "@/components/ui/alert-dialog";
import { splitPdfIfNeeded } from "@/hooks/usePdfSplitter";

interface TrendDocument {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  chunk_count: number | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// Categories for trend documents
const TREND_CATEGORY_OPTIONS = [
  { value: 'report', label: 'Informe de Tendencias' },
  { value: 'market_analysis', label: 'Análisis de Mercado' },
  { value: 'technology_forecast', label: 'Pronóstico Tecnológico' },
  { value: 'industry_outlook', label: 'Perspectiva Industrial' },
  { value: 'research_paper', label: 'Artículo de Investigación' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'other', label: 'Otro' },
];

interface GroupedDocument {
  baseName: string;
  isMultiPart: boolean;
  totalParts: number;
  mainDoc: TrendDocument;
  parts: TrendDocument[];
  processedCount: number;
  totalChunks: number;
}

function groupDocumentParts(docs: TrendDocument[]): GroupedDocument[] {
  const partRegex = /^(.+)_parte(\d+)de(\d+)\.pdf$/i;
  const groups: Map<string, TrendDocument[]> = new Map();
  const standalonesDocs: TrendDocument[] = [];

  docs.forEach(doc => {
    const match = doc.name.match(partRegex);
    if (match) {
      const baseName = match[1];
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }
      groups.get(baseName)!.push(doc);
    } else {
      standalonesDocs.push(doc);
    }
  });

  const result: GroupedDocument[] = [];

  // Add standalone documents
  standalonesDocs.forEach(doc => {
    result.push({
      baseName: doc.name,
      isMultiPart: false,
      totalParts: 1,
      mainDoc: doc,
      parts: [doc],
      processedCount: doc.status === 'processed' ? 1 : 0,
      totalChunks: doc.chunk_count || 0,
    });
  });

  // Add grouped documents
  groups.forEach((parts, baseName) => {
    // Sort parts by part number
    parts.sort((a, b) => {
      const matchA = a.name.match(partRegex);
      const matchB = b.name.match(partRegex);
      return (parseInt(matchA?.[2] || '0') - parseInt(matchB?.[2] || '0'));
    });

    const processedCount = parts.filter(p => p.status === 'processed').length;
    const totalChunks = parts.reduce((sum, p) => sum + (p.chunk_count || 0), 0);
    const totalParts = parts.length;

    result.push({
      baseName: baseName + '.pdf',
      isMultiPart: true,
      totalParts,
      mainDoc: parts[0],
      parts,
      processedCount,
      totalChunks,
    });
  });

  // Sort by creation date of main doc
  result.sort((a, b) => new Date(b.mainDoc.created_at).getTime() - new Date(a.mainDoc.created_at).getTime());

  return result;
}

const Trends = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  const isInternalUser = profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role);

  // Fetch trend documents (sector = 'tendencias')
  const { data: documents, isLoading } = useQuery({
    queryKey: ['trend-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('sector', 'tendencias')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrendDocument[];
    },
    enabled: !!user,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description, category }: { file: File | Blob; description?: string; category?: string }) => {
      const fileName = file instanceof File ? file.name : `document_${Date.now()}.pdf`;
      const filePath = `trends/${Date.now()}_${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('knowledge_documents')
        .insert({
          name: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file instanceof File ? file.type : 'application/pdf',
          status: 'pending',
          sector: 'tendencias',
          category: category || null,
          description: description || null,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trend-documents'] });
      toast({
        title: 'Documento subido',
        description: 'El documento se está procesando',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al subir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: TrendDocument) => {
      // Delete from storage
      await supabase.storage
        .from('knowledge-base')
        .remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trend-documents'] });
      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al eliminar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ status: 'pending', chunk_count: null })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trend-documents'] });
      toast({
        title: 'Reprocesando',
        description: 'El documento se está reprocesando',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato no soportado',
        description: 'Solo se permiten archivos PDF',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo es 100MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setUploadDescription("");
    setUploadCategory("");
    setShowUploadModal(true);
    e.target.value = '';
  };

  const handleGenerateDescription = async () => {
    if (!selectedFile) return;
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-description', {
        body: {
          fileName: selectedFile.name,
          category: uploadCategory,
          sector: 'tendencias',
        },
      });

      if (error) throw error;
      if (data?.description) {
        setUploadDescription(data.description);
      }
    } catch (error) {
      toast({
        title: 'Error al generar descripción',
        description: 'No se pudo generar la descripción automáticamente',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    try {
      const splitResult = await splitPdfIfNeeded(selectedFile);

      if (splitResult.wasSplit) {
        toast({
          title: 'Dividiendo PDF',
          description: `El PDF se dividirá en ${splitResult.parts.length} partes`,
        });

        for (let i = 0; i < splitResult.parts.length; i++) {
          const part = splitResult.parts[i];
          const partFile = new File([part.blob], part.name, { type: 'application/pdf' });
          
          await uploadMutation.mutateAsync({
            file: partFile,
            description: i === 0 ? uploadDescription : undefined,
            category: uploadCategory,
          });
        }
      } else {
        await uploadMutation.mutateAsync({
          file: selectedFile,
          description: uploadDescription,
          category: uploadCategory,
        });
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDescription("");
      setUploadCategory("");
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDownload = async (doc: TrendDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('knowledge-base')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error al descargar',
        description: 'No se pudo descargar el documento',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Procesado</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Clock className="w-3 h-3 mr-1" />Procesando</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-300"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
    }
  };

  const getCategoryLabel = (value: string | null) => {
    if (!value) return null;
    return TREND_CATEGORY_OPTIONS.find(c => c.value === value)?.label || value;
  };

  // Filter documents
  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter(doc => {
      const matchesSearch = !searchQuery || 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, categoryFilter]);

  const groupedDocs = useMemo(() => groupDocumentParts(filteredDocs), [filteredDocs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tendencias Tecnológicas</h1>
            <p className="text-muted-foreground">
              Documentos sobre tendencias y análisis del sector
            </p>
          </div>
        </div>
        
        {isInternalUser && (
          <div>
            <input
              type="file"
              id="trend-upload"
              className="hidden"
              accept="application/pdf"
              onChange={handleFileSelect}
            />
            <Button asChild>
              <label htmlFor="trend-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Subir documento
              </label>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {TREND_CATEGORY_OPTIONS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {groupedDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No hay documentos de tendencias.
              <br />
              Sube documentos PDF para comenzar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groupedDocs.map((group) => {
            if (group.isMultiPart) {
              return (
                <Collapsible key={group.baseName}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{group.baseName}</span>
                            <Badge variant="secondary">{group.totalParts} partes</Badge>
                            {getCategoryLabel(group.mainDoc.category) && (
                              <Badge variant="outline">{getCategoryLabel(group.mainDoc.category)}</Badge>
                            )}
                          </div>
                          {group.mainDoc.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {group.mainDoc.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{group.totalChunks} chunks</span>
                          <Badge variant={group.processedCount === group.totalParts ? "outline" : "secondary"} 
                                 className={group.processedCount === group.totalParts ? "text-green-600 border-green-300" : ""}>
                            {group.processedCount}/{group.totalParts} procesados
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30">
                        {group.parts.map((part, idx) => {
                          const partMatch = part.name.match(/_parte(\d+)de(\d+)\.pdf$/i);
                          const partNum = partMatch ? partMatch[1] : idx + 1;
                          const totalNum = partMatch ? partMatch[2] : group.totalParts;
                          
                          return (
                            <div key={part.id} className="flex items-center gap-4 px-4 py-2 border-b last:border-b-0">
                              <div className="w-4" />
                              <span className="text-sm text-muted-foreground w-24">
                                Parte {partNum} de {totalNum}
                              </span>
                              <div className="flex-1">
                                {getStatusBadge(part.status)}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {part.chunk_count || 0} chunks
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownload(part)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                {isInternalUser && part.status !== 'processing' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => reprocessMutation.mutate(part.id)}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            }

            // Single document
            const doc = group.mainDoc;
            return (
              <Card key={doc.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{doc.name}</span>
                      {getCategoryLabel(doc.category) && (
                        <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                      )}
                      {getStatusBadge(doc.status)}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{doc.chunk_count || 0} chunks</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {isInternalUser && doc.status !== 'processing' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => reprocessMutation.mutate(doc.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente "{doc.name}" y todos sus datos procesados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(doc)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir documento de tendencias
            </DialogTitle>
            <DialogDescription>
              Añade información adicional antes de subir el documento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {TREND_CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Descripción</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !selectedFile}
                  className="h-7 text-xs"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  Generar con IA
                </Button>
              </div>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value.slice(0, 300))}
                placeholder="Descripción breve del documento..."
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">
                {uploadDescription.length}/300
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={uploadMutation.isPending || !selectedFile}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Subir documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trends;
