import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
import type { Job, FeedResponse } from '../uteo-types';

export const jobsService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: Job[]; total: number }>('/jobs', { params }),
  get: (id: string) => apiGet<Job>(`/jobs/${id}`),
  create: (data: any) => apiPost<Job>('/jobs', data),
  update: (id: string, data: any) => apiPatch<Job>(`/jobs/${id}`, data),
  save: (id: string) => apiPost(`/jobs/${id}/save`),
  unsave: (id: string) => apiDelete(`/jobs/${id}/save`),
  saved: () => apiGet<{ items: Job[] }>('/jobs/saved'),
  interact: (id: string, action: string) => apiPost(`/jobs/${id}/interact`, { action }),
  feed: (params?: { page?: number; limit?: number }) =>
    apiGet<FeedResponse>('/feed', { params }),
  refreshFeed: () => apiPost('/feed/refresh'),
};
