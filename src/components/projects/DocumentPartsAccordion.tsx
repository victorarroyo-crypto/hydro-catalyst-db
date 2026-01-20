import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  XCircle,
  Clock,
  Scissors,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import type { 
  DocumentPart, 
  ProjectDocumentWithParts, 
  DocumentProcessingStatus 
} from '@/types/documentProcessing';

interface PartStatusConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

const PART_STATUS_CONFIG: Record<DocumentProcessingStatus, PartStatusConfig> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: 'bg-muted text-muted-foreground',
    label: 'Pendiente',
  },
  processing: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Procesando',
  },
  chunking: {
    icon: <Scissors className="h-3 w-3" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Troceando',
  },
  embedding: {
    icon: <Sparkles className="h-3 w-3" />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    label: 'Vectorizando',
  },
  extracting_entities: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    label: 'Extrayendo',
  },
  completed: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    label: 'Procesado',
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    label: 'Error',
  },
};

interface DocumentPartsAccordionProps {
  document: ProjectDocumentWithParts;
  parts: DocumentPart[];
  totalChunks: number;
}

export function DocumentPartsAccordion({
  document,
  parts,
  totalChunks,
}: DocumentPartsAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const partsCompleted = parts.filter((p) => p.status === 'completed').length;
  const totalParts = parts.length;
  const allCompleted = partsCompleted === totalParts;
  const progressPercentage = totalParts > 0 ? (partsCompleted / totalParts) * 100 : 0;

  // Check if any part is currently processing
  const isProcessing = parts.some(p => 
    !['completed', 'failed', 'pending'].includes(p.status)
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          {/* Header del documento */}
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-3 w-full text-left group">
              {/* Icono de expandir */}
              <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>

              {/* Icono de archivo */}
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />

              {/* Nombre del archivo */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate" title={document.filename}>
                  {document.filename}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {totalChunks} chunks total • {partsCompleted}/{totalParts} partes procesadas
                </p>
              </div>

              {/* Badge de partes */}
              <div className="flex items-center gap-2 shrink-0">
                {isProcessing && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <Badge 
                  variant="secondary"
                  className={allCompleted 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : ''
                  }
                >
                  {totalParts} partes
                </Badge>
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Progress bar cuando está procesando */}
          {!allCompleted && (
            <div className="mt-3 pl-14">
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          )}

          {/* Lista de partes */}
          <CollapsibleContent>
            <div className="mt-4 pl-14 space-y-3">
              {/* Info del documento */}
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Documento dividido automáticamente por ser mayor a 10MB o tener más de 10 páginas.
              </p>

              {/* Tipo de documento */}
              <Badge variant="outline" className="text-xs">
                {document.document_type || 'Sin tipo'}
              </Badge>

              {/* Lista de partes */}
              <div className="space-y-2">
                {parts.map((part) => {
                  const config = PART_STATUS_CONFIG[part.status] || PART_STATUS_CONFIG.pending;

                  return (
                    <div
                      key={part.id}
                      className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* Línea de conexión visual */}
                      <span className="text-muted-foreground/50 font-mono text-xs">
                        └
                      </span>

                      {/* Info de la parte */}
                      <span className="text-muted-foreground flex-1">
                        Parte {part.part_number} de {totalParts}
                      </span>

                      {/* Badge de estado */}
                      <Badge 
                        variant="secondary" 
                        className={`text-xs gap-1 ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>

                      {/* Chunks de esta parte */}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {part.chunk_count} chunks
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
