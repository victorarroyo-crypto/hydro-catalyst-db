import { useState, useCallback, useRef } from 'react';
import { streamAdvisorProxy } from '@/lib/advisorProxy';

export interface AgentState {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  preview?: string;
}

export interface StreamSource {
  type: string;
  name: string;
  count?: number;
  url?: string;
}

export interface ExtractedFact {
  type: string;
  key: string;
  value: string;
}

export interface StreamState {
  phase: string;
  phaseMessage: string;
  agents: Record<string, AgentState>;
  response: string;
  sources: StreamSource[];
  domainScores: Record<string, number> | null;
  isStreaming: boolean;
  error: string | null;
  chatId: string | null;
  hasContext: boolean;
  factsExtracted: ExtractedFact[];
}

interface StreamAttachment {
  url: string;
  type: string;
  name: string;
}

interface DeepStreamConfig {
  synthesis_model?: string;
  analysis_model?: string;
  search_model?: string;
  enable_web_search?: boolean;
  enable_rag?: boolean;
  attachments?: StreamAttachment[];
}

const INITIAL_STATE: StreamState = {
  phase: '',
  phaseMessage: '',
  agents: {},
  response: '',
  sources: [],
  domainScores: null,
  isStreaming: false,
  error: null,
  chatId: null,
  hasContext: false,
  factsExtracted: [],
};

export function useDeepAdvisorStream() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    userId: string,
    chatId?: string | null,
    config?: DeepStreamConfig,
    retryCount = 0
  ) => {
    const MAX_RETRIES = 1;
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...INITIAL_STATE,
      isStreaming: true,
      phase: 'starting',
      phaseMessage: retryCount > 0 ? 'Reintentando conexión...' : 'Iniciando análisis profundo...',
    }));

    try {
      const hasAttachments = config?.attachments && config.attachments.length > 0;
      
      const payload = {
        user_id: userId,
        message,
        chat_id: chatId || undefined,
        deep_mode: true,
        synthesis_model: config?.synthesis_model || 'deepseek',
        analysis_model: config?.analysis_model,
        search_model: config?.search_model,
        enable_web_search: config?.enable_web_search ?? true,
        enable_rag: config?.enable_rag ?? true,
        attachments: hasAttachments ? config.attachments : undefined,
      };

      // Use proxy for streaming
      const response = await streamAdvisorProxy(
        '/api/advisor/deep/chat/stream',
        payload,
        abortControllerRef.current.signal
      );

      // Check for error response (non-streaming)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        const errorCode = errorData.code || '';
        
        // Retry on timeout/connection errors
        if ((errorCode === 'TIMEOUT' || errorCode === 'SSE_TIMEOUT' || errorCode === 'CONNECTION_FAILED') && retryCount < MAX_RETRIES) {
          console.log('[useDeepAdvisorStream] Retrying after error:', errorCode);
          return sendMessage(message, userId, chatId, config, retryCount + 1);
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;
              
              const data = JSON.parse(jsonStr);
              
              switch (data.event) {
                case 'session':
                  setState(prev => ({
                    ...prev,
                    chatId: data.chat_id || prev.chatId,
                    hasContext: data.has_context || false,
                  }));
                  break;

                case 'phase':
                  setState(prev => ({
                    ...prev,
                    phase: data.phase || '',
                    phaseMessage: data.message || '',
                  }));
                  break;

                case 'context':
                  if (data.source && data.found !== undefined) {
                    setState(prev => ({
                      ...prev,
                      sources: [
                        ...prev.sources.filter(s => s.type !== data.source),
                        { type: data.source, name: data.source, count: data.found }
                      ],
                    }));
                  }
                  break;

                case 'agents':
                  if (data.active && Array.isArray(data.active)) {
                    const agentState: Record<string, AgentState> = {};
                    data.active.forEach((agentId: string) => {
                      agentState[agentId] = { id: agentId, status: 'pending' };
                    });
                    setState(prev => ({ ...prev, agents: agentState }));
                  }
                  break;

                case 'agent':
                  if (data.agent && data.status) {
                    setState(prev => ({
                      ...prev,
                      agents: {
                        ...prev.agents,
                        [data.agent]: {
                          id: data.agent,
                          status: data.status,
                          preview: data.preview,
                        },
                      },
                    }));
                  }
                  break;

                case 'synthesis':
                  if (data.chunk) {
                    setState(prev => ({
                      ...prev,
                      phase: 'synthesis',
                      phaseMessage: 'Sintetizando respuesta...',
                      response: prev.response + data.chunk,
                    }));
                  }
                  break;

                case 'complete':
                  setState(prev => ({
                    ...prev,
                    sources: data.sources || prev.sources,
                    domainScores: data.domain_scores || null,
                    chatId: data.chat_id || prev.chatId,
                    factsExtracted: data.facts_extracted || prev.factsExtracted,
                    isStreaming: false,
                    phase: 'complete',
                    phaseMessage: 'Análisis completado',
                  }));
                  break;

                case 'error':
                  setState(prev => ({
                    ...prev,
                    error: data.message || 'Error desconocido',
                    isStreaming: false,
                  }));
                  break;

                default:
                  console.log('Unhandled SSE event:', data.event, data);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line, parseError);
            }
          }
        }
      }

      // Ensure streaming is marked as complete
      setState(prev => ({ ...prev, isStreaming: false }));

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          response: prev.response + '\n\n*[Generación detenida por el usuario]*',
          isStreaming: false,
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
        const isConnectionError = errorMessage.includes('timeout') || 
                                   errorMessage.includes('conexión') || 
                                   errorMessage.includes('servidor');
        
        setState(prev => ({
          ...prev,
          error: errorMessage,
          phase: 'error',
          phaseMessage: isConnectionError 
            ? 'Error de conexión con el servidor' 
            : 'Error durante el análisis',
          isStreaming: false,
        }));
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  return {
    ...state,
    sendMessage,
    stopStreaming,
    reset,
  };
}
