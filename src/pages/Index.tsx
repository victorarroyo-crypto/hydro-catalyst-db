import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import vandarumLogo from "@/assets/vandarum-logo-principal.png";
import vandarumSymbolNaranja from "@/assets/simbolo-naranja.png";
import { 
  Droplets, 
  Search, 
  Network, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  Building2,
  FlaskConical,
  Factory
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-6 py-8">
          {/* Logo centered and large */}
          <div className="flex justify-center mb-12">
            <img 
              src={vandarumLogo} 
              alt="Vandarum" 
              className="h-32 md:h-40 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex items-center justify-center mb-12">
            <Button 
              onClick={handleGetStarted}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              {user ? "Ir al Dashboard" : "Iniciar Sesión"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </nav>

          {/* Hero Content */}
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-secondary mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Impulsado por Inteligencia Artificial</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 animate-slide-up leading-tight">
              Plataforma de Inteligencia de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                Tecnologías del Agua
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-slide-up max-w-3xl mx-auto" style={{ animationDelay: "0.1s" }}>
              Conectamos usuarios finales con las soluciones tecnológicas más innovadoras para el tratamiento y gestión del agua
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="gradient-primary text-primary-foreground shadow-glow text-lg px-8 py-6"
              >
                <Search className="w-5 h-5 mr-2" />
                Explorar Tecnologías
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/5"
              >
                Conocer Más
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Todo lo que necesitas para encontrar la tecnología ideal
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nuestra plataforma centraliza información de las mejores tecnologías del agua del mundo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Búsqueda Inteligente"
              description="Encuentra tecnologías usando lenguaje natural con IA avanzada"
              color="primary"
            />
            <FeatureCard
              icon={<Network className="w-6 h-6" />}
              title="Base de Datos Global"
              description="Acceso a cientos de tecnologías de todo el mundo actualizadas"
              color="secondary"
            />
            <FeatureCard
              icon={<FlaskConical className="w-6 h-6" />}
              title="Análisis Técnico"
              description="Información detallada de madurez (TRL), ventajas y casos de uso"
              color="accent"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Recomendaciones IA"
              description="Sugerencias personalizadas basadas en tus necesidades específicas"
              color="warning"
            />
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Sectores que confían en nosotros
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ayudamos a industrias de todo tipo a optimizar sus procesos de tratamiento de agua
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <IndustryCard
              icon={<Factory className="w-8 h-8" />}
              title="Industria Manufacturera"
              items={["Tratamiento de efluentes", "Reutilización de agua", "Zero Liquid Discharge"]}
            />
            <IndustryCard
              icon={<FlaskConical className="w-8 h-8" />}
              title="Industria Farmacéutica"
              items={["Agua purificada", "Agua para inyección", "Validación de sistemas"]}
            />
            <IndustryCard
              icon={<Building2 className="w-8 h-8" />}
              title="Alimentación y Bebidas"
              items={["Potabilización", "Tratamiento de residuos", "Recuperación de recursos"]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-6 text-center">
          <img 
            src={vandarumSymbolNaranja} 
            alt="Vandarum" 
            className="h-16 w-auto mx-auto mb-6 object-contain"
          />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Comienza a explorar tecnologías hoy
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Únete a las empresas que ya están encontrando las mejores soluciones para sus desafíos en agua
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="bg-white text-primary hover:bg-white/90 shadow-lg text-lg px-10 py-6"
          >
            {user ? "Ir al Dashboard" : "Acceder a la Plataforma"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-sidebar-background text-sidebar-foreground">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img 
              src={vandarumLogo} 
              alt="Vandarum" 
              className="h-10 w-auto"
            />
            <p className="text-sm text-sidebar-foreground/60">
              © {new Date().getFullYear()} Vandarum. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent" | "warning";
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color }) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 card-hover">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};

interface IndustryCardProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

const IndustryCard: React.FC<IndustryCardProps> = ({ icon, title, items }) => {
  return (
    <div className="bg-card rounded-xl p-8 shadow-sm border border-border/50 card-hover">
      <div className="w-14 h-14 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-3 text-muted-foreground">
            <CheckCircle className="w-5 h-5 text-accent shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Index;
