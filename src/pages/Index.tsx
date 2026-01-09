import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import vandarumSymbolBlue from "@/assets/vandarum-symbol-blue.png";
import { 
  Search, 
  Network, 
  Sparkles, 
  ArrowRight,
  Check,
  Building2,
  FlaskConical,
  Factory,
  Droplets,
  Shield,
  Zap,
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={vandarumSymbolBlue} alt="Vandarum" className="h-10 w-auto" />
            <span className="font-bold text-xl">WaterTech Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/advisor">
              <Button variant="ghost" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Advisor
              </Button>
            </Link>
            {user ? (
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Iniciar Sesión</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button>Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          <Droplets className="w-3 h-3 mr-1" />
          Plataforma de Inteligencia de Tecnologías del Agua
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Encuentra la tecnología perfecta para tus desafíos en agua
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Conectamos usuarios finales con las soluciones tecnológicas más innovadoras 
          para el tratamiento y gestión del agua industrial.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={handleGetStarted} className="gap-2">
            <Search className="w-4 h-4" />
            Explorar Tecnologías
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Link to="/advisor">
            <Button size="lg" variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Consultar AI Advisor
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-xl bg-card border">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Todo lo que necesitas para tomar mejores decisiones
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Nuestra plataforma centraliza información de las mejores tecnologías del agua del mundo
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Industries Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl mx-4">
        <h2 className="text-3xl font-bold text-center mb-4">
          Sectores que confían en nosotros
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Ayudamos a industrias de todo tipo a optimizar sus procesos de tratamiento de agua
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {industries.map((industry) => (
            <Card key={industry.title} className="bg-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
                  <industry.icon className="w-7 h-7" />
                </div>
                <CardTitle>{industry.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {industry.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
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
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            ¿Por qué elegir WaterTech Hub?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Rápido y Eficiente</h3>
              <p className="text-muted-foreground text-sm">
                Encuentra tecnologías en segundos en lugar de semanas de investigación
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Información Verificada</h3>
              <p className="text-muted-foreground text-sm">
                Datos curados y actualizados por expertos en tecnologías del agua
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">IA Especializada</h3>
              <p className="text-muted-foreground text-sm">
                Asistente virtual entrenado específicamente en tratamiento de agua
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <img 
              src={vandarumSymbolBlue} 
              alt="Vandarum" 
              className="h-12 w-auto mx-auto mb-6 brightness-0 invert"
            />
            <h2 className="text-3xl font-bold mb-4">
              Comienza a explorar tecnologías hoy
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Únete a las empresas que ya están encontrando las mejores soluciones 
              para sus desafíos en agua
            </p>
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              {user ? "Ir al Dashboard" : "Acceder a la Plataforma"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={vandarumSymbolBlue} alt="Vandarum" className="h-8 w-auto" />
            <span className="font-semibold text-foreground">WaterTech Hub</span>
          </div>
          <p>© {new Date().getFullYear()} Vandarum. Todos los derechos reservados.</p>
          <p className="mt-2">
            <Link to="/terms" className="hover:underline">Términos</Link>
            {' · '}
            <Link to="/privacy" className="hover:underline">Privacidad</Link>
            {' · '}
            <Link to="/cookies" className="hover:underline">Cookies</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
