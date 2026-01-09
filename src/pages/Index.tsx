import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import vandarumLogoWhite from "@/assets/vandarum-logo-white.png";
import vandarumSymbolGreenLight from "@/assets/vandarum-symbol-green-light.png";
import { 
  Search, 
  Network, 
  Sparkles, 
  ArrowRight,
  Check,
  Building2,
  FlaskConical,
  Factory,
  Zap,
  Shield,
  Home
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: 'Búsqueda Inteligente',
    description: 'Encuentra tecnologías usando lenguaje natural con IA avanzada entre +2,600 opciones',
  },
  {
    icon: Network,
    title: 'Base de Datos Global',
    description: 'Acceso a cientos de tecnologías de todo el mundo constantemente actualizadas',
  },
  {
    icon: FlaskConical,
    title: 'Análisis Técnico',
    description: 'Información detallada de madurez (TRL), ventajas competitivas y casos de uso',
  },
  {
    icon: Sparkles,
    title: 'Recomendaciones IA',
    description: 'Sugerencias personalizadas basadas en tus necesidades específicas de tratamiento',
  },
];

const industries = [
  {
    icon: Factory,
    title: 'Industria Manufacturera',
    items: ['Tratamiento de efluentes', 'Reutilización de agua', 'Zero Liquid Discharge'],
  },
  {
    icon: FlaskConical,
    title: 'Industria Farmacéutica',
    items: ['Agua purificada', 'Agua para inyección', 'Validación de sistemas'],
  },
  {
    icon: Building2,
    title: 'Alimentación y Bebidas',
    items: ['Potabilización', 'Tratamiento de residuos', 'Recuperación de recursos'],
  },
];

const stats = [
  { value: '2,600+', label: 'Tecnologías' },
  { value: '50+', label: 'Países' },
  { value: '100+', label: 'Proveedores' },
  { value: '15+', label: 'Sectores' },
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
    <div className="min-h-screen bg-[#307177]">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#307177] via-[#3a8a90] to-[#2a6068] opacity-90" />
      
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
              <span className="text-white font-bold text-xl hidden md:block">WaterTech Hub</span>
            </div>
            
            <div className="flex items-center gap-6">
              <Link to="/advisor" className="text-white/80 hover:text-white text-sm font-medium hidden md:flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Advisor
              </Link>
              {user ? (
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#ffa720] hover:bg-[#e69500] text-white font-medium px-6 gap-2"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Link to="/auth" className="text-white hover:text-white/80 text-sm font-medium">
                    Iniciar sesión
                  </Link>
                  <Button 
                    onClick={handleGetStarted}
                    className="bg-[#ffa720] hover:bg-[#e69500] text-white font-medium px-6"
                  >
                    Registrarse
                  </Button>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Encuentra la tecnología perfecta para tus{" "}
                <span className="text-[#ffa720]">desafíos en agua</span>
              </h1>
              
              <p className="text-lg text-white/70 mb-8 max-w-xl">
                Conectamos usuarios finales con las soluciones tecnológicas más innovadoras 
                para el tratamiento y gestión del agua industrial.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-[#ffa720] hover:bg-[#e69500] text-white font-medium px-8 gap-2"
                >
                  <Search className="w-4 h-4" />
                  Explorar Tecnologías
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Link to="/advisor">
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-medium px-8 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Consultar AI Advisor
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side - Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <Card 
                  key={feature.title} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors"
                >
                  <CardContent className="p-6">
                    <feature.icon className="w-8 h-8 text-[#ffa720] mb-4" />
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
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-[#ffa720] mb-2">{stat.value}</div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Industries Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Sectores que confían en nosotros
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Ayudamos a industrias de todo tipo a optimizar sus procesos de tratamiento de agua
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {industries.map((industry) => (
              <Card key={industry.title} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-xl bg-[#ffa720] text-white flex items-center justify-center mb-6">
                    <industry.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-white mb-4">{industry.title}</h3>
                  <ul className="space-y-3">
                    {industry.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-white/70 text-sm">
                        <Check className="w-4 h-4 text-[#ffa720] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="container mx-auto px-6 py-16 border-t border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Por qué elegir WaterTech Hub?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#ffa720]/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[#ffa720]" />
              </div>
              <h3 className="font-semibold text-white mb-2">Rápido y Eficiente</h3>
              <p className="text-white/60 text-sm">
                Encuentra tecnologías en segundos en lugar de semanas de investigación
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#ffa720]/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#ffa720]" />
              </div>
              <h3 className="font-semibold text-white mb-2">Información Verificada</h3>
              <p className="text-white/60 text-sm">
                Datos curados y actualizados por expertos en tecnologías del agua
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#ffa720]/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#ffa720]" />
              </div>
              <h3 className="font-semibold text-white mb-2">IA Especializada</h3>
              <p className="text-white/60 text-sm">
                Asistente virtual entrenado específicamente en tratamiento de agua
              </p>
            </div>
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
                className="bg-[#ffa720] hover:bg-[#e69500] text-white font-medium px-10"
              >
                {user ? "Ir al Dashboard" : "Acceder a la Plataforma"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={vandarumLogoWhite} 
                alt="Vandarum" 
                className="h-8 w-auto opacity-80"
              />
            </div>
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
