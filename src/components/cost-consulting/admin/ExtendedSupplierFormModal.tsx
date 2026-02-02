import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Supplier, SupplierCategory, SUPPLIER_CATEGORIES } from '@/types/costConsulting';

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  trade_name: z.string().max(200).optional(),
  tax_id: z.string().max(20).optional(),
  categoria: z.string().optional(),
  country: z.string().default('España'),
  region: z.string().optional(),
  web: z.string().url('URL inválida').optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  ambito_geografico: z.string().optional(),
  notas: z.string().optional(),
  // Commercial conditions
  plazo_pago_dias: z.coerce.number().optional(),
  descuento_pronto_pago: z.coerce.number().optional(),
  lead_time_dias: z.coerce.number().optional(),
  minimo_pedido: z.string().optional(),
  // Contact
  contacto_nombre: z.string().optional(),
  contacto_email: z.string().email().optional().or(z.literal('')),
  contacto_telefono: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface ExtendedSupplierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (data: Partial<Supplier>) => void;
  isLoading?: boolean;
}

export const ExtendedSupplierFormModal = ({
  open,
  onOpenChange,
  supplier,
  onSubmit,
  isLoading,
}: ExtendedSupplierFormModalProps) => {
  const isEditing = !!supplier;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || '',
      trade_name: supplier?.trade_name || '',
      tax_id: supplier?.tax_id || '',
      categoria: supplier?.categoria || '',
      country: supplier?.country || 'España',
      region: supplier?.region || '',
      web: supplier?.web || '',
      email: supplier?.email || '',
      phone: supplier?.phone || '',
      ambito_geografico: supplier?.ambito_geografico || '',
      notas: supplier?.notas || '',
      plazo_pago_dias: supplier?.condiciones_comerciales?.plazo_pago_dias || undefined,
      descuento_pronto_pago: supplier?.condiciones_comerciales?.descuento_pronto_pago || undefined,
      lead_time_dias: supplier?.condiciones_comerciales?.lead_time_dias || undefined,
      minimo_pedido: supplier?.condiciones_comerciales?.minimo_pedido || '',
      contacto_nombre: supplier?.contacto_comercial?.nombre || '',
      contacto_email: supplier?.contacto_comercial?.email || '',
      contacto_telefono: supplier?.contacto_comercial?.telefono || '',
    },
  });

  const handleSubmit = (values: SupplierFormValues) => {
    const data: Partial<Supplier> = {
      name: values.name,
      trade_name: values.trade_name || undefined,
      tax_id: values.tax_id || undefined,
      categoria: values.categoria as SupplierCategory | undefined,
      country: values.country,
      region: values.region || undefined,
      web: values.web || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      ambito_geografico: values.ambito_geografico || undefined,
      notas: values.notas || undefined,
    };

    // Add commercial conditions if any are set
    if (values.plazo_pago_dias || values.descuento_pronto_pago || values.lead_time_dias || values.minimo_pedido) {
      data.condiciones_comerciales = {
        plazo_pago_dias: values.plazo_pago_dias,
        descuento_pronto_pago: values.descuento_pronto_pago,
        lead_time_dias: values.lead_time_dias,
        minimo_pedido: values.minimo_pedido,
      };
    }

    // Add contact info if any are set
    if (values.contacto_nombre || values.contacto_email || values.contacto_telefono) {
      data.contacto_comercial = {
        nombre: values.contacto_nombre || '',
        email: values.contacto_email || '',
        telefono: values.contacto_telefono || '',
      };
    }

    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#307177]">
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Datos básicos</TabsTrigger>
                <TabsTrigger value="commercial">Comercial</TabsTrigger>
                <TabsTrigger value="contact">Contacto</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del proveedor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trade_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre comercial</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre comercial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIF/NIF</FormLabel>
                        <FormControl>
                          <Input placeholder="B12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(SUPPLIER_CATEGORIES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl>
                          <Input placeholder="España" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Región</FormLabel>
                        <FormControl>
                          <Input placeholder="Comunidad Autónoma" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ambito_geografico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ámbito geográfico</FormLabel>
                      <FormControl>
                        <Input placeholder="Nacional, Europa, Global..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales sobre el proveedor..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="commercial" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="plazo_pago_dias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plazo de pago (días)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descuento_pronto_pago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dto. pronto pago (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lead_time_dias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead time (días)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="7" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimo_pedido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pedido mínimo</FormLabel>
                        <FormControl>
                          <Input placeholder="1.000 €" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="web"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio web</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email general</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+34 900 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-sm">Contacto comercial</h4>
                  <FormField
                    control={form.control}
                    name="contacto_nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del contacto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contacto_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contacto@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contacto_telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="+34 600 000 000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#307177] hover:bg-[#307177]/90">
                {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendedSupplierFormModal;
