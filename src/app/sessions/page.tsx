'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Booking } from '@/lib/types';

/* ─────────────────── helpers ─────────────────── */

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 2) return `in ${d} days`;
  if (d === 1) return 'Tomorrow';
  if (h >= 1) return `in ${h}h ${m % 60}m`;
  return `in ${m}m`;
}

function relativeDayLabel(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diffDays = Math.round((d.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return formatDate(iso);
}

/* ─────────────────── icon atoms ─────────────────── */

const VideoIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const CalIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const ClockIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ArrowIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
const BookIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

/* ─────────────────── status / type config ─────────────────── */

const STATUS_CFG: Record<string, { label: string; dot: string; ring: string; text: string }> = {
  CONFIRMED:       { label: 'Confirmed',  dot: 'bg-emerald-500',           ring: 'ring-emerald-200 dark:ring-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' },
  IN_PROGRESS:     { label: 'Live now',   dot: 'bg-blue-500 animate-pulse', ring: 'ring-blue-200 dark:ring-blue-700',      text: 'text-blue-600 dark:text-blue-400' },
  PENDING_PAYMENT: { label: 'Pending',    dot: 'bg-amber-500',              ring: 'ring-amber-200 dark:ring-amber-700',    text: 'text-amber-600 dark:text-amber-400' },
  COMPLETED:       { label: 'Completed',  dot: 'bg-gray-400',               ring: 'ring-gray-200 dark:ring-gray-700',      text: 'text-gray-500 dark:text-gray-400' },
};

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  VIRTUAL:  { label: 'Virtual',    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  PHYSICAL: { label: 'In-Person',  color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  HYBRID:   { label: 'Hybrid',     color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
};

/* ─────────────────── page ─────────────────── */

export default function SessionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<any>('/bookings', { params: { limit: 50 } });
        const items = Array.isArray(res) ? res : res?.items ?? res?.data ?? [];
        setBookings(items);
      } catch {
        addToast('error', 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const upcoming = useMemo(() =>
    bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS', 'PENDING_PAYMENT'].includes(b.status))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [bookings]);
  const completed = useMemo(() =>
    bookings.filter(b => b.status === 'COMPLETED')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [bookings]);
  const liveNow = bookings.filter(b => b.status === 'IN_PROGRESS');
  const nextSession = upcoming.find(b => b.status === 'CONFIRMED');
  const totalHours = Math.round(completed.reduce((s, b) => s + b.duration, 0) / 60);

  const displayed = tab === 'upcoming' ? upcoming : completed;

  const getTrainer = (booking: Booking): any =>
    (booking as any).trainer?.user || (booking as any).trainer;

  const canJoin = (b: Booking) =>
    ['CONFIRMED', 'IN_PROGRESS'].includes(b.status) &&
    ['VIRTUAL', 'HYBRID'].includes(b.sessionType);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pb-12">

      {/* ── Live now banner ── */}
      {liveNow.length > 0 && (
        <div className="rounded-2xl overflow-hidden bg-[#192C67] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#192C67] via-[#1e3580] to-[#192C67]" />
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[#F77B0F]/20 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#F77B0F] animate-pulse shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Session in progress</p>
                <p className="text-white/60 text-xs mt-0.5">
                  Your session with{' '}
                  <span className="text-white font-medium">
                    {(() => { const t = getTrainer(liveNow[0]); return t ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : 'your trainer'; })()}
                  </span>{' '}
                  is live right now
                </p>
              </div>
            </div>
            <Link
              href={`/bookings/${liveNow[0].id}/session`}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white text-sm font-bold rounded-xl hover:bg-[#e36d04] transition-colors shadow-lg shadow-[#F77B0F]/30"
            >
              <VideoIcon className="w-4 h-4" />
              Join Now
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-8 sm:px-10 sm:py-10 min-h-[220px]"
        style={{ backgroundImage: 'url(/images/dashboard-hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-[#F77B0F] text-xs font-bold uppercase tracking-widest mb-2">My Learning</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {user?.firstName ? `Welcome back, ${user.firstName}` : 'Your Sessions'}
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-xs">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming session${upcoming.length > 1 ? 's' : ''} scheduled.`
                : 'Book a 1-on-1 session with a trainer to start learning.'}
            </p>

            {/* Next session callout */}
            {nextSession && (
              <div className="mt-4 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5">
                <CalIcon className="w-4 h-4 text-[#F77B0F] shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">
                    Next: {relativeDayLabel(nextSession.scheduledAt)} at {formatTime(nextSession.scheduledAt)}
                  </p>
                  <p className="text-white/50 text-[10px] mt-0.5">
                    with {(() => { const t = getTrainer(nextSession); return t ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : 'your trainer'; })()} · {timeUntil(nextSession.scheduledAt)}
                  </p>
                </div>
              </div>
            )}

            {/* CTA if no sessions */}
            {!loading && upcoming.length === 0 && completed.length === 0 && (
              <Link
                href="/trainers"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white text-sm font-bold rounded-xl hover:bg-[#e36d04] transition-colors"
              >
                <BookIcon className="w-4 h-4" />
                Find a Trainer
              </Link>
            )}
          </div>

          {/* Stats ring */}
          <div className="flex sm:flex-col items-center gap-4 sm:gap-3 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{completed.length}</p>
              <p className="text-white/50 text-[11px] font-medium">Sessions done</p>
            </div>
            <div className="w-px h-8 sm:w-8 sm:h-px bg-white/15" />
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F77B0F]">{totalHours}</p>
              <p className="text-white/50 text-[11px] font-medium">Hours learned</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming', value: upcoming.length, icon: CalIcon, color: 'text-[#192C67] dark:text-[#7ba5e0]', bg: 'bg-[#192C67]/5 dark:bg-[#192C67]/20' },
            { label: 'Live now',  value: liveNow.length,  icon: VideoIcon, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Completed', value: completed.length, icon: BookIcon,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={cn('rounded-2xl p-4 flex items-center gap-3', bg)}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm shrink-0')}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {([['upcoming', 'Upcoming', upcoming.length], ['completed', 'Completed', completed.length]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors',
              tab === key
                ? 'text-[#192C67] dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            )}
          >
            {label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center',
              tab === key
                ? 'bg-[#192C67] text-white dark:bg-[#F77B0F]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            )}>{count}</span>
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#192C67] dark:bg-[#F77B0F] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Session list ── */}
      {loading ? (
        <ListSkeleton rows={3} />
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <CalIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">
            {tab === 'upcoming' ? 'No upcoming sessions' : 'No completed sessions yet'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            {tab === 'upcoming'
              ? 'Find a trainer and book a session to start learning.'
              : 'Sessions you complete will appear here.'}
          </p>
          {tab === 'upcoming' && (
            <Link href="/trainers"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white text-sm font-bold rounded-xl hover:bg-[#e36d04] transition-colors">
              Browse Trainers
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((booking) => {
            const trainer = getTrainer(booking);
            const trainerName = trainer ? `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() : 'Trainer';
            const isLive = booking.status === 'IN_PROGRESS';
            const isPending = booking.status === 'PENDING_PAYMENT';
            const joinable = canJoin(booking);
            const statusCfg = STATUS_CFG[booking.status] ?? STATUS_CFG.COMPLETED;
            const typeCfg = TYPE_CFG[booking.sessionType] ?? { label: booking.sessionType, color: 'bg-gray-100 text-gray-600' };

            return (
              <div
                key={booking.id}
                className={cn(
                  'group relative rounded-2xl border transition-all overflow-hidden bg-white dark:bg-gray-900',
                  isLive
                    ? 'border-[#192C67]/30 dark:border-[#7ba5e0]/30 shadow-md shadow-[#192C67]/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm',
                )}
              >
                {/* Left accent strip */}
                <div className={cn(
                  'absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl',
                  isLive ? 'bg-[#F77B0F]' : isPending ? 'bg-amber-400' : 'bg-[#192C67]/20 dark:bg-[#7ba5e0]/20',
                )} />

                <div className="pl-5 pr-4 py-4 sm:py-5 flex items-start sm:items-center gap-4">
                  {/* Trainer avatar + live dot */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={trainer?.avatar || trainer?.avatarUrl}
                      firstName={trainer?.firstName || '?'}
                      lastName={trainer?.lastName || ''}
                      size="md"
                    />
                    {isLive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F77B0F] border-2 border-white dark:border-gray-900 animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Trainer + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{trainerName}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', typeCfg.color)}>{typeCfg.label}</span>
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', statusCfg.ring, statusCfg.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusCfg.dot)} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Date + time + duration */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <CalIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {relativeDayLabel(booking.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {formatTime(booking.scheduledAt)} · {booking.duration} min
                      </span>
                      {!isPending && booking.status !== 'COMPLETED' && (
                        <span className="font-semibold text-[#192C67] dark:text-[#7ba5e0]">
                          {timeUntil(booking.scheduledAt)}
                        </span>
                      )}
                    </div>

                    {booking.notes && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 truncate max-w-sm italic">
                        "{booking.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {joinable && (
                      <Link
                        href={`/bookings/${booking.id}/session`}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                          isLive
                            ? 'bg-[#F77B0F] text-white hover:bg-[#e36d04] shadow-md shadow-[#F77B0F]/30'
                            : 'bg-[#192C67] text-white hover:bg-[#14234f] dark:bg-[#F77B0F] dark:hover:bg-[#e36d04]',
                        )}
                      >
                        <VideoIcon className="w-3.5 h-3.5" />
                        {isLive ? 'Join Now' : 'Join Session'}
                      </Link>
                    )}

                    <Link
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                    >
                      Details
                      <ArrowIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
