'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { disputeService, Dispute, EscalationTarget } from '@/lib/services/disputes';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';
import SlaWidget from '@/components/ui/SlaWidget';

function levelPillClass(level: number | undefined): string {
  const n = level || 1;
  if (n >= 3) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (n >= 2) return 'bg-[#F77B0F]/15 text-[#F77B0F]';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

function levelLabel(level: number | undefined): string {
  const n = level || 1;
  if (n >= 3) return 'L3 - Super Admin';
  if (n >= 2) return 'L2 - Finance/Admin';
  return 'L1 - Support';
}

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateTo, setEscalateTo] = useState<EscalationTarget>('FINANCE_ADMIN');
  const [escalateBusy, setEscalateBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, cmts] = await Promise.all([
        disputeService.getById(id),
        disputeService.listComments(id).catch(() => []),
      ]);
      setDispute(d);
      setComments(cmts);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;

  if (error || !dispute) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Dispute not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'This dispute is unavailable.'}</p>
        <Link href="/disputes" className="inline-flex items-center gap-2 px-4 py-2 bg-[#192C67] text-white rounded-lg hover:bg-[#14234f] text-sm font-medium">
          Back to Disputes
        </Link>
      </div>
    );
  }

  const level = dispute.escalationLevel || 1;
  const atMaxLevel = level >= 3;

  // Who can escalate: raisedBy, against, or admin/support
  const canEscalate =
    !!user &&
    !atMaxLevel &&
    (user.id === dispute.raisedById ||
      user.id === dispute.againstId ||
      user.role === 'ADMIN' ||
      (user.role as string) === 'SUPPORT');

  const submitEscalate = async () => {
    if (!escalateNote.trim()) {
      addToast('error', 'Escalation reason is required');
      return;
    }
    setEscalateBusy(true);
    try {
      const updated = await disputeService.escalate(dispute.id, {
        note: escalateNote.trim(),
        escalateTo,
      });
      setDispute(updated);
      // Re-fetch comments (audit comment is auto-created on escalate)
      try {
        const cmts = await disputeService.listComments(dispute.id);
        setComments(cmts);
      } catch { /* ignore */ }
      addToast('success', 'Dispute escalated');
      setEscalateOpen(false);
      setEscalateNote('');
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to escalate dispute');
    } finally {
      setEscalateBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/disputes"
        className="inline-flex items-center gap-1.5 text-sm text-[#192C67] dark:text-[#8ba6d8] font-medium mb-6 hover:underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Disputes
      </Link>

      {/* ── Header / Escalation banner ─────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dispute Case</h1>
              <StatusBadge status={dispute.status} />
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
                  levelPillClass(level),
                )}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 10.5L10 3l7 7.5-2 1.5V17H5v-5z" />
                </svg>
                {levelLabel(level)}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-1">ID: {dispute.id}</p>
          </div>

          <button
            onClick={() => setEscalateOpen(true)}
            disabled={!canEscalate}
            title={
              atMaxLevel
                ? 'Already at maximum escalation level'
                : canEscalate
                  ? 'Escalate this dispute'
                  : 'You do not have permission to escalate'
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
              atMaxLevel
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-not-allowed'
                : canEscalate
                  ? 'bg-[#F77B0F] text-white hover:bg-[#e36d04]'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-not-allowed',
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {atMaxLevel ? 'Maximum Level Reached' : 'Escalate'}
          </button>
        </div>

        {/* Escalated banner (when level >= 2) */}
        {level >= 2 && (
          <div
            className={cn(
              'mt-5 rounded-xl border p-4',
              level >= 3
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                : 'border-[#F77B0F]/40 bg-[#F77B0F]/10',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-8 h-8 shrink-0 rounded-full flex items-center justify-center',
                  level >= 3 ? 'bg-red-500 text-white' : 'bg-[#F77B0F] text-white',
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Escalated to level {level} ({levelLabel(level).replace(/^L\d\s*-\s*/, '')})
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  {dispute.escalatedAt && <>On {formatDateTime(dispute.escalatedAt)} </>}
                  {dispute.escalatedBy && (
                    <>by {dispute.escalatedBy.firstName} {dispute.escalatedBy.lastName}</>
                  )}
                </p>
                {dispute.escalationNote && (
                  <div className="mt-2 p-3 rounded-lg bg-white/70 dark:bg-gray-800/70 border border-white/50 dark:border-gray-700">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Reason
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {dispute.escalationNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Parties */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Parties</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Raised By</p>
                <div className="flex items-center gap-2">
                  <Avatar
                    firstName={dispute.raisedBy?.firstName || '?'}
                    lastName={dispute.raisedBy?.lastName || ''}
                    size="sm"
                  />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {dispute.raisedBy ? `${dispute.raisedBy.firstName} ${dispute.raisedBy.lastName}` : '-'}
                    {dispute.raisedById === user?.id && (
                      <span className="ml-1.5 text-[10px] text-[#192C67] dark:text-[#8ba6d8] font-medium">(You)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Against</p>
                <div className="flex items-center gap-2">
                  <Avatar
                    firstName={dispute.against?.firstName || '?'}
                    lastName={dispute.against?.lastName || ''}
                    size="sm"
                  />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {dispute.against ? `${dispute.against.firstName} ${dispute.against.lastName}` : '-'}
                    {dispute.againstId === user?.id && (
                      <span className="ml-1.5 text-[10px] text-[#192C67] dark:text-[#8ba6d8] font-medium">(You)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reason / Description */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Reason</p>
              <p className="text-sm text-gray-900 dark:text-white">{dispute.reason}</p>
            </div>
            {dispute.description && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{dispute.description}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Dispute Filed</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(dispute.createdAt)}</p>
                </div>
              </div>

              {dispute.escalatedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#F77B0F] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Escalated to level {dispute.escalationLevel}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(dispute.escalatedAt)}
                      {dispute.escalatedBy && (
                        <> - by {dispute.escalatedBy.firstName} {dispute.escalatedBy.lastName}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {dispute.status === 'UNDER_REVIEW' && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Under Review</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(dispute.updatedAt)}</p>
                  </div>
                </div>
              )}

              {dispute.resolvedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {dispute.status === 'RESOLVED_RELEASE'
                        ? 'Resolved - Funds Released'
                        : dispute.status === 'RESOLVED_REFUND'
                          ? 'Resolved - Funds Refunded'
                          : dispute.status === 'CLOSED'
                            ? 'Closed'
                            : dispute.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(dispute.resolvedAt)}</p>
                    {dispute.resolution && (
                      <p className="text-xs mt-1 p-2 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {dispute.resolution}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments thread */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Comments & Audit Trail ({comments.length})
            </h2>
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {comments.map((c: any) => (
                  <div
                    key={c.id}
                    className={cn(
                      'p-3 rounded-lg',
                      c.isInternal
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        src={c.author?.avatar}
                        firstName={c.author?.firstName || '?'}
                        lastName={c.author?.lastName || ''}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {c.author?.firstName} {c.author?.lastName}
                          <span className="text-gray-500 font-normal"> - {c.author?.role}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">{formatDateTime(c.createdAt)}</p>
                      </div>
                      {c.isInternal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          INTERNAL
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {dispute.booking && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                Booking
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Amount</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(dispute.booking.amount))}
                  </p>
                </div>
                {dispute.booking.sessionType && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Session Type</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {dispute.booking.sessionType.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
                {dispute.booking.scheduledAt && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Scheduled</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatDate(dispute.booking.scheduledAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Booking Status</p>
                  <div className="mt-0.5"><StatusBadge status={dispute.booking.status} /></div>
                </div>
                <Link
                  href={`/bookings/${dispute.booking.id}`}
                  className="block w-full text-center py-2 text-xs font-semibold text-[#192C67] dark:text-[#8ba6d8] border border-[#192C67]/30 rounded-lg hover:bg-[#192C67]/10"
                >
                  Open Booking
                </Link>
              </div>
            </div>
          )}

          {dispute.booking?.escrow && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Escrow</h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(Number(dispute.booking.escrow.amount))}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Status: {dispute.booking.escrow.status}
              </p>
            </div>
          )}

          {/* SLA Widget */}
          <SlaWidget disputeId={dispute.id} />
        </div>
      </div>

      {/* ── Escalate modal ─────────────────────────────── */}
      <Modal
        isOpen={escalateOpen}
        onClose={() => {
          if (!escalateBusy) {
            setEscalateOpen(false);
            setEscalateNote('');
          }
        }}
        title="Escalate Dispute"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg p-3 bg-[#F77B0F]/10 border border-[#F77B0F]/30">
            <p className="text-xs text-gray-700 dark:text-gray-200">
              Escalation moves this dispute to a higher authority level for review.
              A public audit comment will be added automatically.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Escalate to *
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="escalateTo"
                  value="FINANCE_ADMIN"
                  checked={escalateTo === 'FINANCE_ADMIN'}
                  onChange={() => setEscalateTo('FINANCE_ADMIN')}
                  className="mt-0.5 h-4 w-4 text-[#F77B0F] focus:ring-[#F77B0F]"
                  disabled={level >= 2}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Finance/Admin (L2)</p>
                  <p className="text-[11px] text-gray-500">
                    First escalation level. Finance/admin team reviews the case.
                    {level >= 2 && ' (Already at or past this level)'}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="escalateTo"
                  value="SUPER_ADMIN"
                  checked={escalateTo === 'SUPER_ADMIN'}
                  onChange={() => setEscalateTo('SUPER_ADMIN')}
                  className="mt-0.5 h-4 w-4 text-red-500 focus:ring-red-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Super Admin (L3)</p>
                  <p className="text-[11px] text-gray-500">
                    Final escalation level. Only use for unresolved or critical cases.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Reason / Note *
            </label>
            <textarea
              rows={4}
              value={escalateNote}
              onChange={(e) => setEscalateNote(e.target.value)}
              placeholder="Explain why this dispute needs to be escalated..."
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F77B0F] outline-none resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">{escalateNote.length}/2000</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { if (!escalateBusy) { setEscalateOpen(false); setEscalateNote(''); } }}
              disabled={escalateBusy}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submitEscalate}
              disabled={escalateBusy || !escalateNote.trim()}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] disabled:opacity-50"
            >
              {escalateBusy ? 'Escalating...' : 'Escalate Dispute'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
