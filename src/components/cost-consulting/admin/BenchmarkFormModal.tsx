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
  FormDescription,
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
import { BenchmarkPrice, BenchmarkCreateData } from '@/types/costConsulting';
import { BenchmarkPriceBar } from './BenchmarkPriceBar';
import { useEffect } from 'react';

const CATEGORY_CODES = [
  { code: 'quimicos_basicos', name: 'Químicos Básicos' },
  { code: 'quimicos_especiales', name: 'Químicos Especiales' },
  { code: 'floculantes_coagulantes', name: 'Floculantes y Coagulantes' },
  { code: 'energia_electrica', name: 'Energía Eléctrica' },
  { code: 'gestion_lodos', name: 'Gestión de Lodos' },
  { code: 'gestion_residuos', name: 'Gestión de Residuos' },
  { code: 'analiticas', name: 'Analíticas' },
  { code: 'mantenimiento_general', name: 'Mantenimiento General' },
  { code: 'instrumentacion', name: 'Instrumentación' },
  { code: 'otros', name: 'Otros' },
];

const UNITS = [
  '€/kg',
  '€/L',
  '€/m³',
  '€/Tn',
  '€/kWh',
  '€/MWh',
  '€/análisis',
  '€/mes',
  '€/año',
  '€/unidad',
];

const benchmarkSchema = z.object({
  category_code: z.string().min(1, 'La categoría es obligatoria'),
  product_name: z.string().min(1, 'El producto es obligatorio').max(200),
  unit: z.string().min(1, 'La unidad es obligatoria'),
  region: z.string().optional(),
  price_p10: z.coerce.number().positive('Debe ser mayor que 0'),
  price_p25: z.coerce.number().positive('Debe ser mayor que 0'),
  price_p50: z.coerce.number().positive('Debe ser mayor que 0'),
  price_p75: z.coerce.number().positive('Debe ser mayor que 0'),
  price_p90: z.coerce.number().positive('Debe ser mayor que 0'),
  source: z.string().min(1, 'La fuente es obligatoria'),
  valid_from: z.string().min(1, 'Fecha inicio obligatoria'),
  valid_until: z.string().min(1, 'Fecha fin obligatoria'),
  notes: z.string().optional(),
}).refine(
  data => data.price_p10 <= data.price_p25 && 
          data.price_p25 <= data.price_p50 && 
          data.price_p50 <= data.price_p75 && 
          data.price_p75 <= data.price_p90,
  { message: 'Los percentiles deben estar en orden ascendente (P10 ≤ P25 ≤ P50 ≤ P75 ≤ P90)', path: ['price_p10'] }
);

type BenchmarkFormValues = z.infer<typeof benchmarkSchema>;

interface BenchmarkFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benchmark?: BenchmarkPrice | null;
  onSubmit: (data: BenchmarkCreateData) => void;
  isLoading?: boolean;
}

export const BenchmarkFormModal = ({
  open,
  onOpenChange,
  benchmark,
  onSubmit,
  isLoading,
}: BenchmarkFormModalProps) => {
  const isEditing = !!benchmark;

  const form = useForm<BenchmarkFormValues>({
    resolver: zodResolver(benchmarkSchema),
    defaultValues: {
      category_code: benchmark?.cost_categories?.code || '',
      product_name: benchmark?.product_name || '',
      unit: benchmark?.unit || '',
      region: benchmark?.region || '',
      price_p10: benchmark?.price_p10 || 0,
      price_p25: benchmark?.price_p25 || 0,
      price_p50: benchmark?.price_p50 || 0,
      price_p75: benchmark?.price_p75 || 0,
      price_p90: benchmark?.price_p90 || 0,
      source: benchmark?.source || '',
      valid_from: benchmark?.valid_from || new Date().toISOString().split('T')[0],
      valid_until: benchmark?.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: benchmark?.notes || '',
    },
  });

  // Reset form when benchmark changes
  useEffect(() => {
    if (benchmark) {
      form.reset({
        category_code: benchmark.cost_categories?.code || '',
        product_name: benchmark.product_name,
        unit: benchmark.unit,
        region: benchmark.region || '',
        price_p10: benchmark.price_p10,
        price_p25: benchmark.price_p25,
        price_p50: benchmark.price_p50,
        price_p75: benchmark.price_p75,
        price_p90: benchmark.price_p90,
        source: benchmark.source,
        valid_from: benchmark.valid_from,
        valid_until: benchmark.valid_until,
        notes: benchmark.notes || '',
      });
    }
  }, [benchmark, form]);

  const watchedValues = form.watch();
  const previewBenchmark: BenchmarkPrice | null = 
    watchedValues.price_p10 > 0 && 
    watchedValues.price_p25 > 0 && 
    watchedValues.price_p50 > 0 && 
    watchedValues.price_p75 > 0 && 
    watchedValues.price_p90 > 0
      ? {
          id: 'preview',
          vertical_id: '',
          category_id: '',
          product_name: watchedValues.product_name,
          unit: watchedValues.unit,
          price_p10: watchedValues.price_p10,
          price_p25: watchedValues.price_p25,
          price_p50: watchedValues.price_p50,
          price_p75: watchedValues.price_p75,
          price_p90: watchedValues.price_p90,
          source: watchedValues.source,
          valid_from: watchedValues.valid_from,
          valid_until: watchedValues.valid_until,
        }
      : null;

  const handleSubmit = (values: BenchmarkFormValues) => {
    onSubmit(values as BenchmarkCreateData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#307177]">
            {isEditing ? 'Editar Benchmark' : 'Nuevo Benchmark de Precio'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_CODES.map((cat) => (
                          <SelectItem key={cat.code} value={cat.code}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="product_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="NaOH 50% cisterna" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="Nacional (dejar vacío)" {...field} />
                    </FormControl>
                    <FormDescription>Dejar vacío para benchmark nacional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price Percentiles */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm">Percentiles de precio *</h4>
              <p className="text-xs text-muted-foreground">
                P10 = muy barato, P50 = mediana, P90 = muy caro
              </p>
              <div className="grid grid-cols-5 gap-3">
                <FormField
                  control={form.control}
                  name="price_p10"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">P10</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_p25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">P25</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_p50"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">P50</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_p75"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">P75</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_p90"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">P90</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview bar */}
              {previewBenchmark && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                  <BenchmarkPriceBar benchmark={previewBenchmark} showLabels />
                </div>
              )}
            </div>

            {/* Validity */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mercado 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido desde *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido hasta *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el benchmark..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#307177] hover:bg-[#307177]/90">
                {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear benchmark'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BenchmarkFormModal;
