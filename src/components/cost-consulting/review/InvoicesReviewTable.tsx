import React, { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Pencil, Check, ArrowRightLeft, AlertTriangle, ChevronDown, ChevronRight, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LineItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
  unit?: string;
  total?: number;
}

export interface InvoiceForReview {
  id: string;
  invoice_number?: string;
  invoice_date?: string;
  supplier_name_raw?: string;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  line_items?: LineItem[] | Array<Record<string, unknown>>;
  source?: string;
  needs_review?: boolean;
  human_validated?: boolean;
  classification_confidence?: number;
  classification_warning?: string;
  detected_type?: string;
  cost_project_documents?: {
    file_url?: string;
    filename?: string;
  };
}

interface InvoicesReviewTableProps {
  invoices: InvoiceForReview[];
  onView?: (invoice: InvoiceForReview) => void;
  onEdit?: (invoice: InvoiceForReview) => void;
  onValidate?: (invoiceId: string) => void;
  onChangeType?: (invoice: InvoiceForReview) => void;
  isValidating?: string | null;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
};

const getValidationBadge = (invoice: InvoiceForReview) => {
  if (invoice.human_validated) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
        <Check className="h-3 w-3 mr-1" />
        Validado
      </Badge>
    );
  }
  if (invoice.classification_warning) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Revisar
      </Badge>
    );
  }
  if (invoice.needs_review) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
        Pendiente
      </Badge>
    );
  }
  return null;
};

const getConfidenceBadge = (confidence: number | null | undefined) => {
  if (confidence === null || confidence === undefined) return null;
  if (confidence >= 0.8) {
    return <Badge variant="outline" className="text-green-600 border-green-300">Alta ({Math.round(confidence * 100)}%)</Badge>;
  }
  if (confidence >= 0.6) {
    return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Media ({Math.round(confidence * 100)}%)</Badge>;
  }
  return <Badge variant="outline" className="text-red-600 border-red-300">Baja ({Math.round(confidence * 100)}%)</Badge>;
};

export function InvoicesReviewTable({
  invoices,
  onView,
  onEdit,
  onValidate,
  onChangeType,
  isValidating,
}: InvoicesReviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (invoices.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No se encontraron facturas en los documentos
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Nº Factura</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Confianza</TableHead>
            <TableHead className="text-center">Líneas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const hasLines = invoice.line_items && invoice.line_items.length > 0;
            const isExpanded = expandedRows.has(invoice.id);

            return (
              <Fragment key={invoice.id}>
                <TableRow
                  className={`${hasLines ? 'cursor-pointer hover:bg-muted/50' : ''} ${
                    invoice.classification_warning ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                  }`}
                  onClick={() => hasLines && toggleRow(invoice.id)}
                >
                  <TableCell className="w-8">
                    {hasLines &&
                      (isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ))}
                  </TableCell>
                  <TableCell>{getValidationBadge(invoice)}</TableCell>
                  <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                  <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                  <TableCell>{invoice.supplier_name_raw || 'Sin nombre'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell>{getConfidenceBadge(invoice.classification_confidence)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{invoice.line_items?.length || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Download PDF */}
                      {invoice.cost_project_documents?.file_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => window.open(invoice.cost_project_documents?.file_url, '_blank')}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Descargar PDF</TooltipContent>
                        </Tooltip>
                      )}

                      {/* View */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onView?.(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalles</TooltipContent>
                      </Tooltip>

                      {/* Edit */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onEdit?.(invoice)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      {/* Change Type */}
                      {onChangeType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => onChangeType(invoice)}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cambiar a Contrato</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Validate */}
                      {onValidate && !invoice.human_validated && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => onValidate(invoice.id)}
                              disabled={isValidating === invoice.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Validar</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expandable line items */}
                {isExpanded && hasLines && (
                  <TableRow>
                    <TableCell colSpan={9} className="bg-muted/30 p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Líneas de detalle:
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Concepto</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">Precio Unit.</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.line_items?.map((line, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{line.description}</TableCell>
                                <TableCell className="text-right">
                                  {line.quantity} {line.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(line.unit_price)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(line.total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
