import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ExternalLink, Building2, MapPin, Mail, Globe } from 'lucide-react';
import type { TechnologySheet } from '@/types/advisorChat';
import { generateTechSheetDocument } from '@/lib/generateTechSheetPdf';
import { toast } from 'sonner';

interface TechSheetCardProps {
  tech: TechnologySheet;
}

export function TechSheetCard({ tech }: TechSheetCardProps) {
  const handleDownload = async () => {
    try {
      await generateTechSheetDocument(tech);
      toast.success('Ficha descargada correctamente');
    } catch (error) {
      console.error('Error generating tech sheet:', error);
      toast.error('Error al generar la ficha');
    }
  };

  return (
    <Card className="mt-4 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg text-primary">{tech.nombre}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>{tech.proveedor}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tech.trl && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                TRL {tech.trl}
              </Badge>
            )}
            <Button size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {tech.descripcion && (
          <p className="text-sm text-muted-foreground">{tech.descripcion}</p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {tech.pais && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{tech.pais}</span>
            </div>
          )}
          {tech.tipo && (
            <div>
              <span className="text-muted-foreground">Tipo: </span>
              <span>{tech.tipo}</span>
            </div>
          )}
          {tech.sector && (
            <div>
              <span className="text-muted-foreground">Sector: </span>
              <span>{tech.sector}</span>
            </div>
          )}
          {tech.subcategoria && (
            <div>
              <span className="text-muted-foreground">Subcategoría: </span>
              <span>{tech.subcategoria}</span>
            </div>
          )}
        </div>

        {/* Main Application */}
        {tech.aplicacion_principal && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Aplicación principal</p>
            <p className="text-sm">{tech.aplicacion_principal}</p>
          </div>
        )}

        {/* Competitive Advantage */}
        {tech.ventaja_competitiva && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">Ventaja competitiva</p>
            <p className="text-sm">{tech.ventaja_competitiva}</p>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-2 pt-2">
          {tech.web && (
            <a
              href={tech.web.startsWith('http') ? tech.web : `https://${tech.web}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Globe className="w-3 h-3" />
              Sitio web
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {tech.email && (
            <a
              href={`mailto:${tech.email}`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Mail className="w-3 h-3" />
              {tech.email}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
