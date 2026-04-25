'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

/* ─── Types ─── */

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays?: number;
  billingCycle?: string;
  features: string[] | string;
  maxBookings?: number | null;
  maxTeamMembers?: number | null;
  commissionRate?: number | null;
  trainerType?: string | null;
  isActive?: boolean;
  isGlobal?: boolean;
  orgId?: string | null;
}

interface SubscriptionInfo {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  autoRenew?: boolean;
  plan?: SubscriptionPlan;
  createdAt?: string;
}

interface SubscriptionResponse {
  subscription: SubscriptionInfo | null;
  message?: string;
}

/* ─── Helpers ─── */

function parseFeatures(features: string[] | string | unknown): string[] {
  if (Array.isArray(features)) return features.map(String);
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return features.trim() ? [features] : [];
    }
  }
  if (features && typeof features === 'object') {
    return Object.values(features as Record<string, unknown>).map(String);
  }
  return [];
}

function getStatusColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' };
    case 'CANCELLED':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' };
    case 'EXPIRED':
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-600', dot: 'bg-gray-500' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-600', dot: 'bg-gray-400' };
  }
}

function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPlanTier(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('basic') || lower.includes('free')) return 0;
  if (lower.includes('professional') || lower.includes('pro')) return 1;
  if (lower.includes('enterprise') || lower.includes('premium')) return 2;
  return 1;
}

function getPlanIcon(name: string): React.ReactNode {
  const tier = getPlanTier(name);
  if (tier === 0) {
    return (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    );
  }
  if (tier === 1) {
    return (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function getBillingLabel(plan: SubscriptionPlan): string {
  if (plan.billingCycle === 'quarterly') return '/quarter';
  if (plan.billingCycle === 'yearly') return '/year';
  if (plan.billingCycle === 'custom' && plan.durationDays) return `/${plan.durationDays} days`;
  if (plan.durationDays) {
    if (plan.durationDays <= 31) return '/mo';
    if (plan.durationDays <= 92) return '/quarter';
    if (plan.durationDays <= 366) return '/year';
    return `/${plan.durationDays} days`;
  }
  return '/mo';
}

/* ─── Fallback plans ─── */

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic-fallback',
    name: 'Basic',
    description: 'Essential features for getting started',
    price: 0,
    currency: 'KES',
    durationDays: 30,
    billingCycle: 'monthly',
    features: ['Profile listing', 'Up to 10 bookings/month', 'Basic support', 'Standard visibility'],
    isActive: true,
  },
  {
    id: 'professional-fallback',
    name: 'Professional',
    description: 'Best for active trainers and consultants',
    price: 2500,
    currency: 'KES',
    durationDays: 30,
    billingCycle: 'monthly',
    features: ['Featured listing', 'Unlimited bookings', 'Priority support', 'Analytics dashboard', 'Verified badge', 'Custom profile URL'],
    isActive: true,
  },
  {
    id: 'enterprise-fallback',
    name: 'Enterprise',
    description: 'For training organizations and firms',
    price: 7500,
    currency: 'KES',
    durationDays: 30,
    billingCycle: 'monthly',
    features: ['Everything in Professional', 'Team management', 'Department routing', 'API access', 'Dedicated account manager', 'Bulk discounts', 'White-label option'],
    isActive: true,
  },
];

/* ─── Main Page ─── */

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [togglingRenew, setTogglingRenew] = useState(false);
  const [billingFilter, setBillingFilter] = useState<string>('all');
  const [billingToggle, setBillingToggle] = useState<'monthly' | 'annual'>('monthly');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === 'TRAINER') {
        try {
          const profile = await apiGet<{ trainerType?: string }>('/trainers/me/profile');
          if (profile?.trainerType) params.set('trainerType', profile.trainerType);
        } catch { /* non-critical */ }
      }

      const [plansResult, subResult] = await Promise.allSettled([
        apiGet<SubscriptionPlan[]>(`/subscriptions/plans${params.toString() ? `?${params.toString()}` : ''}`),
        apiGet<SubscriptionResponse | SubscriptionInfo>('/subscriptions/me'),
      ]);

      if (plansResult.status === 'fulfilled') {
        const rawPlans = Array.isArray(plansResult.value) ? plansResult.value : [];
        setPlans(rawPlans.length > 0 ? rawPlans : FALLBACK_PLANS);
      } else {
        setPlans(FALLBACK_PLANS);
      }

      if (subResult.status === 'fulfilled') {
        const data = subResult.value;
        if (data && typeof data === 'object' && 'subscription' in data) {
          setCurrentSub((data as SubscriptionResponse).subscription);
        } else if (data && typeof data === 'object' && 'id' in data && 'status' in data) {
          setCurrentSub(data as SubscriptionInfo);
        } else {
          setCurrentSub(null);
        }
      }
    } catch {
      setPlans(FALLBACK_PLANS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Subscribe handler ─── */
  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const result = await apiPost<SubscriptionInfo | SubscriptionResponse>('/subscriptions/subscribe', { planId });
      if (result && typeof result === 'object' && 'subscription' in result) {
        setCurrentSub((result as SubscriptionResponse).subscription);
      } else if (result && typeof result === 'object' && 'id' in result) {
        setCurrentSub(result as SubscriptionInfo);
      }
      addToast('success', 'Subscription activated successfully!');
      await fetchData();
    } catch {
      addToast('error', 'Failed to subscribe. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  /* ─── Auto-renew toggle ─── */
  const handleToggleAutoRenew = async () => {
    setTogglingRenew(true);
    try {
      const result = await apiPatch<SubscriptionInfo>('/subscriptions/me/auto-renew');
      setCurrentSub((prev) => prev ? { ...prev, autoRenew: result.autoRenew } : prev);
      addToast('success', `Auto-renew turned ${result.autoRenew ? 'on' : 'off'}`);
    } catch {
      addToast('error', 'Failed to update auto-renew setting');
    } finally {
      setTogglingRenew(false);
    }
  };

  /* ─── Cancel handler ─── */
  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiPost('/subscriptions/cancel', {});
      setCurrentSub(null);
      addToast('success', 'Subscription cancelled. You will retain access until the end of your billing period.');
      setShowCancel(false);
      await fetchData();
    } catch {
      addToast('error', 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  /* ─── Determine if a plan is the current one ─── */
  const isCurrentPlan = (plan: SubscriptionPlan): boolean => {
    if (!currentSub || currentSub.status !== 'ACTIVE') return false;
    return currentSub.planId === plan.id ||
      currentSub.plan?.id === plan.id ||
      currentSub.plan?.name?.toLowerCase() === plan.name.toLowerCase();
  };

  /* ─── Determine recommended plan ─── */
  const isRecommended = (plan: SubscriptionPlan): boolean => {
    const tier = getPlanTier(plan.name);
    return tier === 1;
  };

  /* ─── Loading ─── */
  if (loading) return <PageSkeleton />;

  /* ─── Role gate: this page is for trainers only ─── */
  if (user && user.role !== 'TRAINER') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">For Trainers Only</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Subscription plans are designed for trainers who list their services on SkillSasa.
            As a learner, your sessions are managed through your bookings.
          </p>
          <a
            href="/bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#192C67] text-white font-semibold text-sm hover:bg-[#162d4a] transition-colors"
          >
            View My Bookings
          </a>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.isActive !== false);

  const filteredPlans = billingFilter === 'all'
    ? activePlans
    : activePlans.filter((p) => (p.billingCycle || 'monthly') === billingFilter);

  const orgPlans = filteredPlans.filter((p) => p.orgId && !p.isGlobal);
  const globalPlans = filteredPlans.filter((p) => !p.orgId || p.isGlobal);

  return (
    <div className="min-h-screen pb-20">

      {/* ─── Hero ─── */}
      <div className="relative h-52 sm:h-60 overflow-hidden">
        <img
          src="/images/settings-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-sm text-white/75 mt-1">Manage your plan and unlock premium features for your training business.</p>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Current Plan Card ─── */}
        {currentSub ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Current Plan</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {currentSub.plan?.name || 'Active Subscription'}
                </h2>
                {currentSub.plan?.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentSub.plan.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {(() => {
                  const colors = getStatusColor(currentSub.status);
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', colors.bg, colors.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot, currentSub.status === 'ACTIVE' && 'animate-pulse')} />
                      {String(currentSub.status || '')}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Details row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Start Date</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{formatDate(currentSub.startDate)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">End Date</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{formatDate(currentSub.endDate)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Days Remaining</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {currentSub.status === 'ACTIVE' ? `${daysRemaining(currentSub.endDate)} days` : '--'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Billing Cycle</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5 capitalize">
                  {currentSub.plan?.billingCycle || 'Monthly'}
                </p>
              </div>
            </div>

            {/* Plan details: commission rate, limits */}
            {currentSub.plan && (currentSub.plan.commissionRate != null || currentSub.plan.maxBookings != null || currentSub.plan.maxTeamMembers != null) && (
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {currentSub.plan.commissionRate != null && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-500">Commission:</span>
                    <span className="font-medium">{(Number(currentSub.plan.commissionRate) * 100).toFixed(1)}%</span>
                  </span>
                )}
                {currentSub.plan.maxBookings != null && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <span className="text-gray-500">Max Bookings:</span>
                    <span className="font-medium">{currentSub.plan.maxBookings}</span>
                  </span>
                )}
                {currentSub.plan.maxTeamMembers != null && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <span className="text-gray-500">Team Limit:</span>
                    <span className="font-medium">{currentSub.plan.maxTeamMembers}</span>
                  </span>
                )}
              </div>
            )}

            {/* Auto-renew toggle + cancel */}
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <button
                onClick={handleToggleAutoRenew}
                disabled={togglingRenew || currentSub.status !== 'ACTIVE'}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {togglingRenew ? (
                  <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                    currentSub.autoRenew ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}>
                    <span className={cn(
                      'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                      currentSub.autoRenew ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Auto-renew
                  <span className={cn('ml-1.5 text-xs font-bold', currentSub.autoRenew ? 'text-green-600 dark:text-green-400' : 'text-gray-400')}>
                    {currentSub.autoRenew ? 'ON' : 'OFF'}
                  </span>
                </span>
              </button>

              {currentSub.status === 'ACTIVE' && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="px-5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Active Subscription</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Choose a plan below to unlock premium features, boost your visibility, and grow your training business.
            </p>
          </div>
        )}

        {/* ─── Billing Cycle Filter ─── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Available Plans</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select the perfect plan for your training business</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Monthly / Annual toggle */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => { setBillingToggle('monthly'); setBillingFilter('monthly'); }}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors', billingToggle === 'monthly' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}
                >Monthly</button>
                <button
                  onClick={() => { setBillingToggle('annual'); setBillingFilter('yearly'); }}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1', billingToggle === 'annual' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}
                >
                  Annual
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-bold">2 mo free</span>
                </button>
              </div>

              {/* Billing cycle granular filter */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBillingFilter(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      billingFilter === opt.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button onClick={() => setViewMode('cards')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Org-Exclusive Plans ─── */}
        {orgPlans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Exclusive to your firm
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {orgPlans.map((plan) => renderPlanCard(plan))}
            </div>
          </div>
        )}

        {/* ─── Global Plans ─── */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {globalPlans.map((plan) => renderPlanCard(plan))}
          </div>
        ) : (
          /* ─── Comparison Table ─── */
          <div className="mb-12 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-5 py-4 text-left font-semibold text-gray-700 dark:text-gray-300 w-48">Feature</th>
                  {globalPlans.map((plan) => (
                    <th key={plan.id} className={cn('px-5 py-4 text-center font-semibold', isCurrentPlan(plan) ? 'text-[#192C67] dark:text-[#5b8bc7]' : 'text-gray-700 dark:text-gray-300')}>
                      <div>{plan.name}</div>
                      <div className={cn('text-base font-bold mt-1', isCurrentPlan(plan) ? 'text-[#192C67] dark:text-[#5b8bc7]' : 'text-gray-900 dark:text-white')}>
                        {plan.price === 0 ? 'Free' : `${plan.currency || 'KES'} ${plan.price.toLocaleString('en-KE')}`}
                        {plan.price > 0 && <span className="text-xs font-normal text-gray-500">{getBillingLabel(plan)}</span>}
                      </div>
                      {isCurrentPlan(plan) && <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#192C67] text-white text-[9px] font-bold">Current</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 font-medium">Commission Rate</td>
                  {globalPlans.map((plan) => (
                    <td key={plan.id} className={cn('px-5 py-3 text-center', isCurrentPlan(plan) ? 'bg-[#192C67]/5 dark:bg-[#192C67]/10' : '')}>
                      {plan.commissionRate != null ? <span className="text-green-600 dark:text-green-400 font-semibold">{(Number(plan.commissionRate) * 100).toFixed(0)}%</span> : <span className="text-gray-400">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 font-medium">Monthly Bookings</td>
                  {globalPlans.map((plan) => (
                    <td key={plan.id} className={cn('px-5 py-3 text-center', isCurrentPlan(plan) ? 'bg-[#192C67]/5 dark:bg-[#192C67]/10' : '')}>
                      {plan.maxBookings != null ? <span className="font-semibold text-gray-900 dark:text-white">{plan.maxBookings}</span> : <span className="text-[#0D9488] font-semibold">Unlimited</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 font-medium">Team Members</td>
                  {globalPlans.map((plan) => (
                    <td key={plan.id} className={cn('px-5 py-3 text-center', isCurrentPlan(plan) ? 'bg-[#192C67]/5 dark:bg-[#192C67]/10' : '')}>
                      {plan.maxTeamMembers != null ? <span className="font-semibold text-gray-900 dark:text-white">{plan.maxTeamMembers}</span> : <span className="text-gray-400">—</span>}
                    </td>
                  ))}
                </tr>
                {(() => {
                  const allFeatures = Array.from(new Set(globalPlans.flatMap((p) => parseFeatures(p.features))));
                  return allFeatures.map((feat, fi) => (
                    <tr key={fi} className={cn('border-t border-gray-100 dark:border-gray-800', fi % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/30' : '')}>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{feat}</td>
                      {globalPlans.map((plan) => {
                        const planFeats = parseFeatures(plan.features);
                        const hasIt = planFeats.includes(feat);
                        return (
                          <td key={plan.id} className={cn('px-5 py-3 text-center', isCurrentPlan(plan) ? 'bg-[#192C67]/5 dark:bg-[#192C67]/10' : '')}>
                            {hasIt ? (
                              <svg className="w-4 h-4 text-[#0D9488] mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-5 py-4" />
                  {globalPlans.map((plan) => (
                    <td key={plan.id} className={cn('px-5 py-4 text-center', isCurrentPlan(plan) ? 'bg-[#192C67]/5 dark:bg-[#192C67]/10' : '')}>
                      {isCurrentPlan(plan) ? (
                        <span className="px-4 py-2 rounded-lg bg-[#192C67] text-white text-xs font-bold">Current Plan</span>
                      ) : (
                        <button onClick={() => handleSubscribe(plan.id)} disabled={!!subscribing} className="px-4 py-2 rounded-lg bg-[#192C67] text-white text-xs font-bold hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                          {subscribing === plan.id ? 'Subscribing...' : plan.price === 0 ? 'Get Started' : 'Upgrade'}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {filteredPlans.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No plans available for the selected billing cycle.
          </div>
        )}

        {/* ─── Subscription History ─── */}
        {currentSub && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Subscription History
            </h3>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Plan</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Period</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Billing</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {currentSub.plan?.name || 'Subscription'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const colors = getStatusColor(currentSub.status);
                        return (
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', colors.bg, colors.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
                            {String(currentSub.status || '')}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(currentSub.startDate)} - {formatDate(currentSub.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">
                      {currentSub.plan?.billingCycle || 'Monthly'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {currentSub.plan?.price !== undefined
                        ? formatCurrency(currentSub.plan.price as number, (currentSub.plan.currency as string) || 'KES')
                        : '--'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── FAQ Section ─── */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Can I switch plans anytime?</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">What happens when I cancel?</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                You will retain access to premium features until the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">How do I pay?</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Payments are processed via M-Pesa or your SkillSasa wallet balance. You will receive a confirmation upon successful payment.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">What about commission rates?</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Some plans include reduced commission rates on bookings. The commission rate is shown on each plan card.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Cancel Confirmation Dialog ─── */}
      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will retain access to premium features until the end of your current billing period."
        confirmText="Yes, Cancel Subscription"
        variant="warning"
        isLoading={cancelling}
      />

    </div>
  );

  /* ─── Plan Card Renderer ─── */
  function renderPlanCard(plan: SubscriptionPlan) {
    const features = parseFeatures(plan.features);
    const recommended = isRecommended(plan);
    const current = isCurrentPlan(plan);
    const tier = getPlanTier(plan.name);
    const isFree = plan.price === 0;
    const billingLabel = getBillingLabel(plan);
    const isOrgExclusive = plan.orgId && !plan.isGlobal;

    return (
      <div
        key={plan.id}
        className={cn(
          'relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all hover:shadow-lg',
          recommended && !current
            ? 'border-[#F77B0F] shadow-md shadow-orange-100 dark:shadow-orange-900/20'
            : current
              ? 'border-[#192C67] shadow-md shadow-blue-100 dark:shadow-blue-900/20'
              : 'border-gray-200 dark:border-gray-700',
        )}
      >
        {/* Recommended badge */}
        {recommended && !current && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1 px-4 py-1 bg-[#F77B0F] text-white text-xs font-bold rounded-full shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              RECOMMENDED
            </span>
          </div>
        )}

        {/* Current plan badge */}
        {current && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1 px-4 py-1 bg-[#192C67] text-white text-xs font-bold rounded-full shadow-sm">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              CURRENT PLAN
            </span>
          </div>
        )}

        <div className="p-6 sm:p-8 flex flex-col flex-1">
          {/* Plan icon + name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {getPlanIcon(plan.name)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{String(plan.name || '')}</h3>
              {plan.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{String(plan.description || '')}</p>
              )}
            </div>
          </div>

          {/* Badges: trainer type, org exclusive */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {plan.trainerType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {String(plan.trainerType || '')}
              </span>
            )}
            {isOrgExclusive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Exclusive to your firm
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mb-4">
            {isFree ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">Free</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{plan.currency || 'KES'}</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {plan.price.toLocaleString('en-KE')}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{billingLabel}</span>
              </div>
            )}
          </div>

          {/* Plan details: limits & commission */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
            {plan.maxBookings != null && (
              <span>Up to {plan.maxBookings} bookings</span>
            )}
            {plan.maxTeamMembers != null && (
              <span>Up to {plan.maxTeamMembers} team members</span>
            )}
            {plan.commissionRate != null && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {(Number(plan.commissionRate) * 100).toFixed(0)}% commission
              </span>
            )}
          </div>

          {/* Features list */}
          <ul className="space-y-3 mb-8 flex-1">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Action button */}
          <button
            onClick={() => !current && handleSubscribe(plan.id)}
            disabled={current || subscribing === plan.id}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:cursor-not-allowed',
              current
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                : recommended
                  ? 'bg-[#F77B0F] text-white hover:bg-[#e06a00] shadow-sm disabled:opacity-60'
                  : tier === 2
                    ? 'bg-[#192C67] text-white hover:bg-[#162d4a] shadow-sm disabled:opacity-60'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60'
            )}
          >
            {subscribing === plan.id ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : current ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Current Plan
              </span>
            ) : currentSub?.status === 'ACTIVE' ? (
              `Change to ${String(plan.name || '')}`
            ) : isFree ? (
              'Get Started Free'
            ) : (
              `Subscribe for ${formatCurrency(plan.price, plan.currency || 'KES')}`
            )}
          </button>
        </div>
      </div>
    );
  }
}
