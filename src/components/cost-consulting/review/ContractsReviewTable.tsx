import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Pencil, Check, ArrowRightLeft, AlertTriangle, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ContractForReview {
  id: string;
  supplier_name_raw?: string;
  contract_number?: string;
  contract_title?: string;
  start_date?: string;
  end_date?: string;
  total_annual_value?: number;
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

interface ContractsReviewTableProps {
  contracts: ContractForReview[];
  onView?: (contract: ContractForReview) => void;
  onEdit?: (contract: ContractForReview) => void;
  onValidate?: (contractId: string) => void;
  onChangeType?: (contract: ContractForReview) => void;
  isValidating?: string | null;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
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

const getValidationBadge = (contract: ContractForReview) => {
  if (contract.human_validated) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
        <Check className="h-3 w-3 mr-1" />
        Validado
      </Badge>
    );
  }
  if (contract.classification_warning) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Revisar
      </Badge>
    );
  }
  if (contract.needs_review) {
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

export function ContractsReviewTable({
  contracts,
  onView,
  onEdit,
  onValidate,
  onChangeType,
  isValidating,
}: ContractsReviewTableProps) {
  if (contracts.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No se encontraron contratos en los documentos
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Nº Contrato</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead className="text-right">Valor Anual</TableHead>
            <TableHead>Confianza</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow 
              key={contract.id}
              className={contract.classification_warning ? 'bg-red-50/50 dark:bg-red-950/20' : ''}
            >
              <TableCell>
                {getValidationBadge(contract)}
              </TableCell>
              <TableCell className="font-medium">
                {contract.supplier_name_raw || '-'}
              </TableCell>
              <TableCell>{contract.contract_number || '-'}</TableCell>
              <TableCell>
                {contract.start_date && contract.end_date
                  ? `${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}`
                  : formatDate(contract.start_date) || '-'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(contract.total_annual_value)}
              </TableCell>
              <TableCell>
                {getConfidenceBadge(contract.classification_confidence)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {/* Download PDF */}
                  {contract.cost_project_documents?.file_url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => window.open(contract.cost_project_documents?.file_url, '_blank')}
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
                        onClick={() => onView?.(contract)}
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
                        onClick={() => onEdit?.(contract)}
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
                          onClick={() => onChangeType(contract)}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cambiar a Factura</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Validate */}
                  {onValidate && !contract.human_validated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onValidate(contract.id)}
                          disabled={isValidating === contract.id}
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
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
