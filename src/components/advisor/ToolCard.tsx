import { ToolMetadata } from "@/types/advisorTools";
import { FichaTecnicaCard } from "./tools/FichaTecnicaCard";
import { ComparadorOfertasCard } from "./tools/ComparadorOfertasCard";
import { ChecklistAnalisisCard } from "./tools/ChecklistAnalisisCard";
import { PresupuestoVandarumCard } from "./tools/PresupuestoVandarumCard";

interface ToolCardProps {
  metadata: ToolMetadata;
}

export function ToolCard({ metadata }: ToolCardProps) {
  switch (metadata.type) {
    case "ficha_tecnica":
      return <FichaTecnicaCard metadata={metadata} />;
    case "comparador_ofertas":
      return <ComparadorOfertasCard metadata={metadata} />;
    case "checklist_analisis":
      return <ChecklistAnalisisCard metadata={metadata} />;
    case "presupuesto_vandarum":
      return <PresupuestoVandarumCard metadata={metadata} />;
    default:
      return null;
  }
}
