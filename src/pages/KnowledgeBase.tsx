import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Upload, Search, FileText, Loader2, Trash2, BookOpen, MessageSquare, AlertCircle, SplitSquareVertical, HardDrive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { splitPdfIfNeeded } from "@/hooks/usePdfSplitter";

interface KnowledgeDocument {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  status: string;
  chunk_count: number;
  created_at: string;
}

interface QueryResult {
  answer: string;
  sources: Array<{
    documentName: string;
    documentId: string;
    preview: string;
  }>;
}

export default function KnowledgeBase() {
  const { profile } = useAuth();
  const userRole = profile?.role;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [querying, setQuerying] = useState(false);

  const canManage = userRole === "admin" || userRole === "supervisor" || userRole === "analyst";

  // Storage limit (1GB for knowledge-docs bucket)
  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

  // Fetch documents
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeDocument[];
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Upload to storage
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-docs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: "pending",
        })
        .select()
        .single();

      if (docError) throw docError;

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke(
        "process-knowledge-document",
        { body: { documentId: doc.id } }
      );

      if (processError) {
        console.error("Processing error:", processError);
        // Don't throw - document is uploaded, just processing failed
        toast.error("Documento subido pero hubo un error al procesarlo");
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento subido y en proceso");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Error al subir el documento");
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: KnowledgeDocument) => {
      // Delete from storage
      await supabase.storage.from("knowledge-docs").remove([doc.file_path]);
      
      // Delete record (chunks will cascade delete)
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Documento eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar el documento");
    },
  });

  // Handle file upload with automatic splitting for large PDFs
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("El archivo no puede superar 100MB");
      return;
    }

    setUploading(true);
    setUploadProgress(null);
    
    try {
      // Split PDF if needed
      toast.info("Analizando documento...");
      const { parts, totalPages, wasSplit } = await splitPdfIfNeeded(file);
      
      if (wasSplit) {
        toast.info(`Documento dividido en ${parts.length} partes (${totalPages} páginas total)`);
      }
      
      setUploadProgress({ current: 0, total: parts.length });
      
      // Upload each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        setUploadProgress({ current: i + 1, total: parts.length });
        
        // Create a File object from the blob
        const partFile = new File([part.blob], part.name, { type: "application/pdf" });
        await uploadMutation.mutateAsync(partFile);
      }
      
      if (wasSplit) {
        toast.success(`${parts.length} partes subidas correctamente`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error al procesar el documento");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // Handle query
  const handleQuery = async () => {
    if (!query.trim()) return;

    setQuerying(true);
    setQueryResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("query-knowledge-base", {
        body: { query: query.trim(), limit: 5 },
      });

      if (error) throw error;

      if (data.success) {
        setQueryResult({
          answer: data.answer,
          sources: data.sources || [],
        });
      } else {
        toast.error(data.error || "Error al consultar");
      }
    } catch (error) {
      console.error("Query error:", error);
      toast.error("Error al realizar la consulta");
    } finally {
      setQuerying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-500">Procesado</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500">Procesando</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate total storage used
  const totalStorageUsed = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0;
  const storagePercentage = Math.min((totalStorageUsed / STORAGE_LIMIT_BYTES) * 100, 100);
  const storageRemaining = STORAGE_LIMIT_BYTES - totalStorageUsed;

  const getStorageColor = () => {
    if (storagePercentage >= 90) return "bg-destructive";
    if (storagePercentage >= 70) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Base de Conocimiento
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentos técnicos para consultas con IA contextualizada
          </p>
        </div>
      </div>

      {/* Storage Usage Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <HardDrive className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Almacenamiento</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground cursor-help">
                        {formatFileSize(totalStorageUsed)} / {formatFileSize(STORAGE_LIMIT_BYTES)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Espacio libre: {formatFileSize(storageRemaining)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${getStorageColor()}`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Usado: {storagePercentage.toFixed(1)}%</span>
                <span>Libre: {formatFileSize(storageRemaining)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="query" className="space-y-4">
        <TabsList>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Consultar
          </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos ({documents?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Consulta Técnica
                </CardTitle>
                <CardDescription>
                  Haz preguntas sobre tratamiento de aguas basadas en los documentos cargados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ej: ¿Cuál es la eficiencia típica de un reactor MBR para eliminación de nitrógeno?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[100px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleQuery();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={handleQuery} 
                  disabled={querying || !query.trim()}
                  className="w-full"
                >
                  {querying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Consultar Base de Conocimiento
                    </>
                  )}
                </Button>

                {queryResult && (
                  <div className="space-y-4 mt-6">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Respuesta</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{queryResult.answer}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>

                    {queryResult.sources.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Fuentes ({queryResult.sources.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {queryResult.sources.map((source, index) => (
                                <div
                                  key={index}
                                  className="p-3 rounded-lg bg-muted/50 text-sm"
                                >
                                  <p className="font-medium text-primary">
                                    {source.documentName}
                                  </p>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {source.preview}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {!queryResult && !querying && documents?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay documentos en la base de conocimiento.</p>
                    <p className="text-sm">Sube documentos técnicos en la pestaña "Documentos".</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Subir Documento
                  </CardTitle>
                  <CardDescription>
                    PDFs grandes se dividen automáticamente en partes más pequeñas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="max-w-md"
                    />
                    {uploading && !uploadProgress && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analizando documento...
                      </div>
                    )}
                  </div>
                  
                  {uploadProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <SplitSquareVertical className="h-4 w-4" />
                        <span>Subiendo parte {uploadProgress.current} de {uploadProgress.total}</span>
                      </div>
                      <Progress 
                        value={(uploadProgress.current / uploadProgress.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Formatos: PDF. Tamaño máximo: 100MB. PDFs &gt;8MB se dividen automáticamente.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Documentos Cargados</CardTitle>
                <CardDescription>
                  Documentos procesados y disponibles para consultas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{doc.chunk_count} fragmentos</span>
                              <span>•</span>
                              <span>
                                {new Date(doc.created_at).toLocaleDateString("es-ES")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(doc.status)}
                          {userRole === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(doc)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay documentos cargados</p>
                    <p className="text-sm">Sube tu primer documento técnico</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
