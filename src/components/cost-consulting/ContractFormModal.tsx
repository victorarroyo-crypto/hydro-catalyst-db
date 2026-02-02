import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FileDown, ArrowRightLeft } from 'lucide-react';
import { CostContract, CostSupplier } from '@/hooks/useCostConsultingData';
import { 
  createContract, 
  updateContract, 
  changeDocumentType,
  ContractFormData,
  Category,
  getCategories 
} from '@/services/costConsultingApi';
import { useQueryClient } from '@tanstack/react-query';
interface ContractFormModalProps {
  projectId: string;
  contract?: CostContract | null;
  suppliers: CostSupplier[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId?: string;
}

export const ContractFormModal = ({
  projectId,
  contract,
  suppliers,
  open,
  onClose,
  onSaved,
  userId,
}: ContractFormModalProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ContractFormData>({
    supplier_id: '',
    supplier_name_raw: '',
    category_id: '',
    contract_number: '',
    contract_title: '',
    start_date: '',
    end_date: '',
    auto_renewal: false,
    notice_period_days: 30,
    total_annual_value: '',
    payment_days: 30,
    early_payment_discount: '',
    indexation_clause: '',
    penalty_clauses: '',
    notes: '',
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (contract) {
      setFormData({
        supplier_id: contract.cost_suppliers?.name ? '' : '',
        supplier_name_raw: contract.supplier_name_raw || '',
        category_id: '',
        contract_number: contract.contract_number || '',
        contract_title: '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        auto_renewal: contract.auto_renewal || false,
        notice_period_days: contract.notice_period_days || 30,
        total_annual_value: contract.total_annual_value || '',
        payment_days: contract.payment_days || 30,
        early_payment_discount: '',
        indexation_clause: '',
        penalty_clauses: '',
        notes: '',
      });
    } else {
      setFormData({
        supplier_id: '',
        supplier_name_raw: '',
        category_id: '',
        contract_number: '',
        contract_title: '',
        start_date: '',
        end_date: '',
        auto_renewal: false,
        notice_period_days: 30,
        total_annual_value: '',
        payment_days: 30,
        early_payment_discount: '',
        indexation_clause: '',
        penalty_clauses: '',
        notes: '',
      });
    }
  }, [contract, open]);

  const handleSubmit = async () => {
    if (!formData.supplier_name_raw && !formData.supplier_id) {
      toast.error('Debes seleccionar o introducir un proveedor');
      return;
    }

    setIsSubmitting(true);
    try {
      if (contract) {
        await updateContract(projectId, contract.id, formData);
        toast.success('Contrato actualizado');
      } else {
        await createContract(projectId, formData);
        toast.success('Contrato creado');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error('Error al guardar el contrato');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get file_url from the associated document
  const fileUrl = (contract as any)?.cost_project_documents?.file_url;

  const handleChangeToInvoice = async () => {
    if (!contract?.id || !projectId || !userId) return;
    
    const confirmed = window.confirm(
      '¿Estás seguro de cambiar este documento de CONTRATO a FACTURA?\n\n' +
      'El documento se moverá a la tabla de facturas.'
    );
    
    if (!confirmed) return;
    
    setIsChangingType(true);
    try {
      await changeDocumentType(projectId, 'contract', contract.id, userId);
      toast.success('Documento convertido a factura');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {contract ? 'Editar Contrato' : 'Nuevo Contrato Manual'}
              </DialogTitle>
              <DialogDescription>
                {contract
                  ? 'Modifica los datos del contrato'
                  : 'Introduce los datos del contrato manualmente'}
              </DialogDescription>
            </div>
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

        <div className="grid grid-cols-2 gap-4">
          {/* Proveedor */}
          <div className="col-span-2">
            <Label>Proveedor</Label>
            <Select
              value={formData.supplier_id || ''}
              onValueChange={(v) =>
                setFormData({ ...formData, supplier_id: v, supplier_name_raw: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor existente" />
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

          {/* O nombre manual */}
          <div className="col-span-2">
            <Label>O introducir nombre manualmente</Label>
            <Input
              placeholder="Nombre del proveedor (si no está en la lista)"
              value={formData.supplier_name_raw || ''}
              onChange={(e) =>
                setFormData({ ...formData, supplier_name_raw: e.target.value, supplier_id: '' })
              }
            />
          </div>

          {/* Categoría */}
          <div>
            <Label>Categoría</Label>
            <Select
              value={formData.category_id || ''}
              onValueChange={(v) => setFormData({ ...formData, category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Número de contrato */}
          <div>
            <Label>Nº Contrato</Label>
            <Input
              value={formData.contract_number || ''}
              onChange={(e) =>
                setFormData({ ...formData, contract_number: e.target.value })
              }
            />
          </div>

          {/* Título */}
          <div className="col-span-2">
            <Label>Título/Descripción</Label>
            <Input
              value={formData.contract_title || ''}
              onChange={(e) =>
                setFormData({ ...formData, contract_title: e.target.value })
              }
            />
          </div>

          {/* Fechas */}
          <div>
            <Label>Fecha inicio</Label>
            <Input
              type="date"
              value={formData.start_date || ''}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Fecha fin</Label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
            />
          </div>

          {/* Renovación automática */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-renewal"
              checked={formData.auto_renewal || false}
              onCheckedChange={(v) =>
                setFormData({ ...formData, auto_renewal: !!v })
              }
            />
            <Label htmlFor="auto-renewal">Renovación automática</Label>
          </div>
          <div>
            <Label>Días preaviso</Label>
            <Input
              type="number"
              value={formData.notice_period_days || 30}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notice_period_days: parseInt(e.target.value) || 30,
                })
              }
            />
          </div>

          {/* Valor y condiciones */}
          <div>
            <Label>Valor anual (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.total_annual_value || ''}
              onChange={(e) =>
                setFormData({ ...formData, total_annual_value: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Días de pago</Label>
            <Input
              type="number"
              value={formData.payment_days || 30}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_days: parseInt(e.target.value) || 30,
                })
              }
            />
          </div>

          <div>
            <Label>Dto. pronto pago (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.early_payment_discount || ''}
              onChange={(e) =>
                setFormData({ ...formData, early_payment_discount: e.target.value })
              }
            />
          </div>

          {/* Cláusulas */}
          <div className="col-span-2">
            <Label>Cláusula de indexación</Label>
            <Textarea
              value={formData.indexation_clause || ''}
              onChange={(e) =>
                setFormData({ ...formData, indexation_clause: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="col-span-2">
            <Label>Penalizaciones</Label>
            <Textarea
              value={formData.penalty_clauses || ''}
              onChange={(e) =>
                setFormData({ ...formData, penalty_clauses: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="col-span-2">
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
          {contract && userId && (
            <Button
              variant="outline"
              onClick={handleChangeToInvoice}
              disabled={isSubmitting || isChangingType}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 mr-auto"
            >
              {isChangingType ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Cambiar a Factura
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting || isChangingType}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isChangingType}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contract ? 'Guardar cambios' : 'Crear contrato'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
