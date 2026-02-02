import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, FileText, Receipt } from 'lucide-react';

export interface ChangeTypeDocument {
  id: string;
  supplier_name_raw?: string;
  contract_number?: string;
  invoice_number?: string;
}

interface ChangeTypeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  document: ChangeTypeDocument | null;
  currentType: 'contract' | 'invoice';
  isLoading?: boolean;
}

export function ChangeTypeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  document,
  currentType,
  isLoading,
}: ChangeTypeConfirmDialogProps) {
  if (!document) return null;

  const newType = currentType === 'contract' ? 'invoice' : 'contract';
  const currentLabel = currentType === 'contract' ? 'CONTRATO' : 'FACTURA';
  const newLabel = newType === 'contract' ? 'CONTRATO' : 'FACTURA';
  const docNumber = currentType === 'contract' 
    ? document.contract_number 
    : document.invoice_number;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirmar cambio de tipo
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>
                ¿Estás seguro de cambiar este documento de <strong>{currentLabel}</strong> a{' '}
                <strong>{newLabel}</strong>?
              </p>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="font-medium">{docNumber || 'Sin número'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Proveedor:</span>
                  <span className="font-medium">{document.supplier_name_raw || 'Desconocido'}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                <Badge 
                  className={currentType === 'contract' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                  }
                >
                  {currentType === 'contract' ? (
                    <FileText className="h-3 w-3 mr-1" />
                  ) : (
                    <Receipt className="h-3 w-3 mr-1" />
                  )}
                  {currentLabel}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  className={newType === 'contract' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                  }
                >
                  {newType === 'contract' ? (
                    <FileText className="h-3 w-3 mr-1" />
                  ) : (
                    <Receipt className="h-3 w-3 mr-1" />
                  )}
                  {newLabel}
                </Badge>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  <strong>⚠️ Importante:</strong> Esta acción moverá el documento a la tabla de{' '}
                  {newType === 'contract' ? 'contratos' : 'facturas'}. Los datos básicos se 
                  conservarán pero deberás completar los campos específicos.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Procesando...' : 'Confirmar cambio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
