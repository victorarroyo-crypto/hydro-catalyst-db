import { API_URL } from '@/lib/api';

const BASE_URL = `${API_URL}/api/technology-comparison-projects`;

export interface ComparisonProject {
  id: string;
  name: string;
  description?: string;
  use_case?: string;
  target_industry?: string;
  selected_technology_ids: string[];
  comparison_results?: Record<string, any>;
  status: 'active' | 'completed' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTechnology {
  id: string;
  comparison_project_id: string;
  technology_id: string;
  user_notes?: string;
  user_rating?: number; // 1-10
  tags: string[];
  added_at: string;
  // Joined fields from technologies table
  technology?: {
    id: string;
    name: string;
    category?: string;
    description?: string;
  };
}

export const comparisonProjectsService = {
  // ============================================================================
  // PROJECTS CRUD
  // ============================================================================

  // List all projects
  async list(params?: { status?: string; industry?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.industry) searchParams.append('industry', params.industry);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  // Get single project with technologies
  async get(projectId: string) {
    const response = await fetch(`${BASE_URL}/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  // Create project
  async create(data: {
    name: string;
    description?: string;
    use_case?: string;
    target_industry?: string;
    created_by?: string;
  }) {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  // Update project
  async update(projectId: string, data: Partial<ComparisonProject>) {
    const response = await fetch(`${BASE_URL}/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  // Delete project
  async delete(projectId: string) {
    const response = await fetch(`${BASE_URL}/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete project');
    return response.json();
  },

  // ============================================================================
  // PROJECT TECHNOLOGIES
  // ============================================================================

  // List technologies in a project
  async listTechnologies(projectId: string) {
    const response = await fetch(`${BASE_URL}/${projectId}/technologies`);
    if (!response.ok) throw new Error('Failed to fetch technologies');
    return response.json();
  },

  // Add technology to project
  async addTechnology(projectId: string, data: {
    technology_id: string;
    user_notes?: string;
    user_rating?: number;
    tags?: string[];
  }) {
    const response = await fetch(`${BASE_URL}/${projectId}/technologies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add technology');
    return response.json();
  },

  // Update technology in project (notes, rating, tags)
  async updateTechnology(projectId: string, technologyId: string, data: {
    user_notes?: string;
    user_rating?: number;
    tags?: string[];
  }) {
    const response = await fetch(`${BASE_URL}/${projectId}/technologies/${technologyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update technology');
    return response.json();
  },

  // Remove technology from project
  async removeTechnology(projectId: string, technologyId: string) {
    const response = await fetch(`${BASE_URL}/${projectId}/technologies/${technologyId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove technology');
    return response.json();
  },
};

export default comparisonProjectsService;
