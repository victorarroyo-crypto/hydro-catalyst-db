import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Loader2, 
  PlusCircle,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  FileText,
  Square,
} from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorChat } from '@/hooks/useAdvisorChat';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { useAdvisorServices } from '@/hooks/useAdvisorServices';
import { useLLMModels, getDefaultModel, isFreeModel, formatModelCost } from '@/hooks/useLLMModels';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import vandarumSymbolBlue from '@/assets/vandarum-symbol-blue.png';
import { TechSheetCard } from '@/components/advisor/TechSheetCard';
import { ComparisonTableCard } from '@/components/advisor/ComparisonTableCard';
import { WaterAnalysisCard } from '@/components/advisor/WaterAnalysisCard';
import { ToolCard } from '@/components/advisor/ToolCard';
import { AdvisorMessage } from '@/components/advisor/AdvisorMessage';
import { ServicesBar } from '@/components/advisor/ServicesBar';
import { ComparadorModal, type ComparadorData } from '@/components/advisor/modals/ComparadorModal';
import { ChecklistModal, type ChecklistData } from '@/components/advisor/modals/ChecklistModal';
import { FichaModal, type FichaData } from '@/components/advisor/modals/FichaModal';
import { PresupuestoModal, type PresupuestoData } from '@/components/advisor/modals/PresupuestoModal';
import { PromptExamples } from '@/components/advisor/PromptExamples';
import type { Message } from '@/types/advisorChat';



export default function AdvisorChat() {
  const navigate = useNavigate();
  const { advisorUser, signOut, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { 
    messages, 
    isLoading, 
    isStreaming,
    sendMessage, 
    startNewChat, 
    chatId,
    stopStreaming,
  } = useAdvisorChat(advisorUser?.id);
  const { balance, freeRemaining, refetch: refetchCredits } = useAdvisorCredits(advisorUser?.id);
  
  // Fetch LLM models from Railway
  const { data: llmData, isLoading: modelsLoading } = useLLMModels();
  const models = llmData?.models ?? [];
  
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeModal, setActiveModal] = useState<'comparador' | 'checklist' | 'ficha' | 'presupuesto' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Hook for special services
  const { callService, isLoading: serviceLoading } = useAdvisorServices(
    advisorUser?.id,
    chatId,
    () => {
      // We refetch credits after service call
      refetchCredits();
    },
    (newCredits) => {
      // Credits updated callback - refetch will handle this
    }
  );
  
  // Set default model when models load
  useEffect(() => {
    if (llmData && !selectedModel) {
      const defaultModel = getDefaultModel(llmData);
      if (defaultModel) setSelectedModel(defaultModel.key);
    }
  }, [llmData, selectedModel]);

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

  // Detect service redirect from backend and auto-open modal
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.metadata?.type === 'service_redirect' &&
        lastMessage.metadata?.redirect_to_service
      ) {
        // Open modal after showing the message
        const timer = setTimeout(() => {
          setActiveModal(lastMessage.metadata!.redirect_to_service!);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [messages]);

  // Service handlers
  const handleComparadorSubmit = async (data: ComparadorData) => {
    await callService('comparador', data);
  };

  const handleChecklistSubmit = async (data: ChecklistData) => {
    await callService('checklist', data);
  };

  const handleFichaSubmit = async (data: FichaData) => {
    await callService('ficha', data);
  };

  const handlePresupuestoSubmit = async (data: PresupuestoData) => {
    await callService('presupuesto', data);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const model = models.find(m => m.key === selectedModel);
    if (!model) return;

    // Check if user can send (has free queries or credits)
    const canUseFreeModel = freeRemaining > 0 && isFreeModel(model);
    const creditCost = model.cost_per_query * 100; // Convert to credits (approx)
    const hasCredits = balance >= creditCost;

    if (!canUseFreeModel && !hasCredits) {
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

  const currentModel = models.find(m => m.key === selectedModel);
  const canUseFree = freeRemaining > 0 && currentModel && isFreeModel(currentModel);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={vandarumSymbolBlue} alt="Vandarum" className="h-9 w-auto" />
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
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelsLoading}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={modelsLoading ? "Cargando..." : "Seleccionar modelo"} />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.key} value={model.key}>
                    <span className="flex items-center gap-2">
                      <span>{model.name}</span>
                      {model.is_free && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                          Gratis
                        </Badge>
                      )}
                      {model.is_recommended && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Recomendado
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">
                        {formatModelCost(model.cost_per_query)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={startNewChat}
              className="gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Nuevo Chat
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

      {/* Services Bar */}
      <ServicesBar 
        onServiceClick={setActiveModal} 
        userCredits={balance} 
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto py-6 space-y-6">
          {/* Welcome with example queries */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-8">
              <div className="text-center space-y-3">
                <img src={vandarumSymbolBlue} alt="Vandarum" className="h-14 w-auto mx-auto" />
                <h2 className="text-2xl font-semibold">¿En qué puedo ayudarte?</h2>
                <p className="text-muted-foreground">Experto en tratamiento de aguas industriales</p>
              </div>
              
              <PromptExamples onSelectPrompt={(prompt) => setInputValue(prompt)} />

              {/* Info about features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mt-2">
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Fichas técnicas</p>
                  <p className="text-xs text-muted-foreground">0.5 créditos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Análisis de agua</p>
                  <p className="text-xs text-muted-foreground">2 créditos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
                  <svg className="w-6 h-6 mx-auto mb-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <p className="text-sm font-medium">Comparador</p>
                  <p className="text-xs text-muted-foreground">Incluido</p>
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
                <img src={vandarumSymbolBlue} alt="Vandarum" className="h-8 w-auto flex-shrink-0" />
              )}
              <div
                className={cn(
                  'flex-1 max-w-[85%] rounded-2xl p-4',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/50 rounded-tl-none'
                )}
              >

                {/* Message Content */}
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <AdvisorMessage 
                    content={message.content} 
                    sources={message.sources}
                  />
                )}

                {/* Tech Sheet Card */}
                {message.role === 'assistant' && message.metadata?.type === 'tech_sheet' && message.metadata.tech_sheet && (
                  <TechSheetCard tech={message.metadata.tech_sheet} />
                )}

                {/* Comparison Table */}
                {message.role === 'assistant' && message.metadata?.type === 'comparison' && message.metadata.comparison && (
                  <ComparisonTableCard comparison={message.metadata.comparison} />
                )}

                {/* Water Analysis */}
                {message.role === 'assistant' && message.metadata?.type === 'water_analysis' && message.metadata.water_analysis && (
                  <WaterAnalysisCard analysis={message.metadata.water_analysis} />
                )}

                {/* Tool Cards (new special tools) */}
                {message.role === 'assistant' && message.metadata?.tool_data && (
                  <ToolCard metadata={message.metadata.tool_data} />
                )}

                {/* Credits used indicator */}
                {message.role === 'assistant' && message.credits_used !== undefined && (
                  <div className="mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                    {message.credits_used.toFixed(3)} créditos
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <img src={vandarumSymbolBlue} alt="Vandarum" className="h-8 w-auto flex-shrink-0" />
              <div className="bg-muted/50 rounded-2xl rounded-tl-none p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-muted/60 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 bg-background border-2 border-primary/20 rounded-2xl p-3 shadow-lg">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre tratamiento de agua..."
              disabled={isLoading}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 h-14 text-base px-4"
            />
            {isStreaming ? (
              <Button 
                onClick={stopStreaming}
                variant="destructive"
                size="lg" 
                className="h-14 px-6 gap-2"
              >
                <Square className="w-4 h-4" />
                Detener
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !inputValue.trim()} 
                size="lg" 
                className="h-14 px-8"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground gap-4">
            <span>
              {canUseFree 
                ? `Consulta gratuita (${freeRemaining} restantes)`
                : currentModel ? formatModelCost(currentModel.cost_per_query) : ''
              }
            </span>
            <span className="text-border">•</span>
            <span>Las recomendaciones son orientativas</span>
          </div>
        </div>
      </div>

      {/* Service Modals */}
      <ComparadorModal
        isOpen={activeModal === 'comparador'}
        onClose={() => setActiveModal(null)}
        onSubmit={handleComparadorSubmit}
        userCredits={balance}
      />
      <ChecklistModal
        isOpen={activeModal === 'checklist'}
        onClose={() => setActiveModal(null)}
        onSubmit={handleChecklistSubmit}
        userCredits={balance}
      />
      <FichaModal
        isOpen={activeModal === 'ficha'}
        onClose={() => setActiveModal(null)}
        onSubmit={handleFichaSubmit}
        userCredits={balance}
      />
      <PresupuestoModal
        isOpen={activeModal === 'presupuesto'}
        onClose={() => setActiveModal(null)}
        onSubmit={handlePresupuestoSubmit}
      />
    </div>
  );
}
