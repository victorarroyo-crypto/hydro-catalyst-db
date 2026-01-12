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
  ChevronDown, 
  Plus, 
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Paperclip,
  FileText,
  Image,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorChat } from '@/hooks/useAdvisorChat';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import vandarumSymbolBlue from '@/assets/vandarum-symbol-blue.png';
import { TechSheetCard } from '@/components/advisor/TechSheetCard';
import { ComparisonTableCard } from '@/components/advisor/ComparisonTableCard';
import { WaterAnalysisCard } from '@/components/advisor/WaterAnalysisCard';
import type { AttachmentInfo } from '@/types/advisorChat';

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', price: 0.75, credits: 1.65, freeAllowed: true },
  { id: 'gpt-4o', name: 'GPT-4o', price: 2.25, credits: 5.0, freeAllowed: false },
  { id: 'claude-sonnet', name: 'Claude Sonnet', price: 3.00, credits: 6.65, freeAllowed: false },
  { id: 'claude-opus', name: 'Claude Opus', price: 7.50, credits: 16.65, freeAllowed: false },
];

const EXAMPLE_QUERIES = [
  "¿Qué tecnología me recomiendas para tratar agua con alto contenido en metales pesados?",
  "Comparar sistemas de ósmosis inversa vs electrodiálisis",
  "Ficha técnica de ZeeWeed 500D",
  "Tecnologías para reutilización de agua en industria alimentaria",
  "¿Qué TRL tienen las tecnologías de desalinización solar?",
];

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AdvisorChat() {
  const navigate = useNavigate();
  const { advisorUser, signOut, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    startNewChat, 
    attachments, 
    addAttachment, 
    removeAttachment 
  } = useAdvisorChat(advisorUser?.id);
  const { balance, freeRemaining, refetch: refetchCredits } = useAdvisorCredits(advisorUser?.id);
  
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`Formato no soportado: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Archivo muy grande: ${file.name} (máx. 10MB)`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      addAttachment(validFiles);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-3 h-3" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <div className="max-w-4xl mx-auto py-6 space-y-6">
          {/* Welcome with example queries */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-8">
              <div className="text-center space-y-3">
                <img src={vandarumSymbolBlue} alt="Vandarum" className="h-16 w-auto mx-auto" />
                <h2 className="text-2xl font-semibold">¿En qué puedo ayudarte?</h2>
                <p className="text-muted-foreground">Experto en tratamiento de aguas industriales</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {EXAMPLE_QUERIES.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(query)}
                    className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg border border-border/50 hover:border-border transition-colors text-left"
                  >
                    {query}
                  </button>
                ))}
              </div>

              {/* Info about features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mt-4">
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Fichas técnicas</p>
                  <p className="text-xs text-muted-foreground">0.5 créditos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/30">
                  <Paperclip className="w-6 h-6 mx-auto mb-2 text-primary" />
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
                {/* User attachments */}
                {message.role === 'user' && message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {message.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-white/10"
                      >
                        {getFileIcon(file.type)}
                        <span className="max-w-[100px] truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {message.content}
                </div>

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

                {/* Sources - hidden by default, only shown if user explicitly asks */}

                {/* Credits used indicator */}
                {message.role === 'assistant' && message.credits_used !== undefined && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {message.credits_used} créditos utilizados
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
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-sm"
                >
                  {getFileIcon(file.type)}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <span className="text-muted-foreground text-xs">({formatSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(file.id)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 bg-background border-2 border-primary/20 rounded-2xl p-3 shadow-lg">
            {/* File attachment button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Adjuntar análisis de agua (PDF, Excel o imagen)"
              className="h-14 w-14 flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachments.length > 0 
                ? "Describe lo que quieres analizar..." 
                : "Escribe tu consulta sobre tratamiento de agua..."
              }
              disabled={isLoading}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 h-14 text-base px-4"
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || (!inputValue.trim() && attachments.length === 0)} 
              size="lg" 
              className="h-14 px-8"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground gap-4">
            <span>
              {attachments.length > 0 
                ? 'Análisis de agua: 2 créditos'
                : canUseFree 
                  ? `Consulta gratuita (${freeRemaining} restantes)`
                  : `${currentModel?.credits.toFixed(2)} créditos por consulta`
              }
            </span>
            <span className="text-border">•</span>
            <span>Las recomendaciones son orientativas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
