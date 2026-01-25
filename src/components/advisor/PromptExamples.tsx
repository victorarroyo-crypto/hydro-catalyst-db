import React from 'react';
import { Factory, Droplets, ScrollText, Calculator } from 'lucide-react';

const PROMPT_EXAMPLES = [
  {
    category: "Tratamiento Industrial",
    icon: Factory,
    examples: [
      {
        title: "Efluente galvánico",
        prompt: "Tengo un efluente de galvanizado con 80 mg/L de níquel y 50 mg/L de cromo. Caudal 100 m³/día. ¿Qué tecnologías me recomiendas para cumplir límites de vertido y recuperar los metales?"
      },
      {
        title: "Agua de proceso",
        prompt: "Necesito reutilizar el agua de refrigeración de mi planta (500 m³/día). Tiene 2000 µS/cm de conductividad y 50 mg/L de SST. ¿Qué tratamiento necesito?"
      }
    ]
  },
  {
    category: "Aguas Residuales",
    icon: Droplets,
    examples: [
      {
        title: "EDAR industrial",
        prompt: "Diseña una EDAR para 200 m³/día de agua residual de industria alimentaria. DQO entrada: 5000 mg/L, límite vertido: 125 mg/L. Presupuesto: 300.000€"
      },
      {
        title: "Lodos activados",
        prompt: "Mi sistema de lodos activados tiene problemas de bulking. SVI >250 mL/g. ¿Qué puede estar pasando y cómo lo soluciono?"
      }
    ]
  },
  {
    category: "Normativa",
    icon: ScrollText,
    examples: [
      {
        title: "Límites de vertido",
        prompt: "¿Cuáles son los límites de vertido para metales pesados según el RD 817/2015? Específicamente para Cr, Ni, Zn y Cu."
      },
      {
        title: "BAT/BREF",
        prompt: "¿Qué dice el BREF de tratamiento de superficies metálicas sobre las mejores técnicas disponibles para recuperación de níquel?"
      }
    ]
  },
  {
    category: "Estudios económicos",
    icon: Calculator,
    examples: [
      {
        title: "Comparativa tecnologías",
        prompt: "Compara electrocoagulación vs precipitación química para eliminar metales de un efluente de 150 m³/día. Incluye CAPEX, OPEX y payback."
      },
      {
        title: "Viabilidad ZLD",
        prompt: "¿Es viable técnica y económicamente implementar Zero Liquid Discharge en una planta de 500 m³/día con conductividad 15.000 µS/cm?"
      }
    ]
  }
];

interface PromptExamplesProps {
  onSelectPrompt: (prompt: string) => void;
}

// Brand colors
const BRAND_COLORS = ['#307177', '#32b4cd', '#8cb63c', '#ffa720'];

export function PromptExamples({ onSelectPrompt }: PromptExamplesProps) {
  return (
    <div className="w-full px-4 lg:px-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-foreground">¿Qué puedo preguntarte?</h2>
        <p className="text-muted-foreground text-sm mt-2">Haz click en cualquier ejemplo para empezar</p>
      </div>
      
      {/* Category Headers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-4">
        {PROMPT_EXAMPLES.map((category, idx) => {
          const Icon = category.icon;
          const brandColor = BRAND_COLORS[idx % BRAND_COLORS.length];
          return (
            <div key={idx} className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${brandColor}40` }}>
              <Icon className="w-5 h-5" style={{ color: brandColor }} />
              <h3 className="text-sm font-semibold" style={{ color: brandColor }}>{category.category}</h3>
            </div>
          );
        })}
      </div>

      {/* First Row of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-3">
        {PROMPT_EXAMPLES.map((category, idx) => {
          const example = category.examples[0];
          const brandColor = BRAND_COLORS[idx % BRAND_COLORS.length];
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(example.prompt)}
              className="w-full text-left p-4 rounded-xl bg-card border-2 transition-all group shadow-sm hover:shadow-lg hover:-translate-y-0.5 h-full"
              style={{ borderColor: `${brandColor}25` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = brandColor;
                e.currentTarget.style.background = `${brandColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${brandColor}25`;
                e.currentTarget.style.background = '';
              }}
            >
              <span className="font-semibold text-sm text-foreground block mb-1.5">
                {example.title}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {example.prompt.substring(0, 100)}...
              </p>
            </button>
          );
        })}
      </div>

      {/* Second Row of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PROMPT_EXAMPLES.map((category, idx) => {
          const example = category.examples[1];
          const brandColor = BRAND_COLORS[idx % BRAND_COLORS.length];
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(example.prompt)}
              className="w-full text-left p-4 rounded-xl bg-card border-2 transition-all group shadow-sm hover:shadow-lg hover:-translate-y-0.5 h-full"
              style={{ borderColor: `${brandColor}25` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = brandColor;
                e.currentTarget.style.background = `${brandColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${brandColor}25`;
                e.currentTarget.style.background = '';
              }}
            >
              <span className="font-semibold text-sm text-foreground block mb-1.5">
                {example.title}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {example.prompt.substring(0, 100)}...
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
