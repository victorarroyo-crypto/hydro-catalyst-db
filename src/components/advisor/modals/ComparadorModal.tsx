import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { externalSupabase } from "@/integrations/supabase/externalClient";

interface ComparadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ComparadorData) => Promise<void>;
  userCredits: number;
}

export interface ComparadorData {
  attachments: { url: string; name: string; type: string }[];
  criterios: string[];
  notas: string;
}

const CRITERIOS_OPTIONS = [
  { id: 'capex', label: 'CAPEX (€)' },
  { id: 'opex', label: 'OPEX (€/año)' },
  { id: 'garantia', label: 'Garantía rendimiento' },
  { id: 'plazo', label: 'Plazo entrega' },
  { id: 'referencias', label: 'Referencias' },
  { id: 'energia', label: 'Consumo energético' },
  { id: 'huella', label: 'Huella instalación' },
  { id: 'postventa', label: 'Servicio postventa' },
];

export const ComparadorModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userCredits 
}: ComparadorModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [criterios, setCriterios] = useState<string[]>(['capex', 'opex', 'garantia', 'plazo']);
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfFiles].slice(0, 10));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCriterio = (criterioId: string) => {
    setCriterios(prev => 
      prev.includes(criterioId) 
        ? prev.filter(c => c !== criterioId)
        : [...prev, criterioId]
    );
  };

  const uploadFiles = async (): Promise<{ url: string; name: string; type: string }[]> => {
    const attachments: { url: string; name: string; type: string }[] = [];
    
    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `services/comparador/${timestamp}_${safeName}`;
      
      const { data, error } = await externalSupabase.storage
        .from('knowledge-docs')
        .upload(filePath, file);
      
      if (!error && data) {
        const { data: urlData } = await externalSupabase.storage
          .from('knowledge-docs')
          .createSignedUrl(filePath, 4 * 60 * 60);
        
        if (urlData?.signedUrl) {
          attachments.push({
            url: urlData.signedUrl,
            name: file.name,
            type: file.type
          });
        }
      }
    }
    
    return attachments;
  };

  const handleSubmit = async () => {
    if (files.length < 2) {
      return;
    }
    
    if (userCredits < 5) {
      return;
    }
    
    setIsLoading(true);
    try {
      const attachments = await uploadFiles();
      
      await onSubmit({
        attachments,
        criterios,
        notas
      });
      
      // Limpiar y cerrar
      setFiles([]);
      setNotas('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setNotas('');
    setCriterios(['capex', 'opex', 'garantia', 'plazo']);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>📊</span>
            Comparador de Ofertas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Upload area */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Ofertas de proveedores (PDF) *
            </Label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Añadir archivos PDF
                </span>
                <span className="text-xs text-muted-foreground">
                  Mínimo 2, máximo 10 ofertas
                </span>
              </div>
            </label>
            
            {/* Files list */}
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className="text-sm truncate max-w-[300px]">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Criterios */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Criterios de comparación
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CRITERIOS_OPTIONS.map(opt => (
                <label key={opt.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={criterios.includes(opt.id)}
                    onCheckedChange={() => toggleCriterio(opt.id)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Información adicional sobre el proyecto, prioridades, restricciones..."
              rows={3}
            />
          </div>
          
          {/* Credits info */}
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <span className="text-sm">Coste del servicio:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">5 créditos</span>
          </div>
          
          {userCredits < 5 && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              ⚠️ Créditos insuficientes. Tienes {userCredits.toFixed(1)} créditos, necesitas 5.
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
            disabled={files.length < 2 || isLoading || userCredits < 5}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Comparar ofertas'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
