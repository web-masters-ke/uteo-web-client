'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { slaClientService, SlaAssignmentDetail } from '@/lib/services/sla';
import { disputeService, Dispute } from '@/lib/services/disputes';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedAssignment {
  assignment: SlaAssignmentDetail;
  dispute: Dispute;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minsToHuman(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getProgressColor(pct: number, breached: boolean): string {
  if (breached) return 'bg-red-500';
  if (pct >= 90) return 'bg-amber-500';
  if (pct >= 70) return 'bg-yellow-400';
  return 'bg-green-500';
}

function slaStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'WARNING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'BREACHED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'MET': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'PAUSED': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function priorityColor(priority: string): string {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL': return 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
    case 'HIGH': return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
    case 'MEDIUM': return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    case 'LOW': return 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ label, pct, breached, done, dueAt, overdueByMins, completedAt }: {
  label: string;
  pct: number;
  breached: boolean;
  done: boolean;
  dueAt?: string;
  overdueByMins?: number;
  completedAt?: string;
}) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor = done ? 'bg-green-500' : getProgressColor(clampedPct, breached);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {done && completedAt ? (
          <span className="text-green-600 dark:text-green-400 font-medium">✓ Done · {formatDate(completedAt)}</span>
        ) : breached ? (
          <span className="text-red-600 dark:text-red-400 font-medium">
            Overdue{overdueByMins ? ` by ${minsToHuman(overdueByMins)}` : ''}
          </span>
        ) : dueAt ? (
          <span className="text-gray-500 dark:text-gray-400">Due {formatDateTime(dueAt)}</span>
        ) : null}
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${done ? 100 : clampedPct}%` }}
        />
      </div>
      {!done && !breached && (
        <p className="text-[10px] text-gray-400">{Math.round(clampedPct)}% elapsed</p>
      )}
    </div>
  );
}

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentCard({ item, currentUserId }: { item: EnrichedAssignment; currentUserId?: string }) {
  const { assignment: sla, dispute } = item;
  const snapshot = sla.statusSnapshot;
  const policy = sla.policy;
  const isRaisedByMe = dispute.raisedById === currentUserId;
  const otherParty = isRaisedByMe
    ? (dispute.against ? `${dispute.against.firstName} ${dispute.against.lastName}` : 'Other party')
    : (dispute.raisedBy ? `${dispute.raisedBy.firstName} ${dispute.raisedBy.lastName}` : 'Other party');

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4 hover:border-[#192C67]/30 dark:hover:border-[#4a6fa5]/30 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold', slaStatusColor(sla.status))}>
              {sla.status}
            </span>
            {policy?.priority && (
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold', priorityColor(policy.priority))}>
                {policy.priority}
              </span>
            )}
            {sla.escalations && sla.escalations.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F77B0F]/15 text-[#F77B0F]">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M3 10.5L10 3l7 7.5-2 1.5V17H5v-5z" /></svg>
                Escalated ×{sla.escalations.length}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{dispute.reason}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isRaisedByMe ? `Filed against ${otherParty}` : `Filed by ${otherParty}`}
            {' · '}
            <span className="font-mono">{dispute.id.slice(0, 10)}</span>
          </p>
        </div>

        {/* SLA policy */}
        {policy && (
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400">Policy</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{policy.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {policy.firstResponseHours}h first response · {policy.resolutionHours}h resolution
            </p>
          </div>
        )}
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        <ProgressBar
          label="First Response"
          pct={snapshot?.firstResponsePercent ?? 0}
          breached={sla.firstResponseBreached}
          done={!!sla.firstResponseAt}
          dueAt={sla.firstResponseDue}
          overdueByMins={snapshot?.firstResponseOverdueByMins}
          completedAt={sla.firstResponseAt}
        />
        <ProgressBar
          label="Resolution"
          pct={snapshot?.resolutionPercent ?? 0}
          breached={sla.resolutionBreached}
          done={!!sla.resolvedAt}
          dueAt={sla.resolutionDue}
          overdueByMins={snapshot?.resolutionOverdueByMins}
          completedAt={sla.resolvedAt}
        />
      </div>

      {/* Time remaining + escalation history */}
      <div className="flex items-end justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
        <div>
          {snapshot?.minutesRemaining != null && snapshot.minutesRemaining > 0 && !sla.resolvedAt ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{minsToHuman(snapshot.minutesRemaining)}</span> remaining
            </p>
          ) : sla.resolvedAt ? (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Resolved {formatDate(sla.resolvedAt)}</p>
          ) : snapshot?.isBreached ? (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">SLA breached</p>
          ) : sla.pausedAt ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Paused since {formatDate(sla.pausedAt)}</p>
          ) : null}

          {sla.escalations && sla.escalations.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {sla.escalations.map((e: any) => (
                <p key={e.id} className="text-[10px] text-gray-400">
                  ↑ Escalated to <span className="font-medium text-gray-600 dark:text-gray-300">{e.escalatedTo?.replace(/_/g, ' ')}</span>
                  {' · '}{formatDate(e.createdAt)}
                  {e.reason && <span className="italic"> — "{e.reason}"</span>}
                </p>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/disputes"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#192C67]/20 dark:border-[#4a6fa5]/20 text-[12px] font-medium text-[#192C67] dark:text-[#8ba6d8] hover:bg-[#192C67]/5 dark:hover:bg-[#4a6fa5]/10 transition-colors shrink-0"
        >
          View Dispute
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ─── Stats chip ───────────────────────────────────────────────────────────────

function StatChip({ label, value, color, onClick, active }: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border p-4 transition-all min-w-[90px] flex-1',
        active
          ? 'border-[#192C67] bg-[#192C67]/5 dark:border-[#5b8bc7] dark:bg-[#192C67]/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600',
      )}
    >
      <span className={cn('text-2xl font-black', color)}>{value}</span>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'WARNING', label: 'Warning' },
  { key: 'BREACHED', label: 'Breached' },
  { key: 'MET', label: 'Met' },
  { key: 'PAUSED', label: 'Paused' },
];

export default function SlaPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const disputesPage = await disputeService.getMyDisputes({ limit: 100 });
      const disputes = disputesPage.items;
      if (disputes.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const slaMap = await slaClientService.batchGetForDisputes(disputes.map((d) => d.id));
      const enriched: EnrichedAssignment[] = [];
      disputes.forEach((d) => {
        const sla = slaMap.get(d.id);
        if (sla) enriched.push({ assignment: sla, dispute: d });
      });
      // Sort: BREACHED first, then WARNING, then ACTIVE, then others
      const ORDER: Record<string, number> = { BREACHED: 0, WARNING: 1, ACTIVE: 2, PAUSED: 3, MET: 4 };
      enriched.sort((a, b) => (ORDER[a.assignment.status] ?? 5) - (ORDER[b.assignment.status] ?? 5));
      setItems(enriched);
    } catch {
      addToast('error', 'Failed to load SLA data');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    active: items.filter((i) => i.assignment.status === 'ACTIVE').length,
    warning: items.filter((i) => i.assignment.status === 'WARNING').length,
    breached: items.filter((i) => i.assignment.status === 'BREACHED').length,
    met: items.filter((i) => i.assignment.status === 'MET').length,
    paused: items.filter((i) => i.assignment.status === 'PAUSED').length,
    total: items.length,
  };

  const complianceRate = stats.met + stats.breached > 0
    ? Math.round((stats.met / (stats.met + stats.breached)) * 100)
    : null;

  const filtered = activeFilter ? items.filter((i) => i.assignment.status === activeFilter) : items;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Performance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track service level agreements on your dispute cases
            </p>
          </div>
          {complianceRate != null && (
            <div className="text-right">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Compliance Rate</p>
              <p className={cn(
                'text-3xl font-black',
                complianceRate >= 80 ? 'text-green-600 dark:text-green-400' :
                complianceRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400',
              )}>
                {complianceRate}%
              </p>
            </div>
          )}
        </div>

        {/* Compliance bar */}
        {complianceRate != null && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  complianceRate >= 80 ? 'bg-green-500' : complianceRate >= 50 ? 'bg-amber-500' : 'bg-red-500',
                )}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{stats.met} met · {stats.breached} breached</p>
          </div>
        )}
      </div>

      {/* Stats chips */}
      {!loading && items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          <StatChip
            label="Active" value={stats.active}
            color="text-blue-600 dark:text-blue-400"
            onClick={() => setActiveFilter(activeFilter === 'ACTIVE' ? '' : 'ACTIVE')}
            active={activeFilter === 'ACTIVE'}
          />
          <StatChip
            label="Warning" value={stats.warning}
            color="text-amber-600 dark:text-amber-400"
            onClick={() => setActiveFilter(activeFilter === 'WARNING' ? '' : 'WARNING')}
            active={activeFilter === 'WARNING'}
          />
          <StatChip
            label="Breached" value={stats.breached}
            color="text-red-600 dark:text-red-400"
            onClick={() => setActiveFilter(activeFilter === 'BREACHED' ? '' : 'BREACHED')}
            active={activeFilter === 'BREACHED'}
          />
          <StatChip
            label="Met" value={stats.met}
            color="text-green-600 dark:text-green-400"
            onClick={() => setActiveFilter(activeFilter === 'MET' ? '' : 'MET')}
            active={activeFilter === 'MET'}
          />
          <StatChip
            label="Paused" value={stats.paused}
            color="text-gray-500 dark:text-gray-400"
            onClick={() => setActiveFilter(activeFilter === 'PAUSED' ? '' : 'PAUSED')}
            active={activeFilter === 'PAUSED'}
          />
        </div>
      )}

      {/* Filter tabs */}
      {!loading && items.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                activeFilter === f.key
                  ? 'bg-[#192C67] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {f.label}
              {f.key !== '' && items.filter((i) => i.assignment.status === f.key).length > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {items.filter((i) => i.assignment.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((item) => (
            <AssignmentCard
              key={item.assignment.id}
              item={item}
              currentUserId={user?.id}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No SLA assignments yet"
          description="SLA tracking is activated on your disputes once an admin assigns a policy. File a dispute and it will appear here once tracked."
          action={{ label: 'View Disputes', onClick: () => { window.location.href = '/disputes'; } }}
        />
      ) : (
        <EmptyState
          title={`No ${activeFilter.toLowerCase()} assignments`}
          description={`No SLA assignments with status "${activeFilter}" found.`}
          action={{ label: 'Show All', onClick: () => setActiveFilter('') }}
        />
      )}

      {/* Info footer */}
      {!loading && items.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-700 dark:text-gray-300">What is SLA?</span>
            {' '}Service Level Agreements define response and resolution time targets for dispute cases.
            Breached SLAs are escalated to senior staff automatically.
            Contact support if you believe your dispute is not being handled within the agreed timeframes.
          </p>
        </div>
      )}
    </div>
  );
}
