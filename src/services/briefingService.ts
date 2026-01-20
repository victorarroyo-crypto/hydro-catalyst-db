import { API_URL } from '@/lib/api';
import type {
  ProjectBriefing,
  ResearchSource,
  ResearchSourcesByType,
  AgentConclusion,
  ConclusionsSummary,
} from '@/types/briefing';

// ============================================================================
// BRIEFING
// ============================================================================

export async function getBriefing(projectId: string): Promise<ProjectBriefing> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/briefing`);
  if (!response.ok) throw new Error('Error al obtener briefing');
  return response.json();
}

export async function updateBriefing(projectId: string, briefing: Partial<ProjectBriefing>): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/briefing`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(briefing),
  });
  if (!response.ok) throw new Error('Error al actualizar briefing');
}

export async function completeBriefing(projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/briefing/complete`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al completar briefing');
}

export async function runPreliminaryResearch(projectId: string): Promise<{ job_id: string }> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/run-preliminary-research`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al iniciar investigación');
  return response.json();
}

export async function getResearchStatus(projectId: string): Promise<{ status: string; progress: number }> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/research-status`);
  if (!response.ok) throw new Error('Error al obtener estado');
  return response.json();
}

// ============================================================================
// RESEARCH SOURCES
// ============================================================================

export async function getResearchSources(projectId: string): Promise<ResearchSource[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/research-sources`);
  if (!response.ok) throw new Error('Error al obtener fuentes');
  return response.json();
}

export async function getResearchSourcesByType(projectId: string): Promise<ResearchSourcesByType[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/research-sources/by-type`);
  if (!response.ok) throw new Error('Error al obtener fuentes por tipo');
  return response.json();
}

export async function verifyResearchSource(projectId: string, sourceId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/research-sources/${sourceId}/verify`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al verificar fuente');
}

// ============================================================================
// CONCLUSIONS
// ============================================================================

export async function getConclusions(projectId: string): Promise<AgentConclusion[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/conclusions`);
  if (!response.ok) throw new Error('Error al obtener conclusiones');
  return response.json();
}

export async function getConclusionsSummary(projectId: string): Promise<ConclusionsSummary[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/conclusions/summary`);
  if (!response.ok) throw new Error('Error al obtener resumen');
  return response.json();
}

export async function reviewConclusion(projectId: string, conclusionId: string, notes?: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/conclusions/${conclusionId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Error al revisar conclusión');
}

export async function dismissConclusion(projectId: string, conclusionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/conclusions/${conclusionId}/dismiss`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Error al descartar conclusión');
}

export const briefingService = {
  getBriefing,
  updateBriefing,
  completeBriefing,
  runPreliminaryResearch,
  getResearchStatus,
  getResearchSources,
  getResearchSourcesByType,
  verifyResearchSource,
  getConclusions,
  getConclusionsSummary,
  reviewConclusion,
  dismissConclusion,
};
