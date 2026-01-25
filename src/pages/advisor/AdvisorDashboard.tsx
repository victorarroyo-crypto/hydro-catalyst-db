import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  MessageSquare, 
  Phone, 
  ArrowLeft, 
  Plus, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { useAdvisorHistory } from '@/hooks/useAdvisorHistory';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DeepAdvisorConfigPanel } from '@/components/advisor/DeepAdvisorConfigPanel';

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const { advisorUser, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { balance, freeRemaining, transactions, isLoading: creditsLoading } = useAdvisorCredits(advisorUser?.id);
  const { chats, isLoading: historyLoading } = useAdvisorHistory(advisorUser?.id);

  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackForm, setCallbackForm] = useState({
    name: advisorUser?.name || '',
    email: advisorUser?.email || '',
    company: advisorUser?.company || '',
    phone: '',
    description: '',
  });

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/advisor/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorUser) return;

    setCallbackLoading(true);
    try {
      const { error } = await externalSupabase
        .from('advisor_callback_requests')
        .insert({
          user_id: advisorUser.id,
          name: callbackForm.name,
          email: callbackForm.email,
          company: callbackForm.company || null,
          phone: callbackForm.phone || null,
          description: callbackForm.description || null,
          type: 'consultation',
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Solicitud enviada. Te contactaremos pronto.');
      setCallbackOpen(false);
      setCallbackForm(prev => ({ ...prev, phone: '', description: '' }));
    } catch (error) {
      console.error('Callback error:', error);
      toast.error('Error al enviar la solicitud');
    } finally {
      setCallbackLoading(false);
    }
  };

  if (authLoading || !advisorUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/chat')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mi Dashboard</h1>
              <p className="text-muted-foreground">Hola, {advisorUser.name || advisorUser.email}</p>
            </div>
          </div>
          <Link to="/advisor/pricing">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Comprar créditos
            </Button>
          </Link>
        </div>

        {/* Credits Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Balance de Créditos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {balance.toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">créditos disponibles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Consultas Gratis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {freeRemaining}/5
              </div>
              <p className="text-sm text-muted-foreground mt-1">este mes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conversaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {chats.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">total</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Historial de Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay transacciones aún
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">
                          {format(new Date(t.created_at), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'usage' ? 'secondary' : 'default'}>
                            {t.type === 'purchase' && 'Compra'}
                            {t.type === 'usage' && 'Uso'}
                            {t.type === 'bonus' && 'Bonus'}
                            {t.type === 'refund' && 'Reembolso'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                            {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversaciones Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No tienes conversaciones aún
                  </p>
                  <Link to="/advisor/chat">
                    <Button>Iniciar primera consulta</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.slice(0, 5).map((chat) => (
                    <Link 
                      key={chat.id} 
                      to={`/advisor/chat?id=${chat.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span>{chat.message_count} mensajes</span>
                        <span>·</span>
                        <span>{format(new Date(chat.updated_at), 'dd MMM', { locale: es })}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deep Advisor Configuration */}
        <DeepAdvisorConfigPanel variant="collapsible" />

        {/* Consultation CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              ¿Necesitas ayuda profesional?
            </CardTitle>
            <CardDescription>
              Agenda una llamada con uno de nuestros expertos en tratamiento de agua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={callbackOpen} onOpenChange={setCallbackOpen}>
              <DialogTrigger asChild>
                <Button>Solicitar llamada - 30min - €150</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Consultoría</DialogTitle>
                  <DialogDescription>
                    Completa el formulario y te contactaremos para agendar la llamada
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCallbackSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cb-name">Nombre *</Label>
                      <Input
                        id="cb-name"
                        value={callbackForm.name}
                        onChange={(e) => setCallbackForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cb-email">Email *</Label>
                      <Input
                        id="cb-email"
                        type="email"
                        value={callbackForm.email}
                        onChange={(e) => setCallbackForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cb-company">Empresa</Label>
                      <Input
                        id="cb-company"
                        value={callbackForm.company}
                        onChange={(e) => setCallbackForm(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cb-phone">Teléfono</Label>
                      <Input
                        id="cb-phone"
                        value={callbackForm.phone}
                        onChange={(e) => setCallbackForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cb-description">Describe tu caso</Label>
                    <Textarea
                      id="cb-description"
                      value={callbackForm.description}
                      onChange={(e) => setCallbackForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Cuéntanos sobre tu proyecto o problema..."
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={callbackLoading}>
                    {callbackLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Enviar solicitud
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
