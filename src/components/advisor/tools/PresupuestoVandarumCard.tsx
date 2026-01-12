import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, FileEdit, Send, CheckCircle } from "lucide-react";
import { PresupuestoVandarumMetadata, FormField } from "@/types/advisorTools";
import { useToast } from "@/hooks/use-toast";

interface Props {
  metadata: PresupuestoVandarumMetadata;
}

export function PresupuestoVandarumCard({ metadata }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedServicios, setSelectedServicios] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const updateField = (campo: string, valor: string) => {
    setFormData({ ...formData, [campo]: valor });
  };

  const toggleServicio = (codigo: string) => {
    setSelectedServicios(prev => 
      prev.includes(codigo) 
        ? prev.filter(s => s !== codigo)
        : [...prev, codigo]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Aquí podrías enviar a un endpoint real
      // await fetch('/api/advisor/callback', { ... })
      
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
      toast({
        title: "Solicitud enviada",
        description: "Vandarum se pondrá en contacto en 24-48h laborables",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.campo] || '';
    
    switch (field.tipo) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateField(field.campo, e.target.value)}
            placeholder={field.label}
            className="h-20"
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(v) => updateField(field.campo, v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'boolean':
        return (
          <Select value={value} onValueChange={(v) => updateField(field.campo, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type={field.tipo}
            value={value}
            onChange={(e) => updateField(field.campo, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="font-semibold text-lg">¡Solicitud Enviada!</h3>
            <p className="text-sm text-muted-foreground">
              El equipo de Vandarum se pondrá en contacto contigo en 24-48 horas laborables.
            </p>
            <p className="text-xs text-muted-foreground">
              Referencia: #{Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-purple-600" />
          🏢 Solicitar Consultoría
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <div>
            <p className="font-medium text-sm">{metadata.empresa.nombre}</p>
            <p className="text-xs text-muted-foreground">{metadata.empresa.especialidad}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Servicios disponibles */}
        <h4 className="font-medium text-sm">Servicios disponibles:</h4>
        <div className="grid gap-2">
          {metadata.servicios.slice(0, 3).map((servicio) => (
            <div key={servicio.codigo} className="bg-background p-2 rounded border text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">{servicio.nombre}</span>
                <Badge variant="outline" className="text-xs">{servicio.duracion}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{servicio.descripcion}</p>
            </div>
          ))}
          {metadata.servicios.length > 3 && (
            <p className="text-xs text-muted-foreground">+{metadata.servicios.length - 3} servicios más...</p>
          )}
        </div>
        
        {/* Botón para abrir formulario */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <FileEdit className="h-4 w-4" />
              Completar Solicitud
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Solicitud de Presupuesto - {metadata.empresa.nombre}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Pasos */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step >= s ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
              
              {/* Step 1: Datos empresa */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Datos de su Empresa</h3>
                  {metadata.formulario.datos_empresa.map((field) => (
                    <div key={field.campo} className="space-y-1">
                      <Label className="text-sm">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Step 2: Datos técnicos */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Datos Técnicos</h3>
                  {metadata.formulario.datos_tecnicos.map((field) => (
                    <div key={field.campo} className="space-y-1">
                      <Label className="text-sm">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Servicios de interés</Label>
                    {metadata.servicios.map((servicio) => (
                      <div key={servicio.codigo} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedServicios.includes(servicio.codigo)}
                          onCheckedChange={() => toggleServicio(servicio.codigo)}
                        />
                        <span className="text-sm">{servicio.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Step 3: Info adicional y enviar */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Información Adicional</h3>
                  {metadata.formulario.informacion_adicional.map((field) => (
                    <div key={field.campo} className="space-y-1">
                      <Label className="text-sm">{field.label}</Label>
                      {renderField(field)}
                    </div>
                  ))}
                  
                  <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
                    <p>✓ Sus datos serán tratados de forma confidencial</p>
                    <p>✓ Sin compromiso hasta aceptación formal</p>
                    <p>✓ Respuesta en 24-48 horas laborables</p>
                  </div>
                </div>
              )}
              
              {/* Navegación */}
              <div className="flex justify-between pt-4 border-t">
                {step > 1 ? (
                  <Button variant="outline" onClick={() => setStep(step - 1)}>
                    Anterior
                  </Button>
                ) : (
                  <div />
                )}
                
                {step < 3 ? (
                  <Button onClick={() => setStep(step + 1)}>
                    Siguiente
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Solicitud
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <p className="text-xs text-muted-foreground text-center">
          Sin compromiso • Respuesta en 24-48h
        </p>
      </CardContent>
    </Card>
  );
}
