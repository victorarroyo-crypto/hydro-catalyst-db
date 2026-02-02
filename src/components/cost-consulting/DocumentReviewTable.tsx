/**
 * DocumentReviewTable - Table for reviewing and validating documents
 * Shows classification warnings, confidence levels, and validation actions
 */
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Check,
  Loader2,
  FileText,
  Receipt
} from 'lucide-react';
import { 
  PendingDocument, 
  DOC_TYPE_LABELS, 
  getConfidenceColor, 
  getConfidenceLabel 
} from '@/hooks/useDocumentReview';

interface DocumentReviewTableProps {
  documents: PendingDocument[];
  onValidate: (docType: string, docId: string) => Promise<boolean>;
  onChangeType: (docType: string, docId: string) => Promise<boolean>;
  loading?: boolean;
}

// Confidence bar component
const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percent = Math.round(confidence * 100);
  const colorClass = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs ${
        confidence >= 0.8 ? 'text-green-600' : 
        confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {label} ({percent}%)
      </span>
    </div>
  );
};

// Type badge component
const TypeBadge: React.FC<{ 
  docType: string; 
  detectedType?: string | null; 
  hasWarning?: boolean;
}> = ({ docType, detectedType, hasWarning }) => {
  const typeConfig = DOC_TYPE_LABELS[docType] || DOC_TYPE_LABELS.unknown;
  const detectedConfig = detectedType ? DOC_TYPE_LABELS[detectedType] : null;
  
  // If types don't match and there's a detected type
  const typesMismatch = detectedType && detectedType !== docType;
  
  return (
    <div className="flex items-center gap-1">
      <Badge className={typeConfig.color}>
        {docType === 'contract' && <FileText className="h-3 w-3 mr-1" />}
        {docType === 'invoice' && <Receipt className="h-3 w-3 mr-1" />}
        {typeConfig.label}
      </Badge>
      
      {typesMismatch && (
        <>
          <span className="text-muted-foreground mx-1">→</span>
          <Badge variant="outline" className="border-dashed border-orange-300 text-orange-600">
            ¿{detectedConfig?.label || detectedType}?
          </Badge>
        </>
      )}
    </div>
  );
};

// Individual row component
const DocumentReviewRow: React.FC<{
  document: PendingDocument;
  onValidate: () => Promise<boolean>;
  onChangeType: () => Promise<boolean>;
}> = ({ document, onValidate, onChangeType }) => {
  const [isValidating, setIsValidating] = React.useState(false);
  const [isChangingType, setIsChangingType] = React.useState(false);
  
  const handleValidate = async () => {
    setIsValidating(true);
    await onValidate();
    setIsValidating(false);
  };
  
  const handleChangeType = async () => {
    setIsChangingType(true);
    await onChangeType();
    setIsChangingType(false);
  };
  
  const hasWarning = !!document.classification_warning;
  const isLowConfidence = document.classification_confidence < 0.6;
  const needsAttention = hasWarning || isLowConfidence;
  const otherType = document.doc_type === 'contract' ? 'Factura' : 'Contrato';
  
  return (
    <TableRow className={needsAttention && !document.human_validated ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}>
      {/* Status indicator */}
      <TableCell className="w-10">
        {document.human_validated ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : needsAttention ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{document.classification_warning || 'Confianza de clasificación baja'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
        )}
      </TableCell>
      
      {/* Filename */}
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]" title={document.filename}>
            {document.filename}
          </span>
          {document.supplier_name && (
            <span className="text-xs text-muted-foreground">{document.supplier_name}</span>
          )}
        </div>
      </TableCell>
      
      {/* Type */}
      <TableCell>
        <TypeBadge 
          docType={document.doc_type} 
          detectedType={document.detected_type}
          hasWarning={hasWarning}
        />
      </TableCell>
      
      {/* Confidence */}
      <TableCell>
        <ConfidenceBar confidence={document.classification_confidence} />
      </TableCell>
      
      {/* Warning */}
      <TableCell>
        {document.classification_warning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-orange-600 dark:text-orange-400 truncate max-w-[150px] block">
                  {document.classification_warning.substring(0, 30)}...
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>{document.classification_warning}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      
      {/* Actions */}
      <TableCell>
        <div className="flex gap-2">
          {!document.human_validated && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleValidate}
                disabled={isValidating || isChangingType}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Validar
                  </>
                )}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleChangeType}
                      disabled={isValidating || isChangingType}
                    >
                      {isChangingType ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cambiar a {otherType}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          
          {document.human_validated && (
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Validado
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export const DocumentReviewTable: React.FC<DocumentReviewTableProps> = ({
  documents,
  onValidate,
  onChangeType,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">Todos los documentos validados</h3>
        <p className="text-muted-foreground mt-1">
          No hay documentos pendientes de revisión
        </p>
      </div>
    );
  }
  
  // Sort: needs attention first, then unvalidated, then validated
  const sortedDocs = [...documents].sort((a, b) => {
    // Already validated go last
    if (a.human_validated && !b.human_validated) return 1;
    if (!a.human_validated && b.human_validated) return -1;
    
    // Has warning goes first
    const aWarning = a.classification_warning || a.classification_confidence < 0.6;
    const bWarning = b.classification_warning || b.classification_confidence < 0.6;
    if (aWarning && !bWarning) return -1;
    if (!aWarning && bWarning) return 1;
    
    // Then by confidence (lower first)
    return a.classification_confidence - b.classification_confidence;
  });
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Confianza</TableHead>
          <TableHead>Advertencia</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedDocs.map((doc) => (
          <DocumentReviewRow
            key={`${doc.doc_type}-${doc.doc_id}`}
            document={doc}
            onValidate={() => onValidate(doc.doc_type, doc.doc_id)}
            onChangeType={() => onChangeType(doc.doc_type, doc.doc_id)}
          />
        ))}
      </TableBody>
    </Table>
  );
};
