import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Loader2, Plus } from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorHistory } from '@/hooks/useAdvisorHistory';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdvisorHistory() {
  const navigate = useNavigate();
  const { advisorUser, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { chats, isLoading } = useAdvisorHistory(advisorUser?.id);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/advisor/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/chat')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Historial de Conversaciones</h1>
              <p className="text-muted-foreground">{chats.length} conversaciones</p>
            </div>
          </div>
          <Link to="/advisor/chat">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva consulta
            </Button>
          </Link>
        </div>

        {/* Chat List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : chats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tienes conversaciones aún</h3>
              <p className="text-muted-foreground mb-4">
                Inicia tu primera consulta con nuestro asistente de IA
              </p>
              <Link to="/advisor/chat">
                <Button>Iniciar consulta</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => (
              <Link key={chat.id} to={`/advisor/chat?id=${chat.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{chat.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {chat.message_count} mensajes
                          </span>
                          {chat.model_used && (
                            <Badge variant="outline" className="text-xs">
                              {chat.model_used}
                            </Badge>
                          )}
                          {chat.total_credits_used > 0 && (
                            <span>{chat.total_credits_used.toFixed(2)} créditos</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground text-right">
                        <div>{format(new Date(chat.updated_at), 'dd MMM yyyy', { locale: es })}</div>
                        <div>{format(new Date(chat.updated_at), 'HH:mm', { locale: es })}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
