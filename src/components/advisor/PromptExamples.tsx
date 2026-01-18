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

export function PromptExamples({ onSelectPrompt }: PromptExamplesProps) {
  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground">¿Qué puedo preguntarte?</h2>
        <p className="text-muted-foreground text-sm mt-1">Haz click en cualquier ejemplo para empezar</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROMPT_EXAMPLES.map((category, idx) => {
          const Icon = category.icon;
          return (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">{category.category}</h3>
              </div>
              <div className="space-y-2">
                {category.examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectPrompt(example.prompt)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary text-sm">
                      {example.title}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {example.prompt.substring(0, 85)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
