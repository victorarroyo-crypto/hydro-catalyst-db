import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Loader2, 
  Download, 
  CheckCircle2,
  FileDown
} from 'lucide-react';

interface ReportSection {
  id: string;
  label: string;
  default: boolean;
  isAnnex?: boolean;
}

const REPORT_SECTIONS: ReportSection[] = [
  { id: 'executive_summary', label: 'Resumen ejecutivo', default: true },
  { id: 'spend_map', label: 'Mapa de gasto', default: true },
  { id: 'contracts_analysis', label: 'Análisis de contratos', default: true },
  { id: 'invoices_analysis', label: 'Análisis de facturas', default: true },
  { id: 'supplier_benchmarking', label: 'Benchmarking proveedores', default: true },
  { id: 'opportunities', label: 'Oportunidades priorizadas', default: true },
  { id: 'scenarios', label: 'Escenarios simulados', default: true },
  { id: 'roadmap', label: 'Roadmap de implementación', default: true },
];

const ANNEX_SECTIONS: ReportSection[] = [
  { id: 'contracts_detail', label: 'Detalle completo de contratos', default: false, isAnnex: true },
  { id: 'invoices_anomalies', label: 'Detalle de facturas con anomalías', default: false, isAnnex: true },
  { id: 'methodology', label: 'Metodología', default: true, isAnnex: true },
];

type GenerationPhase = 'config' | 'generating' | 'complete';

interface ReportGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  open,
  onOpenChange,
  projectId,
  projectName,
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    [...REPORT_SECTIONS, ...ANNEX_SECTIONS].filter(s => s.default).map(s => s.id)
  );
  const [reportFormat, setReportFormat] = useState<'executive' | 'complete'>('executive');
  const [phase, setPhase] = useState<GenerationPhase>('config');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const generationSteps = [
    'Preparando datos...',
    'Generando resumen ejecutivo...',
    'Creando gráficos de gasto...',
    'Analizando contratos...',
    'Compilando oportunidades...',
    'Generando documento PDF...',
    'Finalizando...',
  ];

  const generateReport = async () => {
    setPhase('generating');
    setProgress(0);

    // Simulate report generation with progress updates
    for (let i = 0; i < generationSteps.length; i++) {
      setCurrentStep(generationSteps[i]);
      setProgress(Math.round(((i + 1) / generationSteps.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Generate and download PDF
    await downloadPdfReport();
    
    setPhase('complete');
  };

  const downloadPdfReport = async () => {
    // Create a simple PDF-like document content
    const reportContent = generateReportContent();
    
    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_Informe_Costes.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateReportContent = () => {
    const date = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Consultoría de Costes - ${projectName}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0ea5e9;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0ea5e9;
    }
    .date {
      color: #666;
      font-size: 14px;
    }
    h1 {
      color: #0ea5e9;
      font-size: 28px;
      margin-bottom: 10px;
    }
    h2 {
      color: #0ea5e9;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .kpi-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #0ea5e9;
    }
    .kpi-value {
      font-size: 32px;
      font-weight: bold;
      color: #0ea5e9;
    }
    .kpi-label {
      color: #666;
      font-size: 14px;
    }
    .opportunity-list {
      list-style: none;
      padding: 0;
    }
    .opportunity-item {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      border-left: 4px solid #22c55e;
    }
    .opportunity-title {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .opportunity-savings {
      color: #22c55e;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      color: #666;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
    }
    .page-break {
      page-break-after: always;
    }
    @media print {
      body { padding: 0; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">💧 WaterTech</div>
    <div class="date">Generado: ${date}</div>
  </div>

  <h1>Informe de Consultoría de Costes</h1>
  <p class="subtitle">${projectName}</p>

  ${selectedSections.includes('executive_summary') ? `
  <h2>1. Resumen Ejecutivo</h2>
  <p>
    Este informe presenta los resultados del análisis exhaustivo de costes operativos 
    realizado para ${projectName}. Se han identificado oportunidades de ahorro significativas
    que pueden implementarse en diferentes horizontes temporales.
  </p>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">245.000€</div>
      <div class="kpi-label">Gasto Total Analizado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">12.450€</div>
      <div class="kpi-label">Ahorro Potencial Identificado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">5,1%</div>
      <div class="kpi-label">Porcentaje de Ahorro</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">8</div>
      <div class="kpi-label">Oportunidades Identificadas</div>
    </div>
  </div>
  ` : ''}

  ${selectedSections.includes('spend_map') ? `
  <h2>2. Mapa de Gasto</h2>
  <p>Distribución del gasto por categorías principales:</p>
  <table>
    <thead>
      <tr>
        <th>Categoría</th>
        <th>Importe</th>
        <th>% del Total</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Químicos</td><td>85.750€</td><td>35%</td></tr>
      <tr><td>Canon y tasas</td><td>53.900€</td><td>22%</td></tr>
      <tr><td>Residuos</td><td>44.100€</td><td>18%</td></tr>
      <tr><td>O&M</td><td>36.750€</td><td>15%</td></tr>
      <tr><td>Otros</td><td>24.500€</td><td>10%</td></tr>
    </tbody>
  </table>
  ` : ''}

  ${selectedSections.includes('opportunities') ? `
  <h2>3. Oportunidades Priorizadas</h2>
  <p>Las siguientes oportunidades han sido identificadas y priorizadas según su impacto y facilidad de implementación:</p>
  
  <h3>Quick Wins (0-3 meses)</h3>
  <ul class="opportunity-list">
    <li class="opportunity-item">
      <div class="opportunity-title">Renegociar precio de químicos</div>
      <div>Ahorro estimado: <span class="opportunity-savings">4.500€/año</span></div>
      <div>Proveedor actual por encima del benchmark de mercado</div>
    </li>
    <li class="opportunity-item">
      <div class="opportunity-title">Eliminar contrato zombie O&M</div>
      <div>Ahorro estimado: <span class="opportunity-savings">2.400€/año</span></div>
      <div>Servicio duplicado identificado</div>
    </li>
  </ul>

  <h3>Medio Plazo (3-6 meses)</h3>
  <ul class="opportunity-list">
    <li class="opportunity-item">
      <div class="opportunity-title">Cambiar gestor de residuos</div>
      <div>Ahorro estimado: <span class="opportunity-savings">3.200€/año</span></div>
      <div>Proveedor alternativo con mejores tarifas disponible</div>
    </li>
  </ul>
  ` : ''}

  ${selectedSections.includes('roadmap') ? `
  <h2>4. Roadmap de Implementación</h2>
  <table>
    <thead>
      <tr>
        <th>Fase</th>
        <th>Acciones</th>
        <th>Ahorro Acumulado</th>
        <th>Plazo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Fase 1</td>
        <td>Renegociación de químicos + Eliminar zombie</td>
        <td>6.900€</td>
        <td>0-3 meses</td>
      </tr>
      <tr>
        <td>Fase 2</td>
        <td>Cambio gestor residuos</td>
        <td>10.100€</td>
        <td>3-6 meses</td>
      </tr>
      <tr>
        <td>Fase 3</td>
        <td>Consolidación proveedores + Optimización términos pago</td>
        <td>12.450€</td>
        <td>6-12 meses</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  ${selectedSections.includes('methodology') ? `
  <div class="page-break"></div>
  <h2>Anexo: Metodología</h2>
  <p>
    El análisis se ha realizado siguiendo la metodología de WaterTech para consultoría de costes:
  </p>
  <ol>
    <li><strong>Recopilación de datos:</strong> Análisis de contratos y facturas del período</li>
    <li><strong>Clasificación:</strong> Categorización del gasto según taxonomía estándar</li>
    <li><strong>Benchmarking:</strong> Comparación con precios de mercado y mejores prácticas</li>
    <li><strong>Identificación:</strong> Detección de anomalías, duplicidades y oportunidades</li>
    <li><strong>Priorización:</strong> Clasificación por impacto y esfuerzo de implementación</li>
    <li><strong>Recomendaciones:</strong> Plan de acción con roadmap de implementación</li>
  </ol>
  ` : ''}

  <div class="footer">
    <div>WaterTech - Consultoría de Costes</div>
    <div>Página 1</div>
  </div>
</body>
</html>
    `;
  };

  const handleClose = () => {
    if (phase === 'generating') return;
    setPhase('config');
    setProgress(0);
    onOpenChange(false);
  };

  const handleNewReport = () => {
    setPhase('config');
    setProgress(0);
    setSelectedSections(
      [...REPORT_SECTIONS, ...ANNEX_SECTIONS].filter(s => s.default).map(s => s.id)
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Generar Informe Ejecutivo
          </DialogTitle>
          <DialogDescription>
            {phase === 'config' && 'Configura las secciones y formato del informe'}
            {phase === 'generating' && 'Generando informe...'}
            {phase === 'complete' && 'Informe generado correctamente'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'config' && (
          <div className="space-y-6 py-4">
            {/* Main Sections */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Secciones a incluir</Label>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_SECTIONS.map((section) => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label htmlFor={section.id} className="cursor-pointer font-normal">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Annexes */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Anexos</Label>
              <div className="grid grid-cols-1 gap-2">
                {ANNEX_SECTIONS.map((section) => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label htmlFor={section.id} className="cursor-pointer font-normal">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Formato</Label>
              <RadioGroup
                value={reportFormat}
                onValueChange={(v) => setReportFormat(v as 'executive' | 'complete')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="executive" id="executive" />
                  <Label htmlFor="executive" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileText className="h-4 w-4" />
                    PDF ejecutivo (recomendado)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="complete" id="complete" />
                  <Label htmlFor="complete" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileText className="h-4 w-4" />
                    PDF completo con anexos
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {phase === 'generating' && (
          <div className="py-8 space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <FileText className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {currentStep}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {progress}% completado
              </p>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="py-8 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">¡Informe generado correctamente!</p>
              <p className="text-sm text-muted-foreground">
                El archivo se ha descargado automáticamente
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {phase === 'config' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={generateReport}
                disabled={selectedSections.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Generar PDF
              </Button>
            </>
          )}

          {phase === 'generating' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </Button>
          )}

          {phase === 'complete' && (
            <>
              <Button variant="outline" onClick={handleNewReport}>
                Generar otro
              </Button>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
