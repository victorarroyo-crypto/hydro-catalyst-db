import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Table,
  TableBody, 
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Files,
  FileQuestion,
  ExternalLink,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getProjectDocuments, 
  deleteDocument, 
  reprocessDocument,
  reExtractDocument,
  ProjectDocument 
} from '@/services/costConsultingApi';
import { useDocumentEntityCounts, getDocumentCounts, documentHasEntities } from '@/hooks/useDocumentEntityCounts';
import { DocumentReclassifyModal } from './DocumentReclassifyModal';
import { openDocumentUrl } from '@/utils/storageUrlHelper';

export interface DocumentStats {
  pending: number;
  failed: number;
  processing: number;
  completed: number;
  total: number;
  noEntities: number; // Documents completed but with 0 contracts/invoices
}

interface PendingDocumentsListProps {
  projectId: string;
  userId?: string;
  onDocumentDeleted?: () => void;
  onStatsChange?: (stats: DocumentStats) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        label: 'Procesado',
        className: 'text-green-600 dark:text-green-400',
        bgClassName: 'bg-green-500/10',
      };
    case 'processing':
      return {
        icon: Loader2,
        label: 'Procesando',
        className: 'text-blue-600 dark:text-blue-400',
        bgClassName: 'bg-blue-500/10',
      };
    case 'failed':
      return {
        icon: XCircle,
        label: 'Error',
        className: 'text-red-600 dark:text-red-400',
        bgClassName: 'bg-red-500/10',
      };
    case 'pending':
    default:
      return {
        icon: Clock,
        label: 'Pendiente',
        className: 'text-yellow-600 dark:text-yellow-400',
        bgClassName: 'bg-yellow-500/10',
      };
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PendingDocumentsList: React.FC<PendingDocumentsListProps> = ({
  projectId,
  userId,
  onDocumentDeleted,
  onStatsChange,
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const [documentToReclassify, setDocumentToReclassify] = useState<ProjectDocument | null>(null);
  
  const { data: documents = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['project-documents-list', projectId],
    queryFn: () => getProjectDocuments(projectId),
    enabled: !!projectId,
    // Poll every 2 seconds when processing, otherwise every 10 seconds
    refetchInterval: (query) => {
      const docs = query.state.data as ProjectDocument[] | undefined;
      const hasProcessing = docs?.some(d => d.extraction_status === 'processing');
      return hasProcessing ? 2000 : 10000;
    },
  });

  // Fetch entity counts per document
  const { counts: entityCounts, isLoading: entityCountsLoading } = useDocumentEntityCounts(projectId);

  // Calculate stats - use extraction_status (API field name)
  // Also count documents that are completed but have no entities
  const stats: DocumentStats = useMemo(() => {
    const completed = documents.filter(d => d.extraction_status === 'completed');
    const completedWithoutEntities = completed.filter(d => !documentHasEntities(entityCounts, d.id));
    
    return {
      total: documents.length,
      completed: completed.length,
      processing: documents.filter(d => d.extraction_status === 'processing').length,
      pending: documents.filter(d => d.extraction_status === 'pending').length,
      failed: documents.filter(d => d.extraction_status === 'failed').length,
      noEntities: completedWithoutEntities.length,
    };
  }, [documents, entityCounts]);

  // Notify parent when stats change
  React.useEffect(() => {
    onStatsChange?.(stats);
  }, [stats.pending, stats.failed, stats.processing, stats.completed, stats.total, stats.noEntities, onStatsChange]);
  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    setDeletingId(documentToDelete.id);
    setDocumentToDelete(null);
    
    try {
      await deleteDocument(projectId, documentToDelete.id);
      toast.success('Documento eliminado');
      await refetch();
      onDocumentDeleted?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (doc: ProjectDocument) => {
    setReprocessingId(doc.id);
    try {
      await reprocessDocument(projectId, doc.id);
      toast.success('Documento enviado a reprocesar');
      queryClient.invalidateQueries({ queryKey: ['project-documents-list', projectId] });
    } catch (error) {
      console.error('Error reprocessing document:', error);
      toast.error('Error al reprocesar el documento');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleReExtract = async (doc: ProjectDocument) => {
    setReExtractingId(doc.id);
    try {
      const result = await reExtractDocument(projectId, doc.id);
      
      // Mostrar información sobre registros borrados
      const deletedInfo = [];
      if (result.deleted_contracts > 0) {
        deletedInfo.push(`${result.deleted_contracts} contratos`);
      }
      if (result.deleted_invoices > 0) {
        deletedInfo.push(`${result.deleted_invoices} facturas`);
      }
      
      const deletedMsg = deletedInfo.length > 0 
        ? ` (eliminados: ${deletedInfo.join(', ')})` 
        : '';
      
      toast.success(`Re-extracción iniciada para "${doc.filename}"${deletedMsg}`);
      
      // Small delay to allow backend to update status
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refetch();
      
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', projectId] });
    } catch (error) {
      console.error('Error re-extracting document:', error);
      toast.error(error instanceof Error ? error.message : 'Error al re-extraer el documento');
    } finally {
      setReExtractingId(null);
    }
  };

  const handleReclassified = async () => {
    // Refetch documents and entity counts
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['cost-contracts', projectId] });
    queryClient.invalidateQueries({ queryKey: ['cost-invoices', projectId] });
  };

  const handleViewPdf = (doc: ProjectDocument) => {
    if (doc.file_url) {
      openDocumentUrl(doc.file_url);
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

  if (isError) {
    return (
      <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span>No se pudieron cargar los documentos</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Files className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay documentos subidos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Files className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Documentos Subidos ({stats.total})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {stats.completed} procesados
                    {stats.noEntities > 0 && ` · ${stats.noEntities} sin datos`}
                    {stats.pending > 0 && ` · ${stats.pending} pendientes`}
                    {stats.processing > 0 && ` · ${stats.processing} procesando`}
                    {stats.failed > 0 && ` · ${stats.failed} con error`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Status badges summary */}
                {stats.pending > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                    <Clock className="h-3 w-3 mr-1" />
                    {stats.pending}
                  </Badge>
                )}
                {stats.processing > 0 && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {stats.processing}
                  </Badge>
                )}
                {stats.failed > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-3 w-3 mr-1" />
                    {stats.failed}
                  </Badge>
                )}
                {stats.noEntities > 0 && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                    <FileQuestion className="h-3 w-3 mr-1" />
                    {stats.noEntities}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead className="w-[100px]">Estado</TableHead>
                    <TableHead className="w-[70px] text-center">Contratos</TableHead>
                    <TableHead className="w-[70px] text-center">Facturas</TableHead>
                    <TableHead className="w-[80px] text-right">Tamaño</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {documents.map((doc) => {
                    const statusConfig = getStatusConfig(doc.extraction_status);
                    const StatusIcon = statusConfig.icon;
                    const docCounts = getDocumentCounts(entityCounts, doc.id);
                    const hasNoEntities = doc.extraction_status === 'completed' && 
                      docCounts.contracts === 0 && docCounts.invoices === 0;
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[250px]" title={doc.filename}>
                              {doc.filename}
                            </span>
                            {doc.file_type && doc.file_type !== 'otro' && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {doc.file_type === 'contrato' ? 'Contrato' : 
                                 doc.file_type === 'factura' ? 'Factura' : 
                                 doc.file_type}
                              </Badge>
                            )}
                            {hasNoEntities && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs shrink-0 bg-orange-500/10 text-orange-600 border-orange-200">
                                      Sin datos
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Este documento fue procesado pero no generó contratos ni facturas
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {doc.extraction_error && (
                            <p className="text-xs text-destructive mt-1 ml-6 truncate max-w-[400px]" title={doc.extraction_error}>
                              {doc.extraction_error}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge 
                                  variant="outline" 
                                  className={`${statusConfig.bgClassName} border-0`}
                                >
                                  <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.className}`} />
                                  <span className={statusConfig.className}>
                                    {statusConfig.label}
                                  </span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {doc.extraction_status === 'completed' && doc.chunk_count 
                                  ? `${doc.chunk_count} fragmentos procesados`
                                  : statusConfig.label
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.extraction_status === 'completed' ? (
                            <span className={docCounts.contracts > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                              {docCounts.contracts}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.extraction_status === 'completed' ? (
                            <span className={docCounts.invoices > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                              {docCounts.invoices}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* View PDF button - for all completed documents with file_url */}
                            {doc.file_url && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      onClick={() => handleViewPdf(doc)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver PDF original</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* Reclassify button - only for completed documents without entities */}
                            {hasNoEntities && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                      onClick={() => setDocumentToReclassify(doc)}
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reclasificar documento</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* Reprocess button - only for failed or pending (embeddings only) */}
                            {(doc.extraction_status === 'failed' || doc.extraction_status === 'pending') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      onClick={() => handleReprocess(doc)}
                                      disabled={reprocessingId === doc.id}
                                    >
                                      {reprocessingId === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reprocesar embeddings</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* Re-extract button - for failed or completed (to retry LLM extraction) */}
                            {(doc.extraction_status === 'failed' || doc.extraction_status === 'completed') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-orange-600"
                                      onClick={() => handleReExtract(doc)}
                                      disabled={reExtractingId === doc.id}
                                    >
                                      {reExtractingId === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {doc.extraction_status === 'failed' 
                                      ? 'Re-extraer datos (pipeline LLM)' 
                                      : 'Re-extraer (corregir datos)'
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* Delete button */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDocumentToDelete(doc)}
                                    disabled={deletingId === doc.id}
                                  >
                                    {deletingId === doc.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar documento</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Warning if there are unprocessed documents or documents without entities */}
            {(stats.pending > 0 || stats.failed > 0 || stats.noEntities > 0) && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    {stats.pending > 0 && (
                      <p>
                        <strong>{stats.pending}</strong> documento{stats.pending > 1 ? 's' : ''} pendiente{stats.pending > 1 ? 's' : ''} de procesamiento.
                      </p>
                    )}
                    {stats.failed > 0 && (
                      <p>
                        <strong>{stats.failed}</strong> documento{stats.failed > 1 ? 's' : ''} con error. Usa "Re-extraer" para volver a procesar.
                      </p>
                    )}
                    {stats.noEntities > 0 && (
                      <p>
                        <strong>{stats.noEntities}</strong> documento{stats.noEntities > 1 ? 's' : ''} procesado{stats.noEntities > 1 ? 's' : ''} sin contratos ni facturas.
                        <span className="opacity-80"> Pueden ser anexos técnicos, catálogos u otros documentos de soporte.</span>
                      </p>
                    )}
                    <p className="text-xs opacity-80">
                      El botón naranja re-ejecuta el pipeline LLM para extraer contratos/facturas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente el documento <strong>"{documentToDelete?.filename}"</strong> junto con todos sus datos extraídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reclassify Modal */}
      <DocumentReclassifyModal
        open={!!documentToReclassify}
        onOpenChange={(open) => !open && setDocumentToReclassify(null)}
        document={documentToReclassify}
        projectId={projectId}
        userId={userId || ''}
        onReclassified={handleReclassified}
      />
    </Card>
  );
};
