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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ChecklistData) => Promise<void>;
  userCredits: number;
}

export interface ChecklistData {
  sector: string;
  tipo_efluente: string;
  destino_vertido: string;
}

const SECTORES = [
  'Farmacéutica',
  'Química',
  'Alimentaria',
  'Textil',
  'Metalúrgica',
  'Papelera',
  'Petroquímica',
  'Láctea',
  'Cervecera',
  'Curtidos',
  'Cosmética',
  'Automoción',
  'Otro'
];

const DESTINOS = [
  { id: 'colector', label: 'Colector municipal' },
  { id: 'cauce', label: 'Cauce público (río, mar)' },
  { id: 'reutilizacion', label: 'Reutilización' },
];

export const ChecklistModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userCredits 
}: ChecklistModalProps) => {
  const [sector, setSector] = useState('');
  const [tipoEfluente, setTipoEfluente] = useState('');
  const [destinoVertido, setDestinoVertido] = useState('colector');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!sector) {
      return;
    }
    
    if (userCredits < 2) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit({
        sector,
        tipo_efluente: tipoEfluente,
        destino_vertido: destinoVertido
      });
      
      handleClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSector('');
    setTipoEfluente('');
    setDestinoVertido('colector');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>📋</span>
            Checklist de Análisis
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Sector */}
          <div className="space-y-2">
            <Label>Sector industrial *</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORES.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tipo efluente */}
          <div className="space-y-2">
            <Label>Tipo de efluente (opcional)</Label>
            <Input
              value={tipoEfluente}
              onChange={(e) => setTipoEfluente(e.target.value)}
              placeholder="Ej: aguas de proceso, lavado CIP, purgas..."
            />
          </div>
          
          {/* Destino */}
          <div className="space-y-2">
            <Label>Destino del vertido</Label>
            <RadioGroup value={destinoVertido} onValueChange={setDestinoVertido}>
              {DESTINOS.map(d => (
                <div key={d.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={d.id} id={d.id} />
                  <Label htmlFor={d.id} className="font-normal cursor-pointer">
                    {d.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {/* Credits info */}
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
            <span className="text-sm">Coste del servicio:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">2 créditos</span>
          </div>
          
          {userCredits < 2 && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              ⚠️ Créditos insuficientes. Tienes {userCredits.toFixed(1)} créditos, necesitas 2.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sector || isLoading || userCredits < 2}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar checklist'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
