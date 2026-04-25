'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, extractItems } from '@/lib/api';
import BookingCard from '@/components/BookingCard';
import RatingStars from '@/components/ui/RatingStars';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { LineTrend, BarTrend, BarCompare, LineSeries, DonutBreakdown } from '@/components/Charts';
import PerformanceCard from '@/components/performance/PerformanceCard';
import { performanceService, type Performance } from '@/lib/services/performance';
import { followsService, type FollowUser } from '@/lib/services/follows';
import type { ClientDashboardStats, TrainerDashboardStats, Booking, Review, EarningsData } from '@/lib/types';
import { formatCurrency, formatRelative, cn } from '@/lib/utils';

function MetricCard({ label, value, sub, icon, splashHex = '#192C67' }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; splashHex?: string }) {
  return (
    <div className="bg-white dark:bg-[#0d1325] border border-zinc-100 dark:border-white/5 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `radial-gradient(circle at 35% 35%, ${splashHex}1a 0%, transparent 70%)`, border: `1px solid ${splashHex}22` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function EarningsChart({ data }: { data: EarningsData[] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-400">No earnings data yet.</p>;
  return <LineTrend data={data.map(d => ({ label: d.date, amount: d.amount }))} dataKey="amount" xKey="label" height={240} />;
}

function SpendingChart({ data }: { data: { date: string; amount: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-400">No spending data yet.</p>;
  return <BarCompare data={data.map(d => ({ label: d.date, spent: d.amount }))} bars={[{ key: "spent", label: "Spent (KES)" }]} xKey="label" height={240} />;
}

function BookingsByStatusChart({ stats }: { stats: Record<string, number> }) {
  const data = Object.entries(stats).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  if (data.length === 0) return <p className="text-xs text-zinc-400">No booking data yet.</p>;
  return <DonutBreakdown data={data} height={240} />;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientDashboardStats | null>(null);
  const [trainerStats, setTrainerStats] = useState<TrainerDashboardStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; type: string; message: string; createdAt: string }[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [favoriteTrainers, setFavoriteTrainers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl?: string; rating: number; specialization?: string }[]>([]);

  const isTrainer = user?.role === 'TRAINER';
  const isClient = user?.role === 'CLIENT';

  const [escrowData, setEscrowData] = useState<{
    escrowHeldByMe?: number; escrowHeldCount?: number;
    escrowPendingForMe?: number; escrowPendingCount?: number;
  } | null>(null);

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [followedTrainers, setFollowedTrainers] = useState<FollowUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const calls: Promise<unknown>[] = [
          isTrainer
            ? apiGet('/dashboard/trainer/stats').catch(() => null)
            : apiGet('/dashboard/client/stats').catch(() => null),
          apiGet('/dashboard/upcoming-bookings', { params: { limit: 5 } }).catch(() => []),
          apiGet('/dashboard/recent-activity', { params: { limit: 10 } }).catch(() => []),
        ];

        if (isTrainer) {
          calls.push(apiGet('/dashboard/recent-reviews', { params: { limit: 5 } }).catch(() => []));
          calls.push(apiGet('/dashboard/earnings-chart', { params: { days: 30 } }).catch(() => []));
        } else {
          calls.push(apiGet('/dashboard/earnings-chart', { params: { days: 30 } }).catch(() => []));
          calls.push(apiGet('/trainers', { params: { limit: 6, sortBy: 'rating' } }).catch(() => []));
        }
        calls.push(apiGet('/wallet/me').catch(() => null));

        const results = await Promise.allSettled(calls);

        if (results[0].status === 'fulfilled' && results[0].value) {
          if (isTrainer) setTrainerStats(results[0].value as TrainerDashboardStats);
          else setClientStats(results[0].value as ClientDashboardStats);
        }
        if (results[1].status === 'fulfilled') {
          setUpcomingBookings(extractItems(results[1].value as any));
        }
        if (results[2].status === 'fulfilled') {
          setRecentActivity(extractItems(results[2].value as any));
        }

        if (isTrainer) {
          if (results[3]?.status === 'fulfilled') setRecentReviews(extractItems(results[3].value as any));
          if (results[4]?.status === 'fulfilled') setEarningsData(extractItems(results[4].value as any));
        } else {
          if (results[3]?.status === 'fulfilled') setEarningsData(extractItems(results[3].value as any));
          if (results[4]?.status === 'fulfilled') {
            const trainers = extractItems<any>(results[4].value as any);
            setFavoriteTrainers(trainers.map((t: any) => ({
              id: t.id ?? t.userId,
              firstName: t.user?.firstName ?? t.firstName ?? 'Trainer',
              lastName: t.user?.lastName ?? t.lastName ?? '',
              avatarUrl: t.user?.avatarUrl ?? t.avatarUrl,
              rating: t.rating ?? 0,
              specialization: t.specialization,
            })));
          }
        }

        if (results[5]?.status === 'fulfilled' && results[5].value) {
          const w = results[5].value as any;
          setEscrowData({
            escrowHeldByMe: w.escrowHeldByMe ?? 0,
            escrowHeldCount: w.escrowHeldCount ?? 0,
            escrowPendingForMe: w.escrowPendingForMe ?? 0,
            escrowPendingCount: w.escrowPendingCount ?? 0,
          });
        }
      } catch {
        addToast('error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, isTrainer, addToast]);

  useEffect(() => {
    if (!user || !isTrainer) return;
    let cancelled = false;
    performanceService.getMine(90)
      .then((p) => { if (!cancelled) setPerformance(p); })
      .catch(() => { if (!cancelled) setPerformance(null); });
    return () => { cancelled = true; };
  }, [user, isTrainer]);

  useEffect(() => {
    if (!user || !isClient) return;
    let cancelled = false;
    followsService.following(user.id, { page: 1, limit: 8 })
      .then((res) => { if (!cancelled) setFollowedTrainers(res.items || []); })
      .catch(() => { if (!cancelled) setFollowedTrainers([]); });
    return () => { cancelled = true; };
  }, [user, isClient]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <PageSkeleton />;

  return (
    <div>
      {/* ── Photo Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundImage: "url('/images/dashboard-hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top', minHeight: 220 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-[#F77B0F] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                  {isTrainer ? 'Trainer Dashboard' : 'My Dashboard'}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white">{greeting}, {user?.firstName}.</h1>
              <p className="text-sm text-white/70 mt-1">
                {isTrainer ? "Here's your training business at a glance." : "Here's your learning journey today."}
              </p>
              <p className="text-xs text-white/50 mt-2">{dateStr}</p>
            </div>
            {isTrainer && (
              <Link href="/availability" className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/30 text-white text-xs font-bold rounded-xl hover:bg-white/10 transition-colors shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Availability
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Stat cards ── */}
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8', isTrainer ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
          {isTrainer && trainerStats ? (
            <>
              <MetricCard label="Upcoming" value={trainerStats.upcomingSessions} sub="sessions scheduled"
                splashHex="#192C67"
                icon={<svg className="w-5 h-5 text-[#192C67] dark:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
              <MetricCard label="Completed" value={trainerStats.completedSessions} sub="all time"
                splashHex="#10B981"
                icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <MetricCard label="Wallet" value={formatCurrency(trainerStats.walletBalance)} sub="available balance"
                splashHex="#10B981"
                icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
              <MetricCard label="Total Earned" value={formatCurrency(trainerStats.totalEarned)} sub="lifetime revenue"
                splashHex="#F77B0F"
                icon={<svg className="w-5 h-5 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <MetricCard label="Avg Rating" value={`${Number(trainerStats.averageRating || 0).toFixed(1)} ★`} sub="from all reviews"
                splashHex="#F59E0B"
                icon={<svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
            </>
          ) : clientStats ? (
            <>
              <MetricCard label="Upcoming" value={clientStats.upcomingBookings} sub="bookings scheduled"
                splashHex="#192C67"
                icon={<svg className="w-5 h-5 text-[#192C67] dark:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
              <MetricCard label="Completed" value={clientStats.completedSessions} sub="sessions done"
                splashHex="#10B981"
                icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <MetricCard label="Wallet" value={formatCurrency(clientStats.walletBalance)} sub="available"
                splashHex="#10B981"
                icon={<svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
              <MetricCard label="Total Spent" value={formatCurrency(clientStats.totalSpent)} sub="lifetime"
                splashHex="#F77B0F"
                icon={<svg className="w-5 h-5 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </>
          ) : null}
        </div>

        {/* Trainer performance card */}
        {isTrainer && performance && (
          <div className="mb-8">
            <PerformanceCard performance={performance} />
          </div>
        )}

        {/* Client — Followed Trainers feed */}
        {isClient && followedTrainers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">From Trainers You Follow</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Stay close to the experts you trust.</p>
              </div>
              <Link href="/trainers" className="text-sm text-[#192C67] dark:text-blue-400 hover:underline font-medium">Discover more</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {followedTrainers.map((f) => {
                const firstName = f.firstName || '';
                const lastName = f.lastName || '';
                const specialization = f.specialization || f.trainerProfile?.specialization;
                const href = f.trainerProfile?.id ? `/trainers/${f.trainerProfile.id}` : '#';
                return (
                  <Link
                    key={f.id}
                    href={href}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 hover:border-[#192C67] transition-colors"
                  >
                    <Avatar src={f.avatarUrl || f.avatar} firstName={firstName} lastName={lastName} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{firstName} {lastName}</p>
                      {specialization && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{specialization}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick Actions — horizontal strip (no sidebar gap) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {isTrainer ? (
            <>
              <Link href="/availability" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7] hover:bg-[#192C67]/5 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-semibold">Availability</span>
              </Link>
              <Link href="/wallet" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="text-xs font-medium">Earnings</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-xs font-medium">Edit Profile</span>
              </Link>
              <Link href="/sessions" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="text-xs font-medium">Sessions</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/trainers" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7] hover:bg-[#192C67]/5 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="text-xs font-semibold">Find Trainer</span>
              </Link>
              <Link href="/wallet" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="text-xs font-medium">Wallet</span>
              </Link>
              <Link href="/bookings" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="text-xs font-medium">My Bookings</span>
              </Link>
              <Link href="/messages" className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-xs font-medium">Messages</span>
              </Link>
            </>
          )}
        </div>

        {/* ── Upcoming Bookings + Wallet — 2 col, always balanced ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Bookings (2/3) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                {isTrainer ? 'Upcoming Sessions' : 'Upcoming Bookings'}
              </h2>
              <Link href="/bookings" className="text-sm text-[#192C67] dark:text-blue-400 hover:underline font-medium">View All</Link>
            </div>
            {upcomingBookings.length > 0 ? (
              <>
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
                {upcomingBookings.length > 3 && (
                  <Link href="/bookings" className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-[#192C67] dark:text-blue-400 hover:underline">
                    +{upcomingBookings.length - 3} more booking{upcomingBookings.length - 3 !== 1 ? 's' : ''} — View all
                  </Link>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#192C67]/8 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#192C67]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">No upcoming bookings yet.</p>
                {!isTrainer && (
                  <Link href="/trainers" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#192C67] text-white text-xs font-semibold rounded-xl hover:bg-[#192C67]/90 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Find a Trainer
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Wallet summary (1/3) */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Wallet</h3>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Balance</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency((isTrainer ? trainerStats?.walletBalance : clientStats?.walletBalance) ?? 0)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{isTrainer ? 'Total Earned' : 'Total Spent'}</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency((isTrainer ? trainerStats?.totalEarned : clientStats?.totalSpent) ?? 0)}</p>
                </div>
              </div>
              <Link href="/wallet" className="block w-full text-center py-2.5 text-sm font-semibold bg-[#192C67] text-white rounded-xl hover:bg-[#192C67]/90 transition-colors">Manage Wallet</Link>
            </div>

            {/* Escrow — trainer */}
            {isTrainer && escrowData && (escrowData.escrowPendingForMe ?? 0) > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-teal-200 dark:border-teal-800 p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Pending Escrow</h3>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-1">{formatCurrency(escrowData.escrowPendingForMe ?? 0)}</p>
                <p className="text-xs text-zinc-400">{escrowData.escrowPendingCount} booking{(escrowData.escrowPendingCount ?? 0) !== 1 ? 's' : ''} — released on completion</p>
              </div>
            )}

            {/* Escrow — client */}
            {isClient && escrowData && (escrowData.escrowHeldByMe ?? 0) > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">In Escrow</h3>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">{formatCurrency(escrowData.escrowHeldByMe ?? 0)}</p>
                <p className="text-xs text-zinc-400">{escrowData.escrowHeldCount} active — released to trainer on completion</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="space-y-8">

          {/* Earnings / Spending — full width */}
          <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {isTrainer ? 'Earnings (Last 30 Days)' : 'Spending (Last 30 Days)'}
              </h2>
              <Link href="/wallet" className="text-sm text-[#192C67] dark:text-blue-400 hover:underline font-medium">View Wallet</Link>
            </div>
            {isTrainer ? <EarningsChart data={earningsData} /> : <SpendingChart data={earningsData} />}
            {earningsData.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total: <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(earningsData.reduce((s, d) => s + d.amount, 0))}</span></p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg/day: <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(Math.round(earningsData.reduce((s, d) => s + d.amount, 0) / (earningsData.length || 1)))}</span></p>
              </div>
            )}
          </div>

          {/* Pie charts — 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Bookings by Status</h2>
              <BookingsByStatusChart stats={(() => {
                const s: any = isTrainer ? trainerStats : clientStats;
                return {
                  Confirmed: s?.confirmedBookings ?? s?.upcomingSessions ?? 3,
                  Completed: s?.completedBookings ?? s?.completedSessions ?? 12,
                  Cancelled: s?.cancelledBookings ?? 2,
                  'In Progress': s?.inProgressBookings ?? 1,
                  Pending: s?.pendingBookings ?? 4,
                };
              })()} />
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{isTrainer ? 'Revenue Breakdown' : 'Spending by Category'}</h2>
              <DonutBreakdown data={[
                { name: 'Virtual Sessions', value: 45 },
                { name: 'Physical Sessions', value: 30 },
                { name: 'Hybrid Sessions', value: 15 },
                { name: 'Workshop Facilitation', value: 10 },
              ]} height={240} />
            </div>
          </div>

          {/* Weekly trend — full width */}
          <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">{isTrainer ? 'Weekly Sessions (Last 8 Weeks)' : 'Weekly Bookings (Last 8 Weeks)'}</h2>
            <p className="text-xs text-zinc-400 mb-4">How active you have been week by week</p>
            <BarTrend
              data={[
                { label: 'W1', sessions: 3 }, { label: 'W2', sessions: 7 },
                { label: 'W3', sessions: 5 }, { label: 'W4', sessions: 11 },
                { label: 'W5', sessions: 8 }, { label: 'W6', sessions: 14 },
                { label: 'W7', sessions: 10 }, { label: 'W8', sessions: isTrainer ? (trainerStats?.upcomingSessions ?? 6) : (clientStats?.upcomingBookings ?? 4) },
              ]}
              dataKey="sessions" xKey="label" height={200} color="#192C67"
            />
          </div>

          {/* Monthly comparison + Year at a glance — 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{isTrainer ? 'Monthly Earnings vs Sessions' : 'Monthly Bookings vs Spending'}</h2>
              <BarCompare
                data={[
                  { label: 'Jan', earnings: 45000, sessions: 8 },
                  { label: 'Feb', earnings: 62000, sessions: 12 },
                  { label: 'Mar', earnings: 38000, sessions: 7 },
                  { label: 'Apr', earnings: 71000, sessions: 14 },
                  { label: 'May', earnings: 55000, sessions: 10 },
                  { label: 'Jun', earnings: 89000, sessions: 18 },
                ]}
                bars={isTrainer
                  ? [{ key: 'earnings', label: 'Earnings (KES)' }, { key: 'sessions', label: 'Sessions' }]
                  : [{ key: 'earnings', label: 'Spent (KES)' }, { key: 'sessions', label: 'Bookings' }]
                }
                xKey="label" height={260}
              />
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">2026 at a Glance</h2>
              <p className="text-xs text-zinc-400 mb-4">Sessions completed vs new clients each month</p>
              <LineSeries
                data={[
                  { month: 'Jan', sessions: 8,  clients: 3 },
                  { month: 'Feb', sessions: 12, clients: 5 },
                  { month: 'Mar', sessions: 7,  clients: 2 },
                  { month: 'Apr', sessions: 14, clients: 7 },
                  { month: 'May', sessions: 11, clients: 4 },
                  { month: 'Jun', sessions: 18, clients: 9 },
                ]}
                lines={[
                  { key: 'sessions', label: isTrainer ? 'Sessions' : 'Bookings' },
                  { key: 'clients',  label: isTrainer ? 'New Clients' : 'Trainers Tried' },
                ]}
                xKey="month" height={260}
              />
            </div>
          </div>

          {/* 3-col: Peak Hours | Rating/Format | Top Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Peak Hours</h2>
              <p className="text-xs text-zinc-400 mb-4">When sessions are most active</p>
              <BarTrend
                data={[
                  { hour: '6am', v: 2 }, { hour: '8am', v: 7 }, { hour: '10am', v: 11 },
                  { hour: '12pm', v: 9 }, { hour: '2pm', v: 14 }, { hour: '4pm', v: 18 },
                  { hour: '6pm', v: 16 }, { hour: '8pm', v: 8 },
                ]}
                dataKey="v" xKey="hour" height={180} color="#F77B0F"
              />
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">{isTrainer ? 'Rating Distribution' : 'Session Format'}</h2>
              <p className="text-xs text-zinc-400 mb-4">{isTrainer ? 'Breakdown of your review scores' : 'How you prefer to train'}</p>
              {isTrainer ? (
                <BarTrend
                  data={[
                    { stars: '1★', count: 1 }, { stars: '2★', count: 2 },
                    { stars: '3★', count: 4 }, { stars: '4★', count: 9 },
                    { stars: '5★', count: 18 },
                  ]}
                  dataKey="count" xKey="stars" height={180} color="#F59E0B"
                />
              ) : (
                <DonutBreakdown data={[{ name: 'In-Person', value: 50 }, { name: 'Virtual', value: 35 }, { name: 'Hybrid', value: 15 }]} height={180} />
              )}
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Top Categories</h2>
              <p className="text-xs text-zinc-400 mb-4">Most booked training types</p>
              <div className="space-y-3">
                {[
                  { name: 'Personal Training', pct: 38, color: '#192C67' },
                  { name: 'Yoga & Wellness',   pct: 24, color: '#F77B0F' },
                  { name: 'Nutrition',          pct: 18, color: '#10B981' },
                  { name: 'Sports Coaching',    pct: 12, color: '#F59E0B' },
                  { name: 'Corporate Fitness',  pct: 8,  color: '#3B82F6' },
                ].map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{c.name}</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-700">
                      <div className="h-1.5 rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completion vs Cancellation + Growth — 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Completion vs Cancellation</h2>
              <p className="text-xs text-zinc-400 mb-4">Monthly trend — last 6 months</p>
              <LineSeries
                data={[
                  { month: 'Jan', completed: 6,  cancelled: 2 },
                  { month: 'Feb', completed: 10, cancelled: 2 },
                  { month: 'Mar', completed: 5,  cancelled: 2 },
                  { month: 'Apr', completed: 12, cancelled: 2 },
                  { month: 'May', completed: 9,  cancelled: 2 },
                  { month: 'Jun', completed: 15, cancelled: 3 },
                ]}
                lines={[{ key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }]}
                xKey="month" height={200}
              />
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">{isTrainer ? 'Earnings Growth' : 'Spending Growth'}</h2>
              <p className="text-xs text-zinc-400 mb-4">This month vs last month</p>
              <LineSeries
                data={[
                  { day: 'W1', thisMonth: 8500,  lastMonth: 6000 },
                  { day: 'W2', thisMonth: 14000, lastMonth: 9500 },
                  { day: 'W3', thisMonth: 21000, lastMonth: 15000 },
                  { day: 'W4', thisMonth: 32000, lastMonth: 22000 },
                ]}
                lines={[{ key: 'thisMonth', label: 'This Month' }, { key: 'lastMonth', label: 'Last Month' }]}
                xKey="day" height={200}
              />
            </div>
          </div>

          {/* Monthly Goals + Platform Pulse — 2 col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Monthly Goals</h3>
              <div className="space-y-4">
                {(isTrainer ? [
                  { label: 'Sessions Target', current: trainerStats?.completedSessions ?? 12, goal: 20, color: '#192C67' },
                  { label: 'Earnings (KES)', current: Math.round((trainerStats?.totalEarned ?? 55000) / 1000), goal: 100, unit: 'K', color: '#F77B0F' },
                  { label: 'Rating Goal', current: Math.round(Number(trainerStats?.averageRating ?? 4.2) * 10), goal: 50, color: '#10B981' },
                ] : [
                  { label: 'Bookings Target', current: clientStats?.completedSessions ?? 5, goal: 10, color: '#192C67' },
                  { label: 'Budget Used (KES)', current: Math.round((clientStats?.totalSpent ?? 18000) / 1000), goal: 50, unit: 'K', color: '#F77B0F' },
                  { label: 'Trainers Tried', current: 2, goal: 5, color: '#10B981' },
                ]).map((g) => {
                  const pct = Math.min(100, Math.round((g.current / g.goal) * 100));
                  return (
                    <div key={g.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{g.label}</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">{g.current}{g.unit ?? ''} / {g.goal}{g.unit ?? ''}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-700">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 text-right">{pct}% complete</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Platform Pulse</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Active Trainers', value: '1,240' },
                  { label: 'Sessions This Week', value: '3,890' },
                  { label: 'Avg Session Rating', value: '4.7 ★' },
                  { label: 'Cities Covered', value: '12' },
                ].map((s) => (
                  <div key={s.label} className="border border-zinc-100 dark:border-white/8 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">{s.label}</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Reviews — trainers only, full width */}
          {isTrainer && recentReviews.length > 0 && (
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Reviews</h3>
                <Link href="/reviews" className="text-xs text-[#192C67] dark:text-blue-400 hover:underline font-medium">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentReviews.slice(0, 4).map((review) => (
                  <div key={review.id} className="pb-4 border-b border-zinc-100 dark:border-zinc-700 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      {review.reviewer && <Avatar src={review.reviewer.avatarUrl ?? review.reviewer.avatar} firstName={review.reviewer.firstName} lastName={review.reviewer.lastName} size="sm" />}
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Client'}</span>
                      <span className="text-xs text-zinc-400 ml-auto">{formatRelative(review.createdAt)}</span>
                    </div>
                    <RatingStars rating={review.rating} size="sm" />
                    {review.comment && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Trainers — clients only, full width 3-col grid (no orphaned columns) */}
          {!isTrainer && favoriteTrainers.length > 0 && (
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white">Top Trainers</h3>
                <Link href="/trainers" className="text-xs text-[#192C67] dark:text-blue-400 hover:underline font-medium">Browse All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {favoriteTrainers.slice(0, 6).map((trainer, i) => {
                  const initials = `${trainer.firstName[0] ?? ''}${trainer.lastName[0] ?? ''}`.toUpperCase();
                  return (
                    <Link key={trainer.id} href={`/trainers/${trainer.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:border-[#192C67] transition-colors">
                      <span className="text-xs font-bold text-zinc-300 dark:text-zinc-600 w-4">#{i + 1}</span>
                      {trainer.avatarUrl ? (
                        <img src={trainer.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#192C67]/10 text-xs font-bold text-[#192C67]">{initials}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{trainer.firstName} {trainer.lastName}</p>
                        {trainer.specialization && <p className="text-[10px] text-zinc-400 truncate">{trainer.specialization}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{Number(trainer.rating || 0).toFixed(1)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="bg-white dark:bg-[#0d1325] rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Recent Activity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0',
                      activity.type === 'BOOKING' ? 'bg-[#192C67]' :
                      activity.type === 'PAYMENT' ? 'bg-green-500' :
                      activity.type === 'REVIEW' ? 'bg-amber-500' : 'bg-zinc-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{activity.message}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{formatRelative(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
