import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, FileDown, ArrowRightLeft } from 'lucide-react';
import { CostInvoice, CostSupplier, CostContract } from '@/hooks/useCostConsultingData';
import {
  createInvoice,
  updateInvoice,
  createInvoiceLine,
  changeDocumentType,
  InvoiceFormData,
  InvoiceLineData,
} from '@/services/costConsultingApi';
import { useQueryClient } from '@tanstack/react-query';
interface InvoiceFormModalProps {
  projectId: string;
  invoice?: CostInvoice | null;
  suppliers: CostSupplier[];
  contracts: CostContract[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId?: string;
}

const UNITS = [
  { value: 'ud', label: 'ud' },
  { value: 'kg', label: 'kg' },
  { value: 'm3', label: 'm³' },
  { value: 't', label: 't' },
  { value: 'h', label: 'h' },
  { value: 'mes', label: 'mes' },
  { value: 'kwh', label: 'kWh' },
  { value: 'l', label: 'L' },
];

export const InvoiceFormModal = ({
  projectId,
  invoice,
  suppliers,
  contracts,
  open,
  onClose,
  onSaved,
  userId,
}: InvoiceFormModalProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier_id: '',
    supplier_name_raw: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    subtotal: 0,
    tax_rate: 21,
    tax_amount: 0,
    total: 0,
    contract_id: '',
    notes: '',
  });

  const [lines, setLines] = useState<InvoiceLineData[]>([]);

  // Initialize form when invoice changes
  useEffect(() => {
    if (invoice) {
      setFormData({
        supplier_id: '',
        supplier_name_raw: invoice.supplier_name_raw || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date || '',
        due_date: invoice.due_date || '',
        subtotal: invoice.subtotal || 0,
        tax_rate: 21,
        tax_amount: invoice.tax_amount || 0,
        total: invoice.total || 0,
        contract_id: '',
        notes: '',
      });

      // Parse existing line_items
      if (invoice.line_items && Array.isArray(invoice.line_items)) {
        setLines(
          invoice.line_items.map((item: Record<string, unknown>) => ({
            description: (item.description as string) || '',
            quantity: (item.quantity as number) || 1,
            unit: (item.unit as string) || 'ud',
            unit_price: (item.unit_price as number) || 0,
            total: (item.total as number) || 0,
          }))
        );
      } else {
        setLines([]);
      }
    } else {
      setFormData({
        supplier_id: '',
        supplier_name_raw: '',
        invoice_number: '',
        invoice_date: '',
        due_date: '',
        subtotal: 0,
        tax_rate: 21,
        tax_amount: 0,
        total: 0,
        contract_id: '',
        notes: '',
      });
      setLines([]);
    }
  }, [invoice, open]);

  // Recalculate totals when lines change
  useEffect(() => {
    const subtotal = lines.reduce((sum, l) => sum + (l.total || 0), 0);
    const taxRate = formData.tax_rate || 21;
    const tax_amount = subtotal * (taxRate / 100);
    const total = subtotal + tax_amount;

    setFormData((f) => ({
      ...f,
      subtotal,
      tax_amount,
      total,
    }));
  }, [lines, formData.tax_rate]);

  const addLine = () => {
    setLines([
      ...lines,
      { description: '', quantity: 1, unit: 'ud', unit_price: 0, total: 0 },
    ]);
  };

  const updateLine = (index: number, field: keyof InvoiceLineData, value: unknown) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Recalculate line total
    if (field === 'quantity' || field === 'unit_price') {
      newLines[index].total =
        (newLines[index].quantity || 0) * (newLines[index].unit_price || 0);
    }

    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.supplier_name_raw && !formData.supplier_id) {
      toast.error('Debes seleccionar o introducir un proveedor');
      return;
    }

    if (!formData.invoice_number) {
      toast.error('El número de factura es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      let invoiceId: string;

      if (invoice) {
        await updateInvoice(projectId, invoice.id, formData);
        invoiceId = invoice.id;
      } else {
        const result = await createInvoice(projectId, formData);
        invoiceId = result.invoice?.id || result.id;
      }

      // Create new lines (only for new invoices or new lines without id)
      for (const line of lines) {
        if (!line.id) {
          await createInvoiceLine(projectId, invoiceId, line);
        }
      }

      toast.success(invoice ? 'Factura actualizada' : 'Factura creada');
      onSaved();
      onClose();
    } catch (error) {
      toast.error('Error al guardar la factura');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get file_url from the associated document
  const fileUrl = (invoice as any)?.cost_project_documents?.file_url;

  const handleChangeToContract = async () => {
    if (!invoice?.id || !projectId || !userId) return;
    
    const confirmed = window.confirm(
      '¿Estás seguro de cambiar este documento de FACTURA a CONTRATO?\n\n' +
      'El documento se moverá a la tabla de contratos.'
    );
    
    if (!confirmed) return;
    
    setIsChangingType(true);
    try {
      await changeDocumentType(projectId, 'invoice', invoice.id, userId);
      toast.success('Documento convertido a contrato');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['cost-contracts', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cost-invoices', projectId] });
      onSaved();
    } catch (error) {
      toast.error('Error al cambiar tipo de documento');
      console.error(error);
    } finally {
      setIsChangingType(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {invoice ? 'Editar Factura' : 'Nueva Factura Manual'}
            </DialogTitle>
            {fileUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Ver PDF Original
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header data */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Proveedor</Label>
              <Select
                value={formData.supplier_id || ''}
                onValueChange={(v) =>
                  setFormData({ ...formData, supplier_id: v, supplier_name_raw: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>O nombre manual</Label>
              <Input
                placeholder="Nombre proveedor"
                value={formData.supplier_name_raw || ''}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name_raw: e.target.value, supplier_id: '' })
                }
              />
            </div>

            <div>
              <Label>Nº Factura *</Label>
              <Input
                value={formData.invoice_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Contrato asociado</Label>
              <Select
                value={formData.contract_id || ''}
                onValueChange={(v) =>
                  setFormData({ ...formData, contract_id: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin contrato</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_number || c.supplier_name_raw || 'Contrato'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fecha factura</Label>
              <Input
                type="date"
                value={formData.invoice_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_date: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Fecha vencimiento</Label>
              <Input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>

            <div>
              <Label>IVA (%)</Label>
              <Input
                type="number"
                value={formData.tax_rate || 21}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tax_rate: parseFloat(e.target.value) || 21,
                  })
                }
              />
            </div>
          </div>

          {/* Invoice lines */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">Líneas de factura</Label>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Añadir línea
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay líneas. Haz clic en "Añadir línea" para empezar.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            updateLine(idx, 'description', e.target.value)
                          }
                          placeholder="Descripción del concepto"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.unit}
                          onValueChange={(v) => updateLine(idx, 'unit', v)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={line.unit_price}
                          onChange={(e) =>
                            updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {line.total.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{Number(formData.subtotal || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({formData.tax_rate || 21}%):</span>
                <span>{Number(formData.tax_amount || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total:</span>
                <span>{Number(formData.total || 0).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {invoice && userId && (
            <Button
              variant="outline"
              onClick={handleChangeToContract}
              disabled={isSubmitting || isChangingType}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 mr-auto"
            >
              {isChangingType ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Cambiar a Contrato
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting || isChangingType}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isChangingType}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {invoice ? 'Guardar cambios' : 'Crear factura'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
