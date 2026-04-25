"use client";

import { api, unwrap } from "../api";

export interface SlaAssignmentDetail {
  id: string;
  disputeId: string;
  status: "ACTIVE" | "WARNING" | "BREACHED" | "MET" | "PAUSED";
  firstResponseDue: string;
  resolutionDue: string;
  firstResponseAt?: string;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  resolvedAt?: string;
  pausedAt?: string;
  pausedDurationMins: number;
  createdAt: string;
  policy?: {
    id: string;
    name: string;
    priority: string;
    firstResponseHours: number;
    resolutionHours: number;
    warningPercent: number;
  };
  escalations?: Array<{
    id: string;
    reason: string;
    escalatedTo: string;
    createdAt: string;
  }>;
  statusSnapshot?: {
    status: string;
    firstResponsePercent: number;
    resolutionPercent: number;
    firstResponseOverdueByMins?: number;
    resolutionOverdueByMins?: number;
    minutesRemaining?: number | null;
    isBreached: boolean;
    firstResponseBreached?: boolean;
    resolutionBreached?: boolean;
  };
}

export interface SlaWithDispute {
  assignment: SlaAssignmentDetail;
  disputeId: string;
  disputeReason?: string;
  disputeStatus?: string;
  otherPartyName?: string;
  isRaisedByUser?: boolean;
}

export interface SlaStats {
  active: number;
  warning: number;
  breached: number;
  met: number;
  paused: number;
  total: number;
  complianceRate: number;
}

const BASE = "/sla";

export const slaClientService = {
  getForDispute: (disputeId: string) =>
    api
      .get(`${BASE}/assignments/dispute/${disputeId}`)
      .then((r) => unwrap<SlaAssignmentDetail | null>(r)),

  /** Fetch SLA assignments for a list of dispute IDs (batched, parallel). Returns only disputes with SLA assigned. */
  async batchGetForDisputes(disputeIds: string[]): Promise<Map<string, SlaAssignmentDetail>> {
    const results = await Promise.allSettled(
      disputeIds.map((id) =>
        api.get(`${BASE}/assignments/dispute/${id}`).then((r) => ({ id, sla: unwrap<SlaAssignmentDetail | null>(r) })),
      ),
    );
    const map = new Map<string, SlaAssignmentDetail>();
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.sla) map.set(r.value.id, r.value.sla);
    });
    return map;
  },
};
