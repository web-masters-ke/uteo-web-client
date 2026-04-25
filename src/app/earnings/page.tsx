'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { financialService } from '@/lib/services/financial';
import { walletService } from '@/lib/services/wallet';
import { bookingService } from '@/lib/services/bookings';
import { coursesService } from '@/lib/services/courses';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';
import { LineTrend, DonutBreakdown } from '@/components/Charts';
import Modal from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { Wallet, Booking } from '@/lib/types';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
  { label: 'All', value: 'all' },
];

const PAYOUT_FEE_RATES: Record<string, number> = {
  MPESA: 0.015,
  BANK_TRANSFER: 0.005,
};

/* ─── Status badge helper ───────────────────────────────────────────────────── */

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    COMPLETED: 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400',
    PROCESSING: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    REQUESTED: 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
    APPROVED: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    REJECTED: 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
    PAID: 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400',
    SENT: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    DRAFT: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
    OVERDUE: 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
    VOID: 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400',
    PENDING: 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-transparent', colors[status] || 'border-gray-300 text-gray-600')}>
      {status}
    </span>
  );
}

/* ─── Skeleton block for loading ────────────────────────────────────────────── */

function SkeletonBlock({ h = 'h-64' }: { h?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className={`${h} bg-gray-100 dark:bg-gray-700 rounded`} />
    </div>
  );
}

/* ─── Source badge ──────────────────────────────────────────────────────────── */

function sourceBadge(source: string) {
  const map: Record<string, { border: string; label: string }> = {
    BOOKING: { border: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400', label: 'Booking' },
    COURSE: { border: 'border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400', label: 'Course Sale' },
    TIP: { border: 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400', label: 'Tip' },
  };
  const s = map[source] || { border: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400', label: source };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-transparent', s.border)}>
      {s.label}
    </span>
  );
}

/* ─── Commission Details Expandable Section ────────────────────────────────── */

function CommissionDetails({
  commissions,
  gross,
  recentEarnings,
}: {
  commissions: number;
  gross: number;
  recentEarnings: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const effectiveRate = gross > 0 ? commissions / gross : 0;

  // Recent commission breakdown from the earnings data (last 10 with commission info)
  const commissionBreakdown = recentEarnings
    .filter((e: any) => {
      const comm = Number(e.commission || 0);
      const amt = Number(e.amount || 0);
      return comm > 0 || amt > 0;
    })
    .slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 35% 35%, rgba(239,68,68,0.1) 0%, transparent 70%)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Commission Details</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Effective rate: <span className="font-medium text-red-600 dark:text-red-400">{(effectiveRate * 100).toFixed(1)}%</span>
              {' '}&middot;{' '}
              Total paid: <span className="font-medium">{formatCurrency(commissions)}</span>
            </p>
          </div>
        </div>
        <svg
          className={cn('w-5 h-5 text-gray-400 transition-transform', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-200 dark:border-gray-700 pt-5">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Effective Rate</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {(effectiveRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Based on your subscription plan</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Commissions Paid</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(commissions)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Lifetime platform fees</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Gross Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(gross)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Before commission deductions</p>
            </div>
          </div>

          {/* Commission breakdown per booking */}
          {commissionBreakdown.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Recent Commission Breakdown
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Booking Amount</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Rate</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Commission</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">You Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {commissionBreakdown.map((e: any, i: number) => {
                      const amt = Number(e.amount || 0);
                      const comm = Number(e.commission || 0);
                      const netAmt = Number(e.net || amt - comm);
                      const rate = amt > 0 ? comm / amt : 0;
                      return (
                        <tr key={e.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                            {formatDate(e.date || e.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">
                            {formatCurrency(amt)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">
                            {(rate * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400 font-medium">
                            -{formatCurrency(comm)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-semibold">
                            {formatCurrency(netAmt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info note + upgrade CTA */}
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Commission rates are determined by your subscription plan. Higher-tier plans offer lower commission rates, meaning you keep more of your earnings.
              </p>
              <Link
                href="/subscriptions"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline"
              >
                Upgrade your plan to reduce your rate
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function EarningsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Period
  const [period, setPeriod] = useState('30d');

  // Data states
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  // Payout request modal
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('MPESA');
  const [payoutDest, setPayoutDest] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ─── Fetch all data ──────────────────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [earn, wal, pay, invSummary, bookingsRes, courses, txns] = await Promise.all([
        financialService.myEarnings(period).catch(() => null),
        walletService.get().catch(() => null),
        financialService.myPayouts({ limit: 50 }).catch(() => []),
        financialService.myInvoicesSummary().catch(() => null),
        bookingService.list({ status: 'COMPLETED', limit: 100 }).catch(() => ({ items: [] })),
        coursesService.myCreated().catch(() => []),
        walletService.getTransactions({ limit: 50 }).catch(() => ({ items: [] })),
      ]);
      setEarnings(earn);
      setWallet(wal);
      setPayouts(Array.isArray(pay) ? pay : pay?.items || []);
      setInvoiceSummary(invSummary);
      const bkItems = bookingsRes?.items || (Array.isArray(bookingsRes) ? bookingsRes : []);
      setCompletedBookings(bkItems);
      setMyCourses(Array.isArray(courses) ? courses : courses?.items || []);
      const txnItems = txns?.items || (Array.isArray(txns) ? txns : []);
      setWalletTransactions(txnItems);
    } catch {
      addToast('error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, [period, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Payout request handler ──────────────────────────────────────────────── */

  const handlePayoutRequest = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) {
      addToast('warning', 'Enter a valid amount');
      return;
    }
    if (wallet && amt > wallet.balance) {
      addToast('warning', 'Amount exceeds your wallet balance');
      return;
    }
    if (!payoutDest.trim()) {
      addToast('warning', 'Enter a destination');
      return;
    }
    setSubmitting(true);
    try {
      await financialService.requestPayout({ amount: amt, method: payoutMethod, destination: payoutDest });
      addToast('success', 'Payout request submitted');
      setPayoutModal(false);
      setPayoutAmount('');
      setPayoutDest('');
      fetchData();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to request payout');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Derived data ────────────────────────────────────────────────────────── */

  const walletBalance = wallet?.balance ?? 0;
  const gross = Number(earnings?.grossEarnings || earnings?.gross || earnings?.totalEarnings || 0);
  const commissions = Number(earnings?.commissionsPaid || earnings?.commissions || 0);
  const net = Number(earnings?.netEarnings || earnings?.net || gross - commissions);
  const pendingPayouts = Number(earnings?.pendingPayouts || earnings?.pending || 0);

  // Booking earnings total
  const bookingEarningsTotal = completedBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  // Course revenue: sum of (price * enrolled count)
  const courseRevenueTotal = myCourses.reduce((sum, c) => {
    const price = Number(c.price || 0);
    const enrolled = Number(c.enrolledCount || c.enrollments?.length || c._count?.enrollments || 0);
    return sum + price * enrolled;
  }, 0);

  // Earnings trend data
  const trendData: Record<string, unknown>[] = Array.isArray(earnings?.trend || earnings?.data || earnings?.chart)
    ? (earnings?.trend || earnings?.data || earnings?.chart).map((r: any) => ({
        label: r.date || r.period || r.label || '',
        amount: Number(r.amount || r.earnings || r.value || 0),
      }))
    : [];

  // Recent earnings (from API or built from transactions)
  const recentEarnings: any[] = useMemo(() => {
    const fromApi = Array.isArray(earnings?.recent || earnings?.recentBookings)
      ? (earnings?.recent || earnings?.recentBookings)
      : [];
    if (fromApi.length > 0) return fromApi;
    // Fall back to wallet transactions that are credits
    return walletTransactions
      .filter((t: any) => {
        const isCredit = t.entries?.some((e: any) => e.entryType === 'CREDIT') || t.type === 'ESCROW_RELEASE' || t.type === 'DEPOSIT';
        return isCredit;
      })
      .slice(0, 20);
  }, [earnings, walletTransactions]);

  // Revenue by source (donut)
  const revenueBySource = useMemo(() => {
    const sources: { name: string; value: number }[] = [];
    if (bookingEarningsTotal > 0) sources.push({ name: 'Bookings', value: bookingEarningsTotal });
    if (courseRevenueTotal > 0) sources.push({ name: 'Course Sales', value: courseRevenueTotal });
    const tipsTotal = Number(earnings?.tipsEarnings || earnings?.tips || 0);
    if (tipsTotal > 0) sources.push({ name: 'Tips', value: tipsTotal });
    // If we only have net total from API, use that as fallback
    if (sources.length === 0 && gross > 0) {
      sources.push({ name: 'Earnings', value: gross });
    }
    return sources;
  }, [bookingEarningsTotal, courseRevenueTotal, earnings, gross]);

  // Invoice summary
  const invIssued = Number(invoiceSummary?.issued || invoiceSummary?.total || invoiceSummary?.count || 0);
  const invPaid = Number(invoiceSummary?.paid || invoiceSummary?.paidCount || 0);
  const invOutstanding = Number(invoiceSummary?.outstanding || invoiceSummary?.outstandingCount || invIssued - invPaid);
  const invIssuedAmount = Number(invoiceSummary?.totalAmount || invoiceSummary?.issuedAmount || 0);
  const invPaidAmount = Number(invoiceSummary?.paidAmount || 0);
  const invOutstandingAmount = Number(invoiceSummary?.outstandingAmount || invIssuedAmount - invPaidAmount);

  // Payout fee preview
  const payoutAmtNum = Number(payoutAmount) || 0;
  const payoutFeeRate = PAYOUT_FEE_RATES[payoutMethod] || 0;
  const payoutFee = Math.round(payoutAmtNum * payoutFeeRate);
  const payoutNet = payoutAmtNum - payoutFee;

  /* ─── Render ──────────────────────────────────────────────────────────────── */

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero earnings banner */}
      <div className="relative overflow-hidden rounded-2xl text-white shadow-2xl">
        <img
          src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Brand-tinted gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(5,46,22,0.90) 0%, rgba(6,78,59,0.82) 55%, rgba(13,148,136,0.70) 100%)' }} />

        <div className="relative z-10 p-7 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            {/* Left: headline + balance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300/80">Earnings Overview</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFeatureSettings: '"tnum"' }}>Earnings</h1>
              <p className="text-sm text-white/60 mt-1">Your complete financial picture — income, payouts &amp; invoices</p>
            </div>

            {/* Right: wallet balance card */}
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50 mb-1">Wallet Balance</p>
              <p className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                {formatCurrency(walletBalance)}
              </p>
              <p className="text-xs text-white/50 mt-1 font-mono">{wallet?.currency || 'KES'} · {wallet?.status === 'ACTIVE' ? 'Active' : wallet?.status || 'Active'}</p>
              <div className="flex sm:justify-end gap-2.5 mt-5">
                <button
                  onClick={() => setPayoutModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: '#10b981', color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Request Payout
                </button>
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  View Wallet
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Period selector ───────────────────────────────────────────────────── */}
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

      {/* ── Revenue Breakdown Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 35%, rgba(59,130,246,0.1) 0%, transparent 70%)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Booking Earnings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(bookingEarningsTotal || gross)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{completedBookings.length} completed sessions</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 35%, rgba(168,85,247,0.1) 0%, transparent 70%)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Course Sales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(courseRevenueTotal)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {myCourses.length} course{myCourses.length !== 1 ? 's' : ''} published
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 35%, rgba(239,68,68,0.1) 0%, transparent 70%)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Commissions Deducted</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(commissions)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Platform commission</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 35%, rgba(16,185,129,0.1) 0%, transparent 70%)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Net Earnings</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(net)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {pendingPayouts > 0 ? `${formatCurrency(pendingPayouts)} pending payout` : 'After all deductions'}
          </p>
        </div>
      </div>

      {/* ── Earnings Trend + Revenue by Source ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Trend (wider) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Earnings Trend</h3>
          {trendData.length > 0 ? (
            <LineTrend data={trendData} dataKey="amount" xKey="label" height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
              No trend data available for this period
            </div>
          )}
        </div>

        {/* Revenue by Source (donut) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Revenue by Source</h3>
          {revenueBySource.length > 0 ? (
            <DonutBreakdown data={revenueBySource} height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
              No revenue data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Earnings Table ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Earnings</h3>
        {recentEarnings.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Source</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Commission</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentEarnings.map((e: any, i: number) => {
                  const source = e.source || e.referenceType || e.type || 'BOOKING';
                  const amt = Number(e.amount || 0);
                  const comm = Number(e.commission || 0);
                  const netAmt = Number(e.net || amt - comm);
                  const bookingId = e.bookingId || e.referenceId;
                  const courseId = e.courseId;
                  return (
                    <tr key={e.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatDate(e.date || e.createdAt)}</td>
                      <td className="px-4 py-2.5">{sourceBadge(source.toUpperCase().includes('COURSE') ? 'COURSE' : source.toUpperCase().includes('TIP') ? 'TIP' : 'BOOKING')}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                        {e.client?.firstName || e.clientName || e.description || '—'} {e.client?.lastName || ''}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{formatCurrency(amt)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{formatCurrency(comm)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">
                        {bookingId ? (
                          <Link href={`/bookings/${bookingId}`} className="text-[#192C67] dark:text-[#5b8bc7] hover:underline">
                            {formatCurrency(netAmt)}
                          </Link>
                        ) : courseId ? (
                          <Link href={`/courses/${courseId}`} className="text-[#192C67] dark:text-[#5b8bc7] hover:underline">
                            {formatCurrency(netAmt)}
                          </Link>
                        ) : (
                          formatCurrency(netAmt)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No earnings yet" description="Complete bookings or sell courses to start earning" />
        )}
      </div>

      {/* ── Commission Details (Expandable) ─────────────────────────────────── */}
      <CommissionDetails
        commissions={commissions}
        gross={gross}
        recentEarnings={recentEarnings}
      />

      {/* ── Payout History ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Payout History</h3>
          <button
            onClick={() => setPayoutModal(true)}
            className="text-sm font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline"
          >
            Request Payout
          </button>
        </div>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Fee</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Net</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Method</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payouts.map((p: any, i: number) => {
                  const amt = Number(p.amount || 0);
                  const fee = Number(p.fee || p.processingFee || 0);
                  const pNet = Number(p.netAmount || amt - fee);
                  return (
                    <tr key={p.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(amt)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{formatCurrency(fee)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(pNet)}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        {(p.method || p.paymentMethod || '—').replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(p.status || 'PENDING')}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {p.reference || p.transactionId || p.destination || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No payouts yet" description="Request your first payout when you have available earnings" />
        )}
      </div>

      {/* ── Invoices Section ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Invoices</h3>
          <Link
            href="/invoices"
            className="text-sm font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline"
          >
            View All Invoices
          </Link>
        </div>
        {invoiceSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Issued</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{invIssued}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatCurrency(invIssuedAmount)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{invPaid}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatCurrency(invPaidAmount)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{invOutstanding}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatCurrency(invOutstandingAmount)}</p>
            </div>
          </div>
        ) : (
          <EmptyState title="No invoices yet" description="Invoices will appear here once generated" />
        )}
      </div>

      {/* ── Payout Request Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={payoutModal} onClose={() => setPayoutModal(false)} title="Request Payout" size="md">
        <div className="space-y-5">
          {/* Available balance */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(walletBalance)}</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (KES)</label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Enter amount"
              min={1}
              max={walletBalance}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/50"
            />
          </div>

          {/* Method toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayoutMethod('MPESA')}
                className={cn(
                  'px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-center',
                  payoutMethod === 'MPESA'
                    ? 'border-2 border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7]'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                )}
              >
                M-Pesa
                <span className="block text-xs font-normal mt-0.5 opacity-70">1.5% fee</span>
              </button>
              <button
                type="button"
                onClick={() => setPayoutMethod('BANK_TRANSFER')}
                className={cn(
                  'px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-center',
                  payoutMethod === 'BANK_TRANSFER'
                    ? 'border-2 border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7]'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                )}
              >
                Bank Transfer
                <span className="block text-xs font-normal mt-0.5 opacity-70">0.5% fee</span>
              </button>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {payoutMethod === 'MPESA' ? 'Phone Number' : 'Bank Account Number'}
            </label>
            <input
              type="text"
              value={payoutDest}
              onChange={(e) => setPayoutDest(e.target.value)}
              placeholder={payoutMethod === 'MPESA' ? '254712345678' : 'Account number'}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/50"
            />
          </div>

          {/* Fee preview */}
          {payoutAmtNum > 0 && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(payoutAmtNum)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Fee ({payoutMethod === 'MPESA' ? '1.5%' : '0.5%'})
                </span>
                <span className="text-red-600 dark:text-red-400">- {formatCurrency(payoutFee)}</span>
              </div>
              <div className="border-t border-blue-200 dark:border-blue-800 pt-1 mt-1 flex justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">You receive</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(payoutNet)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPayoutModal(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handlePayoutRequest}
              disabled={submitting || payoutAmtNum <= 0 || payoutAmtNum > walletBalance}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7] hover:bg-[#192C67]/5 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
