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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileText, FileSpreadsheet, File } from "lucide-react";

interface FichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FichaData) => Promise<void>;
  userCredits: number;
}

export interface FichaData {
  query: string;
  format: string;
}

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: <FileText className="w-4 h-4" /> },
  { id: 'xlsx', label: 'Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: 'docx', label: 'Word', icon: <File className="w-4 h-4" /> },
];

export const FichaModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userCredits 
}: FichaModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [format, setFormat] = useState('pdf');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    
    if (userCredits < 3) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit({
        query: searchQuery,
        format
      });
      
      handleClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setFormat('pdf');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>📄</span>
            Ficha Técnica
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Buscar tecnologías *</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ej: MBR, ósmosis inversa, DAF, MBBR..."
            />
            <p className="text-xs text-muted-foreground">
              Buscaremos en nuestra base de datos de 2,500+ tecnologías
            </p>
          </div>
          
          {/* Format */}
          <div className="space-y-2">
            <Label>Formato de descarga</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="flex gap-4">
              {FORMATS.map(f => (
                <div key={f.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={f.id} id={`format-${f.id}`} />
                  <Label htmlFor={`format-${f.id}`} className="font-normal cursor-pointer flex items-center gap-1.5">
                    {f.icon}
                    {f.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {/* Credits info */}
          <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
            <span className="text-sm">Coste del servicio:</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">3 créditos</span>
          </div>
          
          {userCredits < 3 && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              ⚠️ Créditos insuficientes. Tienes {userCredits.toFixed(1)} créditos, necesitas 3.
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
            disabled={!searchQuery.trim() || isLoading || userCredits < 3}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar fichas'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
