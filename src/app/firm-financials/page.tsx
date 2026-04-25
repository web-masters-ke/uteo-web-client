'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { financialService } from '@/lib/services/financial';
import { apiGet } from '@/lib/api';
import { formatCurrency, formatDate, cn, getInitials } from '@/lib/utils';
import { LineTrend, BarCompare } from '@/components/Charts';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { Wallet } from '@/lib/types';

/* ─── Hero Section ─────────────────────────────────────────────────────────── */

function FirmHero() {
  return (
    <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden -mx-6 lg:-mx-10 -mt-6">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=4096&q=100"
          alt="Financial overview"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#192C67]/80" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
        <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">
          SkillSasa Firm
        </p>
        <h1 className="text-4xl lg:text-6xl font-black text-white">Firm Financials</h1>
        <p className="mt-4 text-lg text-white/80 max-w-xl">
          Organization-wide financial overview. Track revenue, consultant performance, and payouts across your firm.
        </p>
      </div>
    </section>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color || 'bg-gray-100 dark:bg-gray-700')}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Escrow Status Badge ──────────────────────────────────────────────────── */

function EscrowBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    FUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    HELD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REFUNDED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    FROZEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

/* ─── Payout Status Badge ──────────────────────────────────────────────────── */

function PayoutBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

/* ─── Interfaces ───────────────────────────────────────────────────────────── */

interface ConsultantRow {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  department?: string;
  bookings: number;
  revenue: number;
  commissions: number;
  netEarnings: number;
  rating: number;
}

interface DepartmentRow {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  members: number;
  avgTicket: number;
}

/* ─── Firm Commission Summary ─────────────────────────────────────────────── */

function FirmCommissionSummary({
  consultants,
  firmRevenue,
}: {
  consultants: ConsultantRow[];
  firmRevenue: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalCommissions = consultants.reduce((sum, c) => sum + c.commissions, 0);
  const totalNet = consultants.reduce((sum, c) => sum + c.netEarnings, 0);
  const effectiveRate = firmRevenue > 0 ? totalCommissions / firmRevenue : 0;

  // Consultant breakdown sorted by commission paid (descending)
  const sorted = [...consultants]
    .filter((c) => c.commissions > 0)
    .sort((a, b) => b.commissions - a.commissions);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Commission Summary</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total commissions paid across all consultants:{' '}
              <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalCommissions)}</span>
              {' '}&middot;{' '}
              Effective rate: <span className="font-medium">{(effectiveRate * 100).toFixed(1)}%</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total Commissions</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(totalCommissions)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Paid to platform</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Firm Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(firmRevenue)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gross earnings</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Net After Commission</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(totalNet)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">What consultants received</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Effective Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(effectiveRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Avg across consultants</p>
            </div>
          </div>

          {/* Per-consultant commission breakdown */}
          {sorted.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Commission by Consultant
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Consultant</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Commission Paid</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Rate</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Net Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sorted.map((c) => {
                      const cRate = c.revenue > 0 ? c.commissions / c.revenue : 0;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {c.avatar ? (
                                <img src={c.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-[#192C67] text-white text-[9px] font-bold flex items-center justify-center">
                                  {getInitials(c.firstName, c.lastName)}
                                </span>
                              )}
                              {c.firstName} {c.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">
                            {formatCurrency(c.revenue)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400 font-medium">
                            {formatCurrency(c.commissions)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">
                            {(cRate * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-semibold">
                            {formatCurrency(c.netEarnings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Total</td>
                      <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">
                        {formatCurrency(firmRevenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(totalCommissions)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">
                        {(effectiveRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(totalNet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {sorted.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No commission data available for consultants yet.
            </p>
          )}

          {/* Info note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Commission rates are applied based on each consultant's subscription plan and booking amount. Organization-level subscription plans may offer reduced rates for all team members.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function FirmFinancialsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [consultantDetail, setConsultantDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortKey, setSortKey] = useState<keyof ConsultantRow>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, wal] = await Promise.all([
        financialService.firmFinancial(),
        apiGet<Wallet>('/wallet/me').catch(() => null),
      ]);
      setData(res);
      setWallet(wal);
    } catch {
      addToast('error', 'Failed to load firm financial data');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpandConsultant = async (id: string) => {
    if (expandedConsultant === id) {
      setExpandedConsultant(null);
      setConsultantDetail(null);
      return;
    }
    setExpandedConsultant(id);
    setDetailLoading(true);
    try {
      const detail = await financialService.firmConsultant(id);
      setConsultantDetail(detail);
    } catch {
      addToast('error', 'Failed to load consultant details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSort = (key: keyof ConsultantRow) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  /* ─── Derived Data ─────────────────────────────────────────────────────────── */

  const firmRevenue = Number(data?.revenue || data?.totalRevenue || 0);
  const consultantCount = Number(data?.consultantCount || data?.consultants?.length || 0);
  const avgPerConsultant = consultantCount > 0 ? firmRevenue / consultantCount : 0;
  const outstandingInvoices = Number(data?.outstandingInvoices || 0);
  const escrowPending = Number(data?.escrowPending || data?.totalEscrow || wallet?.escrowPendingForMe || 0);

  // Monthly revenue trend
  const revenueTrend: Record<string, unknown>[] = useMemo(() => {
    const raw = data?.monthlyRevenue || data?.trend;
    if (!Array.isArray(raw)) return [];
    return raw.map((m: any) => ({
      label: m.date || m.month || m.period || m.label || '',
      amount: Number(m.revenue || m.amount || m.value || 0),
    }));
  }, [data]);

  // Consultants
  const consultants: ConsultantRow[] = useMemo(() => {
    if (!Array.isArray(data?.consultants)) return [];
    return data.consultants.map((c: any) => ({
      id: c.id || c.userId || '',
      firstName: c.firstName || c.user?.firstName || '',
      lastName: c.lastName || c.user?.lastName || '',
      avatar: c.avatar || c.avatarUrl || c.user?.avatarUrl || c.user?.avatar || '',
      department: c.department || c.departmentName || c.user?.department || '',
      bookings: Number(c.bookings || c.bookingCount || 0),
      revenue: Number(c.revenue || c.totalRevenue || 0),
      commissions: Number(c.commissions || 0),
      netEarnings: Number(c.netEarnings || c.net || 0),
      rating: Number(c.rating || c.avgRating || 0),
    }));
  }, [data]);

  // Revenue by consultant (bar chart)
  const consultantBarData = useMemo(() => {
    return consultants
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
      .map((c) => ({
        label: `${c.firstName} ${c.lastName.charAt(0)}.`,
        revenue: c.revenue,
      }));
  }, [consultants]);

  // Sort consultants
  const sortedConsultants = useMemo(() => {
    return [...consultants].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [consultants, sortKey, sortAsc]);

  // Departments
  const departments: DepartmentRow[] = useMemo(() => {
    if (!Array.isArray(data?.departments)) return [];
    return data.departments.map((d: any) => ({
      id: d.id || '',
      name: d.name || '',
      bookings: Number(d.bookings || d.bookingCount || 0),
      revenue: Number(d.revenue || d.totalRevenue || 0),
      members: Number(d.members || d.memberCount || 0),
      avgTicket: Number(d.avgTicket || d.averageBookingValue || 0),
    }));
  }, [data]);

  // Escrow overview
  const escrowFunded = Number(data?.escrow?.funded || data?.escrowFunded || 0);
  const escrowHeld = Number(data?.escrow?.held || data?.escrowHeld || 0);
  const escrowReleased = Number(data?.escrow?.released || data?.escrowReleased || 0);
  const hasEscrow = escrowFunded > 0 || escrowHeld > 0 || escrowReleased > 0 || escrowPending > 0;

  // Payout history
  const payouts: any[] = useMemo(() => {
    return Array.isArray(data?.payouts) ? data.payouts : [];
  }, [data]);

  const SortIcon = ({ field }: { field: keyof ConsultantRow }) => {
    if (sortKey !== field) return <span className="text-gray-300 dark:text-gray-600 ml-1">&#8645;</span>;
    return <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>;
  };

  const handleExport = () => {
    addToast('info', 'Export report feature coming soon');
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <FirmHero />

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing all-time firm financials for <span className="font-medium text-gray-700 dark:text-gray-200">{user?.firstName} {user?.lastName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
          <Link
            href="/invoices"
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-[#192C67] text-white hover:bg-[#192C67]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Invoices
          </Link>
        </div>
      </div>

      {/* KPI cards (5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Firm Revenue"
          value={formatCurrency(firmRevenue)}
          sub="Total all-time"
          icon={
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" />
            </svg>
          }
          color="bg-green-50 dark:bg-green-900/20"
        />
        <KpiCard
          label="Consultant Count"
          value={String(consultantCount)}
          sub="Active members"
          icon={
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          label="Avg Revenue / Consultant"
          value={formatCurrency(avgPerConsultant)}
          sub="Per team member"
          icon={
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <KpiCard
          label="Outstanding Invoices"
          value={String(outstandingInvoices)}
          sub="Awaiting payment"
          icon={
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="bg-amber-50 dark:bg-amber-900/20"
        />
        <KpiCard
          label="Escrow Pending"
          value={formatCurrency(escrowPending)}
          sub="Held in escrow"
          icon={
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          color="bg-teal-50 dark:bg-teal-900/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue Trend</h3>
          {revenueTrend.length > 0 ? (
            <LineTrend data={revenueTrend} dataKey="amount" xKey="label" height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
              No monthly trend data available
            </div>
          )}
        </div>

        {/* Revenue by Consultant (Bar) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Revenue by Consultant</h3>
          {consultantBarData.length > 0 ? (
            <BarCompare data={consultantBarData} bars={[{ key: 'revenue', label: 'Revenue' }]} xKey="label" height={260} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400 dark:text-gray-500">
              No consultant revenue data
            </div>
          )}
        </div>
      </div>

      {/* Consultant Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Consultant Performance</h3>
        {sortedConsultants.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('firstName')} className="flex items-center hover:text-gray-700 dark:hover:text-gray-200">
                      Name <SortIcon field="firstName" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('bookings')} className="flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200">
                      Bookings <SortIcon field="bookings" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('revenue')} className="flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200">
                      Revenue <SortIcon field="revenue" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('commissions')} className="flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200">
                      Commissions <SortIcon field="commissions" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('netEarnings')} className="flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200">
                      Net Earnings <SortIcon field="netEarnings" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button onClick={() => handleSort('rating')} className="flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200">
                      Rating <SortIcon field="rating" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedConsultants.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => handleExpandConsultant(c.id)}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
                        expandedConsultant === c.id && 'bg-gray-50 dark:bg-gray-700/30'
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                        <span className="flex items-center gap-2.5">
                          <svg
                            className={cn('w-3.5 h-3.5 transition-transform text-gray-400 flex-shrink-0', expandedConsultant === c.id && 'rotate-90')}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {c.avatar ? (
                            <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-[#192C67] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {getInitials(c.firstName, c.lastName)}
                            </span>
                          )}
                          {c.firstName} {c.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{c.department || '--'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{c.bookings}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(c.revenue)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400">{formatCurrency(c.commissions)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(c.netEarnings)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {c.rating > 0 ? c.rating.toFixed(1) : '--'}
                        </span>
                      </td>
                    </tr>
                    {expandedConsultant === c.id && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50/50 dark:bg-gray-750/50">
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#192C67]" />
                            </div>
                          ) : consultantDetail ? (
                            <div className="space-y-4">
                              {/* Recent Bookings */}
                              {Array.isArray(consultantDetail.recentBookings) && consultantDetail.recentBookings.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Bookings</h4>
                                  <div className="space-y-1.5">
                                    {consultantDetail.recentBookings.slice(0, 5).map((b: any, i: number) => (
                                      <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                        <div>
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {b.client?.firstName || b.clientName || 'Client'} {b.client?.lastName || ''}
                                          </span>
                                          <span className="text-xs text-gray-400 ml-2">{formatDate(b.date || b.createdAt)}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(Number(b.amount || b.price || 0))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Payout History */}
                              {Array.isArray(consultantDetail.payoutHistory) && consultantDetail.payoutHistory.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payout History</h4>
                                  <div className="space-y-1.5">
                                    {consultantDetail.payoutHistory.slice(0, 5).map((p: any, i: number) => (
                                      <div key={p.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(p.createdAt)}</span>
                                          <PayoutBadge status={p.status || 'PENDING'} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(Number(p.amount || 0))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {!consultantDetail.recentBookings?.length && !consultantDetail.payoutHistory?.length && (
                                <p className="text-sm text-gray-400 text-center py-4">No detailed data available</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 text-center py-4">No details available</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No consultants" description="Add team members to see their performance" />
        )}
      </div>

      {/* Department Revenue Table */}
      {departments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Department Revenue</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Members</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Bookings</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Avg Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{d.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{d.members}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{d.bookings}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(d.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{formatCurrency(d.avgTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Escrow Overview */}
      {hasEscrow && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Escrow Overview
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Money held in escrow for the firm's bookings</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <EscrowBadge status="FUNDED" />
              </div>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-2">{formatCurrency(escrowFunded)}</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">Funded by clients</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <EscrowBadge status="HELD" />
              </div>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-2">{formatCurrency(escrowHeld)}</p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-1">Currently held in escrow</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <EscrowBadge status="RELEASED" />
              </div>
              <p className="text-xl font-bold text-green-800 dark:text-green-200 mt-2">{formatCurrency(escrowReleased)}</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/70 mt-1">Released to consultants</p>
            </div>
          </div>
        </div>
      )}

      {/* Commission Summary for Org */}
      <FirmCommissionSummary consultants={consultants} firmRevenue={firmRevenue} />

      {/* Payout History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Payout History</h3>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Recipient</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Method</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payouts.map((p: any, i: number) => (
                  <tr key={p.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                      {p.recipientName || p.user?.firstName || p.consultant?.firstName || 'Firm Owner'}{' '}
                      {p.user?.lastName || p.consultant?.lastName || ''}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(p.amount || 0))}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 text-xs uppercase">
                      {(p.method || p.paymentMethod || 'MPESA').replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <PayoutBadge status={p.status || 'PENDING'} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No payouts yet" description="Payouts to the firm and consultants will appear here" />
        )}
      </div>
    </div>
  );
}
