import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
import type { Job, FeedResponse } from '../uteo-types';

export const jobsService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: Job[]; total: number }>('/jobs', { params }),
  mine: () => apiGet<{ items: Job[]; total: number }>('/jobs/mine'),
  get: (id: string) => apiGet<Job>(`/jobs/${id}`),
  create: (data: any) => apiPost<Job>('/jobs', data),
  update: (id: string, data: any) => apiPatch<Job>(`/jobs/${id}`, data),
  remove: (id: string) => apiDelete<{ message: string }>(`/jobs/${id}`),
  save: (id: string) => apiPost(`/jobs/${id}/save`),
  unsave: (id: string) => apiDelete(`/jobs/${id}/save`),
  saved: () => apiGet<{ items: Job[] }>('/jobs/saved'),
  interact: (id: string, action: string) => apiPost(`/jobs/${id}/interact`, { action }),
  feed: (params?: { page?: number; limit?: number }) =>
    apiGet<FeedResponse>('/feed', { params }),
  refreshFeed: () => apiPost('/feed/refresh'),
  bulkClose: (ids: string[]) =>
    apiPost<{ closed: number; skipped: number }>('/jobs/bulk-close', { ids }),
  bulkCreate: (jobs: any[]) =>
    apiPost<{ created: number; failed: { index: number; error: string }[] }>('/jobs/bulk', { jobs }),
};
