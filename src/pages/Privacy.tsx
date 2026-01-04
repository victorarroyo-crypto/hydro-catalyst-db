import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Configuración
          </Link>
        </Button>

        <h1 className="text-3xl font-display font-bold mb-8">Política de Privacidad</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última actualización: Enero 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Información que Recopilamos</h2>
            <p className="text-muted-foreground">
              Recopilamos información que usted nos proporciona directamente, como nombre, 
              correo electrónico y datos de perfil al registrarse. También recopilamos 
              información sobre su uso de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Uso de la Información</h2>
            <p className="text-muted-foreground">
              Utilizamos la información recopilada para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Proporcionar, mantener y mejorar nuestros servicios</li>
              <li>Personalizar su experiencia en la plataforma</li>
              <li>Enviar comunicaciones relacionadas con el servicio</li>
              <li>Proteger la seguridad de nuestros usuarios y la plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Compartir Información</h2>
            <p className="text-muted-foreground">
              No vendemos ni compartimos su información personal con terceros para fines 
              comerciales. Podemos compartir información con proveedores de servicios que 
              nos ayudan a operar la plataforma, siempre bajo estrictas obligaciones de 
              confidencialidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Seguridad de los Datos</h2>
            <p className="text-muted-foreground">
              Implementamos medidas de seguridad técnicas y organizativas para proteger 
              su información personal contra acceso no autorizado, pérdida o alteración. 
              Esto incluye cifrado de datos y controles de acceso estrictos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Sus Derechos</h2>
            <p className="text-muted-foreground">
              De acuerdo con el RGPD y la LOPDGDD, usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Acceder a sus datos personales</li>
              <li>Rectificar datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al tratamiento de sus datos</li>
              <li>Portabilidad de datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Retención de Datos</h2>
            <p className="text-muted-foreground">
              Conservamos sus datos personales mientras su cuenta esté activa o según 
              sea necesario para proporcionarle servicios. Puede solicitar la eliminación 
              de su cuenta en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contacto</h2>
            <p className="text-muted-foreground">
              Para ejercer sus derechos o realizar consultas sobre privacidad, contacte con 
              nuestro Delegado de Protección de Datos en:{' '}
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

export default Privacy;
