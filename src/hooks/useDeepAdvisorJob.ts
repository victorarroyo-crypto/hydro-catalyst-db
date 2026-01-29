import { useState, useEffect, useCallback, useRef } from 'react';
import { callAdvisorProxy } from '@/lib/advisorProxy';

export interface AgentStatus {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface JobSource {
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

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  phase?: string;
  phase_detail?: string;
  progress_percent: number;
  agent_status: Record<string, 'pending' | 'running' | 'complete' | 'failed'>;
  error?: string;
  result?: {
    content: string;
    sources: JobSource[];
    facts_extracted: ExtractedFact[];
    chat_id: string;
    has_context?: boolean;
  };
}

export interface StartJobParams {
  user_id: string;
  message: string;
  chat_id?: string;
  deep_mode?: boolean;
  synthesis_model?: string;
  analysis_model?: string;
  search_model?: string;
  enable_web_search?: boolean;
  enable_rag?: boolean;
  attachments?: Array<{ url: string; type: string; name: string }>;
}

export interface UseDeepAdvisorJobOptions {
  pollingInterval?: number; // default 5000ms
  onProgress?: (status: JobStatus) => void;
  onComplete?: (result: JobStatus['result']) => void;
  onError?: (error: string) => void;
}

const STORAGE_KEY = 'deep_advisor_active_job';

export function useDeepAdvisorJob(options: UseDeepAdvisorJobOptions = {}) {
  const { pollingInterval = 5000, onProgress, onComplete, onError } = options;
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
  }, [onComplete, onError, onProgress]);

  // Start a new job
  const startJob = useCallback(async (params: StartJobParams): Promise<string> => {
    try {
      const { data, error } = await callAdvisorProxy<{ job_id: string; chat_id?: string }>({
        endpoint: '/api/advisor/deep/start',
        method: 'POST',
        payload: {
          ...params,
          deep_mode: true,
        },
      });
      
      if (error || !data?.job_id) {
        throw new Error(error || 'No job_id returned from server');
      }
      
      const newJobId = data.job_id;
      setJobId(newJobId);
      setIsPolling(true);
      setStatus({ 
        job_id: newJobId, 
        status: 'pending', 
        progress_percent: 0, 
        agent_status: {},
        phase: 'starting',
        phase_detail: 'Iniciando análisis profundo...',
      });
      
      if (data.chat_id) {
        setChatId(data.chat_id);
      }
      
      // Persist for reconnection on page reload
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        jobId: newJobId,
        chatId: data.chat_id || params.chat_id,
        startedAt: Date.now(),
      }));
      
      return newJobId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start job';
      onErrorRef.current?.(msg);
      throw err;
    }
  }, []);

  // Poll for status
  const pollStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await callAdvisorProxy<JobStatus>({
        endpoint: `/api/advisor/deep/status/${id}`,
        method: 'GET',
      });
      
      if (error || !data) {
        console.warn('[useDeepAdvisorJob] Poll error:', error);
        // Don't stop polling on transient errors
        return false;
      }
      
      setStatus(data);
      onProgressRef.current?.(data);
      
      if (data.status === 'complete') {
        setIsPolling(false);
        localStorage.removeItem(STORAGE_KEY);
        
        if (data.result?.chat_id) {
          setChatId(data.result.chat_id);
        }
        if (data.result?.has_context) {
          setHasContext(true);
        }
        
        onCompleteRef.current?.(data.result);
        return true; // Stop polling
      }
      
      if (data.status === 'failed') {
        setIsPolling(false);
        localStorage.removeItem(STORAGE_KEY);
        onErrorRef.current?.(data.error || 'El trabajo falló sin mensaje de error');
        return true; // Stop polling
      }
      
      return false; // Continue polling
    } catch (err) {
      console.error('[useDeepAdvisorJob] Poll exception:', err);
      // Continue polling on exception - might be transient network issue
      return false;
    }
  }, []);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !jobId) return;
    
    let isMounted = true;
    
    const poll = async () => {
      if (!isMounted) return;
      
      const shouldStop = await pollStatus(jobId);
      
      if (!shouldStop && isMounted && isPolling) {
        pollingRef.current = window.setTimeout(poll, pollingInterval);
      }
    };
    
    // Start polling immediately
    poll();
    
    return () => {
      isMounted = false;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isPolling, jobId, pollStatus, pollingInterval]);

  // Resume from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { jobId: savedJobId, chatId: savedChatId, startedAt } = JSON.parse(savedData);
        
        // Only resume if job was started less than 30 minutes ago
        const thirtyMinutesMs = 30 * 60 * 1000;
        if (Date.now() - startedAt < thirtyMinutesMs) {
          console.log('[useDeepAdvisorJob] Resuming job:', savedJobId);
          setJobId(savedJobId);
          setChatId(savedChatId);
          setIsPolling(true);
        } else {
          // Job is too old, clean up
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Cancel polling
  const cancel = useCallback(() => {
    setIsPolling(false);
    localStorage.removeItem(STORAGE_KEY);
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    // TODO: Optionally call backend to cancel job if it supports it
  }, []);

  // Reset state completely (for new chat)
  const reset = useCallback(() => {
    cancel();
    setJobId(null);
    setStatus(null);
    setChatId(null);
    setHasContext(false);
  }, [cancel]);

  // Derive agent states in the format expected by StreamingProgress
  const agents: Record<string, { id: string; status: 'pending' | 'running' | 'complete' | 'failed'; preview?: string }> = {};
  if (status?.agent_status) {
    Object.entries(status.agent_status).forEach(([id, agentStatus]) => {
      agents[id] = { id, status: agentStatus };
    });
  }

  return {
    // Actions
    startJob,
    cancel,
    reset,
    
    // State
    jobId,
    chatId,
    status,
    isPolling,
    hasContext,
    
    // Derived state for compatibility with existing UI
    isRunning: status?.status === 'running' || status?.status === 'pending',
    isComplete: status?.status === 'complete',
    isStreaming: isPolling, // Alias for UI compatibility
    progress: status?.progress_percent || 0,
    phase: status?.phase || '',
    phaseMessage: status?.phase_detail || '',
    agents,
    response: status?.result?.content || '',
    sources: status?.result?.sources || [],
    factsExtracted: status?.result?.facts_extracted || [],
    error: status?.error || null,
    result: status?.result,
  };
}
