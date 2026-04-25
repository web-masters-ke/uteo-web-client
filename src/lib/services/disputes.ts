import { apiGet, apiPost, apiPatch } from '../api';
import type { Paginated } from '../types';

export interface DisputeUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DisputeBooking {
  id: string;
  amount: number;
  status: string;
  sessionType?: string;
  scheduledAt?: string;
  duration?: number;
  trainerId?: string;
  clientId?: string;
  escrow?: { id: string; amount: number; status: string };
}

export type EscalationTarget = 'FINANCE_ADMIN' | 'SUPER_ADMIN';

export const DISPUTE_CATEGORIES = [
  { key: 'PAYMENT',    label: 'Payment Issue',    description: 'Payment not received, wrong amount, or billing error', priority: 'HIGH' },
  { key: 'NO_SHOW',    label: 'No-Show',           description: 'Trainer didn\'t show up or cancelled without notice',   priority: 'HIGH' },
  { key: 'QUALITY',    label: 'Poor Quality',      description: 'Session quality was below expectations',               priority: 'MEDIUM' },
  { key: 'MISCONDUCT', label: 'Misconduct',        description: 'Inappropriate behavior or unprofessional conduct',     priority: 'CRITICAL' },
  { key: 'FRAUD',      label: 'Fraud',             description: 'Suspected scam, false credentials, or deception',     priority: 'CRITICAL' },
  { key: 'TECHNICAL',  label: 'Technical Issue',   description: 'Platform or technical problems affected the session',  priority: 'LOW' },
  { key: 'OTHER',      label: 'Other',             description: 'Something else not covered above',                    priority: 'LOW' },
] as const;

export interface Dispute {
  id: string;
  bookingId: string;
  booking?: DisputeBooking;
  raisedById: string;
  raisedBy?: DisputeUser;
  againstId: string;
  against?: DisputeUser;
  status: string;
  category?: string;
  reason: string;
  description?: string;
  resolution?: string;
  resolvedById?: string;
  resolvedBy?: DisputeUser;
  resolvedAt?: string;
  escalationLevel?: number;
  escalatedAt?: string;
  escalatedById?: string;
  escalatedBy?: DisputeUser;
  escalationNote?: string;
  createdAt: string;
  updatedAt: string;
}

export const disputeService = {
  /** List disputes the current user is involved in */
  async getMyDisputes(params?: { status?: string; page?: number; limit?: number }): Promise<Paginated<Dispute>> {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      });
    }
    return apiGet<Paginated<Dispute>>(`/disputes/my?${qs.toString()}`);
  },

  /** Get a single dispute by ID */
  async getById(id: string): Promise<Dispute> {
    return apiGet<Dispute>(`/disputes/${id}`);
  },

  /** Create a new dispute */
  async create(data: { bookingId: string; category?: string; reason: string; description?: string }): Promise<Dispute> {
    return apiPost<Dispute>('/disputes', data);
  },

  /** Assign dispute to a team member */
  async assign(id: string, assigneeId: string): Promise<Dispute> {
    return apiPatch<Dispute>(`/disputes/${id}/assign`, { assigneeId });
  },

  /** Remove assignment */
  async unassign(id: string): Promise<Dispute> {
    return apiPatch<Dispute>(`/disputes/${id}/unassign`);
  },

  /** List comments visible to user */
  async listComments(id: string): Promise<any[]> {
    return apiGet<any[]>(`/disputes/${id}/comments`);
  },

  /** Post a comment (optional attachments array of { url, name, mimeType }) */
  async addComment(id: string, content: string, attachments?: any[]): Promise<any> {
    return apiPost<any>(`/disputes/${id}/comments`, { content, attachments });
  },

  /** Filer withdraws their OPEN dispute */
  async withdraw(id: string): Promise<Dispute> {
    return apiPatch<Dispute>(`/disputes/${id}/withdraw`);
  },

  /** Team members the current user can assign disputes to */
  async assignableTeam(): Promise<any[]> {
    return apiGet<any[]>('/disputes/team/assignable');
  },

  /** Escalate a dispute to a higher level (adds an audit comment automatically). */
  async escalate(
    id: string,
    body: { note: string; escalateTo?: EscalationTarget },
  ): Promise<Dispute> {
    return apiPatch<Dispute>(`/disputes/${id}/escalate`, body);
  },
};
