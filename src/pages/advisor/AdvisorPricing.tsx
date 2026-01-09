import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Check, Droplets } from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { toast } from 'sonner';

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

const models = [
  { name: 'GPT-4o Mini', credits: 0.33, price: 0.15, speed: 'Muy rápido', quality: 'Buena' },
  { name: 'GPT-4o', credits: 1.0, price: 0.45, speed: 'Rápido', quality: 'Muy buena' },
  { name: 'Claude Sonnet', credits: 1.33, price: 0.60, speed: 'Rápido', quality: 'Excelente' },
  { name: 'Claude Opus', credits: 3.33, price: 1.50, speed: 'Moderado', quality: 'Máxima' },
];

const faqs = [
  {
    question: '¿Qué son los créditos?',
    answer: 'Los créditos son la moneda que usas para hacer consultas. Cada modelo de IA consume una cantidad diferente de créditos por consulta.',
  },
  {
    question: '¿Caducan los créditos?',
    answer: 'No, los créditos que compras no caducan nunca. Puedes usarlos cuando quieras.',
  },
  {
    question: '¿Qué incluyen las consultas gratis?',
    answer: 'Cada mes tienes 5 consultas gratis con el modelo GPT-4o Mini. Se renuevan automáticamente cada 30 días.',
  },
  {
    question: '¿Puedo usar diferentes modelos?',
    answer: 'Sí, puedes cambiar de modelo en cualquier momento. Cada modelo tiene diferentes costes en créditos.',
  },
  {
    question: '¿Cómo puedo pagar?',
    answer: 'Aceptamos tarjeta de crédito/débito y PayPal. El pago es seguro y procesado por Stripe.',
  },
];

export default function AdvisorPricing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAdvisorAuth();

  const handlePurchase = (plan: typeof pricingPlans[0]) => {
    if (!isAuthenticated) {
      navigate('/advisor/auth?mode=signup');
      return;
    }
    // TODO: Integrate with Stripe
    toast.info(`Integración de pago pendiente. Plan: ${plan.name}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/advisor" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Droplets className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">AI Advisor</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/advisor/chat">
                <Button variant="ghost">Ir al chat</Button>
              </Link>
            ) : (
              <>
                <Link to="/advisor/auth">
                  <Button variant="ghost">Iniciar Sesión</Button>
                </Link>
                <Link to="/advisor/auth?mode=signup">
                  <Button>Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Planes de Créditos</h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Compra créditos y úsalos cuando quieras. Sin suscripciones ni compromisos.
          </p>
        </div>

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
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handlePurchase(plan)}
                >
                  Comprar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          💡 5 consultas gratis al mes con el modelo rápido (GPT-4o Mini)
        </p>
      </section>

      {/* Models Comparison */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Comparativa de Modelos</h2>
        <Card className="max-w-3xl mx-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-center">Créditos/consulta</TableHead>
                <TableHead className="text-center">Precio €</TableHead>
                <TableHead className="text-center">Velocidad</TableHead>
                <TableHead className="text-center">Calidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.name}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell className="text-center">{model.credits.toFixed(2)}</TableCell>
                  <TableCell className="text-center">€{model.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{model.speed}</TableCell>
                  <TableCell className="text-center">{model.quality}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
        <Accordion type="single" collapsible className="max-w-2xl mx-auto">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Vandarum Water Tech Hub. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
