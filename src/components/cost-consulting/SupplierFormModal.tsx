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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CostSupplier } from '@/hooks/useCostConsultingData';
import { createSupplier, updateSupplier, SupplierFormData } from '@/services/costConsultingApi';

interface SupplierFormModalProps {
  supplier?: CostSupplier | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (< 10 empleados)' },
  { value: 'pyme', label: 'PYME (10-50 empleados)' },
  { value: 'mediana', label: 'Mediana (50-250 empleados)' },
  { value: 'grande', label: 'Grande (> 250 empleados)' },
];

const SPANISH_REGIONS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Madrid',
  'Murcia',
  'Navarra',
  'País Vasco',
  'Valencia',
  'Ceuta',
  'Melilla',
];

export const SupplierFormModal = ({
  supplier,
  open,
  onClose,
  onSaved,
}: SupplierFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    trade_name: '',
    tax_id: '',
    country: 'España',
    region: '',
    web: '',
    email: '',
    phone: '',
    contact_person: '',
    company_size: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        trade_name: supplier.trade_name || '',
        tax_id: supplier.tax_id || '',
        country: 'España',
        region: supplier.region || '',
        web: '',
        email: '',
        phone: '',
        contact_person: '',
        company_size: supplier.company_size || '',
      });
    } else {
      setFormData({
        name: '',
        trade_name: '',
        tax_id: '',
        country: 'España',
        region: '',
        web: '',
        email: '',
        phone: '',
        contact_person: '',
        company_size: '',
      });
    }
  }, [supplier, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      if (supplier) {
        await updateSupplier(supplier.id, formData);
        toast.success('Proveedor actualizado');
      } else {
        await createSupplier(formData);
        toast.success('Proveedor creado');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error('Error al guardar el proveedor');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre de la empresa"
            />
          </div>

          <div>
            <Label>Nombre comercial</Label>
            <Input
              value={formData.trade_name || ''}
              onChange={(e) =>
                setFormData({ ...formData, trade_name: e.target.value })
              }
            />
          </div>

          <div>
            <Label>CIF/NIF</Label>
            <Input
              value={formData.tax_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, tax_id: e.target.value })
              }
              placeholder="B12345678"
            />
          </div>

          <div>
            <Label>País</Label>
            <Input
              value={formData.country || 'España'}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Comunidad Autónoma</Label>
            <Select
              value={formData.region || ''}
              onValueChange={(v) => setFormData({ ...formData, region: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {SPANISH_REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Web</Label>
            <Input
              value={formData.web || ''}
              onChange={(e) =>
                setFormData({ ...formData, web: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Teléfono</Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Persona de contacto</Label>
            <Input
              value={formData.contact_person || ''}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Tamaño empresa</Label>
            <Select
              value={formData.company_size || ''}
              onValueChange={(v) =>
                setFormData({ ...formData, company_size: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {supplier ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
