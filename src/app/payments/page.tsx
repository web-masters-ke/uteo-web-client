'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { financialService } from '@/lib/services/financial';
import { apiGet, extractItems } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';
import { LineTrend, DonutBreakdown } from '@/components/Charts';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

/* ─── Tab types ────────────────────────────────────────────────────────────── */

type Tab = 'overview' | 'transactions' | 'invoices';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'transactions', label: 'Transaction History' },
  { key: 'invoices', label: 'Invoices' },
];

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
];

/* ─── Status badges ────────────────────────────────────────────────────────── */

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    VOID: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    REFUNDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
};

/* ─── Settlement status indicator ──────────────────────────────────────────── */

function SettlementStatus({ status }: { status: string }) {
  const settled = ['SUCCESS', 'COMPLETED', 'PAID'].includes(status);
  const failed = ['FAILED', 'VOID'].includes(status);
  const refunded = status === 'REFUNDED';
  const pending = ['PENDING', 'PROCESSING', 'SENT'].includes(status);

  if (settled) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-700 dark:text-green-400 font-medium">Settled</span>
      </div>
    );
  }
  if (refunded) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">Refunded</span>
      </div>
    );
  }
  if (failed) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-700 dark:text-red-400 font-medium">Failed</span>
      </div>
    );
  }
  if (pending) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      <span className="text-xs text-gray-500 font-medium">{status}</span>
    </div>
  );
}

/* ─── Payment type icons ───────────────────────────────────────────────────── */

function PaymentTypeIcon({ type }: { type: string }) {
  const lower = type.toLowerCase();
  const iconClass = 'w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0';
  if (lower.includes('booking') || lower.includes('session')) {
    return (
      <div className={iconClass}>
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (lower.includes('course')) {
    return (
      <div className={iconClass}>
        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
    );
  }
  if (lower.includes('subscription')) {
    return (
      <div className={iconClass}>
        <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    );
  }
  if (lower.includes('deposit') || lower.includes('topup') || lower.includes('top-up')) {
    return (
      <div className={iconClass}>
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
        </svg>
      </div>
    );
  }
  if (lower.includes('withdraw')) {
    return (
      <div className={iconClass}>
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 16l4-4m-4 4l-4-4" />
        </svg>
      </div>
    );
  }
  return (
    <div className={iconClass}>
      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

/* ─── Type badge ───────────────────────────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  const lower = type.toLowerCase();
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide';
  let classes = `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;

  if (lower.includes('booking') || lower.includes('session')) {
    classes = `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`;
  } else if (lower.includes('course')) {
    classes = `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
  } else if (lower.includes('subscription')) {
    classes = `${base} bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400`;
  } else if (lower.includes('deposit') || lower.includes('topup')) {
    classes = `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`;
  } else if (lower.includes('withdraw')) {
    classes = `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`;
  } else if (lower.includes('escrow')) {
    classes = `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
  } else if (lower.includes('refund')) {
    classes = `${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`;
  }

  return <span className={classes}>{type}</span>;
}

/* ─── Infer payment type ───────────────────────────────────────────────────── */

function inferType(inv: any): string {
  if (inv.type) return inv.type;
  if (inv.metadata?.type) return inv.metadata.type;
  if (inv.bookingId) return 'Booking';
  if (inv.metadata?.courseId) return 'Course';
  if (inv.metadata?.subscriptionId) return 'Subscription';
  const desc = (inv.description || inv.notes || '').toLowerCase();
  if (desc.includes('booking') || desc.includes('session')) return 'Booking';
  if (desc.includes('course')) return 'Course';
  if (desc.includes('subscription')) return 'Subscription';
  if (desc.includes('deposit')) return 'Deposit';
  if (desc.includes('withdraw')) return 'Withdrawal';
  return 'Payment';
}

/* ─── KPI Card ─────────────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {icon && (
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', color || 'bg-gray-100 dark:bg-gray-700')}>
          {icon}
        </div>
      )}
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFeatureSettings: '"tnum"' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PaymentsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sp, inv, stats, pmts] = await Promise.all([
        financialService.mySpending(period).catch(() => null),
        financialService.myInvoices({ limit: 20, role: 'recipient' }).catch(() => []),
        financialService.myInvoicesSummary().catch(() => null),
        apiGet<any>(`/payments?page=${paymentPage}&limit=10`).catch(() => null),
      ]);
      setSpending(sp);
      setInvoices(Array.isArray(inv) ? inv : inv?.items || []);
      setInvoiceStats(stats);
      if (pmts) {
        const items = extractItems(pmts);
        setPayments(items);
        setPaymentTotalPages(pmts?.totalPages || 1);
      }
    } catch {
      addToast('error', 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [period, paymentPage, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Derived data ─────────────────────────────────────────────────────────── */

  const totalSpent = Number(spending?.totalSpent || spending?.total || 0);
  const thisMonth = Number(spending?.thisMonth || spending?.monthlySpent || 0);
  const activeSubs = Number(spending?.activeSubscriptions || spending?.subscriptions || 0);
  const outstandingInvoices = Number(invoiceStats?.outstanding || invoiceStats?.unpaid || 0);

  // Spending breakdown donut
  const spendingBreakdown: { name: string; value: number }[] = (() => {
    const arr = spending?.byTrainer || spending?.breakdown;
    if (!Array.isArray(arr)) return [];
    return arr.map((t: any) => ({
      name: t.trainer || t.name || t.label || 'Other',
      value: Number(t.amount || t.value || 0),
    }));
  })();

  // Monthly trend
  const monthlyTrend: Record<string, unknown>[] = (() => {
    const arr = spending?.trend || spending?.monthly;
    if (!Array.isArray(arr)) return [];
    return arr.map((m: any) => ({
      label: m.date || m.month || m.period || m.label || '',
      amount: Number(m.amount || m.value || m.spent || 0),
    }));
  })();

  if (loading) return <PageSkeleton />;

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
        <div className="relative h-full flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-6">
          <div className="max-w-7xl mx-auto w-full flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Payment History</h1>
              <p className="text-sm text-white/70">Track spending, transactions, and invoices across all services</p>
            </div>
            <div className="flex gap-6 sm:gap-8">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Total Spent</p>
                <p className="text-xl font-black text-white" style={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">This Month</p>
                <p className="text-xl font-black text-white" style={{ fontFeatureSettings: '"tnum"' }}>{formatCurrency(thisMonth)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-[#192C67] text-[#192C67] dark:border-[#5b8bc7] dark:text-[#5b8bc7]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── OVERVIEW TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  period === p.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Spent"
              value={formatCurrency(totalSpent)}
              sub="All-time"
              icon={
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" />
                </svg>
              }
              color="bg-gray-100 dark:bg-gray-700"
            />
            <KpiCard
              label="This Month"
              value={formatCurrency(thisMonth)}
              sub="Current period"
              icon={
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              color="bg-gray-100 dark:bg-gray-700"
            />
            <KpiCard
              label="Active Subscriptions"
              value={String(activeSubs)}
              sub="Recurring"
              icon={
                <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              color="bg-gray-100 dark:bg-gray-700"
            />
            <KpiCard
              label="Outstanding"
              value={String(outstandingInvoices)}
              sub="Unpaid invoices"
              icon={
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              color="bg-gray-100 dark:bg-gray-700"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Breakdown Donut */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Spending Breakdown</h3>
              {spendingBreakdown.length > 0 ? (
                <DonutBreakdown data={spendingBreakdown} height={260} />
              ) : (
                <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
                  No spending data for this period
                </div>
              )}
            </div>

            {/* Monthly Spending Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Spending Trend</h3>
              {monthlyTrend.length > 0 ? (
                <LineTrend data={monthlyTrend} dataKey="amount" xKey="label" height={260} />
              ) : (
                <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
                  No trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TRANSACTION HISTORY TAB ───────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {payments.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Transactions</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your payment transactions with settlement status</p>
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Payment</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Provider</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Settlement</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {payments.map((p: any, i: number) => {
                      const type = inferType(p);
                      const amt = Number(p.amount || 0);
                      const isDebit = ['Withdrawal', 'Payment', 'Booking', 'Course', 'Subscription'].includes(type);
                      return (
                        <tr key={p.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <PaymentTypeIcon type={type} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {p.metadata?.description || p.description || p.reference || p.id?.slice(0, 8)}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">{p.id?.slice(0, 12)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><TypeBadge type={type} /></td>
                          <td className={cn('px-4 py-3 text-right font-semibold', isDebit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
                            {isDebit ? '-' : '+'}{formatCurrency(amt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              p.provider === 'MPESA' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              p.provider === 'CARD' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            )}>
                              {p.provider || 'WALLET'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{statusBadge(p.status || 'PENDING')}</td>
                          <td className="px-4 py-3"><SettlementStatus status={p.status || 'PENDING'} /></td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{formatDate(p.createdAt)}</p>
                              <p className="text-[10px] text-gray-400">{formatDateTime(p.createdAt)}</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((p: any, i: number) => {
                  const type = inferType(p);
                  const amt = Number(p.amount || 0);
                  const isDebit = ['Withdrawal', 'Payment', 'Booking', 'Course', 'Subscription'].includes(type);
                  return (
                    <div key={p.id || i} className="flex items-center gap-3 px-4 py-3.5">
                      <PaymentTypeIcon type={type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {p.metadata?.description || type}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <TypeBadge type={type} />
                          <SettlementStatus status={p.status || 'PENDING'} />
                        </div>
                      </div>
                      <p className={cn('text-sm font-bold whitespace-nowrap', isDebit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
                        {isDebit ? '-' : '+'}{formatCurrency(amt)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {paymentTotalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination currentPage={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
              <EmptyState title="No transactions yet" description="Your payment transactions will appear here once you make a booking or purchase" />
            </div>
          )}
        </div>
      )}

      {/* ─── INVOICES TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice summary */}
          {invoiceStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Received</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {Number(invoiceStats?.total || invoiceStats?.count || invoiceStats?.issued || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(Number(invoiceStats?.totalAmount || invoiceStats?.issuedAmount || 0))}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Paid</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {Number(invoiceStats?.paid || invoiceStats?.paidCount || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(Number(invoiceStats?.paidAmount || 0))}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Outstanding</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {outstandingInvoices}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(Number(invoiceStats?.outstandingAmount || 0))}
                </p>
              </div>
            </div>
          )}

          {/* Invoice list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Invoices Received</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Invoices sent to you by trainers</p>
            </div>
            {invoices.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">From</th>
                        <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Settlement</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {invoices.map((inv: any, i: number) => (
                        <tr key={inv.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 font-mono text-sm text-gray-900 dark:text-white">
                            {inv.invoiceNumber || inv.id?.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                            {inv.issuer?.firstName || inv.trainerName || '--'} {inv.issuer?.lastName || ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(Number(inv.total || inv.amount || 0))}
                          </td>
                          <td className="px-4 py-2.5">{statusBadge(inv.status || 'PENDING')}</td>
                          <td className="px-4 py-2.5"><SettlementStatus status={inv.status || 'PENDING'} /></td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatDate(inv.createdAt)}</td>
                          <td className="px-4 py-2.5">
                            {(inv.status === 'SENT' || inv.status === 'OVERDUE' || inv.status === 'PENDING') && (
                              <button className="px-3 py-1 text-xs font-medium rounded-md bg-[#0D9488] text-white hover:bg-[#0D9488]/90 transition-colors">
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12">
                <EmptyState title="No invoices received" description="Invoices from trainers will appear here" />
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
