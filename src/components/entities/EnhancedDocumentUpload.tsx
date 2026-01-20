import { useState } from 'react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { projectEntitiesService } from '@/services/projectEntitiesService';
import type { DocumentExtractionType, EnhancedUploadResult } from '@/types/documentEntities';

interface EnhancedDocumentUploadProps {
  projectId: string;
  onSuccess?: (result: EnhancedUploadResult) => void;
}

const DOCUMENT_TYPES: Array<{ value: DocumentExtractionType; label: string; description: string }> = [
  { value: 'pid', label: 'P&ID (Diagrama)', description: 'Extrae equipos, instrumentos, válvulas' },
  { value: 'analytics', label: 'Análisis de Agua', description: 'Extrae parámetros con valores' },
  { value: 'datasheet', label: 'Ficha Técnica', description: 'Extrae especificaciones de equipo' },
  { value: 'permit', label: 'Permiso Ambiental', description: 'Extrae límites de vertido' },
  { value: 'process_flow', label: 'PFD (Diagrama de Flujo)', description: 'Extrae flujos y equipos' },
  { value: 'other', label: 'Otro Documento', description: 'Extracción general' },
];

export function EnhancedDocumentUpload({ projectId, onSuccess }: EnhancedDocumentUploadProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentExtractionType>('other');
  const [extractEntities, setExtractEntities] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<EnhancedUploadResult | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await projectEntitiesService.uploadWithExtraction(
        projectId,
        file,
        documentType,
        extractEntities
      );
      setResult(res);
      onSuccess?.(res);
      toast({
        title: 'Documento procesado',
        description: `${res.entities_extracted} entidades extraídas`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al procesar documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Documento con Extracción Inteligente</CardTitle>
        <CardDescription>
          El sistema extrae automáticamente equipos, parámetros y otras entidades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <Label>Archivo</Label>
          <Input
            type="file"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, XLSX o imágenes (para P&ID)
          </p>
        </div>

        {/* Document Type */}
        <div>
          <Label>Tipo de Documento</Label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentExtractionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{dt.label}</span>
                    <span className="text-xs text-muted-foreground">{dt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Extract Entities Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Extraer Entidades</Label>
            <p className="text-xs text-muted-foreground">
              Usa IA para detectar equipos, parámetros, etc.
            </p>
          </div>
          <Switch
            checked={extractEntities}
            onCheckedChange={setExtractEntities}
          />
        </div>

        {/* Result */}
        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Documento Procesado</AlertTitle>
            <AlertDescription>
              <ul className="text-sm mt-1 space-y-1">
                <li>Chunks creados: {result.chunks_created}</li>
                <li>Embeddings generados: {result.embeddings_generated}</li>
                <li>Entidades extraídas: {result.entities_extracted}</li>
                {result.extraction_method && (
                  <li>Método: {result.extraction_method}</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir y Procesar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
