import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Chrome, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const EXTENSION_FILES = [
  { name: 'manifest.json', type: 'text' },
  { name: 'popup.html', type: 'text' },
  { name: 'popup.js', type: 'text' },
  { name: 'icon16.png', type: 'blob' },
  { name: 'icon48.png', type: 'blob' },
  { name: 'icon128.png', type: 'blob' },
];

export function DownloadChromeExtension() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      
      // Fetch all files in parallel
      const filePromises = EXTENSION_FILES.map(async (file) => {
        const response = await fetch(`/chrome-extension/${file.name}`);
        if (!response.ok) {
          throw new Error(`Error al obtener ${file.name}`);
        }
        
        if (file.type === 'text') {
          return { name: file.name, content: await response.text() };
        } else {
          return { name: file.name, content: await response.blob() };
        }
      });
      
      const files = await Promise.all(filePromises);
      
      // Add files to zip
      files.forEach(({ name, content }) => {
        zip.file(name, content);
      });
      
      // Generate and download zip
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'vandarum-chrome-extension.zip');
      
      toast.success('Extensión descargada correctamente');
    } catch (error) {
      console.error('Error downloading extension:', error);
      toast.error('Error al descargar la extensión');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-5 w-5 text-primary" />
          Extensión Chrome - Tech Capture
        </CardTitle>
        <CardDescription>
          Captura tecnologías interesantes desde cualquier página web y envíalas directamente a la cola de scouting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="bg-muted px-2 py-1 rounded">Nombre</span>
          <span className="bg-muted px-2 py-1 rounded">Proveedor</span>
          <span className="bg-muted px-2 py-1 rounded">URL</span>
          <span className="bg-muted px-2 py-1 rounded">Descripción</span>
          <span className="bg-muted px-2 py-1 rounded">País</span>
        </div>
        
        <Button 
          onClick={handleDownload} 
          disabled={isDownloading}
          className="w-full sm:w-auto"
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando ZIP...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar Extensión (.zip)
            </>
          )}
        </Button>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="instructions">
            <AccordionTrigger className="text-sm">
              Instrucciones de instalación
            </AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Descarga y descomprime el archivo ZIP</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Abre Chrome y navega a <code className="bg-muted px-1 rounded">chrome://extensions/</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Activa el <strong>Modo desarrollador</strong> (esquina superior derecha)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Haz clic en <strong>Cargar extensión sin empaquetar</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Selecciona la carpeta descomprimida</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>¡Listo! El icono de Vandarum aparecerá en tu barra de extensiones</span>
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
