import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Globe, 
  Mail, 
  Phone, 
  Star,
  Building2,
  MapPin,
  Edit,
  Trash2
} from 'lucide-react';
import { Supplier, SUPPLIER_CATEGORIES } from '@/types/costConsulting';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SupplierDetailSheetProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

const RatingStars = ({ value }: { value: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= value ? 'fill-[#ffa720] text-[#ffa720]' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
};

export const SupplierDetailSheet = ({
  supplier,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: SupplierDetailSheetProps) => {
  if (!supplier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-[#307177]">{supplier.name}</SheetTitle>
              {supplier.trade_name && (
                <p className="text-sm text-muted-foreground">{supplier.trade_name}</p>
              )}
            </div>
            <div className="flex gap-2">
              {supplier.verified ? (
                <Badge className="bg-[#8cb63c] text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verificado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-[#ffa720] text-[#ffa720]">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
              {!supplier.activo && (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Inactivo
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Información básica</h4>
            {supplier.tax_id && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CIF:</span>
                <span>{supplier.tax_id}</span>
              </div>
            )}
            {supplier.categoria && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Categoría:</span>
                <Badge variant="outline">{SUPPLIER_CATEGORIES[supplier.categoria]}</Badge>
              </div>
            )}
            {(supplier.country || supplier.region) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[supplier.region, supplier.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Contacto</h4>
            {supplier.web && (
              <a
                href={supplier.web}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#32b4cd] hover:underline"
              >
                <Globe className="h-4 w-4" />
                {supplier.web}
              </a>
            )}
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="flex items-center gap-2 text-sm text-[#32b4cd] hover:underline"
              >
                <Mail className="h-4 w-4" />
                {supplier.email}
              </a>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone}
              </div>
            )}
            {supplier.contacto_comercial && (
              <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                <p className="font-medium">{supplier.contacto_comercial.nombre}</p>
                <p className="text-muted-foreground">{supplier.contacto_comercial.email}</p>
                <p className="text-muted-foreground">{supplier.contacto_comercial.telefono}</p>
              </div>
            )}
          </div>

          {/* Rating */}
          {supplier.rating && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Valoración</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Calidad</span>
                    <RatingStars value={supplier.rating.calidad} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Servicio</span>
                    <RatingStars value={supplier.rating.servicio} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Precio</span>
                    <RatingStars value={supplier.rating.precio} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cumplimiento</span>
                    <RatingStars value={supplier.rating.cumplimiento} />
                  </div>
                </div>
                {supplier.rating.notas && (
                  <p className="text-sm text-muted-foreground italic">
                    {supplier.rating.notas}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Commercial Conditions */}
          {supplier.condiciones_comerciales && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Condiciones comerciales
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {supplier.condiciones_comerciales.plazo_pago_dias && (
                    <div>
                      <span className="text-muted-foreground">Plazo pago:</span>{' '}
                      {supplier.condiciones_comerciales.plazo_pago_dias} días
                    </div>
                  )}
                  {supplier.condiciones_comerciales.descuento_pronto_pago && (
                    <div>
                      <span className="text-muted-foreground">Dto. pronto pago:</span>{' '}
                      {supplier.condiciones_comerciales.descuento_pronto_pago}%
                    </div>
                  )}
                  {supplier.condiciones_comerciales.lead_time_dias && (
                    <div>
                      <span className="text-muted-foreground">Lead time:</span>{' '}
                      {supplier.condiciones_comerciales.lead_time_dias} días
                    </div>
                  )}
                  {supplier.condiciones_comerciales.minimo_pedido && (
                    <div>
                      <span className="text-muted-foreground">Mín. pedido:</span>{' '}
                      {supplier.condiciones_comerciales.minimo_pedido}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Products/Services */}
          {supplier.productos_servicios && supplier.productos_servicios.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Productos/Servicios
                </h4>
                <div className="space-y-2">
                  {supplier.productos_servicios.map((ps, idx) => (
                    <div
                      key={idx}
                      className="p-2 border rounded-md text-sm space-y-1"
                    >
                      <p className="font-medium">{ps.producto}</p>
                      {ps.descripcion && (
                        <p className="text-muted-foreground">{ps.descripcion}</p>
                      )}
                      {ps.unidad_tipica && (
                        <p className="text-xs text-muted-foreground">
                          Unidad: {ps.unidad_tipica}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {supplier.notas && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Notas</h4>
                <p className="text-sm">{supplier.notas}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(supplier)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente
                    el proveedor "{supplier.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(supplier.id);
                      onOpenChange(false);
                    }}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SupplierDetailSheet;
