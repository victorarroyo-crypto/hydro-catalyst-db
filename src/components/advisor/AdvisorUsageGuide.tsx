import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Target, 
  AlertTriangle, 
  Lightbulb,
  MapPin,
  Factory,
  Beaker,
  CheckCircle,
  XCircle,
  FileUp,
  FileWarning,
  FileX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvisorUsageGuideProps {
  isDeepMode: boolean;
  variant?: 'full' | 'compact';
  defaultExpanded?: string[];
}

const GUIDE_CONTENT = {
  structureQuery: {
    title: "Cómo estructurar tu consulta",
    icon: FileText,
    color: "#307177",
    subsections: [
      {
        title: "Contexto",
        icon: Factory,
        items: [
          "Sector: alimentario, químico, textil, plásticos, farmacéutico...",
          "Ubicación: país y región (no asumimos autoridades competentes)",
          "Tipo de instalación: nueva, existente, ampliación",
        ],
      },
      {
        title: "Datos técnicos (si disponibles)",
        icon: Beaker,
        items: [
          "Caudal en m³/h o m³/día",
          "Caracterización del efluente: DQO, SST, pH, conductividad, contaminantes específicos",
          "Tratamiento actual si existe",
        ],
      },
      {
        title: "Objetivo claro",
        icon: Target,
        items: [
          "¿Qué quieres lograr? Cumplimiento normativo, reuso X%, reducir OPEX, ZLD",
          "¿Restricciones? Espacio limitado, presupuesto máximo, plazos",
        ],
      },
      {
        title: "Pregunta específica",
        icon: Lightbulb,
        items: [
          "Evita preguntas vagas",
          "Sé concreto sobre lo que necesitas saber",
        ],
      },
    ],
  },
  examples: {
    title: "Ejemplos",
    icon: Lightbulb,
    color: "#32b4cd",
    avoid: [
      "¿Qué hago con mi efluente?",
      "¿Cuánto cuesta una depuradora?",
      "¿Qué normativa aplica?",
    ],
    better: [
      "Tengo efluente de lavado PET en [mi región] con caudal 50 m³/h, DQO 3000 mg/L, SST 500 mg/L, pH 12. Objetivo: reuso en proceso. ¿Qué tren de tratamiento recomiendas?",
      "Para 100 m³/d de efluente alimentario con DQO 2000 mg/L, ¿cuál es el rango CAPEX de MBR vs SBR convencional?",
      "Planta en [mi ubicación], vertido a alcantarillado municipal. ¿Qué parámetros debo verificar en mi permiso de vertido?",
    ],
  },
  documents: {
    title: "Qué documentos subir",
    icon: FileUp,
    color: "#8cb63c",
    categories: [
      {
        label: "Muy útiles",
        badgeColor: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle,
        items: [
          "Analíticas de agua (caracterización del efluente)",
          "Permiso de vertido actual",
          "P&ID simplificado del proceso",
          "Facturas de agua/canon (para análisis de ROI)",
        ],
      },
      {
        label: "Moderadamente útiles",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        icon: FileWarning,
        items: [
          "Datasheets de equipos existentes",
          "Histórico de problemas operativos",
          "Estudios previos",
        ],
      },
      {
        label: "Evitar",
        badgeColor: "bg-red-100 text-red-800 border-red-300",
        icon: FileX,
        items: [
          "PDFs escaneados sin OCR",
          "Planos CAD/DWG",
          "Excel con fórmulas complejas (mejor copiar datos como texto)",
          "Documentos de más de 50 páginas",
          "Fotos de documentos",
        ],
      },
    ],
  },
  limitations: {
    title: "Limitaciones",
    icon: AlertTriangle,
    color: "#ffa720",
    intro: "El sistema NO adivina:",
    items: [
      "Autoridades competentes: siempre indicamos \"verificar según ubicación\"",
      "Límites de vertido \"típicos\": dependen del permiso específico",
      "Normativa futura con números exactos",
    ],
    notes: [
      "Las cifras económicas son rangos orientativos (±20-30%) que requieren cotización real.",
      "Para mayor precisión, indica ubicación exacta del vertido, destino (alcantarillado vs cauce vs reuso), y datos reales mejor que valores \"típicos\".",
    ],
  },
};

export function AdvisorUsageGuide({ isDeepMode, variant = 'full', defaultExpanded }: AdvisorUsageGuideProps) {
  const getDefaultValue = () => {
    if (defaultExpanded) return defaultExpanded;
    // Default: expand first section on first visit
    const saved = localStorage.getItem('advisor_guide_expanded');
    if (saved) return JSON.parse(saved);
    return ['structure'];
  };

  const handleValueChange = (value: string[]) => {
    localStorage.setItem('advisor_guide_expanded', JSON.stringify(value));
  };

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="font-semibold text-lg" style={{ color: '#307177' }}>
          Guía de uso
        </h3>
        <p className="text-sm text-muted-foreground">
          Obtén respuestas más precisas siguiendo estas recomendaciones
        </p>
      </div>

      <Accordion 
        type="multiple" 
        defaultValue={getDefaultValue()}
        onValueChange={handleValueChange}
        className="space-y-2"
      >
        {/* Section 1: How to structure your query */}
        <AccordionItem value="structure" className="border rounded-lg px-4 bg-white/50">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${GUIDE_CONTENT.structureQuery.color}15` }}
              >
                <FileText className="w-4 h-4" style={{ color: GUIDE_CONTENT.structureQuery.color }} />
              </div>
              <span className="font-medium text-sm">{GUIDE_CONTENT.structureQuery.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pl-9">
              {GUIDE_CONTENT.structureQuery.subsections.map((sub, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <sub.icon className="w-3.5 h-3.5" style={{ color: GUIDE_CONTENT.structureQuery.color }} />
                    {sub.title}
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-5">
                    {sub.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary/50 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Examples */}
        <AccordionItem value="examples" className="border rounded-lg px-4 bg-white/50">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${GUIDE_CONTENT.examples.color}15` }}
              >
                <Lightbulb className="w-4 h-4" style={{ color: GUIDE_CONTENT.examples.color }} />
              </div>
              <span className="font-medium text-sm">{GUIDE_CONTENT.examples.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pl-9">
              {/* Avoid examples */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Evitar</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {GUIDE_CONTENT.examples.avoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                      <span>"{item}"</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Better examples */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Mejor</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {GUIDE_CONTENT.examples.better.map((item, i) => (
                    <li key={i} className="bg-green-50 text-green-800 px-3 py-2 rounded-lg leading-relaxed">
                      "{item}"
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Documents to upload */}
        <AccordionItem value="documents" className="border rounded-lg px-4 bg-white/50">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${GUIDE_CONTENT.documents.color}15` }}
              >
                <FileUp className="w-4 h-4" style={{ color: GUIDE_CONTENT.documents.color }} />
              </div>
              <span className="font-medium text-sm">{GUIDE_CONTENT.documents.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pl-9">
              {GUIDE_CONTENT.documents.categories.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge variant="outline" className={cn("gap-1", cat.badgeColor)}>
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-1">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary/50 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Limitations (Deep Mode only) */}
        {isDeepMode && (
          <AccordionItem value="limitations" className="border rounded-lg px-4 bg-white/50">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${GUIDE_CONTENT.limitations.color}15` }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: GUIDE_CONTENT.limitations.color }} />
                </div>
                <span className="font-medium text-sm">{GUIDE_CONTENT.limitations.title}</span>
                <Badge variant="outline" className="text-xs ml-1 bg-cyan-50 text-cyan-700 border-cyan-200">
                  Deep Mode
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3 pl-9">
                <p className="text-sm font-medium text-amber-700">{GUIDE_CONTENT.limitations.intro}</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {GUIDE_CONTENT.limitations.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {GUIDE_CONTENT.limitations.notes.map((note, i) => (
                    <p key={i} className="text-xs text-muted-foreground italic">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
