import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink } from "lucide-react";
import { FichaTecnicaMetadata } from "@/types/advisorTools";
import * as XLSX from 'xlsx';

interface Props {
  metadata: FichaTecnicaMetadata;
}

export function FichaTecnicaCard({ metadata }: Props) {
  
  const downloadExcel = () => {
    const data = metadata.technologies.map(tech => ({
      "Nombre": tech.nombre,
      "Proveedor": tech.proveedor,
      "País": tech.pais,
      "TRL": tech.trl,
      "Descripción": tech.descripcion,
      "Aplicación": tech.aplicacion,
      "Ventajas": tech.ventajas,
      "Limitaciones": tech.limitaciones,
      "Web": tech.web,
      "Contacto": tech.contacto
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tecnologías");
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 5 },
      { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      { wch: 30 }, { wch: 25 }
    ];
    
    XLSX.writeFile(wb, `fichas_tecnicas_${Date.now()}.xlsx`);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          📄 Fichas Técnicas Disponibles
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {metadata.technologies.length} tecnologías encontradas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {metadata.technologies.slice(0, 4).map((tech, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border bg-background p-3"
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{tech.nombre}</span>
                <span className="text-xs text-muted-foreground">- {tech.proveedor}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  TRL {tech.trl}
                </Badge>
                {tech.web && (
                  <a
                    href={tech.web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {metadata.technologies.length > 4 && (
            <p className="text-center text-sm text-muted-foreground py-2">
              +{metadata.technologies.length - 4} tecnologías más en el archivo
            </p>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button onClick={downloadExcel} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
