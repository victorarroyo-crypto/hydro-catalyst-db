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

export interface StudyLonglistItem {
  id: string;
  session_id: string;
  technology_id?: string;
  existing_technology_id?: string;
  solution_id?: string;
  technology_name: string;
  provider?: string;
  country?: string;
  trl?: number;
  brief_description?: string;
  inclusion_reason?: string;
  source?: string;
  web?: string;
  confidence_score?: number;
  already_in_db?: boolean;
  paises_actua?: string;
  email?: string;
  sector?: string;
  type_suggested?: string;
  subcategory_suggested?: string;
  applications?: string[];
  ventaja_competitiva?: string;
  innovacion?: string;
  casos_referencia?: string;
  tipo_id?: number;
  subcategoria_id?: number;
  sector_id?: string;
  subsector_industrial?: string;
  status?: string;
  added_by?: string;
  added_at: string;
}

export interface StudyShortlistItem {
  id: string;
  session_id: string;
  longlist_id: string;
  selection_reason?: string;
  priority?: number;
  notes?: string;
  selected_by?: string;
  selected_at: string;
  longlist?: StudyLonglistItem;
}

export interface StudyEvaluation {
  id: string;
  session_id: string;
  shortlist_id: string;
  trl_score?: number;
  cost_score?: number;
  scalability_score?: number;
  context_fit_score?: number;
  innovation_potential_score?: number;
  overall_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  implementation_barriers?: string[];
  recommendation?: 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended';
  recommendation_notes?: string;
  ai_generated?: boolean;
  ai_analysis_json?: Record<string, any>;
  evaluated_by?: string;
  evaluated_at: string;
  shortlist?: StudyShortlistItem;
}

export interface StudyReport {
  id: string;
  session_id: string;
  version: number;
  title: string;
  executive_summary?: string;
  methodology?: string;
  problem_analysis?: string;
  solutions_overview?: string;
  technology_comparison?: string;
  recommendations?: string;
  conclusions?: string;
  appendices?: Record<string, any>;
  generated_by?: string;
  file_path?: string;
  created_by?: string;
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

  // Get session stats
  async getStats(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
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

  async updateResearch(sessionId: string, researchId: string, data: Partial<StudyResearch>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/research/${researchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update research');
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
  // LONGLIST (Fase 3)
  // ============================================================================

  async listLonglist(sessionId: string, params?: { status?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/longlist?${searchParams}`
      : `${BASE_URL}/${sessionId}/longlist`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch longlist');
    return response.json();
  },

  async addToLonglist(sessionId: string, data: Omit<StudyLonglistItem, 'id' | 'session_id' | 'added_at'>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/longlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add to longlist');
    return response.json();
  },

  async updateLonglistItem(sessionId: string, itemId: string, data: Partial<StudyLonglistItem>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/longlist/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update longlist item');
    return response.json();
  },

  async removeFromLonglist(sessionId: string, itemId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/longlist/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove from longlist');
    return response.json();
  },

  // ============================================================================
  // SHORTLIST (Fase 4)
  // ============================================================================

  async listShortlist(sessionId: string, params?: { limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/shortlist?${searchParams}`
      : `${BASE_URL}/${sessionId}/shortlist`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch shortlist');
    return response.json();
  },

  async addToShortlist(sessionId: string, data: {
    longlist_id: string;
    selection_reason?: string;
    priority?: number;
    notes?: string;
  }) {
    const response = await fetch(`${BASE_URL}/${sessionId}/shortlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add to shortlist');
    return response.json();
  },

  async updateShortlistItem(sessionId: string, itemId: string, data: Partial<StudyShortlistItem>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/shortlist/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update shortlist item');
    return response.json();
  },

  async removeFromShortlist(sessionId: string, itemId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/shortlist/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove from shortlist');
    return response.json();
  },

  // ============================================================================
  // EVALUATIONS (Fase 5)
  // ============================================================================

  async listEvaluations(sessionId: string, params?: { recommendation?: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.recommendation) searchParams.append('recommendation', params.recommendation);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${BASE_URL}/${sessionId}/evaluations?${searchParams}`
      : `${BASE_URL}/${sessionId}/evaluations`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch evaluations');
    return response.json();
  },

  async upsertEvaluation(sessionId: string, data: Partial<StudyEvaluation>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to upsert evaluation');
    return response.json();
  },

  async deleteEvaluation(sessionId: string, evaluationId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/evaluations/${evaluationId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete evaluation');
    return response.json();
  },

  // ============================================================================
  // REPORTS (Fase 6)
  // ============================================================================

  async listReports(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
  },

  async createReport(sessionId: string, data: Partial<StudyReport>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create report');
    return response.json();
  },

  async updateReport(sessionId: string, reportId: string, data: Partial<StudyReport>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update report');
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

  // ============================================================================
  // AI ACTIONS
  // ============================================================================

  async startAIPhase(sessionId: string, phase: string, config?: Record<string, any>) {
    const response = await fetch(`${BASE_URL}/${sessionId}/ai/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, config }),
    });
    if (!response.ok) throw new Error('Failed to start AI phase');
    return response.json();
  },

  async cancelSession(sessionId: string) {
    const response = await fetch(`${BASE_URL}/${sessionId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to cancel session');
    return response.json();
  },
};

export default studySessionsService;
