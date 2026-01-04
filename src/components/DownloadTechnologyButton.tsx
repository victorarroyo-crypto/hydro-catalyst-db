import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { generateTechnologyWordDocument } from "@/lib/generateWordDocument";
import { supabase } from "@/integrations/supabase/client";
import type { Technology } from "@/types/database";

interface DownloadTechnologyButtonProps {
  technology: Technology;
  variant?: "icon" | "full";
}

export const DownloadTechnologyButton: React.FC<DownloadTechnologyButtonProps> = ({
  technology,
  variant = "icon",
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);

    try {
      // Fetch taxonomy data
      const tipoId = (technology as any).tipo_id;
      const subcategoriaId = (technology as any).subcategoria_id;
      const sectorId = (technology as any).sector_id;

      let taxonomyData: {
        tipo?: { codigo: string; nombre: string } | null;
        subcategoria?: { codigo: string; nombre: string } | null;
        sector?: { id: string; nombre: string } | null;
      } = {};

      if (tipoId) {
        const { data } = await supabase
          .from("taxonomy_tipos")
          .select("codigo, nombre")
          .eq("id", tipoId)
          .maybeSingle();
        taxonomyData.tipo = data;
      }

      if (subcategoriaId) {
        const { data } = await supabase
          .from("taxonomy_subcategorias")
          .select("codigo, nombre")
          .eq("id", subcategoriaId)
          .maybeSingle();
        taxonomyData.subcategoria = data;
      }

      if (sectorId) {
        const { data } = await supabase
          .from("taxonomy_sectores")
          .select("id, nombre")
          .eq("id", sectorId)
          .maybeSingle();
        taxonomyData.sector = data;
      }

      await generateTechnologyWordDocument(technology, taxonomyData);

      toast({
        title: "Ficha descargada",
        description: "El documento Word se ha generado correctamente",
      });
    } catch (error) {
      console.error("Error downloading technology:", error);
      toast({
        variant: "destructive",
        title: "Error al descargar",
        description: "No se pudo generar el documento. Verifica que la plantilla esté disponible.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "full") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isGenerating}
        className="gap-2"
      >
        <Download className={`w-4 h-4 ${isGenerating ? "animate-pulse" : ""}`} />
        {isGenerating ? "Generando..." : "Descargar Word"}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDownload}
          disabled={isGenerating}
        >
          <Download className={`w-4 h-4 ${isGenerating ? "animate-pulse" : ""}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Descargar ficha en Word</p>
      </TooltipContent>
    </Tooltip>
  );
};
