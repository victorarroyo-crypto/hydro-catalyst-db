import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Cookies: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Configuración
          </Link>
        </Button>

        <h1 className="text-3xl font-display font-bold mb-8">Política de Cookies</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última actualización: Enero 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. ¿Qué son las Cookies?</h2>
            <p className="text-muted-foreground">
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo 
              cuando visita un sitio web. Se utilizan ampliamente para hacer que los sitios 
              web funcionen de manera más eficiente y proporcionar información a los 
              propietarios del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Cookies que Utilizamos</h2>
            <p className="text-muted-foreground mb-3">
              Utilizamos los siguientes tipos de cookies:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-1">Cookies Esenciales</h3>
                <p className="text-sm text-muted-foreground">
                  Necesarias para el funcionamiento básico del sitio, como la autenticación 
                  y la seguridad. No se pueden desactivar.
                </p>
              </div>
              
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-1">Cookies de Preferencias</h3>
                <p className="text-sm text-muted-foreground">
                  Almacenan sus preferencias, como el tema (claro/oscuro) y el idioma 
                  seleccionado.
                </p>
              </div>
              
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-1">Cookies de Sesión</h3>
                <p className="text-sm text-muted-foreground">
                  Mantienen su sesión activa mientras navega por la plataforma. Se eliminan 
                  cuando cierra el navegador.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Control de Cookies</h2>
            <p className="text-muted-foreground">
              Puede controlar y eliminar las cookies a través de la configuración de su 
              navegador. Sin embargo, tenga en cuenta que eliminar las cookies esenciales 
              puede afectar el funcionamiento de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies de Terceros</h2>
            <p className="text-muted-foreground">
              No utilizamos cookies de terceros para publicidad. Las únicas cookies de 
              terceros son las necesarias para el funcionamiento de servicios integrados 
              como la autenticación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Actualizaciones</h2>
            <p className="text-muted-foreground">
              Podemos actualizar esta política de cookies periódicamente. Le notificaremos 
              cualquier cambio significativo a través de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Contacto</h2>
            <p className="text-muted-foreground">
              Si tiene preguntas sobre nuestra política de cookies, contacte en:{' '}
              <a href="mailto:privacy@vandarum.com" className="text-primary hover:underline">
                privacy@vandarum.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
