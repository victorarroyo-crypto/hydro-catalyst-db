import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Send, 
  Loader2, 
  Droplets, 
  ChevronDown, 
  Plus, 
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorChat } from '@/hooks/useAdvisorChat';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', price: 0.15, credits: 0.33, freeAllowed: true },
  { id: 'gpt-4o', name: 'GPT-4o', price: 0.45, credits: 1.0, freeAllowed: false },
  { id: 'claude-sonnet', name: 'Claude Sonnet', price: 0.60, credits: 1.33, freeAllowed: false },
  { id: 'claude-opus', name: 'Claude Opus', price: 1.50, credits: 3.33, freeAllowed: false },
];

const WELCOME_MESSAGE = `¡Hola! 👋 Soy tu asistente experto en tratamiento de aguas industriales.

Puedo ayudarte a:
• **Encontrar tecnologías** para tu problema específico
• **Comparar proveedores** y soluciones
• **Analizar datos** de calidad de agua
• **Recomendar configuraciones** de tratamiento

¿En qué puedo ayudarte hoy?`;

export default function AdvisorChat() {
  const navigate = useNavigate();
  const { advisorUser, signOut, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { messages, isLoading, sendMessage, startNewChat } = useAdvisorChat(advisorUser?.id);
  const { balance, freeRemaining, refetch: refetchCredits } = useAdvisorCredits(advisorUser?.id);
  
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/advisor/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const model = AI_MODELS.find(m => m.id === selectedModel);
    if (!model) return;

    // Check if user can send (has free queries or credits)
    const canUseFree = freeRemaining > 0 && model.freeAllowed;
    const hasCredits = balance >= model.credits;

    if (!canUseFree && !hasCredits) {
      toast.error('No tienes créditos suficientes. Compra un pack para continuar.');
      return;
    }

    const message = inputValue;
    setInputValue('');

    try {
      await sendMessage(message, selectedModel);
      refetchCredits();
    } catch (error) {
      toast.error('Error al enviar el mensaje. Inténtalo de nuevo.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentModel = AI_MODELS.find(m => m.id === selectedModel);
  const canUseFree = freeRemaining > 0 && currentModel?.freeAllowed;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Droplets className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AI Advisor</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Credits Badge */}
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{balance.toFixed(1)} créditos</span>
              {freeRemaining > 0 && (
                <span className="text-muted-foreground">· {freeRemaining} gratis</span>
              )}
            </Badge>

            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem 
                    key={model.id} 
                    value={model.id}
                    disabled={!model.freeAllowed && freeRemaining > 0 && balance < model.credits}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        €{model.price.toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <Button variant="ghost" size="icon" onClick={startNewChat} title="Nueva conversación">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/dashboard')} title="Dashboard">
              <LayoutDashboard className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/history')} title="Historial">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 bg-muted/50 rounded-2xl rounded-tl-none p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {WELCOME_MESSAGE}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'flex-1 max-w-[85%] rounded-2xl p-4',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/50 rounded-tl-none'
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* Sources */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                        <span className="text-xs">Ver fuentes ({message.sources.length})</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="text-xs bg-background/50 rounded-lg p-2 border">
                          <div className="font-medium">{source.nombre}</div>
                          <div className="text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{source.proveedor}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              TRL {source.trl}
                            </Badge>
                            <span className="ml-auto">{Math.round(source.similarity * 100)}% relevancia</span>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted/50 rounded-2xl rounded-tl-none p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre tratamiento de agua..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {canUseFree 
                ? `Consulta gratuita (${freeRemaining} restantes este mes)`
                : `Coste: ${currentModel?.credits.toFixed(2)} créditos`
              }
            </span>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Las recomendaciones son orientativas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
