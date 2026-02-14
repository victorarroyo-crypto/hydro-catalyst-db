/**
 * ProcessTracker: Persiste el estado de procesos asíncronos en localStorage
 * para que sobrevivan a la navegación entre páginas.
 * 
 * El backend (Railway) continúa procesando independientemente del frontend.
 * Este tracker permite que la UI retome el seguimiento al volver a la página.
 */

export interface TrackedProcess {
  id: string;               // Unique process identifier
  type: ProcessType;         // Type of process
  entityId: string;          // Related entity (projectId, studyId, etc.)
  startedAt: number;         // Timestamp when started
  maxDurationMs: number;     // Maximum expected duration
  metadata?: Record<string, any>; // Extra data (workflowId, auditId, etc.)
}

export type ProcessType = 
  | 'chem-invoice-extraction'
  | 'chem-contract-extraction'
  | 'chem-invoice-analysis'
  | 'cost-extraction'
  | 'cost-analysis'
  | 'consultoria-diagnosis'
  | 'scouting-study';

const STORAGE_KEY = 'active_processes';

function getAll(): TrackedProcess[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const processes: TrackedProcess[] = JSON.parse(raw);
    // Auto-clean expired processes
    const now = Date.now();
    const valid = processes.filter(p => (now - p.startedAt) < p.maxDurationMs);
    if (valid.length !== processes.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

function save(processes: TrackedProcess[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(processes));
}

export const processTracker = {
  /**
   * Register a new active process
   */
  start(type: ProcessType, entityId: string, maxDurationMs: number = 300000, metadata?: Record<string, any>): string {
    const processes = getAll();
    const id = `${type}:${entityId}:${Date.now()}`;
    // Remove any existing process of same type+entity
    const filtered = processes.filter(p => !(p.type === type && p.entityId === entityId));
    filtered.push({ id, type, entityId, startedAt: Date.now(), maxDurationMs, metadata });
    save(filtered);
    return id;
  },

  /**
   * Check if there's an active process of a given type for an entity
   */
  getActive(type: ProcessType, entityId: string): TrackedProcess | null {
    const processes = getAll();
    return processes.find(p => p.type === type && p.entityId === entityId) || null;
  },

  /**
   * Check if there's ANY active process for an entity
   */
  getActiveForEntity(entityId: string): TrackedProcess[] {
    return getAll().filter(p => p.entityId === entityId);
  },

  /**
   * Mark a process as completed (remove it)
   */
  complete(type: ProcessType, entityId: string): void {
    const processes = getAll();
    save(processes.filter(p => !(p.type === type && p.entityId === entityId)));
  },

  /**
   * Check if a process is still within its time window
   */
  isExpired(process: TrackedProcess): boolean {
    return (Date.now() - process.startedAt) >= process.maxDurationMs;
  },

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds(process: TrackedProcess): number {
    return Math.floor((Date.now() - process.startedAt) / 1000);
  },
};
