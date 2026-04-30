import { apiGet, apiPost, apiPatch } from '../api';

export type OfferStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';

export interface OfferLetter {
  id: string;
  applicationId: string;
  jobId: string;
  companyId: string;
  candidateId: string;
  createdById: string;
  title: string;
  bodyHtml: string;
  termsHtml?: string | null;
  salaryAmount?: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  startDate?: string | null;
  benefits?: string | null;
  status: OfferStatus;
  expiresAt?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  declinedAt?: string | null;
  revokedAt?: string | null;
  signatureName?: string | null;
  signatureDataUrl?: string | null;
  declineReason?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: { id: string; title: string };
  company?: { id: string; name: string; logoUrl?: string | null };
  candidate?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
  createdBy?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
}

export interface CreateOfferPayload {
  applicationId: string;
  title?: string;
  bodyHtml?: string;
  termsHtml?: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  startDate?: string;
  benefits?: string;
  expiresAt?: string;
}

export const offersService = {
  list: (params?: Record<string, any>) =>
    apiGet<{ items: OfferLetter[]; total: number }>('/offers', { params }),
  get: (id: string) => apiGet<OfferLetter>(`/offers/${id}`),
  create: (payload: CreateOfferPayload) => apiPost<OfferLetter>('/offers', payload),
  update: (id: string, payload: Partial<CreateOfferPayload>) =>
    apiPatch<OfferLetter>(`/offers/${id}`, payload),
  send: (id: string) => apiPost<OfferLetter>(`/offers/${id}/send`),
  sign: (id: string, signatureName: string, signatureDataUrl: string) =>
    apiPost<OfferLetter>(`/offers/${id}/sign`, { signatureName, signatureDataUrl }),
  decline: (id: string, reason?: string) =>
    apiPost<OfferLetter>(`/offers/${id}/decline`, { reason }),
  revoke: (id: string) => apiPost<OfferLetter>(`/offers/${id}/revoke`),
};
