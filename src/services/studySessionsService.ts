import { API_URL } from '@/lib/api';

const BASE_URL = `${API_URL}/api/study-sessions`;

export interface StudySession {
  id: string;
  topic: string;
  description?: string;
  industry?: string;
  region?: string;
  config?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_phase?: string;
  summary?: Record<string, any>;
  error_message?: string;
  created_by?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyResearch {
  id: string;
  session_id: string;
  title: string;
  source_type?: string;
  source_url?: string;
  source_name?: string;
  summary?: string;
  key_findings?: string[];
  relevance_score?: number;
  credibility_score?: number;
  tags?: string[];
  category?: string;
  published_date?: string;
  language?: string;
  created_at: string;
}

export interface StudySolution {
  id: string;
  session_id: string;
  category: string;
  name: string;
  description?: string;
  advantages?: string[];
  disadvantages?: string[];
  trl_range?: string;
  trl_min?: number;
  trl_max?: number;
  key_providers?: any[];
  use_cases?: string[];
  industries?: string[];
  capex_range?: string;
  opex_range?: string;
  matched_technology_ids?: string[];
  created_at: string;
}

export interface StudyLog {
  id: string;
  session_id: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  agent?: string;
  phase?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// SESSIONS
// ============================================================================

export const studySessionsService = {
  // List all sessions
  async list(params?: { status?: string; industry?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.industry) searchParams.append('industry', params.industry);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  // Get single session
  async get(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch session');
    return response.json();
  },

  // Create session
  async create(data: {
    topic: string;
    description?: string;
    industry?: string;
    region?: string;
    config?: Record<string, any>;
    created_by?: string;
  }) {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  // Update session
  async update(sessionId: string, data: Partial<StudySession>) {
    const response = await fetch(`${BASE_URL}/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update session');
    return response.json();
  },

  // Delete session
  async delete(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete session');
    return response.json();
  },

  // Get session summary
  async getSummary(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/summary`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  // ============================================================================
  // RESEARCH (Hallazgos - Fase 1)
  // ============================================================================

  async listResearch(sessionId: string, params?: { source_type?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.source_type) searchParams.append('source_type', params.source_type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/research?${searchParams}`
      : `${BASE_URL}/${sessionId}/research`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch research');
    return response.json();
  },

  async addResearch(sessionId: string, data: Omit<StudyResearch, 'id' | 'session_id' | 'created_at'>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add research');
    return response.json();
  },

  async deleteResearch(sessionId: string, researchId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/research/${researchId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete research');
    return response.json();
  },

  // ============================================================================
  // SOLUTIONS (Soluciones - Fase 2)
  // ============================================================================

  async listSolutions(sessionId: string, params?: { category?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/solutions?${searchParams}`
      : `${BASE_URL}/${sessionId}/solutions`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch solutions');
    return response.json();
  },

  async addSolution(sessionId: string, data: Omit<StudySolution, 'id' | 'session_id' | 'created_at'>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/solutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add solution');
    return response.json();
  },

  async deleteSolution(sessionId: string, solutionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/solutions/${solutionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete solution');
    return response.json();
  },

  // ============================================================================
  // LOGS
  // ============================================================================

  async listLogs(sessionId: string, params?: { level?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.level) searchParams.append('level', params.level);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/logs?${searchParams}`
      : `${BASE_URL}/${sessionId}/logs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },

  async addLog(sessionId: string, data: { level?: string; message: string; agent?: string; phase?: string; metadata?: Record<string, any> }) {
    const response = await fetch(`${BASE_URL}/${sessionId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add log');
    return response.json();
  },
};

export default studySessionsService;
