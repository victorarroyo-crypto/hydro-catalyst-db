import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  startDeepJob as apiStartDeepJob, 
  getDeepJobStatus,
  DeepJobStatus,
  DeepJobStartParams,
  DeepJobSource,
  DeepJobFact,
} from '@/lib/advisorProxy';

// Re-export types for consumers
export type { DeepJobStatus, DeepJobStartParams, DeepJobSource, DeepJobFact };

export interface AgentStatus {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface UseDeepAdvisorJobOptions {
  pollingInterval?: number; // default 5000ms
  onProgress?: (status: DeepJobStatus) => void;
  onComplete?: (result: DeepJobStatus['result']) => void;
  onError?: (error: string) => void;
}

const STORAGE_KEY = 'deep_advisor_active_job';

export function useDeepAdvisorJob(options: UseDeepAdvisorJobOptions = {}) {
  const { pollingInterval = 5000, onProgress, onComplete, onError } = options;
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<DeepJobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
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

  // Start a new job using the dedicated deep-advisor endpoint
  const startJob = useCallback(async (params: DeepJobStartParams): Promise<string> => {
    try {
      const { data, error } = await apiStartDeepJob({
        ...params,
        deep_mode: true,
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

  // Poll for status using the dedicated deep-advisor endpoint
  const pollStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await getDeepJobStatus(id);
      
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

  // Resume from localStorage on mount - immediately fetch current status
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { jobId: savedJobId, chatId: savedChatId, startedAt } = JSON.parse(savedData);
        
        // Only resume if job was started less than 30 minutes ago
        const thirtyMinutesMs = 30 * 60 * 1000;
        if (Date.now() - startedAt < thirtyMinutesMs) {
          console.log('[useDeepAdvisorJob] Resuming job from storage:', savedJobId);
          setJobId(savedJobId);
          setChatId(savedChatId);
          setRestoredFromStorage(true);
          
          // Immediately fetch current status to show result if already complete
          (async () => {
            try {
              const { data, error } = await getDeepJobStatus(savedJobId);
              
              if (error || !data) {
                console.warn('[useDeepAdvisorJob] Failed to restore status:', error);
                setIsPolling(true); // Resume polling anyway
                return;
              }
              
              // Update status immediately
              setStatus(data);
              onProgressRef.current?.(data);
              
              if (data.status === 'complete') {
                // Job already finished - show result, no need to poll
                console.log('[useDeepAdvisorJob] Job already complete, showing result');
                localStorage.removeItem(STORAGE_KEY);
                
                if (data.result?.chat_id) {
                  setChatId(data.result.chat_id);
                }
                if (data.result?.has_context) {
                  setHasContext(true);
                }
                
                onCompleteRef.current?.(data.result);
              } else if (data.status === 'failed') {
                // Job failed - show error, no need to poll
                console.log('[useDeepAdvisorJob] Job failed:', data.error);
                localStorage.removeItem(STORAGE_KEY);
                onErrorRef.current?.(data.error || 'El trabajo falló sin mensaje de error');
              } else {
                // Job still running - continue polling
                console.log('[useDeepAdvisorJob] Job still running, resuming polling');
                setIsPolling(true);
              }
            } catch (err) {
              console.warn('[useDeepAdvisorJob] Error restoring status:', err);
              setIsPolling(true); // Resume polling on error
            }
          })();
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
    setRestoredFromStorage(false);
  }, [cancel]);

  // Derive agent states in the format expected by DeepAdvisorProgress
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
    restoredFromStorage,
  };
}
