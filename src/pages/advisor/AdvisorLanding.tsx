import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Scale, FlaskConical, Droplets, Check, ArrowRight, Home } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Búsqueda Inteligente',
    description: 'Encuentra la tecnología perfecta entre +2,600 opciones en nuestra base de datos',
  },
  {
    icon: Scale,
    title: 'Comparativas',
    description: 'Compara proveedores, costes y especificaciones técnicas de forma instantánea',
  },
  {
    icon: FlaskConical,
    title: 'Análisis de Agua',
    description: 'Sube tu análisis de agua y recibe recomendaciones personalizadas de tratamiento',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    credits: 10,
    price: 4,
    pricePerCredit: 0.40,
    popular: false,
  },
  {
    name: 'Basic',
    credits: 20,
    price: 7,
    pricePerCredit: 0.35,
    popular: false,
  },
  {
    name: 'Pro',
    credits: 40,
    price: 12,
    pricePerCredit: 0.30,
    popular: true,
  },
  {
    name: 'Enterprise',
    credits: 60,
    price: 15,
    pricePerCredit: 0.25,
    popular: false,
  },
];

export default function AdvisorLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">AI Advisor</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/advisor/auth">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link to="/advisor/auth?mode=signup">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Potenciado por +2,600 tecnologías de tratamiento de agua
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Tu experto en agua industrial 24/7
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Consulta sobre tecnologías de tratamiento de agua industrial con IA avanzada. 
          Obtén recomendaciones personalizadas basadas en tu caso específico.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/advisor/auth?mode=signup">
            <Button size="lg" className="gap-2">
              Prueba gratis - 5 consultas/mes
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="#pricing">
            <Button size="lg" variant="outline">
              Ver planes
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Todo lo que necesitas para tomar mejores decisiones
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
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

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Planes flexibles para cada necesidad
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Compra packs de créditos y úsalos cuando los necesites. Sin suscripciones ni compromisos.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Más popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="text-3xl font-bold mt-2">
                  €{plan.price}
                </div>
                <CardDescription>
                  {plan.credits} créditos
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  €{plan.pricePerCredit.toFixed(2)}/crédito
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Todos los modelos IA
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Sin caducidad
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Historial completo
                  </li>
                </ul>
                <Link to="/advisor/auth?mode=signup">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    Comprar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          💡 5 consultas gratis al mes con el modelo rápido (GPT-4o-mini)
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Vandarum Water Tech Hub. Todos los derechos reservados.</p>
          <p className="mt-2">
            <Link to="/terms" className="hover:underline">Términos</Link>
            {' · '}
            <Link to="/privacy" className="hover:underline">Privacidad</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
