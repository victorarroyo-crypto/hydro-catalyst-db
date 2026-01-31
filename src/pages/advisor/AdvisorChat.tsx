import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  FileDown,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { useAdvisorChat } from '@/hooks/useAdvisorChat';
import { useDeepAdvisorJob } from '@/hooks/useDeepAdvisorJob';
import { useAdvisorCredits } from '@/hooks/useAdvisorCredits';
import { useAdvisorServices } from '@/hooks/useAdvisorServices';
import { useDeepAdvisorConfig, getConfigWithFallback } from '@/hooks/useDeepAdvisorConfig';
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
import { StreamingResponse, SourcesPanel } from '@/components/advisor/streaming';
import { DeepAdvisorProgress } from '@/components/advisor/DeepAdvisorProgress';
import { StreamingModeToggle, useStreamingMode } from '@/components/advisor/streaming/StreamingModeToggle';
import { SessionContextIndicator } from '@/components/advisor/SessionContextIndicator';
import { ComparadorModal, type ComparadorData } from '@/components/advisor/modals/ComparadorModal';
import { ChecklistModal, type ChecklistData } from '@/components/advisor/modals/ChecklistModal';
import { FichaModal, type FichaData } from '@/components/advisor/modals/FichaModal';
import { PresupuestoModal, type PresupuestoData } from '@/components/advisor/modals/PresupuestoModal';
import { PromptExamples } from '@/components/advisor/PromptExamples';
import { FileAttachmentButton, type UploadProgress } from '@/components/advisor/FileAttachmentButton';
import { AttachmentsSidebar } from '@/components/advisor/AttachmentsSidebar';
import { CompactUsageHint } from '@/components/advisor/CompactUsageHint';
import { AdvisorUsageGuideSheet } from '@/components/advisor/AdvisorUsageGuideSheet';
import { DeepModeActivatedBanner } from '@/components/advisor/DeepModeActivatedBanner';
import type { Message, AttachmentInfo } from '@/types/advisorChat';



export default function AdvisorChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { advisorUser, signOut, isAuthenticated, isLoading: authLoading } = useAdvisorAuth();
  
  // Standard chat hook (non-streaming)
  const { 
    messages, 
    isLoading, 
    isStreaming,
    isDeepProcessing,
    sendMessage, 
    startNewChat, 
    chatId,
    stopStreaming,
    loadChat,
  } = useAdvisorChat(advisorUser?.id);
  
  // Polling-based hook for Deep Mode (replaces SSE streaming)
  const deepJob = useDeepAdvisorJob({
    pollingInterval: 5000,
    onComplete: async (result) => {
      console.log('[AdvisorChat] Deep job complete:', result?.chat_id);
      
      // Save pdf_url to database if present for persistent access
      if (result?.chat_id && result?.pdf_url) {
        try {
          const { externalSupabase } = await import('@/integrations/supabase/externalClient');
          
          // Update the latest assistant message with the pdf_url
          const { error: updateError } = await externalSupabase
            .from('advisor_messages')
            .update({ pdf_url: result.pdf_url })
            .eq('chat_id', result.chat_id)
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (updateError) {
            console.warn('[AdvisorChat] Failed to save pdf_url:', updateError);
          } else {
            console.log('[AdvisorChat] Saved pdf_url to DB:', result.pdf_url);
          }
        } catch (err) {
          console.warn('[AdvisorChat] Error saving pdf_url:', err);
        }
      }
      
      // Sync messages from DB - backend already saved user + assistant messages
      if (result?.chat_id) {
        loadChat(result.chat_id);
      }
      
      refetchCredits();
      setPendingUserMessage(null);
    },
    onError: (error) => {
      console.error('[AdvisorChat] Deep job error:', error);
      toast.error(error);
      setPendingUserMessage(null);
    },
  });
  
  const { balance, freeRemaining, refetch: refetchCredits } = useAdvisorCredits(advisorUser?.id);
  const { config: deepConfig, isError: isConfigError, error: configError } = useDeepAdvisorConfig(advisorUser?.id);
  const { deepMode, setDeepMode } = useDeepMode();
  const { streamingMode, setStreamingMode } = useStreamingMode();
  
  const [inputValue, setInputValue] = useState('');
  const [activeModal, setActiveModal] = useState<'comparador' | 'checklist' | 'ficha' | 'presupuesto' | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    completedCount: 0,
    totalCount: 0,
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('advisor_sidebar_collapsed') === 'true';
  });
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showDeepBanner, setShowDeepBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevDeepModeRef = useRef(deepMode);
  const resumeToastShownForJobRef = useRef<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('advisor_sidebar_collapsed', String(newValue));
      return newValue;
    });
  };
  
  // Determine if we should use polling (Deep Mode + Streaming enabled)
  const useStreamingUI = deepMode && streamingMode;
  const isAnyLoading = isLoading || deepJob.isPolling;
  const isAnyStreaming = isStreaming || deepJob.isPolling;
  
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

  // Ref to track if streaming was active (persists across renders)
  const wasStreamingRef = useRef(false);
  
  // Update ref whenever streaming state changes
  useEffect(() => {
    if (isAnyStreaming) {
      wasStreamingRef.current = true;
    }
  }, [isAnyStreaming]);
  
  // Protected authentication redirect - never redirect during active streaming
  useEffect(() => {
    // Skip redirect if streaming is active
    if (isAnyStreaming || isAnyLoading) {
      return;
    }
    
    // Skip if we just finished streaming (give time to complete)
    if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      return;
    }
    
    if (!authLoading && !isAuthenticated) {
      // Double-check localStorage as last line of defense
      const storedUser = localStorage.getItem('advisor_user');
      if (storedUser) {
        // User exists in localStorage but context says not authenticated
        // This is a race condition - don't redirect, let context sync
        console.warn('[AdvisorChat] Auth context out of sync with localStorage, skipping redirect');
        return;
      }
      
      navigate('/advisor/auth');
    }
  }, [isAuthenticated, authLoading, navigate, isAnyStreaming, isAnyLoading]);

  // Auto-load active chat: prioritize URL param, fallback to localStorage
  useEffect(() => {
    if (!advisorUser?.id || messages.length > 0) return;
    
    // Check URL query param first (e.g., /advisor/chat?id=xxx from History)
    const searchParams = new URLSearchParams(location.search);
    const urlChatId = searchParams.get('id');
    
    if (urlChatId) {
      console.log('[AdvisorChat] Loading chat from URL param:', urlChatId);
      loadChat(urlChatId);
      // Update localStorage to keep it in sync
      localStorage.setItem('advisor_active_chat_id', urlChatId);
      return;
    }
    
    // Fallback to localStorage
    const savedChatId = localStorage.getItem('advisor_active_chat_id');
    if (savedChatId) {
      loadChat(savedChatId);
    }
  }, [advisorUser?.id, loadChat, messages.length, location.search]);

  // Auto-activate Deep + Streaming when a job is restored from storage
  useEffect(() => {
    if (deepJob.restoredFromStorage && deepJob.isPolling && deepJob.jobId) {
      console.log('[AdvisorChat] Detected restored job, auto-activating Deep + Streaming modes');
      
      // Force enable both modes to show the progress UI
      if (!deepMode) {
        setDeepMode(true);
      }
      if (!streamingMode) {
        setStreamingMode(true);
      }
      
      // Show toast only once per restored job (avoid repeats during polling/rerenders)
      if (resumeToastShownForJobRef.current !== deepJob.jobId) {
        resumeToastShownForJobRef.current = deepJob.jobId;
        toast.info('Reanudando trabajo en curso...', {
          description: `Job ${deepJob.jobId.substring(0, 8)}...`,
          duration: 3000,
        });
      }
    }
  }, [deepJob.restoredFromStorage, deepJob.isPolling, deepJob.jobId, deepMode, streamingMode, setDeepMode, setStreamingMode]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect Deep Mode activation to show temporary banner
  useEffect(() => {
    if (!prevDeepModeRef.current && deepMode) {
      // Deep mode just activated
      const shown = localStorage.getItem('advisor_deep_banner_shown');
      if (!shown) {
        setShowDeepBanner(true);
        localStorage.setItem('advisor_deep_banner_shown', 'true');
        const timer = setTimeout(() => setShowDeepBanner(false), 5000);
        return () => clearTimeout(timer);
      }
    }
    prevDeepModeRef.current = deepMode;
  }, [deepMode]);

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
    if (!inputValue.trim() || isAnyLoading) return;

    // Get config with fallback - always returns valid config even if backend is down
    const validatedConfig = getConfigWithFallback(deepConfig);
    
    // Synthesis model always available from fallback
    const synthesisModel = validatedConfig.synthesis_model;

    // Check if user has credits (simplified - deep advisor handles model costs)
    if (freeRemaining <= 0 && balance <= 0) {
      toast.error('No tienes créditos suficientes. Compra un pack para continuar.');
      return;
    }

    const message = inputValue;
    setInputValue('');
    
    // Reset textarea height after sending
    const textareaEl = document.querySelector('textarea');
    if (textareaEl) {
      textareaEl.style.height = 'auto';
    }

    // Upload attachments to storage if any
    let uploadedAttachments: Array<{ url: string; type: string; name: string }> = [];
    if (attachments.length > 0 && advisorUser?.id) {
      try {
        const { uploadMultipleAttachments } = await import('@/lib/uploadAdvisorAttachment');
        const filesToUpload = attachments
          .filter(a => a.file)
          .map(a => ({ id: a.id, file: a.file!, name: a.name, type: a.type }));
        
        if (filesToUpload.length > 0) {
          // Set upload progress to uploading
          setUploadProgress({
            status: 'uploading',
            progress: 0,
            completedCount: 0,
            totalCount: filesToUpload.length,
          });
          
          const uploaded = await uploadMultipleAttachments(
            filesToUpload, 
            advisorUser.id,
            (progress) => {
              setUploadProgress({
                status: 'uploading',
                progress: progress.progress,
                completedCount: progress.completedCount,
                totalCount: progress.totalCount,
                currentFile: progress.currentFile,
              });
            }
          );
          
          // Mark upload as complete
          setUploadProgress({
            status: 'complete',
            progress: 100,
            completedCount: filesToUpload.length,
            totalCount: filesToUpload.length,
          });
          
          uploadedAttachments = uploaded.map(u => ({ url: u.url, type: u.type, name: u.name }));
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadProgress({
          status: 'error',
          progress: 0,
          completedCount: 0,
          totalCount: 0,
        });
        toast.error('Error al subir archivos. Enviando mensaje sin adjuntos.');
      }
    }

    try {
      // Use polling-based job if Deep Mode + Streaming are enabled
      if (useStreamingUI && advisorUser?.id) {
        setPendingUserMessage(message);
        
        // CRITICAL: Use chat_id from deepJob if available (session memory)
        // Only reset if starting a completely new conversation
        const currentDeepChatId = deepJob.chatId;
        
        // Don't reset if we have an active session - preserve context
        if (!currentDeepChatId) {
          deepJob.reset();
        }
        
        // Determine chat_id to use - prioritize deepJob.chatId for session continuity
        let effectiveChatId = currentDeepChatId || chatId;
        
        // If no chat_id exists, create one first in the external DB
        // This ensures chat history can be saved properly
        if (!effectiveChatId) {
          console.log('[AdvisorChat] No chat_id found, creating new chat in external DB...');
          try {
            const { externalSupabase } = await import('@/integrations/supabase/externalClient');
            const { data: newChat, error: chatError } = await externalSupabase
              .from('advisor_chats')
              .insert({
                user_id: advisorUser.id,
                title: message.substring(0, 100), // First 100 chars as title
                model_used: validatedConfig.synthesis_model,
              })
              .select('id')
              .single();
            
            if (chatError) {
              console.error('[AdvisorChat] Failed to create chat:', chatError);
              // Continue without chat_id - backend will create one
            } else if (newChat?.id) {
              effectiveChatId = newChat.id;
              console.log('[AdvisorChat] Created new chat:', effectiveChatId);
            }
          } catch (createError) {
            console.error('[AdvisorChat] Error creating chat:', createError);
            // Continue without chat_id - backend will create one
          }
        }
        
        await deepJob.startJob({
          user_id: advisorUser.id,
          message,
          chat_id: effectiveChatId, // Now always includes chat_id if possible
          synthesis_model: validatedConfig.synthesis_model,
          analysis_model: validatedConfig.analysis_model,
          search_model: validatedConfig.search_model,
          enable_web_search: validatedConfig.enable_web_search,
          enable_rag: validatedConfig.enable_rag,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
        
        // Clear attachments and reset upload progress after sending
        setAttachments([]);
        setUploadProgress({ status: 'idle', progress: 0, completedCount: 0, totalCount: 0 });
        // refetchCredits is called in onComplete callback
      } else {
        // Use standard endpoint (streaming or non-streaming based on deep mode)
        await sendMessage(
          message, 
          synthesisModel, 
          deepMode,
          deepMode ? {
            synthesis_model: validatedConfig.synthesis_model,
            analysis_model: validatedConfig.analysis_model,
            search_model: validatedConfig.search_model,
            enable_web_search: validatedConfig.enable_web_search,
            enable_rag: validatedConfig.enable_rag,
          } : undefined
        );
        refetchCredits();
      }
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

  const handleStopStreaming = () => {
    if (useStreamingUI) {
      deepJob.cancel();
    } else {
      stopStreaming();
    }
  };
  // Download PDF handler - generates DOCX locally for proper Unicode/subscript support
  // Falls back to backend PDF when content is not available locally
  const handleDownloadPDF = async () => {
    if (isDownloadingPdf) return;
    
    setIsDownloadingPdf(true);
    try {
      // First, try to generate locally using the current deepJob result
      if (deepJob.status?.result?.content) {
        const { generateDeepAdvisorDocument } = await import('@/lib/generateDeepAdvisorDocument');
        
        await generateDeepAdvisorDocument({
          content: deepJob.status.result.content,
          sources: deepJob.status.result.sources || [],
          factsExtracted: deepJob.status.result.facts_extracted || [],
          query: pendingUserMessage || undefined,
          chatId: deepJob.chatId || undefined,
        });
        
        toast.success('Documento generado correctamente');
        return;
      }
      
      // Fallback: Try backend export if local content not available
      if (deepJob.jobId) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/deep-advisor/export/pdf/${deepJob.jobId}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.pdf_url) {
            window.open(data.pdf_url, '_blank');
            toast.success('PDF abierto en nueva pestaña');
            return;
          }
          throw new Error('pdf_url no encontrada en respuesta');
        }
        
        // Binary PDF fallback
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vandarum_advisor_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF descargado correctamente');
        return;
      }
      
      toast.error('No hay contenido disponible para exportar');
    } catch (error) {
      console.error('[AdvisorChat] Document download error:', error);
      toast.error('Error al generar documento. Inténtalo de nuevo.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  
  // Download handler for historic messages with content
  const handleDownloadHistoricMessage = async (message: Message) => {
    try {
      const { generateDeepAdvisorDocument } = await import('@/lib/generateDeepAdvisorDocument');
      
      // Parse sources - may come as JSON string from DB or as array
      let parsedSources: Array<{ type: string; name: string; url?: string }> = [];
      if (message.sources) {
        try {
          // If it's a string, parse it
          const sourcesData = typeof message.sources === 'string' 
            ? JSON.parse(message.sources) 
            : message.sources;
          
          // Ensure it's an array
          if (Array.isArray(sourcesData)) {
            parsedSources = sourcesData.map((s: any) => ({
              type: s.type || 'web',
              name: s.name || 'Fuente',
              url: s.url || undefined,
            }));
          }
        } catch (parseError) {
          console.warn('[AdvisorChat] Could not parse sources:', parseError);
        }
      }
      
      await generateDeepAdvisorDocument({
        content: message.content,
        sources: parsedSources,
        query: undefined,
        chatId: chatId || undefined,
      });
      
      toast.success('Documento generado correctamente');
    } catch (error) {
      console.error('[AdvisorChat] Historic message download error:', error);
      toast.error('Error al generar documento');
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
            {/* Streaming Mode Toggle (only visible when Deep Mode is on) */}
            {deepMode && (
              <>
                <StreamingModeToggle
                  enabled={streamingMode}
                  onChange={setStreamingMode}
                  disabled={isAnyLoading}
                />
                <div className="h-6 w-px bg-white/20" />
              </>
            )}

            {/* Deep Mode Toggle */}
            <DeepModeToggle 
              isProcessing={isDeepProcessing || deepJob.isPolling}
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
        onNewChat={() => {
          startNewChat();
          deepJob.reset();
          // Clear attachments and upload state when starting a new chat
          setAttachments([]);
          setUploadProgress({ status: 'idle', progress: 0, completedCount: 0, totalCount: 0 });
          // Clear URL param and navigate to clean chat
          navigate('/advisor/chat', { replace: true });
        }}
      />

      {/* Backend Unavailable Banner */}
      {isConfigError && (
        <div className="mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-sm">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-amber-600">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-800">Servidor de configuración no disponible</p>
            <p className="text-amber-600 text-xs">Puedes seguir usando el Advisor con la configuración por defecto.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Main Content Area with optional sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Attachments Sidebar - Left side */}
        <AttachmentsSidebar
          attachments={attachments}
          onRemove={(id) => setAttachments(prev => prev.filter(a => a.id !== id))}
          uploadProgress={uploadProgress}
          isVisible={attachments.length > 0 || uploadProgress.status === 'uploading'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="max-w-5xl mx-auto py-8 space-y-6">
              {/* Welcome with example queries */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  {/* Hero section */}
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 blur-3xl rounded-full" style={{ background: 'linear-gradient(135deg, rgba(48,113,119,0.2), rgba(50,180,205,0.15))' }} />
                      <img src={vandarumSymbolBlue} alt="Vandarum" className="h-14 w-auto mx-auto relative" />
                    </div>
                    <h2 className="text-xl font-bold" style={{ 
                      background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      Tu Experto en Agua Industrial
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                      Resuelve tus dudas sobre tratamiento de agua con IA especializada.
                    </p>
                  </div>

                  {/* Value propositions - more compact */}
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <Badge variant="outline" className="px-2 py-1 bg-primary/10 border-primary/30 text-primary">
                      ✓ Respuestas inmediatas
                    </Badge>
                    <Badge variant="outline" className="px-2 py-1 bg-primary/10 border-primary/30 text-primary">
                      ✓ Conocimiento experto
                    </Badge>
                  </div>
                  
                  <PromptExamples onSelectPrompt={(prompt) => setInputValue(prompt)} />

                  {/* Compact Marketing CTA */}
                  <div className="border rounded-xl p-4 max-w-md w-full text-center space-y-2 bg-muted/30 border-border/50">
                    <p className="text-sm font-medium">¿Necesitas una solución personalizada?</p>
                    <Button 
                      onClick={() => setActiveModal('presupuesto')}
                      size="sm"
                      className="text-white"
                      style={{
                        background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)',
                      }}
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-1.5" />
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
                    'flex-1 rounded-2xl',
                    message.role === 'user'
                      ? 'max-w-[80%] text-white rounded-tr-none p-4'
                      : 'bg-card border border-border/50 rounded-tl-none shadow-sm px-8 py-6'
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

                {/* Download Document button for historic messages */}
                {message.role === 'assistant' && message.content && message.content.length > 500 && (
                  <div className="mt-3 pt-2 border-t border-border/30 flex justify-end gap-2">
                    {/* Primary button: Open original PDF if available */}
                    {message.pdf_url && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(message.pdf_url, '_blank')}
                        className="gap-2 text-white"
                        style={{ background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)' }}
                      >
                        <FileDown className="h-4 w-4" />
                        Abrir PDF original
                      </Button>
                    )}
                    {/* Fallback: Generate document locally */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadHistoricMessage(message)}
                      className="gap-2 text-[#307177] border-[#307177]/30 hover:bg-[#307177]/5 hover:border-[#307177]/50"
                    >
                      <FileDown className="h-4 w-4" />
                      {message.pdf_url ? 'Regenerar documento' : 'Descargar informe'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Deep Mode Response (Polling-based) - Keep visible after job completes */}
          {useStreamingUI && (deepJob.isPolling || deepJob.status?.status === 'complete') && (
            <>
              {/* User message for polling mode */}
              {pendingUserMessage && (
                <div className="flex gap-3 flex-row-reverse">
                  <div
                    className="flex-1 max-w-[85%] rounded-2xl p-4 text-white rounded-tr-none"
                    style={{ background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)' }}
                  >
                    <div className="whitespace-pre-wrap">{pendingUserMessage}</div>
                  </div>
                </div>
              )}

              {/* Polling assistant response */}
              <div className="flex gap-3">
                <img src={vandarumSymbolBlue} alt="Vandarum" className="h-8 w-auto flex-shrink-0" />
                <div className="flex-1 max-w-[85%] space-y-3">
                  {/* Progress Panel - only show while actively polling */}
                  {deepJob.isPolling && (
                    <DeepAdvisorProgress
                      phase={deepJob.phase}
                      phaseDetail={deepJob.phaseMessage}
                      progress={deepJob.progress}
                      agentStatus={deepJob.status?.agent_status || {}}
                      onCancel={deepJob.cancel}
                    />
                  )}

                  {/* Response when complete - use result directly from status */}
                  {deepJob.status?.status === 'complete' && deepJob.status?.result?.content && (
                    <div className="bg-white/80 border border-slate-200/50 rounded-2xl rounded-tl-none p-4 shadow-sm">
                      <StreamingResponse
                        content={deepJob.status.result.content}
                        isStreaming={false}
                      />
                      
                      {/* Sources Panel */}
                      {deepJob.status.result.sources && deepJob.status.result.sources.length > 0 && (
                        <SourcesPanel sources={deepJob.status.result.sources} />
                      )}
                      
                      {/* Download Document Button - Always generate locally for proper formatting */}
                      <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPDF}
                          disabled={isDownloadingPdf}
                          className="gap-2 text-[#307177] border-[#307177]/30 hover:bg-[#307177]/5 hover:border-[#307177]/50"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          {isDownloadingPdf ? 'Generando...' : 'Descargar informe'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {deepJob.status?.status === 'failed' && deepJob.error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-none p-4 text-red-700 text-sm">
                      {deepJob.error}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Standard Loading indicator (non-streaming) */}
          {isLoading && !useStreamingUI && (
            <div className="flex gap-3">
              <img src={vandarumSymbolBlue} alt="Vandarum" className="h-8 w-auto flex-shrink-0" />
              <div className="flex-1 max-w-[85%]">
                <div className="bg-white/80 border border-slate-200/50 rounded-2xl rounded-tl-none p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {isDeepProcessing ? 'Analizando en profundidad...' : 'Pensando...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - inside the flex container */}
      <div className="border-t p-4 pb-6" style={{ background: 'linear-gradient(180deg, rgba(48,113,119,0.03) 0%, rgba(50,180,205,0.05) 100%)' }}>
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Deep Mode Activated Banner */}
          {showDeepBanner && (
            <DeepModeActivatedBanner onDismiss={() => setShowDeepBanner(false)} />
          )}

          {/* Compact Usage Hint */}
          <CompactUsageHint 
            onOpenGuide={() => setIsGuideOpen(true)} 
            isDeepMode={deepMode}
          />

          {/* Input row - expandable */}
          <div className="flex gap-3 bg-white rounded-2xl p-3 shadow-lg items-end" style={{ border: '2px solid rgba(48,113,119,0.2)' }}>
            <FileAttachmentButton
              onAttach={(files) => {
                const newAttachments: AttachmentInfo[] = files.map(f => ({
                  id: crypto.randomUUID(),
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  file: f,
                }));
                setAttachments(prev => [...prev, ...newAttachments]);
                // Reset progress when adding new files
                setUploadProgress({ status: 'idle', progress: 0, completedCount: 0, totalCount: 0 });
              }}
              disabled={isAnyLoading}
              isUploading={uploadProgress.status === 'uploading'}
            />
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre tratamiento de agua..."
              disabled={isAnyLoading}
              rows={1}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 min-h-[48px] max-h-[120px] text-base px-4 py-3 resize-none"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            {isAnyStreaming ? (
              <Button 
                onClick={handleStopStreaming}
                size="lg" 
                className="h-12 px-5 gap-2 text-white bg-amber-500 hover:bg-amber-600"
              >
                <Square className="w-4 h-4" />
                Detener
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={isAnyLoading || !inputValue.trim()} 
                size="lg" 
                className="h-12 px-6 text-white"
                style={{ background: 'linear-gradient(135deg, #307177 0%, #32b4cd 100%)' }}
              >
                {isAnyLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
          
          {/* Cost indicator */}
          <div className="flex items-center justify-center text-xs text-muted-foreground gap-3">
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
      </div>
      </div>

      {/* Usage Guide Sheet/Modal */}
      <AdvisorUsageGuideSheet 
        open={isGuideOpen} 
        onOpenChange={setIsGuideOpen}
        isDeepMode={deepMode}
      />

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
