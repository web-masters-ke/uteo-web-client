'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiPatch, apiPost } from '@/lib/api';
import { Booking, ContentAccess, Review, User } from '@/lib/types';
import { bookingService } from '@/lib/services/bookings';
import { milestoneService } from '@/lib/services/milestones';
import MilestonesPanel from '@/components/booking/MilestonesPanel';
import BreakoutRoomsPanel from '@/components/booking/BreakoutRoomsPanel';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatDate, formatTime, formatCurrency, formatRelative, cn } from '@/lib/utils';

/* ============================================================
   Status timeline steps
   ============================================================ */
const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Created', description: 'Booking created, awaiting payment' },
  { status: 'CONFIRMED', label: 'Confirmed', description: 'Payment received, session scheduled' },
  { status: 'IN_PROGRESS', label: 'In Progress', description: 'Session is currently active' },
  { status: 'COMPLETED', label: 'Completed', description: 'Session finished successfully' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
};

const SESSION_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  VIRTUAL: {
    label: 'Virtual (Online)',
    icon: 'video',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  PHYSICAL: {
    label: 'In-Person',
    icon: 'map-pin',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  },
  HYBRID: {
    label: 'Hybrid',
    icon: 'phone',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  },
  PRE_RECORDED: {
    label: 'Pre-recorded Lesson',
    icon: 'play',
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
  },
};

const ESCROW_STATUS_LABELS: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'neutral' }> = {
  HELD: { label: 'Funds in Escrow', variant: 'warning' },
  RELEASED: { label: 'Funds Released', variant: 'success' },
  REFUNDED: { label: 'Funds Refunded', variant: 'neutral' },
  PENDING: { label: 'Pending', variant: 'warning' },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'session'>('overview');
  const [contentAccess, setContentAccess] = useState<ContentAccess | null>(null);

  useEffect(() => {
    bookingService.getById(id)
      .then(setBooking)
      .catch(() => addToast('error', 'Failed to load booking'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    milestoneService
      .contentAccess(id)
      .then((res) => { if (!cancelled) setContentAccess(res); })
      .catch(() => { /* content-access is best-effort; ignore */ });
    return () => { cancelled = true; };
  }, [id]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const updated = await bookingService.cancel(id);
      setBooking(updated);
      addToast('success', 'Booking cancelled');
      setShowCancel(false);
    } catch {
      addToast('error', 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const updated = await bookingService.confirm(id);
      setBooking(updated);
      addToast('success', 'Booking confirmed');
    } catch {
      addToast('error', 'Failed to confirm booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const updated = await apiPatch<Booking>(`/bookings/${id}/status`, { status: newStatus });
      setBooking(updated);
      addToast('success', `Booking ${newStatus === 'IN_PROGRESS' ? 'started' : newStatus === 'COMPLETED' ? 'completed' : 'updated'}`);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || `Failed to update booking`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!booking) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This booking may have been removed or you may not have access.</p>
        <Link href="/bookings" className="inline-flex items-center gap-2 px-4 py-2 bg-[#F77B0F] text-white rounded-lg hover:bg-[#e06a0d] text-sm font-medium">
          Back to Bookings
        </Link>
      </div>
    );
  }

  const isClient = user?.role === 'CLIENT';
  const isTrainer = user?.role === 'TRAINER';
  const currentStatusIdx = STATUS_ORDER[booking.status] ?? -1;
  const isCancelledOrDisputed = ['CANCELLED', 'DISPUTED'].includes(booking.status);

  // Determine the other person
  const otherPerson: User | null = isClient
    ? (booking.trainer?.user || null)
    : (booking.client || null);
  const otherRole = isClient ? 'Trainer' : 'Client';

  const sessionConfig = SESSION_TYPE_CONFIG[booking.sessionType] || SESSION_TYPE_CONFIG.VIRTUAL;
  const escrowConfig = ESCROW_STATUS_LABELS[booking.escrowStatus || ''] || null;

  // Meeting link
  const meetLink = booking.meetingLink || booking.meetingUrl;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-[#F77B0F] hover:text-[#F77B0F] font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Bookings
      </Link>

      {/* ── Content gating banner ─────────────────────── */}
      {contentAccess && contentAccess.canAccess === false && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Content locked — escrow not yet funded
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {contentAccess.reason || 'Session resources are gated until the escrow for this booking is funded.'}
              {contentAccess.escrowStatus ? ` (Escrow: ${contentAccess.escrowStatus})` : ''}
            </p>
          </div>
          {isClient && (
            <Link
              href={`/wallet?bookingId=${booking.id}`}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-secondary-500 hover:bg-secondary-600 rounded-lg"
            >
              Fund Escrow
            </Link>
          )}
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6" aria-label="Booking tabs">
          {([
            { key: 'overview' as const, label: 'Overview', show: true },
            { key: 'milestones' as const, label: 'Milestones', show: true },
            {
              key: 'session' as const,
              label: 'Session',
              show: booking.sessionType === 'VIRTUAL' || booking.sessionType === 'HYBRID',
            },
          ]).filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold transition-colors',
                activeTab === t.key
                  ? 'border-secondary-500 text-secondary-600 dark:text-secondary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
              )}
              aria-current={activeTab === t.key ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'milestones' && (
        <MilestonesPanel
          booking={booking}
          isTrainer={isTrainer}
          isClient={isClient}
          currentUserId={user?.id}
        />
      )}

      {activeTab === 'session' && <BreakoutRoomsPanel booking={booking} />}

      <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', activeTab !== 'overview' && 'hidden')}>
        {/* ── Main Column ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Header Card ───────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Created {formatRelative(booking.createdAt)}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            {/* ── Status Timeline ──────────────────────── */}
            {!isCancelledOrDisputed && (
              <div className="mb-6">
                <div className="flex items-center overflow-x-auto pb-2">
                  {TIMELINE_STEPS.map((step, i) => {
                    const isCompleted = i <= currentStatusIdx;
                    const isCurrent = i === currentStatusIdx;
                    return (
                      <div key={step.status} className="flex items-center">
                        <div className="flex flex-col items-center min-w-[72px]">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                            isCompleted
                              ? 'bg-[#F77B0F] text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400',
                            isCurrent && 'ring-4 ring-[#F77B0F]/10 dark:ring-[#F77B0F]/10'
                          )}>
                            {isCompleted ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] mt-1.5 font-medium text-center whitespace-nowrap',
                            isCompleted ? 'text-[#F77B0F] dark:text-[#F77B0F]/80' : 'text-gray-400'
                          )}>
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-0.5 max-w-[80px]">
                              {step.description}
                            </span>
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={cn(
                            'w-10 sm:w-16 h-0.5 mx-1 transition-colors',
                            i < currentStatusIdx ? 'bg-[#F77B0F]' : 'bg-gray-200 dark:bg-gray-700'
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled/Disputed banner */}
            {booking.status === 'CANCELLED' && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Booking Cancelled</span>
                </div>
                {booking.cancelReason && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-7">{booking.cancelReason}</p>
                )}
              </div>
            )}
            {booking.status === 'DISPUTED' && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span className="text-sm font-semibold text-red-700 dark:text-red-300">Under Dispute</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 ml-7">
                  This booking is being reviewed by our support team.
                </p>
              </div>
            )}

            {/* ── Session Details Grid ─────────────────── */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {formatDate(booking.date || booking.scheduledAt)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Time</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {booking.startTime && booking.endTime
                    ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                    : new Date(booking.scheduledAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Duration</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{booking.duration} minutes</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Session Type</span>
                <p className="mt-0.5">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                    sessionConfig.color
                  )}>
                    {sessionConfig.label}
                  </span>
                </p>
              </div>
              {booking.location && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Location</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {booking.location}
                  </p>
                </div>
              )}
              {meetLink && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Meeting Link</span>
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#F77B0F] hover:text-[#F77B0F] font-medium mt-0.5 break-all text-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {meetLink}
                  </a>
                </div>
              )}
              {booking.notes && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-0.5 text-sm leading-relaxed">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Escrow / Payment Card ─────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Payment & Escrow
            </h2>

            {/* Amount + Status row */}
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Amount</span>
                <p className="text-2xl font-bold text-[#F77B0F] dark:text-[#F77B0F]/80 mt-1">
                  {formatCurrency(booking.amount)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.currency || 'KES'}</p>
              </div>
              {escrowConfig && (
                <div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Escrow Status</span>
                  <div className="mt-1">
                    <Badge variant={escrowConfig.variant} size="md">{escrowConfig.label}</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* ── Escrow Flow Timeline ─── */}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Escrow Flow</p>
              <div className="flex items-center overflow-x-auto pb-2">
                {(() => {
                  const escrowSteps = [
                    { key: 'PAID', label: 'Client Pays', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1' },
                    { key: 'FUNDED', label: 'Escrow Funded', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                    { key: 'COMPLETED', label: 'Session Complete', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { key: 'RELEASED', label: 'Funds Released', icon: 'M5 13l4 4L19 7' },
                  ];
                  const es = booking.escrowStatus || '';
                  const bs = booking.status || '';
                  // Determine step completion based on escrow + booking status
                  const stepDone = (key: string) => {
                    if (key === 'PAID') return !!es || ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(bs);
                    if (key === 'FUNDED') return ['HELD', 'FUNDED', 'RELEASED', 'REFUNDED'].includes(es);
                    if (key === 'COMPLETED') return bs === 'COMPLETED' || es === 'RELEASED';
                    if (key === 'RELEASED') return es === 'RELEASED';
                    return false;
                  };
                  const stepCurrent = (key: string) => {
                    if (key === 'FUNDED' && ['HELD', 'FUNDED'].includes(es) && bs !== 'COMPLETED') return true;
                    if (key === 'COMPLETED' && bs === 'COMPLETED' && es !== 'RELEASED') return true;
                    if (key === 'RELEASED' && es === 'RELEASED') return true;
                    return false;
                  };
                  return escrowSteps.map((step, i) => {
                    const done = stepDone(step.key);
                    const current = stepCurrent(step.key);
                    return (
                      <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                            done ? 'bg-green-500 text-white' : current ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900/40' : 'bg-gray-200 dark:bg-gray-700 text-gray-400',
                          )}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                            </svg>
                          </div>
                          <span className={cn(
                            'text-[10px] mt-1.5 font-medium text-center whitespace-nowrap',
                            done ? 'text-green-600 dark:text-green-400' : current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400',
                          )}>
                            {step.label}
                          </span>
                        </div>
                        {i < escrowSteps.length - 1 && (
                          <div className={cn(
                            'w-8 sm:w-12 h-0.5 mx-1 transition-colors',
                            done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700',
                          )} />
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Commission breakdown */}
            <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Session Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(booking.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Platform Fee (10%)</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">-{formatCurrency(booking.amount * 0.1)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Trainer Payout</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(booking.amount * 0.9)}</span>
              </div>
            </div>

            {/* Role-specific escrow message */}
            {isTrainer && (
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 mb-3">
                <p className="text-xs text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  You will receive {formatCurrency(booking.amount * 0.9)} after 10% platform commission
                </p>
              </div>
            )}
            {isClient && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Your money is secured in escrow. Released to trainer only after session completion.
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Payments are secured via escrow. Funds are released to the trainer only after session completion. Disputes can be raised within 48 hours.
              </p>
            </div>
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* ── Other Person Card ─────────────────────── */}
          {otherPerson && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                {otherRole}
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={otherPerson.avatarUrl || otherPerson.avatar}
                  firstName={otherPerson.firstName || '?'}
                  lastName={otherPerson.lastName || '?'}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {otherPerson.firstName} {otherPerson.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{otherPerson.email}</p>
                  {otherPerson.phone && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{otherPerson.phone}</p>
                  )}
                </div>
              </div>

              {isClient && booking.trainerId && (
                <Link
                  href={`/trainers/${booking.trainerId}`}
                  className="block w-full text-center py-2.5 text-sm font-medium text-[#F77B0F] bg-[#F77B0F]/10 dark:bg-[#192C67]/20 rounded-xl hover:bg-[#F77B0F]/15 dark:hover:bg-[#192C67]/30 transition-colors"
                >
                  View Profile
                </Link>
              )}
              <Link
                href={`/messages?userId=${otherPerson.id}&name=${encodeURIComponent((otherPerson.firstName || '') + ' ' + (otherPerson.lastName || ''))}`}
                className="block w-full text-center py-2.5 mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Send Message
              </Link>
            </div>
          )}

          {/* ── Actions Card ──────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              Actions
            </h3>
            <div className="space-y-2">
              {/* Join / Start Video Session (confirmed or in progress) */}
              {(booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') && (() => {
                const videoRooms: any[] = (booking as any).videoRooms || [];
                const mainRoom = videoRooms.find((r: any) => !r.parentRoomId);
                const breakouts = videoRooms.filter((r: any) => r.parentRoomId);
                const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

                // Find which room this user is assigned to (prefer breakout over main)
                const myBreakout = breakouts.find((r: any) => Array.isArray(r.participants) && r.participants.includes(user?.id));
                const myRoom = myBreakout || mainRoom;

                // Navigate to the in-app session hopper (video iframe + rooms drawer).
                // Falls back to a popup if no VideoSessionRoom records exist yet (legacy bookings).
                const openRoom = (room?: any) => {
                  if (room?.id) {
                    router.push(`/bookings/${booking.id}/session?room=${room.id}`);
                  } else if (mainRoom?.id) {
                    router.push(`/bookings/${booking.id}/session?room=${mainRoom.id}`);
                  } else {
                    // No DB rooms yet (booking created before this feature) — open the meeting directly
                    const fallbackName = `uteo-session-${booking.id.slice(0, 8)}`;
                    const dn = encodeURIComponent(displayName);
                    const url = `https://8x8.vc/vpaas-magic-cookie-315e6ce2ff244da49ecbd19f303846d7/${fallbackName}#userInfo.displayName="${dn}"`;
                    window.open(url, '_blank', 'width=1200,height=800');
                  }
                };

                return (
                  <div className="space-y-2">
                    {/* Primary: join assigned room */}
                    <button
                      onClick={() => openRoom(myRoom)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-accent-500 rounded-xl hover:bg-accent-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                      {myBreakout
                        ? `Join ${myBreakout.name}`
                        : isTrainer ? 'Start Main Room' : 'Join Session'}
                    </button>

                    {/* Trainer: room roster for breakouts */}
                    {isTrainer && breakouts.length > 0 && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Breakout Rooms ({breakouts.filter((r: any) => r.status === 'OPEN').length} open)
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {breakouts.map((room: any) => (
                            <div key={room.id} className="flex items-center justify-between px-3 py-2 gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{room.name}</p>
                                <p className="text-[10px] text-gray-400">{(room.participants || []).length} participant{(room.participants || []).length !== 1 ? 's' : ''}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    const sessionUrl = `${window.location.origin}/bookings/${booking.id}/session?room=${room.id}`;
                                    navigator.clipboard.writeText(sessionUrl);
                                    addToast('success', 'Room link copied');
                                  }}
                                  title="Copy room link"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#F77B0F] hover:bg-[#F77B0F]/10 dark:hover:bg-[#192C67]/20 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openRoom(room)}
                                  title="Join this room"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Session tab hint for trainer */}
                    {isTrainer && (
                      <button
                        onClick={() => setActiveTab('session')}
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#F77B0F] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Manage rooms in Session tab
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Watch Pre-recorded Lesson (for PRE_RECORDED bookings) */}
              {booking.sessionType === 'PRE_RECORDED' && (booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') && (
                <button
                  onClick={() => {
                    const b = booking as any;
                    if (b.lesson?.videoUrl) {
                      window.open(b.lesson.videoUrl, '_blank');
                    } else if (b.courseId) {
                      window.location.href = `/courses/${b.courseId}`;
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {(booking as any).lesson ? `Watch: ${(booking as any).lesson.title}` : 'Watch Course Lesson'}
                </button>
              )}

              {/* Course info card for pre-recorded bookings */}
              {booking.sessionType === 'PRE_RECORDED' && (booking as any).course && (
                <Link
                  href={`/courses/${(booking as any).course.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
                >
                  <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 truncate">{(booking as any).course.title}</p>
                    <p className="text-[10px] text-teal-600/70 dark:text-teal-400/70">View full course</p>
                  </div>
                </Link>
              )}

              {/* Confirm booking (trainer, pending payment) */}
              {isTrainer && booking.status === 'PENDING_PAYMENT' && (
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-[#F77B0F] rounded-xl hover:bg-[#e06a0d] transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {actionLoading ? 'Confirming...' : 'Confirm Booking'}
                </button>
              )}

              {/* Mark In Progress (trainer, confirmed) */}
              {isTrainer && booking.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {actionLoading ? 'Starting...' : 'Start Session'}
                </button>
              )}

              {/* Complete Session (trainer, in progress) */}
              {isTrainer && booking.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {actionLoading ? 'Completing...' : 'Complete Session'}
                </button>
              )}

              {/* Leave review — available to both trainer and client after/during session */}
              {(booking.status === 'COMPLETED' || booking.status === 'IN_PROGRESS') && (() => {
                const allReviews: Review[] = (booking.reviews ?? (booking.review ? [booking.review] : []));
                const myReview = allReviews.find((r) => r.reviewerId === user?.id);
                if (myReview) return null;
                return (
                  <Link
                    href={`/reviews/new?bookingId=${booking.id}&trainerId=${booking.trainerId}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-secondary-500 rounded-xl hover:bg-secondary-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {isTrainer ? 'Review This Client' : 'Leave Review'}
                  </Link>
                );
              })()}

              {/* Cancel booking */}
              {(booking.status === 'PENDING_PAYMENT' || booking.status === 'CONFIRMED') && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Booking
                </button>
              )}

              {/* Rebook (cancelled, client only) */}
              {booking.status === 'CANCELLED' && isClient && (
                <Link
                  href={`/book/${booking.trainerId}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-[#F77B0F] rounded-xl hover:bg-[#e06a0d] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Rebook This Trainer
                </Link>
              )}
            </div>
          </div>

          {/* ── Reviews Card ─────────────────────────── */}
          {(['COMPLETED', 'IN_PROGRESS'].includes(booking.status)) && (() => {
            const allReviews: Review[] = (booking.reviews ?? (booking.review ? [booking.review] : []));
            if (!allReviews.length) return null;
            return (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Session Reviews
                </h3>
                {allReviews.map((rev) => {
                  const isMine = rev.reviewerId === user?.id;
                  const label = isMine ? 'Your Review' : (rev.reviewer ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}` : 'Review');
                  return (
                    <div key={rev.id} className={cn('rounded-xl p-3 border', isMine ? 'bg-[#F77B0F]/10 dark:bg-[#192C67]/20 border-[#F77B0F]/20 dark:border-[#192C67]' : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600')}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={cn('w-3.5 h-3.5', i < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600')} viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1">{rev.rating}/5</span>
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">&quot;{rev.comment}&quot;</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Booking Metadata ──────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Details
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Booking ID</dt>
                <dd className="font-mono text-gray-600 dark:text-gray-400 truncate ml-4 max-w-[180px]">{booking.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-600 dark:text-gray-400">{formatDate(booking.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? The escrowed amount will be refunded to the client."
        confirmText="Yes, Cancel Booking"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
