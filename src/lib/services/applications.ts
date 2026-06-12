import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
import type { Application } from '../uteo-types';

export const applicationsService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: Application[]; total: number }>('/applications', { params }),
  // Accurate status breakdown for chips/tabs — independent of the status filter.
  stats: (params?: Record<string, any>) =>
    apiGet<{ total: number; byStatus: Record<string, number> }>('/applications/stats', { params }),
  get: (id: string) => apiGet<Application>(`/applications/${id}`),
  apply: (data: { jobId: string; coverLetter?: string; resumeUrl?: string }) =>
    apiPost<Application>('/applications', data),
  withdraw: (id: string) => apiDelete(`/applications/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiPatch(`/applications/${id}/status`, { status, notes }),
  updateResume: (id: string, resumeUrl: string) =>
    apiPatch<Application>(`/applications/${id}/resume`, { resumeUrl }),
};
