'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BookingWizard from '@/components/booking/BookingWizard';
import { Booking, User } from '@/lib/types';
import { bookingService } from '@/lib/services/bookings';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatCurrency, formatTime, formatDate, cn } from '@/lib/utils';

const tabs = [
  { key: '', label: 'All', icon: 'grid' },
  { key: 'CONFIRMED', label: 'Upcoming', icon: 'clock' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check' },
  { key: 'CANCELLED', label: 'Cancelled', icon: 'x' },
  { key: 'DISPUTED', label: 'Disputed', icon: 'alert' },
];

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-400',
  IN_PROGRESS: 'bg-purple-400',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-zinc-400',
  DISPUTED: 'bg-red-400',
};

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  VIRTUAL: { label: 'Video Call', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  PHYSICAL: { label: 'On-Site', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  HYBRID: { label: 'Hybrid', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
};

const EMPTY_STATES: Record<string, { title: string; description: string }> = {
  '': { title: 'No interviews yet', description: 'Schedule your first interview to get started.' },
  CONFIRMED: { title: 'No upcoming interviews', description: 'You have no confirmed interviews scheduled.' },
  COMPLETED: { title: 'No completed interviews', description: 'Completed interviews will appear here.' },
  CANCELLED: { title: 'No cancelled interviews', description: 'No interviews have been cancelled.' },
  DISPUTED: { title: 'No disputed interviews', description: 'No interviews are under dispute.' },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isRecruiter = user?.role === 'TRAINER';

  const [activeTab, setActiveTab] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (activeTab) params.status = activeTab;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await bookingService.getMyBookings(params);
      setBookings(data.items);
      setTotalPages(data.totalPages);
    } catch {
      addToast('error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await bookingService.cancel(cancelId);
      addToast('success', 'Interview cancelled');
      setCancelId(null);
      fetchBookings();
    } catch {
      addToast('error', 'Failed to cancel interview');
    } finally {
      setCancelling(false);
    }
  };

  const getPersonName = (booking: Booking): string => {
    if (isRecruiter) {
      return booking.client
        ? `${booking.client.firstName} ${booking.client.lastName}`
        : 'Candidate';
    }
    const t = (booking.trainer?.user || booking.trainer) as any;
    return t?.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : 'Recruiter';
  };

  const getPersonAvatar = (booking: Booking): { src?: string; firstName: string; lastName: string } => {
    if (isRecruiter) {
      return {
        src: booking.client?.avatarUrl || booking.client?.avatar,
        firstName: booking.client?.firstName || '?',
        lastName: booking.client?.lastName || '?',
      };
    }
    const t = (booking.trainer?.user || booking.trainer) as any;
    return {
      src: t?.avatarUrl || t?.avatar,
      firstName: t?.firstName || '?',
      lastName: t?.lastName || '',
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Interviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRecruiter ? 'Manage your interview schedule' : 'View and manage your upcoming interviews'}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white font-medium rounded-xl hover:bg-[#e06a0d] transition-colors shadow-sm text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Schedule Interview
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.key
                ? 'bg-[#F77B0F] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#F77B0F] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#F77B0F] outline-none"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
            className="text-xs text-[#F77B0F] hover:text-[#F77B0F] font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bookings list */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : bookings.length > 0 ? (
        <>
          <div className="space-y-3">
            {bookings.map((booking) => {
              const person = getPersonName(booking);
              const avatar = getPersonAvatar(booking);
              const date = new Date(booking.scheduledAt);
              const sessionLabel = SESSION_TYPE_LABELS[booking.sessionType] || SESSION_TYPE_LABELS.VIRTUAL;
              const statusDot = STATUS_DOT[booking.status] || STATUS_DOT.PENDING;

              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#F77B0F]/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#F77B0F]/50 group"
                >
                  <Avatar
                    src={avatar.src}
                    firstName={avatar.firstName}
                    lastName={avatar.lastName}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#F77B0F] dark:group-hover:text-[#F77B0F]/80 transition-colors">
                        {person}
                      </p>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                        sessionLabel.color
                      )}>
                        {sessionLabel.label}
                      </span>
                    </div>
                    {/* Org/firm info */}
                    {!isRecruiter && (booking.trainer as any)?.organization && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">🏢 {(booking.trainer as any).organization}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span>
                        {date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span>{booking.duration} min</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(booking.amount || 0)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', statusDot)} />
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          title={EMPTY_STATES[activeTab]?.title || 'No bookings found'}
          description={EMPTY_STATES[activeTab]?.description || 'No bookings to show.'}
          action={{
            label: 'Schedule Interview',
            onClick: () => setShowWizard(true),
          }}
        />
      )}

      {/* Cancel dialog */}
      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title="Cancel Interview"
        message="Are you sure you want to cancel this interview? This action cannot be undone."
        confirmText="Yes, Cancel"
        variant="danger"
        isLoading={cancelling}
      />

      {/* Booking wizard modal */}
      {showWizard && (
        <BookingWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(booking) => {
            setShowWizard(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}
