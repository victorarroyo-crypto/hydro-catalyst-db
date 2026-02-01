import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Receipt, 
  Users, 
  Check, 
  Upload, 
  X, 
  Loader2,
  CalendarIcon,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  file: File;
  id: string;
}

interface FormData {
  name: string;
  vertical: string;
  clientSector: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

const VERTICALS = [
  { id: 'agua-industrial', name: 'Agua Industrial', icon: '💧' },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface FileDropZoneProps {
  title: string;
  icon: React.ReactNode;
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  acceptExcel?: boolean;
  required?: boolean;
  maxFiles?: number;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  title,
  icon,
  files,
  onFilesAdd,
  onFileRemove,
  acceptExcel = true,
  required = false,
  maxFiles,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} supera el límite de 20 MB`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      onFilesAdd(validFiles);
    }
  }, [onFilesAdd]);

  const accept = acceptExcel ? ACCEPTED_FORMATS : { 'application/pdf': ['.pdf'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles,
  });

  const displayedFiles = files.slice(0, 3);
  const remainingCount = files.length - 3;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isDragActive && "border-primary ring-2 ring-primary/20"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isDragActive 
              ? "Suelta los archivos aquí..." 
              : "Arrastra archivos aquí"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            o <span className="text-primary underline">seleccionar archivos</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {acceptExcel ? 'PDF, XLSX, XLS' : 'Solo PDF'} • Máx. 20 MB
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {displayedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm truncate">{f.file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({formatFileSize(f.file.size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(f.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="text-sm text-muted-foreground pl-2">
                ... y {remainingCount} más
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CostConsultingNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    vertical: '',
    clientSector: '',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [contracts, setContracts] = useState<UploadedFile[]>([]);
  const [invoices, setInvoices] = useState<UploadedFile[]>([]);
  const [suppliers, setSuppliers] = useState<UploadedFile[]>([]);

  const addFiles = (setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => (files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    setter(prev => [...prev, ...newFiles]);
  };

  const removeFile = (setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => (id: string) => {
    setter(prev => prev.filter(f => f.id !== id));
  };

  const isStep1Valid = formData.name.trim() !== '' && formData.vertical !== '';
  const isStep2Valid = contracts.length > 0 || invoices.length > 0;
  const isStep3Valid = confirmChecked;

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed() || !user) {
      if (!user) {
        toast.error('Sesión expirada. Por favor recarga la página.');
      }
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Get vertical ID
      const { data: verticalData } = await externalSupabase
        .from('cost_verticals')
        .select('id')
        .eq('name', VERTICALS.find(v => v.id === formData.vertical)?.name || '')
        .single();
      
      // 2. Create project in Supabase
      const { data: newProject, error: projectError } = await externalSupabase
        .from('cost_consulting_projects')
        .insert({
          user_id: user.id,
          name: formData.name,
          vertical_id: verticalData?.id || null,
          status: 'uploading',
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      const projectId = newProject.id;
      
      // 3. Upload documents via edge function (Railway backend)
      const allFiles = [
        ...contracts.map(f => ({ ...f, type: 'contrato' as const })),
        ...invoices.map(f => ({ ...f, type: 'factura' as const })),
        ...suppliers.map(f => ({ ...f, type: 'listado_proveedores' as const })),
      ];
      
      let successfulUploads = 0;
      let failedUploads = 0;
      
      for (const fileData of allFiles) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('file_type', fileData.type);
        formData.append('project_id', projectId);
        
        const { data, error } = await supabase.functions.invoke(
          'cost-consulting-upload',
          { body: formData }
        );
        
        if (error || !data?.success) {
          console.error(`Upload failed for ${fileData.file.name}:`, error || data?.error);
          failedUploads++;
          continue;
        }
        
        successfulUploads++;
      }
      
      // If no uploads succeeded, revert project to draft
      if (successfulUploads === 0 && allFiles.length > 0) {
        await externalSupabase
          .from('cost_consulting_projects')
          .update({ status: 'draft' })
          .eq('id', projectId);
        
        toast.error('Error al subir documentos. El almacenamiento no está disponible.');
        setIsSubmitting(false);
        return;
      }
      
      // Notify about failed uploads but continue if some succeeded
      if (failedUploads > 0) {
        toast.warning(`${failedUploads} archivo(s) no se pudieron subir`);
      }
      
      // 4. Update project status to processing
      await externalSupabase
        .from('cost_consulting_projects')
        .update({ status: 'processing' })
        .eq('id', projectId);
      
      toast.success('Proyecto creado correctamente. Iniciando análisis...');
      navigate(`/cost-consulting/${projectId}`);
      
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el análisis';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Información básica' },
    { number: 2, title: 'Subir documentos' },
    { number: 3, title: 'Confirmar' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cost-consulting')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Análisis de Costes</h1>
          <p className="text-muted-foreground">
            Sube tus documentos para identificar oportunidades de ahorro
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                  currentStep > step.number
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden sm:inline",
                  currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 sm:w-24 h-1 mx-2 sm:mx-4 rounded-full transition-colors",
                  currentStep > step.number ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>
                Define los datos principales del análisis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre del proyecto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Análisis EDAR Planta Norte 2024"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Vertical <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.vertical}
                  onValueChange={(value) => setFormData({ ...formData, vertical: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una vertical" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          <span>{v.icon}</span>
                          {v.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSector">Sector del cliente</Label>
                <Input
                  id="clientSector"
                  placeholder="Ej: Alimentación, Químico, Farmacéutico..."
                  value={formData.clientSector}
                  onChange={(e) => setFormData({ ...formData, clientSector: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Periodo de análisis</Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1">Desde</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateFrom 
                            ? format(formData.dateFrom, "PPP", { locale: es }) 
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateFrom}
                          onSelect={(date) => setFormData({ ...formData, dateFrom: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1">Hasta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateTo 
                            ? format(formData.dateTo, "PPP", { locale: es }) 
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateTo}
                          onSelect={(date) => setFormData({ ...formData, dateTo: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <FileDropZone
              title="Contratos"
              icon={<FileText className="h-5 w-5 text-blue-600" />}
              files={contracts}
              onFilesAdd={addFiles(setContracts)}
              onFileRemove={removeFile(setContracts)}
              required={invoices.length === 0}
            />

            <FileDropZone
              title="Facturas (últimos 24 meses)"
              icon={<Receipt className="h-5 w-5 text-green-600" />}
              files={invoices}
              onFilesAdd={addFiles(setInvoices)}
              onFileRemove={removeFile(setInvoices)}
              required={contracts.length === 0}
            />

            <FileDropZone
              title="Lista de Proveedores (opcional)"
              icon={<Users className="h-5 w-5 text-orange-600" />}
              files={suppliers}
              onFilesAdd={addFiles(setSuppliers)}
              onFileRemove={removeFile(setSuppliers)}
              maxFiles={1}
            />

            {!isStep2Valid && (
              <p className="text-sm text-muted-foreground text-center">
                Sube al menos 1 contrato o 1 factura para continuar
              </p>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                Confirmar y analizar
              </CardTitle>
              <CardDescription>
                Revisa los datos antes de iniciar el análisis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Proyecto</Label>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vertical</Label>
                    <p className="font-medium">
                      {VERTICALS.find(v => v.id === formData.vertical)?.name || '-'}
                    </p>
                  </div>
                  {formData.clientSector && (
                    <div>
                      <Label className="text-muted-foreground">Sector</Label>
                      <p className="font-medium">{formData.clientSector}</p>
                    </div>
                  )}
                  {(formData.dateFrom || formData.dateTo) && (
                    <div>
                      <Label className="text-muted-foreground">Periodo</Label>
                      <p className="font-medium">
                        {formData.dateFrom ? format(formData.dateFrom, "dd/MM/yyyy") : '?'} - {formData.dateTo ? format(formData.dateTo, "dd/MM/yyyy") : '?'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">Documentos a procesar</Label>
                  <div className="flex flex-wrap gap-2">
                    {contracts.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {contracts.length} contrato{contracts.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {invoices.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Receipt className="h-3 w-3" />
                        {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {suppliers.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {suppliers.length} archivo de proveedores
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="confirm"
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                />
                <label
                  htmlFor="confirm"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Entiendo que el análisis puede tardar varios minutos dependiendo del 
                  volumen de documentos. Recibiré una notificación cuando esté listo.
                </label>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando análisis...
              </>
            ) : (
              <>
                Iniciar Análisis
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CostConsultingNew;
