import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { streamAdvisorProxy, callAdvisorProxy } from '@/lib/advisorProxy';
import type { Message, Source, MessageMetadata, AttachmentInfo } from '@/types/advisorChat';
import type { AgentAnalysis } from '@/components/advisor/AgentAnalysesAccordion';
export interface DeepModeConfig {
  synthesis_model?: string;
  analysis_model?: string;
  search_model?: string;
  enable_web_search?: boolean;
  enable_rag?: boolean;
}

const STORAGE_KEY = 'advisor_active_chat_id';

export function useAdvisorChat(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDeepProcessing, setIsDeepProcessing] = useState(false);
  const [chatId, setChatId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [lastAgentAnalyses, setLastAgentAnalyses] = useState<AgentAnalysis[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist chatId to localStorage
  useEffect(() => {
    if (chatId) {
      localStorage.setItem(STORAGE_KEY, chatId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [chatId]);

  const loadChat = useCallback(async (existingChatId: string) => {
    if (!userId) return;

    const fetchMessages = async (client: typeof supabase) => {
      const { data, error } = await client
        .from('advisor_messages')
        .select('*')
        .eq('chat_id', existingChatId)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null as typeof data | null, error };
      }
      return { data, error: null };
    };

    // Query both databases in parallel
    const [localResult, externalResult] = await Promise.all([
      fetchMessages(supabase),
      fetchMessages(externalSupabase as unknown as typeof supabase),
    ]);

    // Log for debugging
    console.log('[loadChat] Local messages:', localResult.data?.length || 0);
    console.log('[loadChat] External messages:', externalResult.data?.length || 0);

    // Prioritize external DB for recent Deep Advisor chats (post 18/01/2026)
    let data: typeof localResult.data;
    let source: string;

    if (externalResult.data && externalResult.data.length > 0) {
      // Prefer external DB where Deep Advisor messages are stored
      data = externalResult.data;
      source = 'external';
    } else if (localResult.data && localResult.data.length > 0) {
      data = localResult.data;
      source = 'local';
    } else {
      data = [];
      source = 'none';
    }

    console.log('[loadChat] Using source:', source, 'with', data?.length || 0, 'messages');

    if (!data || data.length === 0) {
      const error = localResult.error || externalResult.error;
      if (error) {
        console.error('[loadChat] Error fetching messages:', error);
      }
      return;
    }

    if (data && data.length > 0) {
      setMessages(data.map(msg => {
        // Safely extract optional fields from the raw record
        const rawMsg = msg as Record<string, unknown>;
        
        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          sources: (msg.sources as unknown as Source[]) || undefined,
          credits_used: msg.credits_used ? Number(msg.credits_used) : undefined,
          created_at: msg.created_at || new Date().toISOString(),
          // Map additional fields if they exist in the DB record
          metadata: rawMsg.metadata ? (rawMsg.metadata as unknown as MessageMetadata) : undefined,
          attachments: rawMsg.attachments ? (rawMsg.attachments as unknown as AttachmentInfo[]) : undefined,
          agentAnalyses: rawMsg.agent_analyses ? (rawMsg.agent_analyses as unknown as AgentAnalysis[]) : undefined,
        };
      }));
      setChatId(existingChatId);
    } else {
      console.warn('[loadChat] No messages found for chat:', existingChatId);
    }
  }, [userId]);

  const sendMessage = useCallback(async (
    message: string, 
    model: string = 'deepseek',
    deepMode: boolean = false,
    deepConfig?: DeepModeConfig
  ) => {
    if (!userId || !message.trim()) return;
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setIsStreaming(true);
    setLastAgentAnalyses(null);
    
    if (deepMode) {
      setIsDeepProcessing(true);
    }
    
    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { 
      id: `user-${Date.now()}`,
      role: 'user' as const, 
      content: message,
      created_at: new Date().toISOString()
    }]);
    
    // Añadir mensaje vacío del asistente
    setMessages(prev => [...prev, { 
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const, 
      content: '',
      created_at: new Date().toISOString()
    }]);
    
    try {
      if (deepMode) {
        // Deep mode - use proxy for JSON response
        const payload = {
          user_id: userId,
          message: message,
          chat_id: chatId || undefined,
          deep_mode: true,
          synthesis_model: deepConfig?.synthesis_model || model,
          analysis_model: deepConfig?.analysis_model,
          search_model: deepConfig?.search_model,
          enable_web_search: deepConfig?.enable_web_search ?? true,
          enable_rag: deepConfig?.enable_rag ?? true,
        };

        const { data, error } = await callAdvisorProxy<{
          response?: string;
          synthesis?: string;
          agent_analyses?: AgentAnalysis[];
          chat_id?: string;
          credits_remaining?: number;
          error?: string;
        }>({
          endpoint: '/api/advisor/deep/chat',
          method: 'POST',
          payload,
        });

        if (error || data?.error) {
          throw new Error(error || data?.error || 'Unknown error');
        }

        if (data) {
          // Update message with full response
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { 
              ...newMessages[newMessages.length - 1],
              content: data.response || data.synthesis || '',
              agentAnalyses: data.agent_analyses,
            };
            return newMessages;
          });

          // Store agent analyses
          if (data.agent_analyses) {
            setLastAgentAnalyses(data.agent_analyses);
          }

          // Capture chat_id and credits
          if (data.chat_id) {
            setChatId(data.chat_id);
          }
          if (data.credits_remaining !== undefined) {
            setCreditsRemaining(data.credits_remaining);
          }
        }
      } else {
        // Standard streaming mode - use proxy
        const payload = {
          user_id: userId,
          message: message,
          chat_id: chatId || undefined,
          model: model
        };

        const response = await streamAdvisorProxy(
          '/api/advisor/chat/stream',
          payload,
          abortControllerRef.current.signal
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6));
                if (json.content) {
                  fullResponse += json.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { 
                      ...newMessages[newMessages.length - 1],
                      content: fullResponse 
                    };
                    return newMessages;
                  });
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
                if (json.chat_id && !chatId) {
                  setChatId(json.chat_id);
                }
                if (json.credits_remaining !== undefined) {
                  setCreditsRemaining(json.credits_remaining);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
            const lastMsg = newMessages[newMessages.length - 1];
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + '\n\n*[Generación detenida por el usuario]*'
            };
          }
          return newMessages;
        });
        console.log('Streaming cancelado por el usuario');
      } else {
        console.error('Error:', error);
        setMessages(prev => prev.slice(0, -2));
        throw error;
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setIsDeepProcessing(false);
      abortControllerRef.current = null;
    }
  }, [userId, chatId]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
    setLastAgentAnalyses(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    isDeepProcessing,
    chatId,
    creditsRemaining,
    lastAgentAnalyses,
    sendMessage,
    loadChat,
    startNewChat,
    stopStreaming,
  };
}
