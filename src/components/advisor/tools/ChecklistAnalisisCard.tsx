import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Download } from "lucide-react";
import { ChecklistAnalisisMetadata } from "@/types/advisorTools";
import * as XLSX from 'xlsx';

interface Props {
  metadata: ChecklistAnalisisMetadata;
}

export function ChecklistAnalisisCard({ metadata }: Props) {
  
  const downloadExcel = () => {
    const allParams = [
      ...metadata.parametros_basicos.map(p => ({ ...p, categoria: "Básico" })),
      ...metadata.parametros_especificos.map(p => ({ ...p, categoria: "Específico sector" }))
    ];
    
    const data = allParams.map(p => ({
      "Categoría": p.categoria,
      "Parámetro": p.parametro,
      "Unidad": p.unidad,
      "Método": p.metodo,
      "Frecuencia": p.frecuencia,
      "Obligatorio": p.obligatorio ? "Sí" : "No"
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist");
    
    XLSX.writeFile(wb, `checklist_${metadata.sector}_${Date.now()}.xlsx`);
  };

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
          📋 Checklist de Caracterización
        </CardTitle>
        <Badge variant="outline" className="w-fit">{metadata.sector}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parámetros básicos */}
        <div>
          <h4 className="text-sm font-medium mb-2">
            🧪 Parámetros Básicos ({metadata.parametros_basicos.length})
          </h4>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Parámetro</TableHead>
                  <TableHead className="text-xs">Unidad</TableHead>
                  <TableHead className="text-xs">Frecuencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.parametros_basicos.slice(0, 5).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{p.parametro}</TableCell>
                    <TableCell className="text-xs">{p.unidad}</TableCell>
                    <TableCell className="text-xs">{p.frecuencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Parámetros específicos */}
        <div>
          <h4 className="text-sm font-medium mb-2">
            🔬 Parámetros Específicos - {metadata.sector} ({metadata.parametros_especificos.length})
          </h4>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Parámetro</TableHead>
                  <TableHead className="text-xs">Método</TableHead>
                  <TableHead className="text-xs">Frecuencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.parametros_especificos.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{p.parametro}</TableCell>
                    <TableCell className="text-xs">{p.metodo}</TableCell>
                    <TableCell className="text-xs">{p.frecuencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Recomendaciones */}
        <div className="rounded-lg bg-muted/50 p-3">
          <h4 className="text-sm font-medium mb-2">💡 Recomendaciones de Muestreo</h4>
          <ul className="space-y-1">
            {metadata.recomendaciones.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {rec}</li>
            ))}
          </ul>
        </div>
        
        <Button onClick={downloadExcel} size="sm" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Descargar Checklist Excel
        </Button>
      </CardContent>
    </Card>
  );
}
