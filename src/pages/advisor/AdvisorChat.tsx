import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  Send, 
  Loader2, 
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Square,
  Briefcase,
} from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorChat } from '@/hooks/useAdvisorChat';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { useAdvisorServices } from '@/hooks/useAdvisorServices';
import { useDeepAdvisorConfig, getValidatedConfig } from '@/hooks/useDeepAdvisorConfig';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import vandarumSymbolBlue from '@/assets/vandarum-symbol-blue.png';
import { TechSheetCard } from '@/components/advisor/TechSheetCard';
import { ComparisonTableCard } from '@/components/advisor/ComparisonTableCard';
import { WaterAnalysisCard } from '@/components/advisor/WaterAnalysisCard';
import { ToolCard } from '@/components/advisor/ToolCard';
import { AdvisorMessage } from '@/components/advisor/AdvisorMessage';
import { ServicesBar } from '@/components/advisor/ServicesBar';
import { DeepAdvisorConfigPopover } from '@/components/advisor/DeepAdvisorConfigPopover';
import { DeepModeToggle, useDeepMode } from '@/components/advisor/DeepModeToggle';
import { AgentAnalysesAccordion } from '@/components/advisor/AgentAnalysesAccordion';
import { DeepAdvisorProgressIndicator } from '@/components/advisor/DeepAdvisorProgressIndicator';
import { ComparadorModal, type ComparadorData } from '@/components/advisor/modals/ComparadorModal';
import { ChecklistModal, type ChecklistData } from '@/components/advisor/modals/ChecklistModal';
import { FichaModal, type FichaData } from '@/components/advisor/modals/FichaModal';
import { PresupuestoModal, type PresupuestoData } from '@/components/advisor/modals/PresupuestoModal';
import { PromptExamples } from '@/components/advisor/PromptExamples';
import { FileAttachmentButton } from '@/components/advisor/FileAttachmentButton';
import type { Message, AttachmentInfo } from '@/types/advisorChat';



export default function AdvisorChat() {
  const navigate = useNavigate();
  const { advisorUser, signOut, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { 
    messages, 
    isLoading, 
    isStreaming,
    isDeepProcessing,
    sendMessage, 
    startNewChat, 
    chatId,
    stopStreaming,
  } = useAdvisorChat(advisorUser?.id);
  const { balance, freeRemaining, refetch: refetchCredits } = useAdvisorCredits(advisorUser?.id);
  const { config: deepConfig } = useDeepAdvisorConfig();
  const { deepMode, setDeepMode } = useDeepMode();
  
  const [inputValue, setInputValue] = useState('');
  const [activeModal, setActiveModal] = useState<'comparador' | 'checklist' | 'ficha' | 'presupuesto' | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
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

    // Get validated config to ensure all models are valid
    const validatedConfig = getValidatedConfig(deepConfig);
    
    // Use validated synthesis model with safe fallback
    const synthesisModel = validatedConfig?.synthesis_model || 'deepseek';

    // Check if user has credits (simplified - deep advisor handles model costs)
    if (freeRemaining <= 0 && balance <= 0) {
      toast.error('No tienes créditos suficientes. Compra un pack para continuar.');
      return;
    }

    const message = inputValue;
    setInputValue('');

    try {
      // Pass deep mode flag and validated config to sendMessage
      await sendMessage(
        message, 
        synthesisModel, 
        deepMode,
        deepMode && validatedConfig ? {
          synthesis_model: validatedConfig.synthesis_model,
          analysis_model: validatedConfig.analysis_model,
          search_model: validatedConfig.search_model,
          enable_web_search: validatedConfig.enable_web_search,
          enable_rag: validatedConfig.enable_rag,
        } : undefined
      );
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

  // Determine if user can use free queries
  const canUseFree = freeRemaining > 0;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header with brand gradient */}
      <header className="px-4 py-3 text-white" style={{
        background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)',
      }}>
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={vandarumSymbolBlue} alt="Vandarum" className="h-9 w-auto brightness-0 invert" />
            <span className="font-bold text-lg">AI Advisor</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Deep Mode Toggle */}
            <DeepModeToggle 
              isProcessing={isDeepProcessing}
              onChange={setDeepMode}
            />

            {/* Separator */}
            <div className="h-6 w-px bg-white/20" />

            {/* Credits Badge */}
            <Badge className="gap-1.5 px-3 py-1.5 bg-white/20 text-white border-white/30 hover:bg-white/30">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{balance.toFixed(1)} créditos</span>
              {freeRemaining > 0 && (
                <span className="text-white/70">· {freeRemaining} gratis</span>
              )}
            </Badge>

            <DeepAdvisorConfigPopover />
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/dashboard')} title="Dashboard" className="text-white hover:bg-white/20">
              <LayoutDashboard className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/advisor/history')} title="Historial" className="text-white hover:bg-white/20">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión" className="text-white hover:bg-white/20">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Services Bar */}
      <ServicesBar 
        onServiceClick={setActiveModal} 
        userCredits={balance}
        onNewChat={startNewChat}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto py-6 space-y-6">
          {/* Welcome with example queries */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              {/* Hero section */}
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 blur-3xl rounded-full" style={{ background: 'linear-gradient(135deg, rgba(48,113,119,0.2), rgba(50,180,205,0.15))' }} />
                  <img src={vandarumSymbolBlue} alt="Vandarum" className="h-16 w-auto mx-auto relative" />
                </div>
                <h2 className="text-2xl font-bold" style={{ 
                  background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Tu Experto en Agua Industrial
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Resuelve tus dudas sobre tratamiento de agua con IA especializada. 
                  <span className="font-medium" style={{ color: '#307177' }}> +20 años de experiencia</span> en el sector.
                </p>
              </div>

              {/* Value propositions */}
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                <Badge variant="outline" className="px-3 py-1.5 bg-[#307177]/10 border-[#307177]/30 text-[#307177]">
                  ✓ Respuestas inmediatas
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 bg-[#32b4cd]/10 border-[#32b4cd]/30 text-[#32b4cd]">
                  ✓ Conocimiento experto
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 bg-[#8cb63c]/10 border-[#8cb63c]/30 text-[#8cb63c]">
                  ✓ Normativa actualizada
                </Badge>
              </div>
              
              <PromptExamples onSelectPrompt={(prompt) => setInputValue(prompt)} />

              {/* Marketing CTA */}
              <div className="border rounded-xl p-5 max-w-lg w-full text-center space-y-3" style={{
                background: 'linear-gradient(135deg, rgba(48,113,119,0.08) 0%, rgba(50,180,205,0.05) 50%, rgba(140,182,60,0.08) 100%)',
                borderColor: 'rgba(48,113,119,0.25)'
              }}>
                <p className="text-sm font-medium">
                  ¿Necesitas una solución personalizada para tu planta?
                </p>
                <p className="text-xs text-muted-foreground">
                  Nuestros ingenieros pueden diseñar el tratamiento óptimo para tu caso específico
                </p>
                <Button 
                  onClick={() => setActiveModal('presupuesto')}
                  className="text-white shadow-lg hover:shadow-xl transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)',
                  }}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Solicitar Consultoría
                </Button>
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
                    ? 'text-white rounded-tr-none'
                    : 'bg-white/80 border border-slate-200/50 rounded-tl-none shadow-sm'
                )}
                style={message.role === 'user' ? { background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)' } : undefined}
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

                {/* Agent Analyses Accordion (Deep Mode) */}
                {message.role === 'assistant' && message.agentAnalyses && message.agentAnalyses.length > 0 && (
                  <AgentAnalysesAccordion analyses={message.agentAnalyses} />
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
              <div className="flex-1 max-w-[85%]">
                {isDeepProcessing ? (
                  <DeepAdvisorProgressIndicator isProcessing={isDeepProcessing} />
                ) : (
                  <div className="bg-white/80 border border-slate-200/50 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#32b4cd' }} />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-8" style={{ background: 'linear-gradient(180deg, rgba(48,113,119,0.03) 0%, rgba(50,180,205,0.05) 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 bg-white rounded-2xl p-3 shadow-lg items-center" style={{ border: '2px solid rgba(48,113,119,0.2)' }}>
            <FileAttachmentButton
              attachments={attachments}
              onAttach={(files) => {
                const newAttachments: AttachmentInfo[] = files.map(f => ({
                  id: crypto.randomUUID(),
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  file: f,
                }));
                setAttachments(prev => [...prev, ...newAttachments]);
              }}
              onRemove={(id) => setAttachments(prev => prev.filter(a => a.id !== id))}
              disabled={isLoading}
            />
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
                size="lg" 
                className="h-14 px-6 gap-2 text-white"
                style={{ background: '#ffa720' }}
              >
                <Square className="w-4 h-4" />
                Detener
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !inputValue.trim()} 
                size="lg" 
                className="h-14 px-8 text-white"
                style={{ background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)' }}
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
                : `Créditos: ${balance.toFixed(2)}`
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
