import { useState, useCallback, useRef } from 'react';
import { API_URL } from '@/lib/api';

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
}

interface DeepStreamConfig {
  synthesis_model?: string;
  analysis_model?: string;
  search_model?: string;
  enable_web_search?: boolean;
  enable_rag?: boolean;
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
    config?: DeepStreamConfig
  ) => {
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...INITIAL_STATE,
      isStreaming: true,
      phase: 'starting',
      phaseMessage: 'Iniciando análisis profundo...',
    }));

    try {
      const response = await fetch(`${API_URL}/api/advisor/deep/chat/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          user_id: userId,
          message,
          chat_id: chatId || undefined,
          deep_mode: true,
          synthesis_model: config?.synthesis_model || 'deepseek',
          analysis_model: config?.analysis_model,
          search_model: config?.search_model,
          enable_web_search: config?.enable_web_search ?? true,
          enable_rag: config?.enable_rag ?? true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
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
                case 'phase':
                  setState(prev => ({
                    ...prev,
                    phase: data.phase || '',
                    phaseMessage: data.message || '',
                  }));
                  break;

                case 'context':
                  // Context sources found during analysis
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
                  // Initialize all agents as pending
                  if (data.active && Array.isArray(data.active)) {
                    const agentState: Record<string, AgentState> = {};
                    data.active.forEach((agentId: string) => {
                      agentState[agentId] = { id: agentId, status: 'pending' };
                    });
                    setState(prev => ({ ...prev, agents: agentState }));
                  }
                  break;

                case 'agent':
                  // Update individual agent status
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
                  // Append text chunk to response
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
                  // Finalize with sources and scores
                  setState(prev => ({
                    ...prev,
                    sources: data.sources || prev.sources,
                    domainScores: data.domain_scores || null,
                    chatId: data.chat_id || prev.chatId,
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
                  // Handle any unrecognized events gracefully
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
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error de conexión',
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
