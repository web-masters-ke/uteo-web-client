'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost, extractItems } from '@/lib/api';
import { bookingService } from '@/lib/services/bookings';
import type { Wallet, WalletTransaction, WalletTransactionEntry, Booking } from '@/lib/types';
import { formatCurrency, formatDateTime, formatDate, formatRelative, cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';

/* ─── Tab types ─── */

type WalletTab = 'wallet' | 'escrow' | 'transactions';

const TABS: { key: WalletTab; label: string }[] = [
  { key: 'wallet', label: 'Wallet' },
  { key: 'escrow', label: 'Escrow' },
  { key: 'transactions', label: 'Transactions' },
];

/* ─── constants ─── */

type FilterType = '' | 'DEPOSIT' | 'WITHDRAWAL' | 'ESCROW' | 'COMMISSION' | 'REFUND' | 'TOPUP';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DEPOSIT', label: 'Deposits' },
  { value: 'WITHDRAWAL', label: 'Withdrawals' },
  { value: 'ESCROW', label: 'Escrow' },
  { value: 'COMMISSION', label: 'Commissions' },
  { value: 'REFUND', label: 'Refunds' },
  { value: 'TOPUP', label: 'Top-ups' },
];

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const PER_PAGE = 20;

/* ─── helpers ─── */

function isCreditTx(tx: WalletTransaction): boolean {
  const refType = tx.referenceType || tx.type || '';
  if (tx.entries && tx.entries.length > 0) {
    return tx.entries.some((e: WalletTransactionEntry) => e.entryType === 'CREDIT');
  }
  return ['DEPOSIT', 'TOPUP', 'REFUND', 'ESCROW_RELEASE'].includes(refType);
}

function getTxAmount(tx: WalletTransaction): number {
  if (tx.entries && tx.entries.length > 0) {
    return tx.entries[0].amount;
  }
  return tx.amount ?? 0;
}

function typeLabel(refType: string): string {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    ESCROW: 'Escrow',
    ESCROW_HOLD: 'Escrow Hold',
    ESCROW_RELEASE: 'Escrow Release',
    COMMISSION: 'Commission',
    REFUND: 'Refund',
    TOPUP: 'Top-up',
  };
  return map[refType] || refType;
}

function txAmountColor(isCredit: boolean): string {
  return isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}

function typeBadgeClasses(refType: string): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';
  switch (refType) {
    case 'DEPOSIT':
    case 'TOPUP':
      return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`;
    case 'WITHDRAWAL':
      return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`;
    case 'ESCROW':
    case 'ESCROW_HOLD':
      return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
    case 'ESCROW_RELEASE':
      return `${base} bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400`;
    case 'COMMISSION':
      return `${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`;
    case 'REFUND':
      return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`;
    default:
      return `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;
  }
}

/* ─── Escrow status badges ─── */

function EscrowStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    FUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    HELD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REFUNDED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    FROZEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    DISPUTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

/* ─── icons (per transaction type) ─── */

function TxIcon({ refType, isCredit }: { refType: string; isCredit: boolean }) {
  if (['DEPOSIT', 'TOPUP'].includes(refType)) {
    return (
      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
        </svg>
      </div>
    );
  }
  if (refType === 'WITHDRAWAL') {
    return (
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 16l4-4m-4 4l-4-4" />
        </svg>
      </div>
    );
  }
  if (['ESCROW', 'ESCROW_HOLD'].includes(refType)) {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
    );
  }
  if (refType === 'COMMISSION') {
    return (
      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
        </svg>
      </div>
    );
  }
  if (refType === 'REFUND') {
    return (
      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </div>
    );
  }
  if (isCredit) {
    return (
      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

/* ─── wallet status badge ─── */

function WalletStatusBadge({ status }: { status: string }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold';
  if (status === 'ACTIVE') {
    return (
      <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'FROZEN') {
    return (
      <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Frozen
      </span>
    );
  }
  return (
    <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      {status || 'Unknown'}
    </span>
  );
}

/* ─── stat card component ─── */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-bold text-gray-900 dark:text-white truncate" style={{ fontFeatureSettings: '"tnum"' }}>{value}</p>
    </div>
  );
}

/* ─── Escrow Timeline ─── */

function EscrowTimeline({ booking }: { booking: Booking }) {
  const escrowStatus = booking.escrowStatus || '';
  const bookingStatus = booking.status || '';

  const steps = [
    { label: 'Paid', done: true },
    { label: 'Funded', done: ['FUNDED', 'HELD', 'RELEASED'].includes(escrowStatus) || ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(bookingStatus) },
    { label: 'Session Done', done: bookingStatus === 'COMPLETED' || escrowStatus === 'RELEASED' },
    { label: 'Released', done: escrowStatus === 'RELEASED' },
  ];

  // Check for refund/cancelled
  const isRefunded = escrowStatus === 'REFUNDED' || bookingStatus === 'CANCELLED';

  return (
    <div className="flex items-center gap-1">
      {isRefunded ? (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Refunded / Cancelled</span>
        </div>
      ) : (
        steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1">
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              step.done ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            )} />
            <span className={cn(
              'text-[10px] whitespace-nowrap',
              step.done ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'
            )}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-4 h-px flex-shrink-0',
                step.done ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
              )} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Main Wallet Page ─── */

export default function WalletPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Tab
  const [activeTab, setActiveTab] = useState<WalletTab>('wallet');

  // Wallet data
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // Escrow data
  const [escrowBookings, setEscrowBookings] = useState<Booking[]>([]);
  const [escrowLoading, setEscrowLoading] = useState(false);

  // Deposit modal state
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdraw modal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // ── NEW: transaction search + date range filters ──
  const [txSearch, setTxSearch] = useState('');
  const [txSearchDebounced, setTxSearchDebounced] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txDirection, setTxDirection] = useState<'' | 'CREDIT' | 'DEBIT'>('');

  useEffect(() => {
    const t = setTimeout(() => setTxSearchDebounced(txSearch), 300);
    return () => clearTimeout(t);
  }, [txSearch]);

  // ── NEW: exporting statement ──
  const [exporting, setExporting] = useState(false);

  // ── NEW: receipt modal ──
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ── NEW: spending insights (for chart) ──
  const [insights, setInsights] = useState<any | null>(null);

  // ── NEW: upcoming escrow releases (countdown) ──
  const [upcomingEscrow, setUpcomingEscrow] = useState<any[]>([]);

  // ── NEW: withdrawal history w/ status ──
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // ── NEW: deposit provider (MPESA/CARD/BANK_TRANSFER) ──
  const [depositProvider, setDepositProvider] = useState<'MPESA' | 'CARD' | 'BANK_TRANSFER'>('MPESA');
  const [depositCardNumber, setDepositCardNumber] = useState('');
  const [depositCardExpiry, setDepositCardExpiry] = useState('');
  const [depositCardCvc, setDepositCardCvc] = useState('');
  const [depositBankAccount, setDepositBankAccount] = useState('');

  // ── NEW: P2P transfer modal ──
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipientQuery, setTransferRecipientQuery] = useState('');
  const [transferRecipients, setTransferRecipients] = useState<any[]>([]);
  const [transferRecipient, setTransferRecipient] = useState<any | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Low-balance threshold (from insights or default 1000)
  const LOW_BALANCE_THRESHOLD = insights?.lowBalanceThreshold ?? 1000;

  const isTrainer = user?.role === 'TRAINER';
  const isClient = user?.role === 'CLIENT';

  /* ─── fetch wallet info ─── */
  const fetchWallet = useCallback(async () => {
    try {
      const data = await apiGet<Wallet>('/wallet/me');
      setWallet(data);
    } catch {
      addToast('error', 'Failed to load wallet');
    }
  }, [addToast]);

  /* ─── fetch transactions ─── */
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(PER_PAGE));
      if (filterType) qs.set('referenceType', filterType);
      if (txSearchDebounced) qs.set('search', txSearchDebounced);
      if (txDateFrom) qs.set('dateFrom', txDateFrom);
      if (txDateTo) qs.set('dateTo', txDateTo);
      if (txDirection) qs.set('type', txDirection);

      const data = await apiGet<any>(`/wallet/transactions?${qs.toString()}`);
      const items = extractItems<WalletTransaction>(data);
      setTransactions(items);
      setTotalPages((data as any)?.totalPages ?? (Math.ceil(((data as any)?.total ?? items.length) / PER_PAGE) || 1));
      setTotalCount((data as any)?.total ?? items.length);
    } catch {
      addToast('error', 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [page, filterType, txSearchDebounced, txDateFrom, txDateTo, txDirection, addToast]);

  /* ─── NEW: fetch spending insights ─── */
  const fetchInsights = useCallback(async () => {
    try {
      const data = await apiGet<any>('/wallet/spending/insights?months=6');
      setInsights(data);
    } catch { /* ignore */ }
  }, []);

  /* ─── NEW: fetch upcoming escrow releases ─── */
  const fetchUpcomingEscrow = useCallback(async () => {
    try {
      const data = await apiGet<any>('/wallet/escrow/upcoming');
      setUpcomingEscrow(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  /* ─── NEW: fetch withdrawal history ─── */
  const fetchWithdrawals = useCallback(async () => {
    try {
      const data = await apiGet<any>('/wallet/withdrawals?limit=20');
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  /* ─── NEW: export CSV statement ─── */
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      if (filterType) qs.set('referenceType', filterType);
      if (txSearchDebounced) qs.set('search', txSearchDebounced);
      if (txDateFrom) qs.set('dateFrom', txDateFrom);
      if (txDateTo) qs.set('dateTo', txDateTo);
      if (txDirection) qs.set('type', txDirection);
      const stmt = await apiGet<any>(`/wallet/transactions/statement?${qs.toString()}`);
      // Build CSV
      const rows = [['Date', 'Type', 'Direction', 'Amount', 'Currency', 'Reference Type', 'Reference ID', 'Description']];
      for (const e of stmt.entries || []) {
        rows.push([
          new Date(e.createdAt).toISOString(),
          e.entryType,
          e.entryType === 'CREDIT' ? 'IN' : 'OUT',
          String(e.amount),
          stmt.currency,
          e.transaction?.referenceType || '',
          e.transaction?.referenceId || '',
          (e.transaction?.description || '').replace(/"/g, '""'),
        ]);
      }
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Statement downloaded');
    } catch (e: any) {
      addToast('error', 'Export failed');
    } finally { setExporting(false); }
  };

  /* ─── NEW: open receipt ─── */
  const openReceipt = async (txId: string) => {
    setReceiptId(txId);
    setReceipt(null);
    setReceiptLoading(true);
    try {
      const data = await apiGet<any>(`/wallet/transactions/${txId}/receipt`);
      setReceipt(data);
    } catch { addToast('error', 'Failed to load receipt'); setReceiptId(null); }
    finally { setReceiptLoading(false); }
  };

  /* ─── NEW: P2P transfer search recipients ─── */
  useEffect(() => {
    if (!showTransfer || transferRecipientQuery.length < 2) { setTransferRecipients([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<any>(`/users?search=${encodeURIComponent(transferRecipientQuery)}&limit=10`);
        const items = Array.isArray(data) ? data : (data?.items || []);
        setTransferRecipients(items.filter((u: any) => u.id !== user?.id));
      } catch { setTransferRecipients([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [transferRecipientQuery, showTransfer, user?.id]);

  const handleTransfer = async () => {
    if (!transferRecipient || !transferAmount) return;
    setTransferLoading(true);
    try {
      await apiPost('/wallet/transfer', {
        toUserId: transferRecipient.id,
        amount: Number(transferAmount),
        description: transferNote || `Transfer to ${transferRecipient.firstName} ${transferRecipient.lastName}`,
      });
      addToast('success', `Sent KES ${Number(transferAmount).toLocaleString()} to ${transferRecipient.firstName}`);
      setShowTransfer(false);
      setTransferAmount('');
      setTransferRecipient(null);
      setTransferRecipientQuery('');
      setTransferNote('');
      fetchWallet();
      fetchTransactions();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Transfer failed');
    } finally { setTransferLoading(false); }
  };

  /* ─── fetch escrow bookings ─── */
  const fetchEscrowBookings = useCallback(async () => {
    setEscrowLoading(true);
    try {
      // Fetch bookings that have escrow -- these are confirmed/in-progress/completed bookings
      const statuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      const allBookings: Booking[] = [];
      for (const status of statuses) {
        try {
          const res = await bookingService.list({ status, limit: 50 });
          const items = res?.items || (Array.isArray(res) ? res : []);
          allBookings.push(...items);
        } catch {
          // Skip if this status query fails
        }
      }
      // Filter to ones with escrow-related status or amount
      const escrow = allBookings.filter(
        (b) => b.escrowStatus || b.amount > 0
      );
      setEscrowBookings(escrow);
    } catch {
      addToast('error', 'Failed to load escrow data');
    } finally {
      setEscrowLoading(false);
    }
  }, [addToast]);

  /* ─── initial load ─── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchTransactions(), fetchInsights(), fetchUpcomingEscrow(), fetchWithdrawals()]);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── refetch transactions on page/filter/search change ─── */
  useEffect(() => {
    if (!loading) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, txSearchDebounced, txDateFrom, txDateTo, txDirection]);

  /* ─── fetch escrow bookings when escrow tab selected ─── */
  useEffect(() => {
    if (activeTab === 'escrow' && escrowBookings.length === 0 && !escrowLoading) {
      fetchEscrowBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── quick stats computed from all loaded transactions ─── */
  const stats = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let escrowHeld = 0;
    let commissionPaid = 0;

    for (const tx of transactions) {
      const refType = tx.referenceType || tx.type || '';
      const amount = getTxAmount(tx);
      if (['DEPOSIT', 'TOPUP'].includes(refType)) totalDeposits += amount;
      if (refType === 'WITHDRAWAL') totalWithdrawals += amount;
      if (['ESCROW', 'ESCROW_HOLD'].includes(refType)) escrowHeld += amount;
      if (refType === 'COMMISSION') commissionPaid += amount;
    }

    return { totalDeposits, totalWithdrawals, escrowHeld, commissionPaid };
  }, [transactions]);

  /* ─── escrow stats ─── */
  const escrowStats = useMemo(() => {
    let funded = 0;
    let held = 0;
    let released = 0;
    let refunded = 0;

    for (const b of escrowBookings) {
      const es = b.escrowStatus || '';
      const amt = Number(b.amount || 0);
      if (es === 'FUNDED' || (b.status === 'CONFIRMED' && !es)) funded += amt;
      else if (es === 'HELD' || b.status === 'IN_PROGRESS') held += amt;
      else if (es === 'RELEASED' || b.status === 'COMPLETED') released += amt;
      else if (es === 'REFUNDED' || b.status === 'CANCELLED') refunded += amt;
    }

    return { funded, held, released, refunded, total: escrowBookings.length };
  }, [escrowBookings]);

  /* ─── deposit handler ─── */
  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      addToast('error', 'Enter a valid amount');
      return;
    }
    if (depositProvider === 'MPESA' && !depositPhone.trim()) {
      addToast('error', 'Enter your M-Pesa phone number');
      return;
    }
    setDepositLoading(true);
    try {
      const payload: any = { amount, provider: depositProvider };
      if (depositProvider === 'MPESA') payload.phone = depositPhone || undefined;
      else if (depositProvider === 'CARD') payload.phone = undefined; // card metadata handled by provider webhook in prod
      else if (depositProvider === 'BANK_TRANSFER') payload.accountNumber = depositBankAccount || undefined;
      await apiPost('/wallet/deposit', payload);
      const successMsg =
        depositProvider === 'MPESA' ? 'Deposit initiated. Check your phone for the M-Pesa prompt.' :
        depositProvider === 'CARD' ? 'Card payment initiated. You will be redirected to complete.' :
        'Bank transfer request logged. We will credit your wallet when funds are received.';
      addToast('success', successMsg);
      setShowDeposit(false);
      setDepositAmount('');
      setDepositPhone('');
      setDepositCardNumber('');
      setDepositCardExpiry('');
      setDepositCardCvc('');
      setDepositBankAccount('');
      await Promise.all([fetchWallet(), fetchTransactions()]);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Deposit failed. Please try again.');
    } finally {
      setDepositLoading(false);
    }
  };

  /* ─── withdraw handler ─── */
  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      addToast('error', 'Enter a valid amount');
      return;
    }
    if (!withdrawPhone) {
      addToast('error', 'Phone number is required for withdrawal');
      return;
    }
    if (amount > (wallet?.balance ?? 0)) {
      addToast('error', 'Insufficient balance');
      return;
    }
    setWithdrawLoading(true);
    try {
      await apiPost('/wallet/withdraw', {
        amount,
        provider: 'MPESA',
        phone: withdrawPhone,
      });
      addToast('success', 'Withdrawal initiated successfully!');
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawPhone('');
      await Promise.all([fetchWallet(), fetchTransactions()]);
    } catch {
      addToast('error', 'Withdrawal failed. Please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  /* ─── pre-fill phone from user profile when opening modals ─── */
  const openDepositModal = () => {
    if (user?.phone && !depositPhone) setDepositPhone(user.phone);
    setShowDeposit(true);
  };

  const openWithdrawModal = () => {
    if (user?.phone && !withdrawPhone) setWithdrawPhone(user.phone);
    setShowWithdraw(true);
  };

  const handleWithdrawAll = () => {
    if (wallet?.balance) setWithdrawAmount(String(wallet.balance));
  };

  /* ─── loading state ─── */
  if (loading) return <PageSkeleton />;

  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? 'KES';
  const walletStatus = wallet?.status ?? 'ACTIVE';
  const isFrozen = walletStatus === 'FROZEN' || walletStatus === 'SUSPENDED';

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
          <div className="max-w-5xl mx-auto w-full flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-bold text-white">My Wallet</h1>
                <WalletStatusBadge status={walletStatus} />
              </div>
              <p className="text-sm text-white/70">Manage your funds, deposits, and withdrawals</p>
            </div>
            {!isFrozen && (
              <button
                onClick={openDepositModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#F77B0F', boxShadow: '0 2px 10px rgba(247,123,15,0.4)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
                </svg>
                Top Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
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
              {tab.key === 'escrow' && (wallet?.escrowHeldByMe || wallet?.escrowPendingForMe) ? (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  {(wallet?.escrowHeldCount || 0) + (wallet?.escrowPendingCount || 0)}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── WALLET TAB ─── */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Low balance alert */}
          {balance < LOW_BALANCE_THRESHOLD && balance >= 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Low wallet balance</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">You have less than {currency} {LOW_BALANCE_THRESHOLD.toLocaleString()} in your wallet. Top up to avoid interruptions.</p>
              </div>
              {isClient && <button onClick={() => setShowDeposit(true)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700">Top up now</button>}
            </div>
          )}

          {/* Balance Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-7 sm:p-8">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Available Balance</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                {currency}
              </span>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-1" style={{ fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
              {balance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-7 font-mono">
              ••••  ••••  ••••  {(user?.id || '0000').slice(-4).toUpperCase()}
              {wallet?.updatedAt && <span className="ml-3">· {formatRelative(wallet.updatedAt)}</span>}
            </p>

            {isTrainer && (wallet?.escrowPendingForMe ?? 0) > 0 && (
              <div className="flex items-center gap-2 mb-5 text-sm text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Pending Escrow: {formatCurrency(wallet?.escrowPendingForMe ?? 0, currency)} ({wallet?.escrowPendingCount} booking{(wallet?.escrowPendingCount ?? 0) !== 1 ? 's' : ''})</span>
              </div>
            )}
            {isClient && (wallet?.escrowHeldByMe ?? 0) > 0 && (
              <div className="flex items-center gap-2 mb-5 text-sm text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>In Escrow: {formatCurrency(wallet?.escrowHeldByMe ?? 0, currency)} ({wallet?.escrowHeldCount} active)</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              {isClient && (
                <button
                  onClick={openDepositModal}
                  disabled={isFrozen}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#F77B0F', boxShadow: '0 4px 14px rgba(247,123,15,0.3)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
                  </svg>
                  Deposit
                </button>
              )}
              <button
                onClick={openWithdrawModal}
                disabled={isFrozen || balance <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 16l4-4m-4 4l-4-4" />
                </svg>
                Withdraw
              </button>
              <button
                onClick={() => setShowTransfer(true)}
                disabled={isFrozen || balance <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Send
              </button>
              {isTrainer && (
                <button
                  onClick={() => addToast('info', 'To refund a client, go to the booking detail page and use the refund action.')}
                  disabled={isFrozen}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Refund
                </button>
              )}
            </div>

            {isFrozen && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Your wallet is {walletStatus.toLowerCase()}. Contact support for assistance.
              </p>
            )}
          </div>

          {/* Escrow Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isClient && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">In Escrow</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(wallet?.escrowHeldByMe ?? 0, currency)}
                      </p>
                    </div>
                    {(wallet?.escrowHeldCount ?? 0) > 0 && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        {wallet?.escrowHeldCount} active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Held securely until sessions complete</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#192C67] dark:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Escrow Protected</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your payments are secured
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Funds only released to trainers after session completion</p>
                </div>
              </>
            )}
            {isTrainer && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Releases</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(wallet?.escrowPendingForMe ?? 0, currency)}
                      </p>
                    </div>
                    {(wallet?.escrowPendingCount ?? 0) > 0 && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                        {wallet?.escrowPendingCount} booking{(wallet?.escrowPendingCount ?? 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">From confirmed bookings, released on completion</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Escrow Secured</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Client payments held securely
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Funds released automatically when sessions are marked complete</p>
                </div>
              </>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Earned"
              value={formatCurrency(wallet?.totalEarned ?? 0, currency)}
              color="bg-gray-100 dark:bg-gray-700"
              icon={
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
                </svg>
              }
            />
            <StatCard
              label="Total Spent"
              value={formatCurrency(wallet?.totalSpent ?? 0, currency)}
              color="bg-gray-100 dark:bg-gray-700"
              icon={
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 16l4-4m-4 4l-4-4" />
                </svg>
              }
            />
            <StatCard
              label="Escrow Held"
              value={formatCurrency(stats.escrowHeld, currency)}
              color="bg-gray-100 dark:bg-gray-700"
              icon={
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <StatCard
              label="Commission Paid"
              value={formatCurrency(stats.commissionPaid, currency)}
              color="bg-gray-100 dark:bg-gray-700"
              icon={
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                </svg>
              }
            />
          </div>

          {/* ── Spending / earning chart (last 6 months) ── */}
          {insights?.monthly && insights.monthly.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Cash Flow — Last 6 Months</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Money in (credits) vs money out (debits)</p>
              {(() => {
                const max = Math.max(...insights.monthly.map((m: any) => Math.max(m.credits, m.debits)), 1);
                return (
                  <div className="space-y-3">
                    {insights.monthly.map((m: any) => {
                      const [y, mo] = m.month.split('-');
                      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en', { month: 'short', year: '2-digit' });
                      return (
                        <div key={m.month}>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span className="font-medium">{label}</span>
                            <span>In: {currency} {m.credits.toLocaleString()} · Out: {currency} {m.debits.toLocaleString()}</span>
                          </div>
                          <div className="flex gap-1 h-6">
                            <div className="bg-green-100 dark:bg-green-900/30 rounded" style={{ flex: m.credits / max || 0.01 }}>
                              <div className="h-full bg-green-500 rounded" style={{ width: '100%' }} />
                            </div>
                            <div className="bg-red-100 dark:bg-red-900/30 rounded" style={{ flex: m.debits / max || 0.01 }}>
                              <div className="h-full bg-red-500 rounded" style={{ width: '100%' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {insights.byType && insights.byType.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">By transaction type</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {insights.byType.map((t: any) => (
                      <div key={t.name} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase">{t.name.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{t.count} {t.count === 1 ? 'tx' : 'txs'}</p>
                        <p className="text-[11px] text-gray-500">↓ {currency} {t.credits.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-500">↑ {currency} {t.debits.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upcoming escrow releases (countdown) ── */}
          {upcomingEscrow.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Upcoming Escrow Releases</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Funds auto-release 72h after a session is marked complete</p>
              <div className="space-y-3">
                {upcomingEscrow.slice(0, 5).map((e: any) => {
                  const other = e.role === 'TRAINER' ? e.booking.client : e.booking.trainer;
                  const countdown = e.hoursUntilRelease != null ? (e.hoursUntilRelease > 24 ? `${Math.floor(e.hoursUntilRelease / 24)}d ${e.hoursUntilRelease % 24}h` : `${e.hoursUntilRelease}h`) : 'Pending session';
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-[#192C67]/10 flex items-center justify-center text-[10px] font-bold text-[#192C67] dark:text-[#5b8bc7] overflow-hidden shrink-0">
                        {other?.avatar ? <img src={other.avatar} alt="" className="w-full h-full object-cover" /> : `${(other?.firstName?.[0] || '')}${(other?.lastName?.[0] || '')}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{other?.firstName} {other?.lastName}</p>
                        <p className="text-[11px] text-gray-500">{e.role === 'TRAINER' ? 'Payment for session on ' : 'Escrow for session on '}{e.booking.scheduledAt ? formatDate(e.booking.scheduledAt) : 'TBD'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{currency} {Number(e.amount).toLocaleString()}</p>
                        <p className={`text-[11px] font-medium ${e.hoursUntilRelease != null && e.hoursUntilRelease <= 24 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {e.hoursUntilRelease != null ? `Releases in ${countdown}` : countdown}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Withdrawal status tracker ── */}
          {withdrawals.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Recent Withdrawals</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Track processing and payout status</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Amount</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Provider</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.slice(0, 10).map((w: any) => {
                      const statusStyle: Record<string, string> = {
                        PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                        PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                        FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                        REFUNDED: 'bg-gray-100 text-gray-600',
                      };
                      return (
                        <tr key={w.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <td className="py-2.5 text-xs">{formatDate(w.createdAt)}</td>
                          <td className="py-2.5 font-semibold text-gray-900 dark:text-white">{currency} {w.amount.toLocaleString()}</td>
                          <td className="py-2.5 text-xs">{w.provider}</td>
                          <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle[w.status] || 'bg-gray-100 text-gray-600'}`}>{w.status}</span></td>
                          <td className="py-2.5 text-[11px] text-gray-500 font-mono">{w.providerRef || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ESCROW TAB ─── */}
      {activeTab === 'escrow' && (
        <div className="space-y-6">
          {/* Escrow summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <EscrowStatusBadge status="FUNDED" />
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(escrowStats.funded, currency)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Funded</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <EscrowStatusBadge status="HELD" />
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(escrowStats.held, currency)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In Progress</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <EscrowStatusBadge status="RELEASED" />
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(escrowStats.released, currency)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Released</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <EscrowStatusBadge status="REFUNDED" />
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(escrowStats.refunded, currency)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Refunded</p>
            </div>
          </div>

          {/* Escrow bookings list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {isClient ? 'Your Active Escrows' : 'Escrows Pending Release'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isClient
                  ? 'Bookings where your payment is held in escrow'
                  : 'Client payments pending release after session completion'}
              </p>
            </div>

            {escrowLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading escrow data...
                </div>
              </div>
            ) : escrowBookings.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
                          {isClient ? 'Trainer' : 'Client'}
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {escrowBookings.map((b) => {
                        const otherParty = isClient ? b.trainer?.user : b.client;
                        const name = otherParty
                          ? `${otherParty.firstName || ''} ${otherParty.lastName || ''}`
                          : (isClient ? 'Trainer' : 'Client');
                        const escrow = b.escrowStatus || (b.status === 'COMPLETED' ? 'RELEASED' : b.status === 'CANCELLED' ? 'REFUNDED' : 'FUNDED');
                        return (
                          <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{name}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(Number(b.amount || 0), b.currency || currency)}
                            </td>
                            <td className="px-4 py-3">
                              <EscrowStatusBadge status={escrow} />
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {formatDate(b.scheduledAt || b.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <EscrowTimeline booking={b} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                  {escrowBookings.map((b) => {
                    const otherParty = isClient ? b.trainer?.user : b.client;
                    const name = otherParty
                      ? `${otherParty.firstName || ''} ${otherParty.lastName || ''}`
                      : (isClient ? 'Trainer' : 'Client');
                    const escrow = b.escrowStatus || (b.status === 'COMPLETED' ? 'RELEASED' : b.status === 'CANCELLED' ? 'REFUNDED' : 'FUNDED');
                    return (
                      <div key={b.id} className="px-4 py-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(Number(b.amount || 0), b.currency || currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <EscrowStatusBadge status={escrow} />
                          <span className="text-xs text-gray-400">{formatDate(b.scheduledAt || b.createdAt)}</span>
                        </div>
                        <EscrowTimeline booking={b} />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-12">
                <EmptyState
                  title="No escrow bookings"
                  description={isClient
                    ? 'When you book a trainer, your payment is held in escrow until the session completes.'
                    : 'Client payments for your bookings will appear here.'}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TRANSACTIONS TAB ─── */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Header with filter tabs */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h2>
                {totalCount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{totalCount} transaction{totalCount !== 1 ? 's' : ''} found</p>
                )}
              </div>
              <button onClick={handleExportCsv} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#192C67] text-white hover:bg-[#162d4a] disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>

            {/* Search + Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="relative sm:col-span-2">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={txSearch} onChange={e => { setTxSearch(e.target.value); setPage(1); }} placeholder="Search description or reference..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none" />
              </div>
              <input type="date" value={txDateFrom} onChange={e => { setTxDateFrom(e.target.value); setPage(1); }} placeholder="From" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
              <input type="date" value={txDateTo} onChange={e => { setTxDateTo(e.target.value); setPage(1); }} placeholder="To" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
            </div>

            {/* Direction + type filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['', 'CREDIT', 'DEBIT'] as const).map((d) => (
                  <button key={d || 'all'} onClick={() => { setTxDirection(d); setPage(1); }} className={cn('px-3 py-1 text-xs font-medium rounded-md', txDirection === d ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                    {d === '' ? 'All' : d === 'CREDIT' ? '↓ In' : '↑ Out'}
                  </button>
                ))}
              </div>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterType(opt.value); setPage(1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    filterType === opt.value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
              {(txSearch || txDateFrom || txDateTo || txDirection || filterType) && (
                <button onClick={() => { setTxSearch(''); setTxDateFrom(''); setTxDateTo(''); setTxDirection(''); setFilterType(''); setPage(1); }} className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:underline">Clear all</button>
              )}
            </div>
          </div>

          {/* Loading overlay */}
          {txLoading && (
            <div className="p-8 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading transactions...
              </div>
            </div>
          )}

          {/* Transaction list */}
          {!txLoading && transactions.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      <th className="px-6 py-3">Transaction</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((tx) => {
                      const refType = tx.referenceType || tx.type || '';
                      const isCredit = isCreditTx(tx);
                      const amount = getTxAmount(tx);
                      return (
                        <tr key={tx.id} onClick={() => openReceipt(tx.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <TxIcon refType={refType} isCredit={isCredit} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {tx.description || typeLabel(refType)}
                                </p>
                                {tx.referenceId && (
                                  <p className="text-[10px] text-gray-400 font-mono truncate">Ref: {tx.referenceId}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={typeBadgeClasses(refType)}>{typeLabel(refType)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div title={formatDateTime(tx.createdAt)}>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{formatRelative(tx.createdAt)}</p>
                              <p className="text-[10px] text-gray-400">{formatDateTime(tx.createdAt)}</p>
                            </div>
                          </td>
                          <td className={cn('px-6 py-4 text-sm font-bold text-right whitespace-nowrap', txAmountColor(isCredit))}>
                            {isCredit ? '+' : '-'}{formatCurrency(amount, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((tx) => {
                  const refType = tx.referenceType || tx.type || '';
                  const isCredit = isCreditTx(tx);
                  const amount = getTxAmount(tx);
                  return (
                    <button key={tx.id} onClick={() => openReceipt(tx.id)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 text-left transition-colors">
                      <TxIcon refType={refType} isCredit={isCredit} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {tx.description || typeLabel(refType)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={typeBadgeClasses(refType)}>{typeLabel(refType)}</span>
                          <span className="text-[10px] text-gray-400" title={formatDateTime(tx.createdAt)}>
                            {formatRelative(tx.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className={cn('text-sm font-bold whitespace-nowrap', txAmountColor(isCredit))}>
                        {isCredit ? '+' : '-'}{formatCurrency(amount, currency)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!txLoading && transactions.length === 0 && (
            <div className="p-12">
              <EmptyState
                title={filterType ? `No ${typeLabel(filterType).toLowerCase()} transactions` : 'No transactions yet'}
                description={
                  filterType
                    ? 'Try selecting a different filter or check back later.'
                    : 'Deposits, withdrawals, and booking payments will appear here.'
                }
                action={
                  filterType
                    ? { label: 'Clear Filter', onClick: () => { setFilterType(''); setPage(1); } }
                    : { label: 'Make a Deposit', onClick: openDepositModal }
                }
              />
            </div>
          )}

          {/* Pagination */}
          {!txLoading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      </div>

      {/* ─── Deposit Modal ─── */}
      <Modal isOpen={showDeposit} onClose={() => setShowDeposit(false)} title="Deposit Funds" size="sm">
        <div className="space-y-5">
          {/* Provider tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {([
              { k: 'MPESA' as const, label: 'M-Pesa' },
              { k: 'CARD' as const, label: 'Card' },
              { k: 'BANK_TRANSFER' as const, label: 'Bank' },
            ]).map(p => (
              <button key={p.k} onClick={() => setDepositProvider(p.k)} className={cn('flex-1 py-2 text-xs font-medium rounded-md transition-colors', depositProvider === p.k ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                {p.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {depositProvider === 'MPESA' && 'M-Pesa STK push — complete on your phone within 60s.'}
            {depositProvider === 'CARD' && 'Pay with Visa, Mastercard, or verve card. 3D Secure verification may apply.'}
            {depositProvider === 'BANK_TRANSFER' && 'Send to platform bank account. Funds credited after confirmation (up to 24h).'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (KES)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KES</span>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(String(amt))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    Number(depositAmount) === amt
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  )}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* M-Pesa fields */}
          {depositProvider === 'MPESA' && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">M-Pesa</p>
                  <p className="text-xs text-green-600 dark:text-green-400">STK Push to your phone</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(e.target.value)}
                  placeholder="254712345678"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use your registered phone number.</p>
              </div>
            </>
          )}

          {/* Card fields */}
          {depositProvider === 'CARD' && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Card Payment</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Visa, Mastercard, Verve</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Card Number</label>
                <input type="text" value={depositCardNumber} onChange={(e) => setDepositCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono" maxLength={19} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry (MM/YY)</label>
                  <input type="text" value={depositCardExpiry} onChange={(e) => setDepositCardExpiry(e.target.value)} placeholder="12/26" maxLength={5} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CVC</label>
                  <input type="text" value={depositCardCvc} onChange={(e) => setDepositCardCvc(e.target.value)} placeholder="123" maxLength={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono" />
                </div>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">🔒 Card processing is handled by our PCI-compliant gateway. Card details are never stored on our servers.</p>
            </>
          )}

          {/* Bank transfer fields */}
          {depositProvider === 'BANK_TRANSFER' && (
            <>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Transfer to this account:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium">KCB Bank Kenya</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account Name</span><span className="font-medium">SkillSasa</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Account Number</span><span className="font-mono font-medium">1234567890</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Branch</span><span className="font-medium">Westlands 01106</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono font-medium">{user?.id?.slice(0, 8).toUpperCase() || 'YOUR ID'}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your bank account (for reference)</label>
                <input type="text" value={depositBankAccount} onChange={(e) => setDepositBankAccount(e.target.value)} placeholder="Your bank account number" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">⏱ Bank transfers are typically credited within 2–24 hours after we receive the funds.</p>
            </>
          )}

          <button
            onClick={handleDeposit}
            disabled={depositLoading || !depositAmount || Number(depositAmount) <= 0 || (depositProvider === 'MPESA' && !depositPhone.trim())}
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {depositLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>Deposit {depositAmount ? `KES ${Number(depositAmount).toLocaleString()}` : ''} via {depositProvider === 'MPESA' ? 'M-Pesa' : depositProvider === 'CARD' ? 'Card' : 'Bank'}</>
            )}
          </button>
        </div>
      </Modal>

      {/* ─── Withdraw Modal ─── */}
      <Modal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} title="Withdraw Funds" size="sm">
        <div className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <span className="text-sm text-gray-500 dark:text-gray-400">Available Balance</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(balance, currency)}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (KES)</label>
              <button
                onClick={handleWithdrawAll}
                disabled={balance <= 0}
                className="text-xs font-medium text-primary-500 hover:text-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw All
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KES</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={balance}
                className={cn(
                  'w-full pl-12 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-primary-500 outline-none',
                  Number(withdrawAmount) > balance
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                )}
              />
            </div>
            {Number(withdrawAmount) > balance && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Amount exceeds available balance
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.filter((amt) => amt <= balance).map((amt) => (
                <button
                  key={amt}
                  onClick={() => setWithdrawAmount(String(amt))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    Number(withdrawAmount) === amt
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  )}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">M-Pesa</p>
              <p className="text-xs text-green-600 dark:text-green-400">Funds sent to your M-Pesa</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">M-Pesa Phone Number</label>
            <input
              type="tel"
              value={withdrawPhone}
              onChange={(e) => setWithdrawPhone(e.target.value)}
              placeholder="254712345678"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={
              withdrawLoading ||
              !withdrawAmount ||
              Number(withdrawAmount) <= 0 ||
              Number(withdrawAmount) > balance ||
              !withdrawPhone
            }
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {withdrawLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>Withdraw {withdrawAmount ? `KES ${Number(withdrawAmount).toLocaleString()}` : ''} to M-Pesa</>
            )}
          </button>
        </div>
      </Modal>

      {/* ═══════════════ P2P TRANSFER MODAL ═══════════════ */}
      <Modal isOpen={showTransfer} onClose={() => { setShowTransfer(false); setTransferRecipient(null); setTransferAmount(''); setTransferRecipientQuery(''); }} title="Send Money" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Send money to another SkillSasa user instantly — no fees.</p>

          {/* Recipient search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recipient</label>
            {transferRecipient ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-sm font-bold text-primary-600 shrink-0 overflow-hidden">
                  {transferRecipient.avatar ? <img src={transferRecipient.avatar} className="w-full h-full object-cover" alt="" /> : `${(transferRecipient.firstName?.[0] || '')}${(transferRecipient.lastName?.[0] || '')}`.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{transferRecipient.firstName} {transferRecipient.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{transferRecipient.email}</p>
                </div>
                <button onClick={() => { setTransferRecipient(null); setTransferRecipientQuery(''); }} className="text-xs text-red-500 hover:text-red-700">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={transferRecipientQuery}
                  onChange={(e) => setTransferRecipientQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {transferRecipients.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {transferRecipients.map((u: any) => (
                      <button key={u.id} onClick={() => { setTransferRecipient(u); setTransferRecipientQuery(''); setTransferRecipients([]); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-600 shrink-0 overflow-hidden">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="" /> : `${(u.firstName?.[0] || '')}${(u.lastName?.[0] || '')}`.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email} · {u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {transferRecipientQuery.length >= 2 && transferRecipients.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No users matching &quot;{transferRecipientQuery}&quot;</p>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (KES)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">KES</span>
              <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0" min="1" max={balance} className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Your balance: {currency} {balance.toLocaleString()}</p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Note (optional)</label>
            <input type="text" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="What's this for?" maxLength={100} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          <button onClick={handleTransfer} disabled={transferLoading || !transferRecipient || !transferAmount || Number(transferAmount) <= 0 || Number(transferAmount) > balance} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {transferLoading ? 'Sending...' : transferRecipient && transferAmount ? `Send KES ${Number(transferAmount).toLocaleString()} to ${transferRecipient.firstName}` : 'Send'}
          </button>
        </div>
      </Modal>

      {/* ═══════════════ RECEIPT MODAL ═══════════════ */}
      <Modal isOpen={!!receiptId} onClose={() => { setReceiptId(null); setReceipt(null); }} title="Transaction Receipt" size="sm">
        {receiptLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : receipt ? (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${receipt.entryType === 'CREDIT' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <svg className={`w-7 h-7 ${receipt.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={receipt.entryType === 'CREDIT' ? "M7 16V4m0 0l-4 4m4-4l4 4" : "M17 8l4 4m0 0l-4 4m4-4H3"} />
                </svg>
              </div>
              <p className={`text-3xl font-black mt-3 ${receipt.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                {receipt.entryType === 'CREDIT' ? '+' : '−'} {receipt.currency} {receipt.amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">{receipt.entryType === 'CREDIT' ? 'Received' : 'Sent'}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Receipt ID</span><span className="font-mono text-xs">{receipt.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDateTime(receipt.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{typeLabel(receipt.referenceType)}</span></div>
              {receipt.referenceId && <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono text-xs">{receipt.referenceId.slice(0, 12)}</span></div>}
              {receipt.description && <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="text-right max-w-[60%]">{receipt.description}</span></div>}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-500">Account holder</span><span>{receipt.holder?.firstName} {receipt.holder?.lastName}</span></div>
            </div>
            <button onClick={() => window.print()} className="w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              🖨 Print / Save as PDF
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
