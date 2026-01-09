import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import vandarumLogoWhite from "@/assets/vandarum-logo-white.png";
import vandarumSymbolGreenLight from "@/assets/vandarum-symbol-green-light.png";
import { 
  Search, 
  BarChart3, 
  Leaf,
  BookOpen,
  Droplets,
  TrendingUp
} from "lucide-react";

const features = [
  {
    icon: Droplets,
    title: 'Balance Hídrico',
    description: 'Cálculo y diseño de flujograma completo',
  },
  {
    icon: BarChart3,
    title: 'Análisis de Escenarios',
    description: 'Compara soluciones y calcula ROI',
  },
  {
    icon: Leaf,
    title: 'Impacto ESG y ahorro de costes',
    description: 'Métricas ambientales y ahorros verificables',
  },
  {
    icon: BookOpen,
    title: 'Catálogo Tecnológico',
    description: 'Base de proveedores y soluciones',
  },
];

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
    <div className="min-h-screen bg-[#1a4a5e]">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a5e] via-[#2a5a6e] to-[#1a4a5e] opacity-90" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={vandarumSymbolGreenLight} 
                alt="Vandarum" 
                className="h-12 w-auto"
              />
              <div className="hidden md:flex items-center">
                <span className="text-white/60 text-sm ml-4">|</span>
                <span className="text-white/80 text-sm ml-4">Innovación aplicada a la eficiencia hídrica</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <Link to="/advisor" className="text-white/80 hover:text-white text-sm font-medium hidden md:block">
                Funcionalidades
              </Link>
              <Link to="/advisor" className="text-white/80 hover:text-white text-sm font-medium hidden md:block">
                Nosotros
              </Link>
              <Link to="/auth" className="text-white hover:text-white/80 text-sm font-medium">
                Iniciar sesión
              </Link>
              <Button 
                onClick={handleGetStarted}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6"
              >
                Comenzar
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Transforma la gestión del agua en{" "}
                <span className="text-amber-400">resultados medibles</span>
              </h1>
              
              <p className="text-lg text-white/70 mb-8 max-w-xl">
                Sistema integral de consultoría hídrica industrial. Te ayudamos a 
                diagnosticar, diseñar y proponer soluciones de tratamiento con 
                precisión y foco en sostenibilidad y ahorro de costes.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-8"
                >
                  Ver demo
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-medium px-8"
                >
                  Contactar ventas
                </Button>
              </div>
            </div>

            {/* Right side - Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <Card 
                  key={feature.title} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors"
                >
                  <CardContent className="p-6">
                    <feature.icon className="w-8 h-8 text-amber-400 mb-4" />
                    <h3 className="font-semibold text-white mb-2 text-sm">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 text-xs">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-6 py-16 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">2,600+</div>
              <div className="text-white/60 text-sm">Tecnologías</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">50+</div>
              <div className="text-white/60 text-sm">Países</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">100+</div>
              <div className="text-white/60 text-sm">Proveedores</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">15+</div>
              <div className="text-white/60 text-sm">Sectores</div>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para tomar mejores decisiones
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Nuestra plataforma centraliza información de las mejores tecnologías del agua del mundo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Búsqueda Inteligente</h3>
                <p className="text-white/60 text-sm">
                  Encuentra tecnologías usando lenguaje natural con IA avanzada
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Información Verificada</h3>
                <p className="text-white/60 text-sm">
                  Datos curados y actualizados por expertos en tecnologías del agua
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Enfoque Sostenible</h3>
                <p className="text-white/60 text-sm">
                  Soluciones con impacto ambiental positivo y ROI medible
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-16">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 max-w-3xl mx-auto">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Comienza a explorar tecnologías hoy
              </h2>
              <p className="text-white/60 mb-8 max-w-xl mx-auto">
                Únete a las empresas que ya están encontrando las mejores soluciones 
                para sus desafíos en agua
              </p>
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-10"
              >
                {user ? "Ir al Dashboard" : "Acceder a la Plataforma"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img 
              src={vandarumLogoWhite} 
              alt="Vandarum" 
              className="h-8 w-auto opacity-80"
            />
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Vandarum. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/terms" className="text-white/40 hover:text-white/60">Términos</Link>
              <Link to="/privacy" className="text-white/40 hover:text-white/60">Privacidad</Link>
              <Link to="/cookies" className="text-white/40 hover:text-white/60">Cookies</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
