import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Scale, Download, PlusCircle, Trash2, Trophy } from "lucide-react";
import { ComparadorOfertasMetadata } from "@/types/advisorTools";
import * as XLSX from 'xlsx';

interface Props {
  metadata: ComparadorOfertasMetadata;
}

interface Oferta {
  id: string;
  proveedor: string;
  valores: Record<string, number>;
}

export function ComparadorOfertasCard({ metadata }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [ofertas, setOfertas] = useState<Oferta[]>([
    { id: '1', proveedor: 'Proveedor A', valores: {} },
    { id: '2', proveedor: 'Proveedor B', valores: {} },
  ]);

  const addOferta = () => {
    const newId = (ofertas.length + 1).toString();
    setOfertas([...ofertas, { 
      id: newId, 
      proveedor: `Proveedor ${String.fromCharCode(65 + ofertas.length)}`, 
      valores: {} 
    }]);
  };

  const removeOferta = (id: string) => {
    if (ofertas.length > 2) {
      setOfertas(ofertas.filter(o => o.id !== id));
    }
  };

  const updateOferta = (id: string, field: string, value: string | number) => {
    setOfertas(ofertas.map(o => {
      if (o.id === id) {
        if (field === 'proveedor') {
          return { ...o, proveedor: value as string };
        } else {
          return { ...o, valores: { ...o.valores, [field]: Number(value) || 0 } };
        }
      }
      return o;
    }));
  };

  // Calcular puntuación ponderada
  const calcularPuntuacion = (oferta: Oferta): number => {
    let puntuacion = 0;
    const valoresCompletos = metadata.criterios.every(c => oferta.valores[c.nombre] !== undefined);
    if (!valoresCompletos) return 0;

    metadata.criterios.forEach(criterio => {
      const valor = oferta.valores[criterio.nombre] || 0;
      const valores = ofertas.map(o => o.valores[criterio.nombre] || 0).filter(v => v > 0);
      
      if (valores.length === 0) return;
      
      const min = Math.min(...valores);
      const max = Math.max(...valores);
      
      let normalizado = 0;
      if (max !== min) {
        if (criterio.tipo === "menor_mejor") {
          normalizado = (max - valor) / (max - min);
        } else {
          normalizado = (valor - min) / (max - min);
        }
      } else {
        normalizado = 1;
      }
      
      puntuacion += normalizado * criterio.peso;
    });
    
    return Math.round(puntuacion * 10) / 10;
  };

  const getBestOferta = (): string | null => {
    let best: string | null = null;
    let bestScore = -1;
    ofertas.forEach(o => {
      const score = calcularPuntuacion(o);
      if (score > bestScore) {
        bestScore = score;
        best = o.id;
      }
    });
    return bestScore > 0 ? best : null;
  };

  const downloadExcel = () => {
    const data = ofertas.map(o => {
      const row: Record<string, string | number> = { "Proveedor": o.proveedor };
      metadata.criterios.forEach(c => {
        row[c.nombre] = o.valores[c.nombre] || '';
      });
      row["PUNTUACIÓN"] = calcularPuntuacion(o);
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativa");
    XLSX.writeFile(wb, `comparador_ofertas_${Date.now()}.xlsx`);
  };

  const bestOferta = getBestOferta();

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5 text-blue-600" />
          ⚖️ Comparador de Ofertas
        </CardTitle>
        <p className="text-sm text-muted-foreground">{metadata.instructions}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criterios */}
        <p className="text-xs font-medium text-muted-foreground">Criterios de evaluación:</p>
        <div className="flex flex-wrap gap-2">
          {metadata.criterios.map((c, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {c.nombre} ({c.peso}%) {c.tipo === "menor_mejor" ? "↓" : "↑"}
            </Badge>
          ))}
        </div>
        
        {/* Botones */}
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 gap-2">
                <Scale className="h-4 w-4" />
                Abrir Comparador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Comparador de Ofertas de Proveedores</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Tabla de entrada */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Proveedor</TableHead>
                        {metadata.criterios.map((c, i) => (
                          <TableHead key={i} className="text-center min-w-[100px]">
                            <div>{c.nombre}</div>
                            <span className="text-xs font-normal text-muted-foreground">
                              ({c.peso}% {c.tipo === "menor_mejor" ? "↓menor" : "↑mayor"})
                            </span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Puntuación</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ofertas.map((oferta) => (
                        <TableRow key={oferta.id} className={bestOferta === oferta.id ? "bg-green-50 dark:bg-green-950/20" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {bestOferta === oferta.id && <Trophy className="h-4 w-4 text-yellow-500" />}
                              <Input
                                value={oferta.proveedor}
                                onChange={(e) => updateOferta(oferta.id, 'proveedor', e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </TableCell>
                          {metadata.criterios.map((c, i) => (
                            <TableCell key={i} className="text-center">
                              <Input
                                type="number"
                                value={oferta.valores[c.nombre] || ''}
                                onChange={(e) => updateOferta(oferta.id, c.nombre, e.target.value)}
                                className="h-8 w-24 text-center"
                                placeholder="0"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold text-lg">
                            {calcularPuntuacion(oferta).toFixed(1)}
                          </TableCell>
                          <TableCell>
                            {ofertas.length > 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeOferta(oferta.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Acciones */}
                <div className="flex gap-2 justify-between">
                  <Button variant="outline" size="sm" onClick={addOferta} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Añadir Proveedor
                  </Button>
                  <Button size="sm" onClick={downloadExcel} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
                
                {bestOferta && (
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                      <Trophy className="h-5 w-5" />
                      <span className="font-semibold">
                        Mejor opción: {ofertas.find(o => o.id === bestOferta)?.proveedor}
                      </span>
                      <span className="text-sm">
                        con {calcularPuntuacion(ofertas.find(o => o.id === bestOferta)!).toFixed(1)} puntos
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={downloadExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Plantilla Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
