import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  CheckCircle, AlertCircle, Loader2, Clock, XCircle,
  RefreshCw, Trash2, FileText, FileSpreadsheet, Image, File,
  StopCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { deleteDocument, reprocessDocument } from '@/services/costConsultingApi';

interface CostProjectDocument {
  id: string;
  filename: string;
  status: string;
  chunk_count: number | null;
  created_at: string;
  error_message: string | null;
}

interface DocumentsManagementCardProps {
  projectId: string;
}

const getDocIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return <Image className="h-4 w-4 text-purple-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
          <CheckCircle className="h-3 w-3" /> Completado
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Procesando
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 gap-1">
          <Clock className="h-3 w-3" /> Pendiente
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Fallido
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
          <XCircle className="h-3 w-3" /> Cancelado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          {status}
        </Badge>
      );
  }
};

export const DocumentsManagementCard: React.FC<DocumentsManagementCardProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  
  // Query documents with polling for processing status
  const { data: documents = [], refetch, isLoading } = useQuery({
    queryKey: ['cost-documents-detailed', projectId],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('cost_project_documents')
        .select('id, filename, status, chunk_count, created_at, error_message')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CostProjectDocument[];
    },
    refetchInterval: (query) => {
      const data = query.state.data as CostProjectDocument[] | undefined;
      const hasProcessing = data?.some(d => d.status === 'pending' || d.status === 'processing');
      return hasProcessing ? 3000 : false;
    },
    enabled: !!projectId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!documents || documents.length === 0) {
      return { total: 0, completed: 0, failed: 0, processing: 0 };
    }
    return {
      total: documents.length,
      completed: documents.filter(d => d.status === 'completed').length,
      failed: documents.filter(d => d.status === 'failed').length,
      processing: documents.filter(d => d.status === 'pending' || d.status === 'processing').length,
    };
  }, [documents]);

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Action handlers
  const handleCancelAnalysis = async () => {
    const toCancel = documents.filter(d => d.status === 'pending' || d.status === 'processing');
    if (toCancel.length === 0) return;
    
    try {
      for (const doc of toCancel) {
        await externalSupabase
          .from('cost_project_documents')
          .update({ status: 'cancelled' })
          .eq('id', doc.id);
      }
      toast.success(`${toCancel.length} documentos cancelados`);
      refetch();
    } catch (error) {
      toast.error('Error al cancelar documentos');
    }
  };

  const handleReprocessFailed = async () => {
    const failed = documents.filter(d => d.status === 'failed');
    if (failed.length === 0) return;
    
    try {
      for (const doc of failed) {
        await reprocessDocument(projectId, doc.id);
      }
      toast.success(`Reprocesando ${failed.length} documentos`);
      refetch();
    } catch (error) {
      toast.error('Error al reprocesar documentos');
    }
  };

  const handleDeleteFailed = async () => {
    const failed = documents.filter(d => d.status === 'failed');
    if (failed.length === 0) return;
    
    try {
      for (const doc of failed) {
        await deleteDocument(projectId, doc.id);
      }
      toast.success(`${failed.length} documentos eliminados`);
      queryClient.invalidateQueries({ queryKey: ['cost-documents', projectId] });
      refetch();
    } catch (error) {
      toast.error('Error al eliminar documentos');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(projectId, docId);
      toast.success('Documento eliminado (BD, chunks y Storage)');
      queryClient.invalidateQueries({ queryKey: ['cost-documents', projectId] });
      refetch();
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  const handleReprocessDocument = async (docId: string) => {
    try {
      await reprocessDocument(projectId, docId);
      toast.success('Reprocesando documento');
      refetch();
    } catch (error) {
      toast.error('Error al reprocesar documento');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No hay documentos subidos todavía.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos del Proyecto
          </CardTitle>
          <CardDescription>
            {stats.processing > 0 
              ? `Procesando ${stats.processing} de ${stats.total} documentos...` 
              : `${stats.completed} de ${stats.total} documentos procesados`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Procesamiento: {stats.completed}/{stats.total} documentos
              </span>
              <span className="text-muted-foreground">
                {stats.processing > 0 && `${stats.processing} en proceso`}
                {stats.processing > 0 && stats.failed > 0 && ' • '}
                {stats.failed > 0 && `${stats.failed} fallidos`}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Action Buttons */}
          {(stats.processing > 0 || stats.failed > 0) && (
            <div className="flex flex-wrap gap-2">
              {stats.processing > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelAnalysis}
                  className="text-destructive hover:text-destructive"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Cancelar Análisis ({stats.processing})
                </Button>
              )}
              {stats.failed > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReprocessFailed}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reintentar Fallidos ({stats.failed})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeleteFailed}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Borrar Fallidos ({stats.failed})
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Documents Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Chunks</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDocIcon(doc.filename)}
                        <span className="font-medium truncate max-w-[200px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {doc.status === 'failed' && doc.error_message && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{doc.error_message}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {doc.chunk_count || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {doc.status === 'failed' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleReprocessDocument(doc.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reintentar</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default DocumentsManagementCard;
