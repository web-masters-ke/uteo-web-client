import { apiGet, apiPost, apiPatch, apiDelete, api } from '../api';
import type { Application } from '../uteo-types';

export const applicationsService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: Application[]; total: number }>('/applications', { params }),
  // Accurate status breakdown for chips/tabs — independent of the status filter.
  stats: (params?: Record<string, any>) =>
    apiGet<{ total: number; byStatus: Record<string, number> }>('/applications/stats', { params }),
  // Downloads an .xlsx applicant report (respects the same filters as the list)
  // and triggers a browser save. Returns the number of bytes downloaded.
  downloadReport: async (params?: Record<string, any>, fallbackName?: string) => {
    const res = await api.get('/applications/export', { params, responseType: 'blob' });
    // Content-Disposition isn't readable cross-origin, so prefer the caller's
    // computed name; fall back to the header (same-origin) then a default.
    const disposition = res.headers['content-disposition'] || '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = fallbackName || match?.[1] || 'applicants.xlsx';
    const url = window.URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  get: (id: string) => apiGet<Application>(`/applications/${id}`),
  apply: (data: { jobId: string; coverLetter?: string; resumeUrl?: string }) =>
    apiPost<Application>('/applications', data),
  withdraw: (id: string) => apiDelete(`/applications/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiPatch(`/applications/${id}/status`, { status, notes }),
  updateResume: (id: string, resumeUrl: string) =>
    apiPatch<Application>(`/applications/${id}/resume`, { resumeUrl }),
};
