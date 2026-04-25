'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { financialService } from '@/lib/services/financial';
import { bookingService } from '@/lib/services/bookings';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  issuerId: string;
  recipientId: string;
  issuer?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  recipient?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  description?: string;
  lineItems?: any;
  dueDate?: string;
  issuedAt?: string;
  paidAt?: string;
  createdAt: string;
  bookingId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VOID: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const emptyLineItem = (): LineItem => ({ description: '', qty: 1, unitPrice: 0, total: 0 });

/* ─── Receipt download ───────────────────────────────────────────────────────── */

function downloadReceipt(inv: InvoiceRow) {
  const lineItems = (() => {
    try {
      const li = typeof inv.lineItems === 'string' ? JSON.parse(inv.lineItems) : inv.lineItems;
      return Array.isArray(li) ? li : [];
    } catch { return []; }
  })();

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${inv.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #192C67; padding-bottom: 20px; }
  .logo { font-size: 24px; font-weight: 900; color: #192C67; }
  .logo small { display: block; font-size: 11px; font-weight: 400; color: #64748b; letter-spacing: 1px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 28px; color: #192C67; text-transform: uppercase; letter-spacing: 2px; }
  .invoice-title .number { font-size: 14px; color: #64748b; margin-top: 4px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
  .status-PAID { background: #dcfce7; color: #166534; }
  .status-SENT { background: #dbeafe; color: #1e40af; }
  .status-DRAFT { background: #f1f5f9; color: #475569; }
  .status-OVERDUE { background: #fef2f2; color: #991b1b; }
  .status-VOID { background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
  .party p { font-size: 14px; margin-bottom: 2px; }
  .party .name { font-weight: 700; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; }
  th.amount { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals table { width: 280px; }
  .totals td { border: none; padding: 6px 12px; }
  .totals .grand { font-size: 18px; font-weight: 900; color: #192C67; border-top: 2px solid #192C67; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="margin-bottom:20px;text-align:right">
    <button onclick="window.print()" style="padding:10px 24px;background:#192C67;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div class="logo">SkillSasa<small>SKILLS TODAY. OPPORTUNITIES TOMORROW.</small></div>
    <div class="invoice-title">
      <h1>Invoice</h1>
      <div class="number">${inv.invoiceNumber}</div>
      <div style="margin-top:8px"><span class="status status-${inv.status}">${inv.status}</span></div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p class="name">${inv.issuer?.firstName || ''} ${inv.issuer?.lastName || ''}</p>
      <p>${inv.issuer?.email || ''}</p>
    </div>
    <div class="party">
      <h3>To</h3>
      <p class="name">${inv.recipient?.firstName || ''} ${inv.recipient?.lastName || ''}</p>
      <p>${inv.recipient?.email || ''}</p>
    </div>
  </div>
  <div class="parties">
    <div class="party"><h3>Issue Date</h3><p>${inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) : new Date(inv.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}</p></div>
    <div class="party"><h3>Due Date</h3><p style="color:${inv.status === 'OVERDUE' ? '#dc2626' : '#1e293b'}">${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) : 'On receipt'}</p></div>
  </div>
  ${inv.description ? `<p style="margin-bottom:20px;color:#475569;font-size:14px">${inv.description}</p>` : ''}
  <table>
    <thead><tr><th>Description</th><th class="amount">Qty</th><th class="amount">Unit Price</th><th class="amount">Total</th></tr></thead>
    <tbody>
      ${lineItems.length > 0 ? lineItems.map((li: any) => `<tr><td>${li.description || ''}</td><td class="amount">${li.qty || li.quantity || 1}</td><td class="amount">KES ${Number(li.unitPrice || 0).toLocaleString()}</td><td class="amount">KES ${Number(li.total || 0).toLocaleString()}</td></tr>`).join('') : `<tr><td>${inv.description || 'Services rendered'}</td><td class="amount">1</td><td class="amount">KES ${Number(inv.amount).toLocaleString()}</td><td class="amount">KES ${Number(inv.amount).toLocaleString()}</td></tr>`}
    </tbody>
  </table>
  <div class="totals"><table>
    <tr><td>Subtotal</td><td class="amount">KES ${Number(inv.amount).toLocaleString()}</td></tr>
    <tr><td>Tax</td><td class="amount">KES ${Number(inv.tax || 0).toLocaleString()}</td></tr>
    <tr><td class="grand">Total</td><td class="amount grand">KES ${Number(inv.total).toLocaleString()}</td></tr>
    ${inv.status === 'PAID' ? `<tr><td style="color:#166534;font-weight:700">Paid</td><td class="amount" style="color:#166534;font-weight:700">${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-KE') : 'Yes'}</td></tr>` : ''}
  </table></div>
  <div class="footer">
    <p>SkillSasa &mdash; Kenya&apos;s Skills & Trainer Marketplace</p>
    <p>support@skillsasa.co.ke &middot; www.skillsasa.co.ke</p>
  </div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

/* ─── Status badge ───────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────────── */

export default function InvoicesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isTrainer = user?.role === 'TRAINER';
  const userId = user?.id;

  /* ─── Tab state ─── */
  const trainerTabs = ['Sent', 'Received', 'Drafts'] as const;
  const clientTabs = ['Received', 'Paid'] as const;
  const tabs = isTrainer ? trainerTabs : clientTabs;
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  /* ─── Data state ─── */
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ─── Modals ─── */
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ─── Create form state ─── */
  const [formRecipientSearch, setFormRecipientSearch] = useState('');
  const [formRecipientId, setFormRecipientId] = useState('');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formLineItems, setFormLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [formTaxEnabled, setFormTaxEnabled] = useState(false);
  const [formTaxRate, setFormTaxRate] = useState(16);
  const [formDueDate, setFormDueDate] = useState('');

  /* ─── Fetch invoices ─── */

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };

      if (isTrainer) {
        if (activeTab === 'Sent') params.status = 'SENT';
        else if (activeTab === 'Drafts') params.status = 'DRAFT';
        // 'Received' = no status filter, we'll filter client-side
      } else {
        if (activeTab === 'Paid') params.status = 'PAID';
        // 'Received' = no status filter, we'll filter client-side
      }

      const res = await financialService.myInvoices(params);
      const items: InvoiceRow[] = Array.isArray(res) ? res : res?.items || [];

      // Filter based on perspective
      let filtered = items;
      if (isTrainer && activeTab === 'Sent') {
        filtered = items.filter(i => i.issuerId === userId && i.status === 'SENT');
      } else if (isTrainer && activeTab === 'Received') {
        filtered = items.filter(i => i.recipientId === userId);
      } else if (isTrainer && activeTab === 'Drafts') {
        filtered = items.filter(i => i.issuerId === userId && i.status === 'DRAFT');
      } else if (!isTrainer && activeTab === 'Received') {
        filtered = items.filter(i => i.recipientId === userId && i.status !== 'PAID');
      } else if (!isTrainer && activeTab === 'Paid') {
        filtered = items.filter(i => i.recipientId === userId && i.status === 'PAID');
      }

      setInvoices(filtered);
      setTotalPages(res?.totalPages || 1);
    } catch {
      addToast('error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, isTrainer, userId, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await financialService.invoiceStats();
      setStats(s);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  /* ─── Client search (debounced) ─── */

  const searchTimer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!clientDropdownOpen || formRecipientId) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchingClients(true);
      try {
        // Use bookings as a source of known clients
        const res = await bookingService.list({ limit: 50 });
        const bookings = res?.items || [];
        const seen = new Set<string>();
        const clients: any[] = [];
        for (const b of bookings) {
          const client = b.client;
          if (client && !seen.has(client.id)) {
            seen.add(client.id);
            if (
              !formRecipientSearch ||
              `${client.firstName} ${client.lastName}`.toLowerCase().includes(formRecipientSearch.toLowerCase()) ||
              (client.email && client.email.toLowerCase().includes(formRecipientSearch.toLowerCase()))
            ) {
              clients.push(client);
            }
          }
        }
        setClientResults(clients.slice(0, 10));
      } catch { setClientResults([]); }
      finally { setSearchingClients(false); }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [formRecipientSearch, clientDropdownOpen, formRecipientId]);

  /* ─── Line items helpers ─── */

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setFormLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') item.description = value as string;
      else if (field === 'qty') item.qty = Math.max(0, Number(value));
      else if (field === 'unitPrice') item.unitPrice = Math.max(0, Number(value));
      item.total = item.qty * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  };

  const addLineItem = () => setFormLineItems(prev => [...prev, emptyLineItem()]);
  const removeLineItem = (index: number) => {
    setFormLineItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const subtotal = formLineItems.reduce((sum, li) => sum + li.total, 0);
  const taxAmount = formTaxEnabled ? subtotal * (formTaxRate / 100) : 0;
  const grandTotal = subtotal + taxAmount;

  const resetForm = () => {
    setFormRecipientSearch('');
    setFormRecipientId('');
    setFormRecipientName('');
    setClientResults([]);
    setFormDescription('');
    setFormLineItems([emptyLineItem()]);
    setFormTaxEnabled(false);
    setFormTaxRate(16);
    setFormDueDate('');
  };

  /* ─── Actions ─── */

  const handleCreate = async (sendNow: boolean) => {
    if (!formRecipientId) { addToast('warning', 'Please select a recipient'); return; }
    if (formLineItems.every(li => !li.description || li.total === 0)) {
      addToast('warning', 'Add at least one line item with a description and amount');
      return;
    }
    setActionLoading(true);
    try {
      const payload: Record<string, any> = {
        recipientId: formRecipientId,
        amount: subtotal,
        description: formDescription || undefined,
        lineItems: formLineItems.filter(li => li.description && li.total > 0),
        includeTax: formTaxEnabled,
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined,
      };
      if (formTaxEnabled) {
        payload.tax = taxAmount;
      }

      const created = await financialService.createInvoice(payload);
      if (sendNow && created?.id) {
        await financialService.sendInvoice(created.id);
        addToast('success', 'Invoice created and sent');
      } else {
        addToast('success', 'Invoice saved as draft');
      }
      setCreateModal(false);
      resetForm();
      fetchInvoices();
      fetchStats();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.data?.message || 'Failed to save invoice';
      addToast('error', typeof msg === 'string' ? msg : 'Failed to save invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async (inv: InvoiceRow) => {
    setActionLoading(true);
    try {
      await financialService.sendInvoice(inv.id);
      addToast('success', 'Invoice sent');
      fetchInvoices();
      fetchStats();
      if (selectedInvoice?.id === inv.id) {
        const fresh = await financialService.invoiceDetail(inv.id);
        setSelectedInvoice(fresh);
      }
    } catch { addToast('error', 'Failed to send invoice'); }
    finally { setActionLoading(false); }
  };

  const handleMarkPaid = async (inv: InvoiceRow) => {
    setActionLoading(true);
    try {
      await financialService.markPaid(inv.id);
      addToast('success', 'Invoice marked as paid');
      fetchInvoices();
      fetchStats();
      if (selectedInvoice?.id === inv.id) {
        const fresh = await financialService.invoiceDetail(inv.id);
        setSelectedInvoice(fresh);
      }
    } catch { addToast('error', 'Failed to mark invoice as paid'); }
    finally { setActionLoading(false); }
  };

  const handleVoid = async (inv: InvoiceRow) => {
    setActionLoading(true);
    try {
      await financialService.voidInvoice(inv.id);
      addToast('success', 'Invoice voided');
      fetchInvoices();
      fetchStats();
      if (selectedInvoice?.id === inv.id) {
        const fresh = await financialService.invoiceDetail(inv.id);
        setSelectedInvoice(fresh);
      }
    } catch { addToast('error', 'Failed to void invoice'); }
    finally { setActionLoading(false); }
  };

  const openDetail = async (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    setDetailModal(true);
    try {
      const fresh = await financialService.invoiceDetail(inv.id);
      setSelectedInvoice(fresh);
    } catch { /* keep existing data */ }
  };

  /* ─── Helpers ─── */

  const isDueDateOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getOtherParty = (inv: InvoiceRow) => {
    if (inv.issuerId === userId) return inv.recipient;
    return inv.issuer;
  };

  const getOtherPartyLabel = (inv: InvoiceRow) => {
    const party = getOtherParty(inv);
    if (!party) return '--';
    return `${party.firstName} ${party.lastName}`;
  };

  /* ─── Stats summary ─── */

  const statsCards = isTrainer
    ? [
        { label: 'Total Issued', value: stats?.totalIssued || 0, amount: stats?.totalIssuedAmount || 0, color: 'blue' },
        { label: 'Paid', value: stats?.totalPaid || 0, amount: stats?.totalPaidAmount || 0, color: 'green' },
        { label: 'Outstanding', value: stats?.outstandingCount || 0, amount: stats?.outstandingAmount || 0, color: 'amber' },
      ]
    : null; // Clients don't need issuer stats

  /* ─── Render ─── */

  if (loading && invoices.length === 0) return <PageSkeleton />;

  /* ─── Role gate: invoices are a trainer tool ─── */
  if (user && user.role !== 'TRAINER') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">For Trainers Only</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Invoices are a billing tool for trainers. As a learner, your payment receipts are available in your payments history.
          </p>
          <a
            href="/payments"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#192C67] text-white font-semibold text-sm hover:bg-[#162d4a] transition-colors"
          >
            View Payment History
          </a>
        </div>
      </div>
    );
  }

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
          <div className="max-w-7xl mx-auto w-full flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Invoices</h1>
              <p className="text-sm text-white/70">
                {isTrainer ? 'Create, send, and manage your invoices' : 'View and pay invoices from trainers'}
              </p>
            </div>
            {isTrainer && (
              <button
                onClick={() => { resetForm(); setCreateModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#F77B0F', boxShadow: '0 2px 10px rgba(247,123,15,0.4)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Stats (trainer only) */}
      {statsCards && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatCurrency(Number(s.amount))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {invoices.length === 0 && !loading ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} invoices`}
          description={
            isTrainer && activeTab === 'Drafts'
              ? 'Create a new invoice to get started'
              : isTrainer
                ? 'Invoices will appear here once created and sent'
                : 'You have no invoices in this category'
          }
          action={
            isTrainer && activeTab === 'Drafts'
              ? { label: 'Create Invoice', onClick: () => { resetForm(); setCreateModal(true); } }
              : undefined
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {isTrainer && activeTab === 'Sent' ? 'Recipient' : isTrainer && activeTab === 'Received' ? 'From' : 'From / To'}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((inv) => {
                  const overdue = isDueDateOverdue(inv.dueDate) && !['PAID', 'VOID'].includes(inv.status);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => openDetail(inv)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{getOtherPartyLabel(inv)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{getOtherParty(inv)?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className={cn('px-4 py-3 text-sm', overdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400')}>
                        {inv.dueDate ? formatDate(inv.dueDate) : '--'}
                        {overdue && <span className="ml-1 text-[10px] font-bold uppercase">overdue</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {/* Trainer actions */}
                          {isTrainer && inv.issuerId === userId && inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSend(inv)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                            >
                              Send
                            </button>
                          )}
                          {isTrainer && inv.issuerId === userId && ['SENT', 'OVERDUE'].includes(inv.status) && (
                            <>
                              <button
                                onClick={() => handleSend(inv)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleVoid(inv)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                              >
                                Void
                              </button>
                            </>
                          )}
                          {/* Client actions - pay button */}
                          {!isTrainer && inv.recipientId === userId && ['SENT', 'OVERDUE'].includes(inv.status) && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                          {/* Receipt download always available */}
                          <button
                            onClick={() => downloadReceipt(inv)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#192C67]/10 text-[#192C67] hover:bg-[#192C67]/20 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {invoices.map((inv) => {
              const overdue = isDueDateOverdue(inv.dueDate) && !['PAID', 'VOID'].includes(inv.status);
              return (
                <div
                  key={inv.id}
                  onClick={() => openDetail(inv)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{getOtherPartyLabel(inv)}</p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(Number(inv.total))}</p>
                    <p className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                      {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : 'Due on receipt'}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    {isTrainer && inv.issuerId === userId && inv.status === 'DRAFT' && (
                      <button onClick={() => handleSend(inv)} disabled={actionLoading} className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/10 text-blue-600">Send</button>
                    )}
                    {!isTrainer && inv.recipientId === userId && ['SENT', 'OVERDUE'].includes(inv.status) && (
                      <button onClick={() => handleMarkPaid(inv)} disabled={actionLoading} className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-500/10 text-green-600">Pay</button>
                    )}
                    <button onClick={() => downloadReceipt(inv)} className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#192C67]/10 text-[#192C67] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      <Modal
        isOpen={detailModal}
        onClose={() => { setDetailModal(false); setSelectedInvoice(null); }}
        title="Invoice Details"
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(selectedInvoice.createdAt)}</p>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">From</span>
                {selectedInvoice.issuer ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1.5">{selectedInvoice.issuer.firstName} {selectedInvoice.issuer.lastName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInvoice.issuer.email}</p>
                  </>
                ) : <p className="mt-1.5 text-gray-400">--</p>}
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">To</span>
                {selectedInvoice.recipient ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1.5">{selectedInvoice.recipient.firstName} {selectedInvoice.recipient.lastName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInvoice.recipient.email}</p>
                  </>
                ) : <p className="mt-1.5 text-gray-400">--</p>}
              </div>
            </div>

            {/* Description */}
            {selectedInvoice.description && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Description</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedInvoice.description}</p>
              </div>
            )}

            {/* Line Items */}
            {(() => {
              let items: any[] = [];
              try {
                const li = typeof selectedInvoice.lineItems === 'string' ? JSON.parse(selectedInvoice.lineItems) : selectedInvoice.lineItems;
                items = Array.isArray(li) ? li : [];
              } catch { items = []; }
              return items.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Line Items</h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Qty</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">{item.description}</td>
                            <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{item.qty || item.quantity || 1}</td>
                            <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(Number(item.unitPrice || 0))}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(item.total || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Totals */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">{formatCurrency(Number(selectedInvoice.amount || 0))}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <span className="text-xs text-gray-500 dark:text-gray-400">Tax</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">{formatCurrency(Number(selectedInvoice.tax || 0))}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#192C67]/5 border border-[#192C67]/20">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                <p className="font-bold text-lg text-[#192C67] dark:text-[#5b8bc7] mt-1">{formatCurrency(Number(selectedInvoice.total || 0))}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400 w-24">Created</span>
                  <span className="text-gray-900 dark:text-white">{formatDateTime(selectedInvoice.createdAt)}</span>
                </div>
                {selectedInvoice.dueDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className={cn('w-2 h-2 rounded-full', isDueDateOverdue(selectedInvoice.dueDate) && !['PAID', 'VOID'].includes(selectedInvoice.status) ? 'bg-red-500' : 'bg-amber-400')} />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Due Date</span>
                    <span className={isDueDateOverdue(selectedInvoice.dueDate) && !['PAID', 'VOID'].includes(selectedInvoice.status) ? 'text-red-600 font-medium' : 'text-gray-900 dark:text-white'}>{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                )}
                {selectedInvoice.issuedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Sent</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(selectedInvoice.issuedAt)}</span>
                  </div>
                )}
                {selectedInvoice.paidAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-500 dark:text-gray-400 w-24">Paid</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(selectedInvoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Trainer: send draft */}
              {isTrainer && selectedInvoice.issuerId === userId && selectedInvoice.status === 'DRAFT' && (
                <>
                  <button onClick={() => handleSend(selectedInvoice)} disabled={actionLoading} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
                    {actionLoading ? 'Sending...' : 'Send Invoice'}
                  </button>
                  <button onClick={() => handleVoid(selectedInvoice)} disabled={actionLoading} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors">
                    Void
                  </button>
                </>
              )}
              {/* Trainer: resend/void sent */}
              {isTrainer && selectedInvoice.issuerId === userId && ['SENT', 'OVERDUE'].includes(selectedInvoice.status) && (
                <>
                  <button onClick={() => handleSend(selectedInvoice)} disabled={actionLoading} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Resend
                  </button>
                  <button onClick={() => handleVoid(selectedInvoice)} disabled={actionLoading} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors">
                    Void
                  </button>
                </>
              )}
              {/* Client: pay */}
              {!isTrainer && selectedInvoice.recipientId === userId && ['SENT', 'OVERDUE'].includes(selectedInvoice.status) && (
                <button onClick={() => handleMarkPaid(selectedInvoice)} disabled={actionLoading} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors">
                  {actionLoading ? 'Processing...' : 'Pay Now'}
                </button>
              )}
              {/* Download receipt always */}
              <button
                onClick={() => downloadReceipt(selectedInvoice)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#192C67] text-white hover:bg-[#162d4a] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== CREATE INVOICE MODAL ==================== */}
      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); resetForm(); }}
        title="Create Invoice"
        size="xl"
      >
        <div className="space-y-5">
          {/* Recipient search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recipient *</label>
            {formRecipientId ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formRecipientName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Selected</p>
                </div>
                <button onClick={() => { setFormRecipientId(''); setFormRecipientName(''); setFormRecipientSearch(''); }} className="text-xs text-red-500 hover:text-red-600">Remove</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={formRecipientSearch}
                  onChange={e => setFormRecipientSearch(e.target.value)}
                  onFocus={() => setClientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                  placeholder="Search your clients..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/50"
                />
                {searchingClients && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  </div>
                )}
                {clientDropdownOpen && clientResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientResults.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setFormRecipientId(c.id);
                          setFormRecipientName(`${c.firstName} ${c.lastName}`);
                          setFormRecipientSearch('');
                          setClientResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{c.firstName} {c.lastName}</span>
                        {c.email && <span className="text-gray-500 dark:text-gray-400 ml-2">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={2}
              placeholder="Invoice description or notes..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/50"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items *</label>
              <button onClick={addLineItem} className="text-xs font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Row
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400 w-20">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400 w-28">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400 w-28">Total</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {formLineItems.map((li, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        <input
                          value={li.description}
                          onChange={e => updateLineItem(i, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#192C67]/50"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          value={li.qty || ''}
                          onChange={e => updateLineItem(i, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-transparent text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#192C67]/50"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={li.unitPrice || ''}
                          onChange={e => updateLineItem(i, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-transparent text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#192C67]/50"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-sm text-gray-900 dark:text-white">
                        {formatCurrency(li.total)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {formLineItems.length > 1 && (
                          <button onClick={() => removeLineItem(i)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formTaxEnabled}
                onChange={e => setFormTaxEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#192C67] focus:ring-[#192C67]/50"
              />
              Apply Tax (VAT)
            </label>
            {formTaxEnabled && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formTaxRate}
                  onChange={e => setFormTaxRate(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#192C67]/50"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
              </div>
            )}
          </div>

          {/* Totals preview */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            {formTaxEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tax ({formTaxRate}%)</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-[#192C67] dark:text-[#5b8bc7]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
            <div className="relative">
              <input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/50 [color-scheme:light] dark:[color-scheme:dark]"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setCreateModal(false); resetForm(); }}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleCreate(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#192C67] text-white text-sm font-medium hover:bg-[#192C67]/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  Sending...
                </>
              ) : 'Send Now'}
            </button>
          </div>
        </div>
      </Modal>

      </div>
    </div>
  );
}
