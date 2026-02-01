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
import { generateCostConsultingWordReport, type CostReportData, type ReportConfig } from '@/lib/generateCostConsultingReport';
import { useCostProject, useCostContracts, useCostOpportunities } from '@/hooks/useCostConsultingData';

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
type OutputFormat = 'word' | 'pdf';

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
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('word');
  const [phase, setPhase] = useState<GenerationPhase>('config');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Fetch real data
  const { data: project } = useCostProject(projectId);
  const { data: contracts = [] } = useCostContracts(projectId);
  const { data: opportunities = [] } = useCostOpportunities(projectId);

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
    `Generando documento ${outputFormat === 'word' ? 'Word' : 'PDF'}...`,
    'Finalizando...',
  ];

  const generateReport = async () => {
    setPhase('generating');
    setProgress(0);

    // Progress simulation with real generation
    for (let i = 0; i < generationSteps.length - 1; i++) {
      setCurrentStep(generationSteps[i]);
      setProgress(Math.round(((i + 1) / generationSteps.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Generate real document
    setCurrentStep(generationSteps[generationSteps.length - 2]);
    
    const reportData: CostReportData = {
      projectName: project?.name || projectName,
      clientName: project?.client_name || undefined,
      totalSpendAnalyzed: project?.total_spend_analyzed || 0,
      totalSavingsIdentified: project?.total_savings_identified || 0,
      savingsPercentage: project?.savings_pct || 0,
      opportunitiesCount: project?.opportunities_count || opportunities.length,
      quickWinsCount: project?.quick_wins_count || opportunities.filter(o => o.implementation_horizon === 'quick_win').length,
      contracts: contracts.map(c => ({
        supplierName: c.supplier_name_raw || c.cost_suppliers?.name || 'Sin nombre',
        contractNumber: c.contract_number || undefined,
        annualValue: c.total_annual_value || 0,
        riskScore: c.risk_score || undefined,
      })),
      opportunities: opportunities.map(o => ({
        title: o.title,
        description: o.description || undefined,
        savingsAnnual: o.savings_annual || 0,
        horizon: o.implementation_horizon || undefined,
        priority: o.priority_score || undefined,
      })),
    };

    const config: ReportConfig = {
      sections: selectedSections,
      format: reportFormat,
    };

    await generateCostConsultingWordReport(reportData, config);
    
    setCurrentStep('Finalizando...');
    setProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setPhase('complete');
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

            {/* Output Format Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Formato de salida</Label>
              <RadioGroup
                value={outputFormat}
                onValueChange={(v) => setOutputFormat(v as OutputFormat)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="word" id="word" />
                  <Label htmlFor="word" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileText className="h-4 w-4 text-primary" />
                    Word (.docx) - Recomendado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer font-normal text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    PDF (próximamente)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                El documento Word utiliza el manual de marca Vandarum con portada profesional.
              </p>
            </div>

            <Separator />

            {/* Report Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tipo de informe</Label>
              <RadioGroup
                value={reportFormat}
                onValueChange={(v) => setReportFormat(v as 'executive' | 'complete')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="executive" id="executive" />
                  <Label htmlFor="executive" className="cursor-pointer font-normal">
                    Ejecutivo (resumen)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="complete" id="complete" />
                  <Label htmlFor="complete" className="cursor-pointer font-normal">
                    Completo con anexos
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
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
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
                disabled={selectedSections.length === 0 || outputFormat === 'pdf'}
              >
                <Download className="h-4 w-4 mr-2" />
                {outputFormat === 'word' ? 'Generar Word' : 'Generar PDF'}
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
