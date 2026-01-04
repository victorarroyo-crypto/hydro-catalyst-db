import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Configuración
          </Link>
        </Button>

        <h1 className="text-3xl font-display font-bold mb-8">Términos de Servicio</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última actualización: Enero 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground">
              Al acceder y utilizar la plataforma Vandarum Technology Radar, usted acepta estar 
              sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de 
              estos términos, no podrá acceder al servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
            <p className="text-muted-foreground">
              Vandarum Technology Radar es una plataforma de gestión de tecnologías emergentes 
              que permite a los usuarios explorar, clasificar y analizar tecnologías innovadoras 
              en diversos sectores industriales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cuentas de Usuario</h2>
            <p className="text-muted-foreground">
              Al crear una cuenta, usted es responsable de mantener la seguridad de su cuenta 
              y contraseña. Usted acepta no compartir sus credenciales de acceso y notificar 
              inmediatamente cualquier uso no autorizado de su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Aceptable</h2>
            <p className="text-muted-foreground">
              Usted se compromete a utilizar el servicio únicamente para fines legales y de 
              acuerdo con estos términos. Está prohibido el uso del servicio para actividades 
              ilegales, la distribución de contenido dañino o la violación de derechos de 
              propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Propiedad Intelectual</h2>
            <p className="text-muted-foreground">
              Todo el contenido, características y funcionalidad del servicio son propiedad 
              exclusiva de Vandarum y están protegidos por las leyes de propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground">
              En ningún caso Vandarum será responsable por daños indirectos, incidentales, 
              especiales, consecuentes o punitivos resultantes del uso o la imposibilidad 
              de uso del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Modificaciones</h2>
            <p className="text-muted-foreground">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Las modificaciones entrarán en vigor inmediatamente después de su publicación 
              en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contacto</h2>
            <p className="text-muted-foreground">
              Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos en:{' '}
              <a href="mailto:legal@vandarum.com" className="text-primary hover:underline">
                legal@vandarum.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
