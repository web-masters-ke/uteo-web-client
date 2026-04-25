import { apiGet, apiPost, apiPatch } from '../api';
import type { Company } from '../uteo-types';

export const companiesService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: Company[]; total: number }>('/companies', { params }),
  get: (id: string) => apiGet<Company>(`/companies/${id}`),
  create: (data: any) => apiPost<Company>('/companies', data),
  update: (id: string, data: any) => apiPatch<Company>(`/companies/${id}`, data),
};
