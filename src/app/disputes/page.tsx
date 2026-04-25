'use client';

import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import { disputeService, Dispute, DISPUTE_CATEGORIES } from '@/lib/services/disputes';
import { slaClientService, SlaAssignmentDetail } from '@/lib/services/sla';
import { bookingService } from '@/lib/services/bookings';
import { Booking } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';
import { api } from '@/lib/api';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'RESOLVED_RELEASE', label: 'Released' },
  { key: 'RESOLVED_REFUND', label: 'Refunded' },
  { key: 'CLOSED', label: 'Closed' },
];

const STATUS_LEFT_BORDER: Record<string, string> = {
  OPEN: 'border-l-amber-400',
  UNDER_REVIEW: 'border-l-blue-400',
  RESOLVED_RELEASE: 'border-l-emerald-400',
  RESOLVED_REFUND: 'border-l-purple-400',
  CLOSED: 'border-l-zinc-300 dark:border-l-zinc-600',
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DisputesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [statsActive, setStatsActive] = useState(0);
  const [statsResolved, setStatsResolved] = useState(0);
  const [statsTotal, setStatsTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDispute, setDetailDispute] = useState<any | null>(null);
  const [detailSla, setDetailSla] = useState<SlaAssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [assignableTeam, setAssignableTeam] = useState<any[]>([]);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<any[]>([]);
  const [commentSending, setCommentSending] = useState(false);
  const [commentUploading, setCommentUploading] = useState(false);

  const [fileOpen, setFileOpen] = useState(false);
  const [fileBookings, setFileBookings] = useState<Booking[]>([]);
  const [fileBookingsLoading, setFileBookingsLoading] = useState(false);
  const [fileSelectedBooking, setFileSelectedBooking] = useState<Booking | null>(null);
  const [fileCategory, setFileCategory] = useState('');
  const [fileReason, setFileReason] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [fileLoading, setFileLoading] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus = activeTab === 'ESCALATED' ? undefined : (activeTab || undefined);
      const data = await disputeService.getMyDisputes({ page, limit: 10, status: apiStatus });
      const items = activeTab === 'ESCALATED'
        ? data.items.filter((d: any) => (d.escalationLevel || 1) >= 2)
        : data.items;
      setDisputes(items);
      setTotalPages(activeTab === 'ESCALATED' ? 1 : data.totalPages);
    } catch {
      addToast('error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const [all, open, underReview, resolvedRelease, resolvedRefund] = await Promise.all([
        disputeService.getMyDisputes({ limit: 1 }),
        disputeService.getMyDisputes({ limit: 1, status: 'OPEN' }),
        disputeService.getMyDisputes({ limit: 1, status: 'UNDER_REVIEW' }),
        disputeService.getMyDisputes({ limit: 1, status: 'RESOLVED_RELEASE' }),
        disputeService.getMyDisputes({ limit: 1, status: 'RESOLVED_REFUND' }),
      ]);
      setStatsTotal(all.total);
      setStatsActive(open.total + underReview.total);
      setStatsResolved(resolvedRelease.total + resolvedRefund.total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const openDetail = async (d: Dispute) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailSla(null);
    setComments([]);
    setNewComment('');
    setCommentAttachments([]);
    try {
      const [full, cmts, team, sla] = await Promise.all([
        disputeService.getById(d.id),
        disputeService.listComments(d.id).catch(() => []),
        disputeService.assignableTeam().catch(() => []),
        slaClientService.getForDispute(d.id).catch(() => null),
      ]);
      setDetailDispute(full);
      setComments(cmts);
      setAssignableTeam(team);
      setDetailSla(sla ?? null);
    } catch {
      addToast('error', 'Failed to load dispute details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssign = async (assigneeId: string) => {
    if (!detailDispute) return;
    setActionLoading(true);
    try {
      const updated = await disputeService.assign(detailDispute.id, assigneeId);
      setDetailDispute(updated);
      setComments(await disputeService.listComments(detailDispute.id));
      addToast('success', 'Dispute assigned');
      setAssignDropdownOpen(false);
      fetchDisputes();
    } catch (e: any) { addToast('error', e?.response?.data?.message || 'Failed to assign'); }
    finally { setActionLoading(false); }
  };

  const handleUnassign = async () => {
    if (!detailDispute) return;
    setActionLoading(true);
    try {
      const updated = await disputeService.unassign(detailDispute.id);
      setDetailDispute(updated);
      setComments(await disputeService.listComments(detailDispute.id));
      addToast('success', 'Assignment removed');
      fetchDisputes();
    } catch (e: any) { addToast('error', e?.response?.data?.message || 'Failed to unassign'); }
    finally { setActionLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!detailDispute) return;
    if (!window.confirm('Withdraw this dispute? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const updated = await disputeService.withdraw(detailDispute.id);
      setDetailDispute(updated);
      addToast('success', 'Dispute withdrawn');
      fetchDisputes(); fetchStats();
    } catch (e: any) { addToast('error', e?.response?.data?.message || 'Failed to withdraw'); }
    finally { setActionLoading(false); }
  };

  const handleAddComment = async () => {
    if (!detailDispute || !newComment.trim()) return;
    setCommentSending(true);
    try {
      await disputeService.addComment(detailDispute.id, newComment, commentAttachments.length ? commentAttachments : undefined);
      setComments(await disputeService.listComments(detailDispute.id));
      setNewComment('');
      setCommentAttachments([]);
      addToast('success', 'Comment posted');
    } catch (e: any) { addToast('error', e?.response?.data?.message || 'Failed to post comment'); }
    finally { setCommentSending(false); }
  };

  async function uploadAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/media/upload', formData, {
      timeout: 600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    const data = (res.data as any)?.data || (res.data as any);
    return { url: data?.url || '', name: file.name, mimeType: file.type };
  }

  const openFileModal = async () => {
    setFileOpen(true);
    setFileBookingsLoading(true);
    try {
      const [confirmed, inProgress, completed] = await Promise.all([
        bookingService.list({ status: 'CONFIRMED', limit: 50 }),
        bookingService.list({ status: 'IN_PROGRESS', limit: 50 }),
        bookingService.list({ status: 'COMPLETED', limit: 50 }),
      ]);
      setFileBookings([...confirmed.items, ...inProgress.items, ...completed.items]);
    } catch {
      addToast('error', 'Failed to load bookings');
    } finally {
      setFileBookingsLoading(false);
    }
  };

  const handleFileDispute = async () => {
    if (!fileSelectedBooking || !fileCategory || !fileReason.trim()) {
      addToast('error', 'Please select a booking, category, and reason');
      return;
    }
    setFileLoading(true);
    try {
      await disputeService.create({
        bookingId: fileSelectedBooking.id,
        category: fileCategory,
        reason: fileReason,
        description: fileDescription || undefined,
      });
      addToast('success', 'Dispute filed successfully');
      setFileOpen(false);
      setFileSelectedBooking(null); setFileCategory(''); setFileReason(''); setFileDescription(''); setFileBookings([]);
      fetchDisputes(); fetchStats();
    } catch (err: any) {
      const msg = err?.response?.data?.data?.message || err?.response?.data?.message || 'Failed to file dispute';
      addToast('error', typeof msg === 'string' ? msg : 'Failed to file dispute');
    } finally {
      setFileLoading(false);
    }
  };

  const getOtherPartyName = (d: Dispute): string => {
    if (!user) return '-';
    if (d.raisedById === user.id) return d.against ? `${d.against.firstName} ${d.against.lastName}` : 'Other party';
    return d.raisedBy ? `${d.raisedBy.firstName} ${d.raisedBy.lastName}` : 'Other party';
  };

  const isRaisedByMe = (d: Dispute) => user?.id === d.raisedById;
  const isTrainer = user?.role === 'TRAINER';

  const getBookingPersonName = (b: Booking): string => {
    if (isTrainer) return b.client ? `${b.client.firstName} ${b.client.lastName}` : 'Client';
    const t = (b.trainer?.user || b.trainer) as any;
    return t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : 'Trainer';
  };

  const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/30';

  const q = debouncedSearch.trim().toLowerCase();
  const filtered = q
    ? disputes.filter(d => {
        const fields = [d.reason, d.description, d.id, d.bookingId,
          (d as any).booking?.client?.firstName, (d as any).booking?.client?.lastName,
          (d as any).booking?.trainer?.firstName, (d as any).booking?.trainer?.lastName,
        ].filter(Boolean).map(String).join(' ').toLowerCase();
        return fields.includes(q);
      })
    : disputes;

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-10 overflow-hidden min-h-[300px] flex items-end px-6 lg:px-10 py-10"
        style={{ backgroundImage: 'url(/images/settings-hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 50%' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-[#F77B0F] text-xs font-bold uppercase tracking-[0.25em] mb-2">Dispute Centre</p>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Disputes</h1>
              <p className="text-white/65 text-sm mt-1.5 max-w-sm">
                File, track, and resolve disputes on your bookings.
              </p>
              <div className="mt-6 flex items-center gap-7">
                <div>
                  <p className="text-3xl font-black text-white tabular-nums">{statsActive}</p>
                  <p className="text-[11px] text-white/55 uppercase tracking-widest mt-0.5">Active</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-black text-white tabular-nums">{statsResolved}</p>
                  <p className="text-[11px] text-white/55 uppercase tracking-widest mt-0.5">Resolved</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-3xl font-black text-white tabular-nums">{statsTotal}</p>
                  <p className="text-[11px] text-white/55 uppercase tracking-widest mt-0.5">Total</p>
                </div>
              </div>
            </div>
            <button
              onClick={openFileModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#192C67] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-xl shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              File Dispute
            </button>
          </div>
        </div>
      </section>

      {/* ── Search + Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search disputes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap sm:flex-nowrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-[#192C67] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#192C67]/40 dark:hover:border-[#5b8bc7]/30',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-bold text-gray-900 dark:text-white mb-1">
            {q ? 'No matching disputes' : 'No disputes found'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-5">
            {q
              ? `No disputes match "${debouncedSearch}"`
              : activeTab
                ? `No ${activeTab.replace(/_/g, ' ').toLowerCase()} disputes`
                : 'You have no disputes. If you have an issue with a booking, you can file one.'}
          </p>
          {!q && !activeTab && (
            <button
              onClick={openFileModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#192C67] text-white text-sm font-bold rounded-xl hover:bg-[#14234f] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              File Dispute
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {filtered.map((dispute) => {
              const otherParty = getOtherPartyName(dispute);
              const isMine = isRaisedByMe(dispute);
              const borderCls = STATUS_LEFT_BORDER[dispute.status] || 'border-l-gray-300 dark:border-l-gray-700';
              const isUrgent = ['OPEN', 'UNDER_REVIEW'].includes(dispute.status) && daysSince(dispute.createdAt) > 7;
              const cat = DISPUTE_CATEGORIES.find(c => c.key === dispute.category);
              const escalation = (dispute as any).escalationLevel || 1;

              return (
                <button
                  key={dispute.id}
                  onClick={() => openDetail(dispute)}
                  className={cn(
                    'w-full text-left flex items-center gap-4 rounded-xl border-l-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 group',
                    borderCls,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] transition-colors">
                        {isMine ? `Against ${otherParty}` : `Filed by ${otherParty}`}
                      </p>
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">URGENT</span>
                      )}
                      {escalation >= 2 && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-black',
                          escalation >= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-[#F77B0F]/15 text-[#F77B0F]',
                        )}>
                          ↑ L{escalation}
                        </span>
                      )}
                    </div>
                    {cat && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-1">
                        {cat.label}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{dispute.reason}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                      <span>{formatDate(dispute.createdAt)}</span>
                      {dispute.booking && <span>{formatCurrency(Number(dispute.booking.amount))}</span>}
                      {dispute.booking?.escrow && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Escrow: {formatCurrency(Number(dispute.booking.escrow.amount))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={dispute.status} />
                    {dispute.resolvedAt && (
                      <span className="text-[10px] text-gray-400">{formatDate(dispute.resolvedAt)}</span>
                    )}
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* ══════════════════════════════════════════
          DETAIL MODAL
      ══════════════════════════════════════════ */}
      <Modal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailDispute(null); setDetailSla(null); }}
        title="Dispute Details"
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#192C67] border-t-transparent" />
          </div>
        ) : detailDispute ? (
          <div className="space-y-5">
            {/* Status header */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={detailDispute.status} />
              {detailDispute.category && (() => {
                const cat = DISPUTE_CATEGORIES.find(c => c.key === detailDispute.category);
                const priorityColors: Record<string, string> = {
                  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                };
                return (
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold', priorityColors[cat?.priority ?? 'LOW'])}>
                    {cat?.label ?? detailDispute.category}
                  </span>
                );
              })()}
              {['OPEN', 'UNDER_REVIEW'].includes(detailDispute.status) && daysSince(detailDispute.createdAt) > 7 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">URGENT</span>
              )}
              {((detailDispute.escalationLevel || 1) >= 2) && (
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-black',
                  (detailDispute.escalationLevel || 1) >= 3
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-[#F77B0F]/15 text-[#F77B0F]',
                )}>
                  L{detailDispute.escalationLevel} ESCALATED
                </span>
              )}
              <a href={`/disputes/${detailDispute.id}`} className="text-[11px] font-semibold text-[#192C67] dark:text-[#8ba6d8] hover:underline ml-auto">
                View full details
              </a>
              <span className="text-xs font-mono text-gray-400">ID: {detailDispute.id.slice(0, 12)}</span>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Raised By', person: detailDispute.raisedBy, isMe: detailDispute.raisedById === user?.id },
                { label: 'Against', person: detailDispute.against, isMe: detailDispute.againstId === user?.id },
              ].map(({ label, person, isMe }) => (
                <div key={label} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {person ? `${person.firstName} ${person.lastName}` : '—'}
                    {isMe && <span className="ml-1.5 text-[10px] text-[#192C67] dark:text-white/70 font-medium">(You)</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Reason + Description */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Reason</p>
                <p className="text-sm text-gray-900 dark:text-white">{detailDispute.reason}</p>
              </div>
              {detailDispute.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{detailDispute.description}</p>
                </div>
              )}
            </div>

            {/* Booking Info */}
            {detailDispute.booking && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Booking Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">Amount</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(Number(detailDispute.booking.amount))}</p>
                  </div>
                  {detailDispute.booking.sessionType && (
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Session Type</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{detailDispute.booking.sessionType.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {detailDispute.booking.scheduledAt && (
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Scheduled</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(detailDispute.booking.scheduledAt)}</p>
                    </div>
                  )}
                  {detailDispute.booking.duration && (
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Duration</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{detailDispute.booking.duration} min</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">Booking Status</p>
                    <StatusBadge status={detailDispute.booking.status} />
                  </div>
                </div>
              </div>
            )}

            {/* Escrow Info */}
            {detailDispute.booking?.escrow && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Escrow</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">Amount Held</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(Number(detailDispute.booking.escrow.amount))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">Status</p>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold mt-1',
                      detailDispute.booking.escrow.status === 'FUNDED' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' :
                      detailDispute.booking.escrow.status === 'RELEASED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    )}>
                      {detailDispute.booking.escrow.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SLA Panel */}
            {detailSla && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">SLA</p>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold',
                    detailSla.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    detailSla.status === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    detailSla.status === 'BREACHED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    detailSla.status === 'MET' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                  )}>
                    {detailSla.status}
                  </span>
                </div>
                {detailSla.policy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {detailSla.policy.name} · {detailSla.policy.firstResponseHours}h first response · {detailSla.policy.resolutionHours}h resolution
                  </p>
                )}
                <div className="space-y-3">
                  {[
                    {
                      label: 'First Response',
                      done: !!detailSla.firstResponseAt,
                      breached: detailSla.firstResponseBreached,
                      dueText: `Due ${formatDateTime(detailSla.firstResponseDue)}`,
                      pct: detailSla.statusSnapshot?.firstResponsePercent ?? 0,
                    },
                    {
                      label: 'Resolution',
                      done: !!detailSla.resolvedAt,
                      breached: detailSla.resolutionBreached,
                      dueText: detailSla.statusSnapshot?.minutesRemaining != null && detailSla.statusSnapshot.minutesRemaining > 0
                        ? `${Math.floor(detailSla.statusSnapshot.minutesRemaining / 60)}h ${detailSla.statusSnapshot.minutesRemaining % 60}m remaining`
                        : `Due ${formatDateTime(detailSla.resolutionDue)}`,
                      pct: detailSla.statusSnapshot?.resolutionPercent ?? 0,
                    },
                  ].map(({ label, done, breached, dueText, pct }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                        {done ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Done</span>
                          : breached ? <span className="text-red-600 dark:text-red-400 font-semibold">Overdue</span>
                          : <span className="text-gray-500">{dueText}</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-500' : breached ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-500')}
                          style={{ width: `${Math.min(100, done ? 100 : pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {detailSla.escalations && detailSla.escalations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Escalations</p>
                    {detailSla.escalations.map((e: any) => (
                      <p key={e.id} className="text-[11px] text-gray-500 dark:text-gray-400">
                        ↑ <span className="font-medium text-gray-700 dark:text-gray-300">{e.escalatedTo?.replace(/_/g, ' ')}</span>
                        {' · '}{formatDate(e.createdAt)}
                        {e.reason && <span className="italic"> — {e.reason}</span>}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <a href="/sla" className="text-xs font-semibold text-[#192C67] dark:text-[#8ba6d8] hover:underline">
                    View all SLA assignments →
                  </a>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Dispute Filed</p>
                    <p className="text-xs text-gray-400">{formatDateTime(detailDispute.createdAt)}</p>
                  </div>
                </div>
                {detailDispute.status === 'UNDER_REVIEW' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Moved to Under Review</p>
                      <p className="text-xs text-gray-400">{formatDateTime(detailDispute.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {detailDispute.resolvedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {detailDispute.status === 'RESOLVED_RELEASE' ? 'Resolved — Funds Released to Trainer'
                          : detailDispute.status === 'RESOLVED_REFUND' ? 'Resolved — Funds Refunded to Client'
                          : detailDispute.status === 'CLOSED' ? 'Closed'
                          : detailDispute.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(detailDispute.resolvedAt)}</p>
                      {detailDispute.resolvedBy && (
                        <p className="text-xs text-gray-400">By: {detailDispute.resolvedBy.firstName} {detailDispute.resolvedBy.lastName}</p>
                      )}
                      {detailDispute.resolution && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 leading-relaxed">
                          {detailDispute.resolution}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {['OPEN', 'UNDER_REVIEW'].includes(detailDispute.status) && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0 animate-pulse" />
                    <p className="text-sm text-gray-400 italic">Awaiting resolution…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned To</p>
                {detailDispute.assignedTo && (
                  <button onClick={handleUnassign} disabled={actionLoading} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                    Unassign
                  </button>
                )}
              </div>
              {detailDispute.assignedTo ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/20 flex items-center justify-center text-sm font-bold text-[#192C67] dark:text-white/70 shrink-0 overflow-hidden">
                    {detailDispute.assignedTo.avatar
                      ? <img src={detailDispute.assignedTo.avatar} className="w-full h-full object-cover" alt="" />
                      : `${detailDispute.assignedTo.firstName?.[0] || ''}${detailDispute.assignedTo.lastName?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{detailDispute.assignedTo.firstName} {detailDispute.assignedTo.lastName}</p>
                    <p className="text-xs text-gray-500">{detailDispute.assignedTo.role}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                    disabled={actionLoading || assignableTeam.length === 0}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-500 disabled:opacity-50 transition-colors"
                  >
                    {assignableTeam.length === 0 ? 'No team members available' : '+ Assign to a team member'}
                  </button>
                  {assignDropdownOpen && assignableTeam.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {assignableTeam.map((m: any) => (
                        <button key={m.id} onClick={() => handleAssign(m.id)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#192C67]/10 flex items-center justify-center text-xs font-bold text-[#192C67] dark:text-white/70 shrink-0 overflow-hidden">
                            {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt="" /> : `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-gray-500 truncate">{m.title || m.teamRole} · {m.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments thread */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Comments & Evidence ({comments.length})
              </p>
              <div className="space-y-3 max-h-[360px] overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p>
                ) : (
                  comments.map((c: any) => (
                    <div key={c.id} className={cn(
                      'p-3 rounded-xl',
                      c.isInternal
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60'
                        : 'bg-gray-50 dark:bg-gray-800/60',
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/20 flex items-center justify-center text-[10px] font-bold text-[#192C67] dark:text-white/70 shrink-0 overflow-hidden">
                          {c.author?.avatar ? <img src={c.author.avatar} className="w-full h-full object-cover" alt="" /> : `${c.author?.firstName?.[0] || ''}${c.author?.lastName?.[0] || ''}`.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            {c.author?.firstName} {c.author?.lastName}
                            <span className="text-gray-400 font-normal ml-1">· {c.author?.role}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">{formatDateTime(c.createdAt)}</p>
                        </div>
                        {c.isInternal && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">INTERNAL</span>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{c.content}</p>
                      {c.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.attachments.map((a: any, ai: number) => (
                            <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 inline-flex items-center gap-1 transition-colors">
                              📎 {a.name || 'attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment or upload evidence…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-[#192C67]/30 outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setCommentUploading(true);
                      try { const att = await uploadAttachment(f); setCommentAttachments([...commentAttachments, att]); addToast('success', `${f.name} attached`); }
                      catch { addToast('error', 'Upload failed'); }
                      finally { setCommentUploading(false); }
                    }} />
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer">
                      {commentUploading ? 'Uploading…' : '📎 Attach'}
                    </span>
                  </label>
                  <button
                    onClick={handleAddComment}
                    disabled={commentSending || commentUploading || !newComment.trim()}
                    className="ml-auto px-4 py-1.5 text-xs font-bold rounded-lg bg-[#192C67] text-white hover:bg-[#14234f] disabled:opacity-50 transition-colors"
                  >
                    {commentSending ? 'Posting…' : 'Post Comment'}
                  </button>
                </div>
                {commentAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {commentAttachments.map((a: any, ai: number) => (
                      <span key={ai} className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 inline-flex items-center gap-1">
                        📎 {a.name}
                        <button onClick={() => setCommentAttachments(commentAttachments.filter((_, i) => i !== ai))} className="text-red-500 hover:text-red-700 ml-1 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Withdraw */}
            {detailDispute.status === 'OPEN' && detailDispute.raisedById === user?.id && (
              <div className="flex justify-end">
                <button
                  onClick={handleWithdraw}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors border border-red-200 dark:border-red-800/50"
                >
                  {actionLoading ? 'Withdrawing…' : 'Withdraw Dispute'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ══════════════════════════════════════════
          FILE DISPUTE MODAL
      ══════════════════════════════════════════ */}
      <Modal
        isOpen={fileOpen}
        onClose={() => { setFileOpen(false); setFileSelectedBooking(null); setFileCategory(''); setFileReason(''); setFileDescription(''); setFileBookings([]); }}
        title="File a Dispute"
        size="lg"
      >
        <div className="space-y-6">
          {/* Step 1: Select booking */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Step 1 — Select Booking</p>
            {fileBookingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#192C67] border-t-transparent" />
              </div>
            ) : fileSelectedBooking ? (
              <div className="p-3.5 rounded-xl border-2 border-[#192C67] bg-[#192C67]/5 dark:bg-[#192C67]/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{getBookingPersonName(fileSelectedBooking)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatCurrency(fileSelectedBooking.amount || 0)} · {fileSelectedBooking.sessionType} · {formatDate(fileSelectedBooking.scheduledAt || fileSelectedBooking.createdAt)}
                    </p>
                  </div>
                  <button onClick={() => setFileSelectedBooking(null)} className="text-xs text-red-500 hover:text-red-600 font-semibold">Change</button>
                </div>
              </div>
            ) : fileBookings.length > 0 ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {fileBookings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setFileSelectedBooking(b)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{getBookingPersonName(b)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatCurrency(b.amount || 0)} · {b.sessionType} · {formatDate(b.scheduledAt || b.createdAt)} · {b.status}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">No eligible bookings found</div>
            )}
          </div>

          {/* Step 2: Category */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Step 2 — Category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISPUTE_CATEGORIES.map((cat) => {
                const selected = fileCategory === cat.key;
                const priorityDot: Record<string, string> = {
                  CRITICAL: 'bg-red-500',
                  HIGH: 'bg-orange-500',
                  MEDIUM: 'bg-amber-400',
                  LOW: 'bg-gray-400',
                };
                const slaLabels: Record<string, string> = { CRITICAL: '4h SLA', HIGH: '24h SLA', MEDIUM: '48h SLA', LOW: '72h SLA' };
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setFileCategory(cat.key)}
                    className={cn(
                      'text-left p-3.5 rounded-xl border-2 transition-all',
                      selected
                        ? 'border-[#192C67] bg-[#192C67]/5 dark:bg-[#192C67]/15'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', priorityDot[cat.priority])} />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{cat.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{slaLabels[cat.priority]}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug pl-3.5">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Reason */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Step 3 — Reason</p>
            <input
              value={fileReason}
              onChange={e => setFileReason(e.target.value)}
              placeholder="Brief reason for the dispute…"
              className={ic}
              maxLength={500}
            />
          </div>

          {/* Step 4: Description */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Step 4 — Description <span className="normal-case font-normal text-gray-400">(optional)</span></p>
            <textarea
              value={fileDescription}
              onChange={e => setFileDescription(e.target.value)}
              rows={4}
              placeholder="Detailed description of the issue, evidence, or supporting context…"
              className={cn(ic, 'resize-none')}
              maxLength={2000}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{fileDescription.length}/2000</p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFileOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFileDispute}
              disabled={fileLoading || !fileSelectedBooking || !fileCategory || !fileReason.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#192C67] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#14234f] transition-colors"
            >
              {fileLoading ? 'Filing…' : 'File Dispute'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
