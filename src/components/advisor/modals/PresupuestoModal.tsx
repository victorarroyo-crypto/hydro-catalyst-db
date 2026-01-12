import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Sparkles } from "lucide-react";

interface PresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PresupuestoData) => Promise<void>;
}

export interface PresupuestoData {
  empresa: string;
  contacto: string;
  email: string;
  telefono: string;
  sector: string;
  caudal: string;
  problema: string;
  urgencia: string;
}

const SECTORES = [
  'Farmacéutica', 'Química', 'Alimentaria', 'Textil',
  'Metalúrgica', 'Papelera', 'Petroquímica', 'Otro'
];

export const PresupuestoModal = ({ 
  isOpen, 
  onClose, 
  onSubmit
}: PresupuestoModalProps) => {
  const [formData, setFormData] = useState<PresupuestoData>({
    empresa: '',
    contacto: '',
    email: '',
    telefono: '',
    sector: '',
    caudal: '',
    problema: '',
    urgencia: 'normal'
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof PresupuestoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.empresa || !formData.contacto || !formData.email || !formData.problema) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(formData);
      
      handleClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      empresa: '', contacto: '', email: '', telefono: '',
      sector: '', caudal: '', problema: '', urgencia: 'normal'
    });
    onClose();
  };

  const isFormValid = formData.empresa && formData.contacto && formData.email && formData.problema;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>💼</span>
            Solicitar Presupuesto
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-muted-foreground">
          Un consultor de Vandarum se pondrá en contacto contigo en 24-48h.
        </p>
        
        <div className="space-y-5 py-4">
          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Input
                value={formData.empresa}
                onChange={(e) => updateField('empresa', e.target.value)}
                placeholder="Nombre de la empresa"
              />
            </div>
            <div className="space-y-2">
              <Label>Contacto *</Label>
              <Input
                value={formData.contacto}
                onChange={(e) => updateField('contacto', e.target.value)}
                placeholder="Nombre y apellidos"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                type="tel"
                value={formData.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select
                value={formData.sector}
                onValueChange={(v) => updateField('sector', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Caudal aproximado</Label>
              <Input
                value={formData.caudal}
                onChange={(e) => updateField('caudal', e.target.value)}
                placeholder="Ej: 100 m³/día"
              />
            </div>
          </div>
          
          {/* Problema */}
          <div className="space-y-2">
            <Label>Describe tu problema o necesidad *</Label>
            <Textarea
              value={formData.problema}
              onChange={(e) => updateField('problema', e.target.value)}
              rows={4}
              placeholder="Cuéntanos sobre tu situación actual, qué parámetros necesitas tratar, límites de vertido..."
            />
          </div>
          
          {/* Urgencia */}
          <div className="space-y-2">
            <Label>Urgencia</Label>
            <RadioGroup 
              value={formData.urgencia} 
              onValueChange={(v) => updateField('urgencia', v)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgente" id="urgente" />
                <Label htmlFor="urgente" className="font-normal cursor-pointer">
                  🔴 Urgente (&lt;1 semana)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="font-normal cursor-pointer">
                  🟡 Normal (1-4 semanas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="planificacion" id="planificacion" />
                <Label htmlFor="planificacion" className="font-normal cursor-pointer">
                  🟢 Planificación (&gt;1 mes)
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Free badge */}
          <div className="flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              Este servicio es gratuito
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Solicitar presupuesto'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
