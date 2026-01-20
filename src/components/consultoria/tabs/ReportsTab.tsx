import React, { useState } from 'react';
import { 
  FileText, 
  FileDown, 
  Loader2, 
  Check,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api';

interface ReportsTabProps {
  projectId: string;
  projectName: string;
  hasFindings: boolean;
}

const REPORT_SECTIONS = [
  { id: 'executive_summary', label: 'Resumen ejecutivo', default: true },
  { id: 'water_balance', label: 'Balance hídrico', default: true },
  { id: 'findings', label: 'Diagnóstico y hallazgos', default: true },
  { id: 'scenarios', label: 'Escenarios y comparación', default: true },
  { id: 'financials', label: 'Análisis financiero (VAN, TIR, Payback)', default: true },
  { id: 'roadmap', label: 'Roadmap de implementación', default: false },
  { id: 'annexes', label: 'Anexos técnicos', default: false },
];

export const ReportsTab: React.FC<ReportsTabProps> = ({ 
  projectId, 
  projectName,
  hasFindings 
}) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx');
  const [language, setLanguage] = useState('es');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    REPORT_SECTIONS.filter(s => s.default).map(s => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = async () => {
    if (format === 'pdf') {
      window.open(`${API_URL}/api/projects/${projectId}/report/pdf`, '_blank');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/report/docx`, {
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 400) {
          toast({
            title: 'Datos insuficientes',
            description: 'El proyecto no tiene suficiente información para generar el informe.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Error al generar el informe');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}_informe.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: 'Informe descargado correctamente' });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error al exportar',
        description: 'No se pudo generar el informe. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Generar Informe
          </CardTitle>
          <CardDescription>
            Configura las opciones del informe y descárgalo en el formato deseado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Formato</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as 'docx' | 'pdf')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  DOCX (Word)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileDown className="h-4 w-4" />
                  PDF
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sections Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Secciones a incluir</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REPORT_SECTIONS.map((section) => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <Label htmlFor={section.id} className="cursor-pointer">
                    {section.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !hasFindings || selectedSections.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generar y Descargar Informe
                </>
              )}
            </Button>
            {!hasFindings && (
              <p className="text-sm text-muted-foreground mt-2">
                Ejecuta un diagnóstico primero para poder generar el informe
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report History (placeholder for future) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informes Generados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              El historial de informes estará disponible próximamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
