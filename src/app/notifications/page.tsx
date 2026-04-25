'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { Notification } from '@/lib/types';
import { formatRelative, cn } from '@/lib/utils';

/* ─── Filter tabs ─── */
type FilterTab = 'ALL' | 'BOOKING' | 'PAYMENT' | 'REVIEW' | 'SYSTEM' | 'MESSAGE' | 'FOLLOW' | 'COURSE';

const FILTER_TABS: { label: string; value: FilterTab; icon: string }[] = [
  {
    label: 'All',
    value: 'ALL',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  {
    label: 'Bookings',
    value: 'BOOKING',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    label: 'Payments',
    value: 'PAYMENT',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    label: 'Reviews',
    value: 'REVIEW',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    label: 'System',
    value: 'SYSTEM',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Messages',
    value: 'MESSAGE',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    label: 'People',
    value: 'FOLLOW',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    label: 'Courses',
    value: 'COURSE',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
];

/* ─── Type‑specific icon SVG paths ─── */
const TYPE_ICONS: Record<string, string> = {
  BOOKING:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  PAYMENT:
    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  REVIEW:
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  SYSTEM:
    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  MESSAGE:
    'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  FOLLOW:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  COURSE:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  DEFAULT:
    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
};

/* ─── Type‑specific accent colors (light / dark) ─── */
const TYPE_COLORS: Record<string, { bg: string; bgDark: string; text: string; textDark: string; iconBg: string; iconBgDark: string }> = {
  BOOKING: {
    bg: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/10',
    text: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    iconBg: 'bg-blue-100',
    iconBgDark: 'dark:bg-blue-900/30',
  },
  PAYMENT: {
    bg: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-900/10',
    text: 'text-emerald-600',
    textDark: 'dark:text-emerald-400',
    iconBg: 'bg-emerald-100',
    iconBgDark: 'dark:bg-emerald-900/30',
  },
  REVIEW: {
    bg: 'bg-amber-50',
    bgDark: 'dark:bg-amber-900/10',
    text: 'text-amber-600',
    textDark: 'dark:text-amber-400',
    iconBg: 'bg-amber-100',
    iconBgDark: 'dark:bg-amber-900/30',
  },
  SYSTEM: {
    bg: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/10',
    text: 'text-purple-600',
    textDark: 'dark:text-purple-400',
    iconBg: 'bg-purple-100',
    iconBgDark: 'dark:bg-purple-900/30',
  },
  MESSAGE: {
    bg: 'bg-teal-50',
    bgDark: 'dark:bg-teal-900/10',
    text: 'text-teal-600',
    textDark: 'dark:text-teal-400',
    iconBg: 'bg-teal-100',
    iconBgDark: 'dark:bg-teal-900/30',
  },
  FOLLOW: {
    bg: 'bg-pink-50',
    bgDark: 'dark:bg-pink-900/10',
    text: 'text-pink-600',
    textDark: 'dark:text-pink-400',
    iconBg: 'bg-pink-100',
    iconBgDark: 'dark:bg-pink-900/30',
  },
  COURSE: {
    bg: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/10',
    text: 'text-[#F77B0F]',
    textDark: 'dark:text-orange-400',
    iconBg: 'bg-orange-100',
    iconBgDark: 'dark:bg-orange-900/30',
  },
  OTHER: {
    bg: 'bg-gray-50',
    bgDark: 'dark:bg-gray-800/50',
    text: 'text-gray-600',
    textDark: 'dark:text-gray-400',
    iconBg: 'bg-gray-100',
    iconBgDark: 'dark:bg-gray-700',
  },
};

/* ─── Channel badge config ─── */
const CHANNEL_CONFIG: Record<string, { label: string; class: string }> = {
  EMAIL: { label: 'Email', class: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  SMS: { label: 'SMS', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  PUSH: { label: 'Push', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  IN_APP: { label: 'In-App', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

/* ─── Helpers ─── */
function getTypeCategory(type: string | undefined): string {
  const t = (type ?? '').toUpperCase();
  if (t.includes('BOOKING') || t.includes('SESSION') || t.includes('SCHEDULE')) return 'BOOKING';
  if (t.includes('PAY') || t.includes('WALLET') || t.includes('DEPOSIT') || t.includes('WITHDRAW') || t.includes('ESCROW')) return 'PAYMENT';
  if (t.includes('REVIEW') || t.includes('RATING')) return 'REVIEW';
  if (t.includes('SYSTEM') || t.includes('ALERT') || t.includes('ACCOUNT')) return 'SYSTEM';
  if (t.includes('MESSAGE') || t.includes('CHAT') || t.includes('CONVERSATION')) return 'MESSAGE';
  if (t.includes('FOLLOW') || t.includes('SUBSCRIBER')) return 'FOLLOW';
  if (t.includes('COURSE') || t.includes('LESSON') || t.includes('ENROL')) return 'COURSE';
  return 'OTHER';
}

function getIconPath(type: string | undefined): string {
  const cat = getTypeCategory(type);
  return TYPE_ICONS[cat] || TYPE_ICONS.DEFAULT;
}

function getTypeColors(type: string | undefined) {
  const cat = getTypeCategory(type);
  return TYPE_COLORS[cat] || TYPE_COLORS.OTHER;
}

function isNotifRead(n: Notification): boolean {
  return !!(n.read || (n as any).isRead || (n as any).status === 'READ' || (n as any).readAt != null);
}

interface DateGroup {
  label: string;
  items: Notification[];
}

function groupByDate(items: Notification[]): DateGroup[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const buckets: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  for (const n of items) {
    const d = new Date(n.createdAt);
    const ds = d.toDateString();
    if (ds === todayStr) buckets['Today'].push(n);
    else if (ds === yesterdayStr) buckets['Yesterday'].push(n);
    else if (d >= weekAgo) buckets['This Week'].push(n);
    else buckets['Earlier'].push(n);
  }

  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function tabEmptyTitle(tab: FilterTab): string {
  switch (tab) {
    case 'BOOKING': return 'No booking notifications';
    case 'PAYMENT': return 'No payment notifications';
    case 'REVIEW': return 'No review notifications';
    case 'SYSTEM': return 'No system notifications';
    case 'MESSAGE': return 'No message notifications';
    default: return 'No notifications yet';
  }
}

function tabEmptyDesc(tab: FilterTab): string {
  switch (tab) {
    case 'BOOKING': return 'You will be notified when bookings are created, confirmed, or updated.';
    case 'PAYMENT': return 'You will be notified when payments are processed, deposits land, or withdrawals complete.';
    case 'REVIEW': return 'You will be notified when someone leaves a review or rates your session.';
    case 'SYSTEM': return 'System alerts and account notifications will appear here.';
    case 'MESSAGE': return 'You will be notified when you receive new messages.';
    default: return 'You will be notified when bookings are made, payments processed, and reviews submitted.';
  }
}

function tabEmptyIcon(tab: FilterTab): string {
  const t = FILTER_TABS.find((f) => f.value === tab);
  return t?.icon || TYPE_ICONS.DEFAULT;
}

const LIMIT = 20;

/* ─── Page Component ─── */
export default function NotificationsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  /* Map raw API notification to our shape */
  const mapNotification = useCallback((n: any): Notification => ({
    ...n,
    type: n.type ?? n.channel ?? '',
    read: !!(n.read || n.isRead || n.status === 'READ' || n.readAt != null),
    body: n.body ?? n.message,
    channel: n.channel,
    status: n.status,
    metadata: n.metadata,
    sentAt: n.sentAt,
    readAt: n.readAt,
  }), []);

  /* Fetch page 1 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<any>('/notifications', { params: { page: 1, limit: LIMIT } });
        let items: Notification[] = [];
        let totalCount = 0;
        if (Array.isArray(data)) {
          items = data.map(mapNotification);
          totalCount = items.length;
        } else if (data && typeof data === 'object') {
          const rawItems = data.items ?? data.results ?? [];
          items = (Array.isArray(rawItems) ? rawItems : []).map(mapNotification);
          totalCount = data.total ?? items.length;
        }
        if (!cancelled) {
          setNotifications(items);
          setTotal(totalCount);
          setPage(1);
        }
      } catch {
        if (!cancelled) addToast('error', 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [addToast, mapNotification]);

  /* Load more */
  const hasMore = page * LIMIT < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await apiGet<any>('/notifications', { params: { page: nextPage, limit: LIMIT } });
      const rawItems = data?.items ?? data?.results ?? (Array.isArray(data) ? data : []);
      const newItems: Notification[] = (Array.isArray(rawItems) ? rawItems : []).map(mapNotification);
      setNotifications((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      if (data?.total != null) setTotal(data.total);
    } catch {
      addToast('error', 'Failed to load more notifications');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, mapNotification, addToast]);

  /* Mark single as read */
  const handleRead = useCallback(async (n: Notification) => {
    if (!isNotifRead(n)) {
      setNotifications((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read: true, isRead: true, status: 'READ' as const, readAt: new Date().toISOString() } : x,
        ),
      );
      try {
        await apiPatch(`/notifications/${n.id}/read`);
      } catch { /* best-effort */ }
    }
    // Navigate if notification has a link
    if (n.link) {
      router.push(n.link);
    } else if (n.metadata && typeof n.metadata === 'object') {
      const meta = n.metadata as Record<string, any>;
      if (meta.bookingId) router.push(`/bookings/${meta.bookingId}`);
      else if (meta.transactionId) router.push(`/wallet`);
      else if (meta.reviewId) router.push(`/reviews`);
    }
  }, [router]);

  /* Mark all as read */
  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, isRead: true, status: 'READ' as const, readAt: new Date().toISOString() })),
    );
    try {
      await apiPatch('/notifications/read-all');
      addToast('success', 'All notifications marked as read');
    } catch {
      addToast('error', 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  }, [addToast]);

  /* Filtered + grouped */
  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    return notifications.filter((n) => getTypeCategory(n.type) === activeTab);
  }, [notifications, activeTab]);

  const grouped = useMemo(() => groupByDate(filteredItems), [filteredItems]);
  const unreadCount = useMemo(() => notifications.filter((n) => !isNotifRead(n)).length, [notifications]);

  /* Tab unread counts */
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { ALL: 0, BOOKING: 0, PAYMENT: 0, REVIEW: 0, SYSTEM: 0, MESSAGE: 0, FOLLOW: 0, COURSE: 0 };
    for (const n of notifications) {
      if (!isNotifRead(n)) {
        counts.ALL++;
        const cat = getTypeCategory(n.type) as FilterTab;
        if (cat in counts) counts[cat]++;
      }
    }
    return counts;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ─── Hero Header ─── */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/notifications-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS.DEFAULT} />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
                  {unreadCount > 0 && (
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#F77B0F] px-2 text-xs font-bold text-white shadow">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-0.5">
                  {loading
                    ? 'Loading...'
                    : unreadCount > 0
                      ? `${unreadCount} unread`
                      : total > 0
                        ? `${total} total · all read`
                        : 'Nothing yet'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {markingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide py-3">
            {FILTER_TABS.map(({ label, value, icon }) => {
              const isActive = activeTab === value;
              const count = tabCounts[value];
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-[#192C67] text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100',
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      'flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold',
                      isActive ? 'bg-[#F77B0F] text-white' : 'bg-red-500 text-white',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-10 h-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tabEmptyIcon(activeTab)} />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-2">{tabEmptyTitle(activeTab)}</h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">{tabEmptyDesc(activeTab)}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ label, items: group }) => (
              <div key={label}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  <span className="text-[10px] font-medium text-zinc-300 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {group.length}
                  </span>
                </div>

                {/* Notification rows */}
                <div className="space-y-2">
                  {group.map((n) => {
                    const read = isNotifRead(n);
                    const colors = getTypeColors(n.type);
                    const hasLink = !!(n.link || (n.metadata && typeof n.metadata === 'object' && (
                      (n.metadata as any).bookingId || (n.metadata as any).transactionId || (n.metadata as any).reviewId
                    )));

                    return (
                      <button
                        key={n.id}
                        onClick={() => handleRead(n)}
                        className={cn(
                          'w-full text-left flex items-start gap-3.5 p-4 rounded-2xl transition-all duration-150 group relative overflow-hidden',
                          read
                            ? 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                            : cn('bg-white dark:bg-zinc-900 border-l-[3px] border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm', colors.text.replace('text-', 'border-l-')),
                        )}
                        style={!read ? { borderLeftColor: 'var(--notif-accent, #192C67)' } : undefined}
                      >
                        {/* Unread accent glow */}
                        {!read && (
                          <span className={cn('absolute inset-0 opacity-[0.03]', colors.bg, colors.bgDark)} aria-hidden />
                        )}

                        {/* Icon */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                          read ? 'bg-zinc-100 dark:bg-zinc-800' : cn(colors.iconBg, colors.iconBgDark),
                        )}>
                          <svg
                            className={cn('w-5 h-5', read ? 'text-zinc-400 dark:text-zinc-500' : cn(colors.text, colors.textDark))}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d={getIconPath(n.type)} />
                          </svg>
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!read && (
                                <span className="w-2 h-2 flex-shrink-0 rounded-full bg-[#F77B0F]" />
                              )}
                              <p className={cn(
                                'text-sm leading-snug truncate',
                                read ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-50 font-semibold',
                              )}>
                                {n.title}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap pt-px">
                              {formatRelative(n.sentAt || n.createdAt)}
                            </span>
                          </div>

                          {(n.body || n.message) && (
                            <p className={cn(
                              'mt-1 text-[13px] leading-relaxed line-clamp-2',
                              read ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400',
                            )}>
                              {n.body ?? n.message}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              read
                                ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                                : cn(colors.iconBg, colors.text, colors.iconBgDark, colors.textDark),
                            )}>
                              {n.type?.replace(/_/g, ' ')}
                            </span>
                            {hasLink && (
                              <span className="ml-auto text-[11px] text-[#192C67] dark:text-primary-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                View
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Load More ─── */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  Load more
                  <span className="text-xs text-zinc-400">({filteredItems.length} of {total})</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── Settings footer ─── */}
        {!loading && total > 0 && (
          <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-center">
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage notification preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
