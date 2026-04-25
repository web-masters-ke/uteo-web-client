'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/toast';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import { milestoneService } from '@/lib/services/milestones';
import type {
  AttendanceRecord,
  Booking,
  Milestone,
  MilestoneStatus,
  PresenceStatus,
  User,
} from '@/lib/types';

/* ============================================================
   Helpers
   ============================================================ */
const STATUS_CHIP: Record<MilestoneStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes:
      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    classes:
      'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  DELIVERED: {
    label: 'Delivered',
    classes:
      'bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-secondary-800',
  },
  RELEASED: {
    label: 'Released',
    classes:
      'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  DISPUTED: {
    label: 'Disputed',
    classes:
      'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  },
};

const PROGRESS_BAR: Record<MilestoneStatus, { width: string; color: string }> = {
  PENDING:      { width: '10%',  color: 'bg-gray-300 dark:bg-gray-600' },
  IN_PROGRESS:  { width: '45%',  color: 'bg-blue-500' },
  DELIVERED:    { width: '75%',  color: 'bg-secondary-500' },
  RELEASED:     { width: '100%', color: 'bg-green-500' },
  DISPUTED:     { width: '60%',  color: 'bg-red-500' },
};

const PRESENCE_LABEL: Record<PresenceStatus, { label: string; classes: string }> = {
  PRESENT: { label: 'Present', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  ABSENT:  { label: 'Absent',  classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  LATE:    { label: 'Late',    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  EXCUSED: { label: 'Excused', classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

const currencyFmt = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});
const money = (n?: number | null) =>
  typeof n === 'number' && !isNaN(n) ? currencyFmt.format(n) : currencyFmt.format(0);

function safeDate(iso?: string) {
  if (!iso) return '—';
  try {
    return formatDate(iso);
  } catch {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  }
}

function safeRelative(iso?: string) {
  if (!iso) return '';
  try {
    return formatRelative(iso);
  } catch {
    return '';
  }
}

/* ============================================================
   Status chip
   ============================================================ */
function StatusChip({ status }: { status: MilestoneStatus }) {
  const c = STATUS_CHIP[status] || STATUS_CHIP.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        c.classes,
      )}
    >
      {c.label}
    </span>
  );
}

/* ============================================================
   Add / Edit milestone modal
   ============================================================ */
interface MilestoneFormState {
  title: string;
  description: string;
  amount: string;
  dueDate: string;
}

const EMPTY_FORM: MilestoneFormState = { title: '', description: '', amount: '', dueDate: '' };

function MilestoneFormModal({
  isOpen,
  onClose,
  onSubmit,
  initial,
  mode,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: MilestoneFormState) => void;
  initial?: MilestoneFormState;
  mode: 'create' | 'edit';
  saving: boolean;
}) {
  const [form, setForm] = useState<MilestoneFormState>(initial || EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial || EMPTY_FORM);
    setErr(null);
  }, [initial, isOpen]);

  const submit = () => {
    if (!form.title.trim()) return setErr('Title is required');
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return setErr('Amount must be greater than 0');
    setErr(null);
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      amount: String(amt),
      dueDate: form.dueDate,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add Milestone' : 'Edit Milestone'}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Module 1: Foundations"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="What will be delivered in this milestone?"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Amount (KES)
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="5000"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {err && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {err}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   Dispute modal
   ============================================================ */
function DisputeModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
  submitting: boolean;
}) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setErr(null);
    }
  }, [isOpen]);

  const submit = () => {
    if (!note.trim()) return setErr('Please describe the issue');
    setErr(null);
    onSubmit(note.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Dispute" size="md">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Disputes pause this milestone and notify support. Please describe what went wrong so we can review quickly.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        placeholder="Describe the issue..."
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {err && (
        <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   Attendance modal (trainer)
   ============================================================ */
function AttendanceModal({
  isOpen,
  onClose,
  milestones,
  clientUser,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  milestones: Milestone[];
  clientUser?: User | null;
  onSubmit: (milestoneId: string | undefined, presence: PresenceStatus, note: string) => void;
  submitting: boolean;
}) {
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [presence, setPresence] = useState<PresenceStatus>('PRESENT');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMilestoneId('');
      setPresence('PRESENT');
      setNote('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Attendance" size="md">
      <div className="space-y-4">
        {clientUser && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
            Recording attendance for{' '}
            <span className="font-semibold">
              {clientUser.firstName} {clientUser.lastName}
            </span>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Milestone (optional)
          </label>
          <select
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">— Whole booking —</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Presence
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as PresenceStatus[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPresence(p)}
                className={cn(
                  'py-2 text-xs font-medium rounded-xl border transition-colors',
                  presence === p
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
                )}
              >
                {PRESENCE_LABEL[p].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(milestoneId || undefined, presence, note.trim())}
          disabled={submitting || !clientUser}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Record'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   MilestonesPanel — main component
   ============================================================ */
export interface MilestonesPanelProps {
  booking: Booking;
  isTrainer: boolean;
  isClient: boolean;
  currentUserId?: string;
}

export default function MilestonesPanel({
  booking,
  isTrainer,
  isClient,
  currentUserId,
}: MilestonesPanelProps) {
  const { addToast } = useToast();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(true);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitial, setFormInitial] = useState<MilestoneFormState | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmRelease, setConfirmRelease] = useState<Milestone | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<Milestone | null>(null);
  const [disputing, setDisputing] = useState(false);

  const [attOpen, setAttOpen] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  // per-row action loading state
  const [actionId, setActionId] = useState<string | null>(null);

  const bookingId = booking.id;

  /* ---------------- Data loaders ---------------- */
  const loadMilestones = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await milestoneService.list(bookingId);
      // Sort by orderIndex for stable UI
      const sorted = [...(data || [])].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      );
      setMilestones(sorted);
    } catch {
      addToast('error', 'Failed to load milestones');
    } finally {
      setLoadingList(false);
    }
  }, [bookingId, addToast]);

  const loadAttendance = useCallback(async () => {
    setLoadingAtt(true);
    try {
      const data = await milestoneService.listAttendance(bookingId);
      setAttendance(data || []);
    } catch {
      // Attendance may not be available for all bookings; fail quietly
      setAttendance([]);
    } finally {
      setLoadingAtt(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadMilestones();
    loadAttendance();
  }, [loadMilestones, loadAttendance]);

  /* ---------------- Totals ---------------- */
  const totals = useMemo(() => {
    const total = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const released = milestones
      .filter((m) => m.status === 'RELEASED')
      .reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const inFlight = milestones
      .filter((m) => ['IN_PROGRESS', 'DELIVERED', 'DISPUTED'].includes(m.status))
      .reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const remaining = Math.max(0, total - released);
    const pct = total > 0 ? Math.round((released / total) * 100) : 0;
    return { total, released, remaining, inFlight, pct };
  }, [milestones]);

  /* ---------------- Actions ---------------- */
  const openCreate = () => {
    setFormMode('create');
    setFormInitial(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (m: Milestone) => {
    setFormMode('edit');
    setEditingId(m.id);
    setFormInitial({
      title: m.title || '',
      description: m.description || '',
      amount: String(m.amount || ''),
      dueDate: m.dueDate || '',
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: MilestoneFormState) => {
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        amount: Number(values.amount),
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      };
      if (formMode === 'create') {
        const created = await milestoneService.create(bookingId, payload);
        setMilestones((prev) => [...prev, created].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
        addToast('success', 'Milestone created');
      } else if (editingId) {
        const updated = await milestoneService.update(editingId, payload);
        setMilestones((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        addToast('success', 'Milestone updated');
      }
      setFormOpen(false);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const handleDeliver = async (m: Milestone) => {
    setActionId(m.id);
    try {
      const updated = await milestoneService.deliver(m.id);
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      addToast('success', 'Milestone marked delivered');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to mark delivered');
    } finally {
      setActionId(null);
    }
  };

  const handleRelease = async () => {
    if (!confirmRelease) return;
    const m = confirmRelease;
    setActionId(m.id);
    try {
      const updated = await milestoneService.release(m.id);
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      addToast('success', 'Payment released');
      setConfirmRelease(null);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to release payment');
    } finally {
      setActionId(null);
    }
  };

  const handleDisputeSubmit = async (note: string) => {
    if (!disputeTarget) return;
    setDisputing(true);
    try {
      const updated = await milestoneService.dispute(disputeTarget.id, note);
      setMilestones((prev) => prev.map((x) => (x.id === disputeTarget.id ? updated : x)));
      addToast('success', 'Dispute submitted');
      setDisputeTarget(null);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setDisputing(false);
    }
  };

  const handleRecordAttendance = async (
    milestoneId: string | undefined,
    presence: PresenceStatus,
    note: string,
  ) => {
    const targetUserId = booking.clientId || booking.client?.id;
    if (!targetUserId) {
      addToast('error', 'Client user not available');
      return;
    }
    setAttSaving(true);
    try {
      await milestoneService.recordAttendance(bookingId, {
        milestoneId,
        entries: [{ userId: targetUserId, presenceStatus: presence, note: note || undefined }],
      });
      addToast('success', 'Attendance recorded');
      setAttOpen(false);
      await loadAttendance();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to record attendance');
    } finally {
      setAttSaving(false);
    }
  };

  /* ---------------- Render helpers ---------------- */
  const visibleAttendance = useMemo(() => {
    if (isTrainer) return attendance;
    if (isClient && currentUserId) {
      return attendance.filter((a) => a.userId === currentUserId);
    }
    return attendance;
  }, [attendance, isTrainer, isClient, currentUserId]);

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      {/* ── Summary card ─────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Escrow Progress</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Milestone-scoped escrow. Funds release per milestone as delivered.
            </p>
          </div>
          <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            {totals.pct}%
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500 transition-all"
            style={{ width: `${totals.pct}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total
            </p>
            <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
              {money(totals.total)}
            </p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-green-700 dark:text-green-300">
              Released
            </p>
            <p className="mt-1 text-base font-bold text-green-700 dark:text-green-300">
              {money(totals.released)}
            </p>
          </div>
          <div className="rounded-xl bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
              Remaining
            </p>
            <p className="mt-1 text-base font-bold text-secondary-700 dark:text-secondary-300">
              {money(totals.remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Milestones list ─────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Milestones</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
            </p>
          </div>
          {isTrainer && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              Add Milestone
            </button>
          )}
        </div>

        {loadingList ? (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading milestones...
          </div>
        ) : milestones.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No milestones yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {isTrainer
                ? 'Break this engagement into deliverable milestones to unlock escrow.'
                : 'The trainer has not set up milestones for this engagement yet.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {milestones.map((m, idx) => {
              const bar = PROGRESS_BAR[m.status] || PROGRESS_BAR.PENDING;
              const busy = actionId === m.id;
              const canEdit = isTrainer && m.status === 'PENDING';
              const canDeliver = isTrainer && (m.status === 'PENDING' || m.status === 'IN_PROGRESS');
              const canRelease = isClient && m.status === 'DELIVERED';
              const canDispute = m.status === 'DELIVERED';
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {m.title}
                        </h4>
                        <StatusChip status={m.status} />
                      </div>
                      {m.description && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">Amount:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {money(Number(m.amount))}
                          </span>
                        </span>
                        {m.dueDate && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400">Due:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                              {safeDate(m.dueDate)}
                            </span>
                          </span>
                        )}
                        {m.deliveredAt && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400">Delivered:</span>
                            <span className="font-medium text-secondary-700 dark:text-secondary-300">
                              {safeRelative(m.deliveredAt) || safeDate(m.deliveredAt)}
                            </span>
                          </span>
                        )}
                        {m.releasedAt && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400">Released:</span>
                            <span className="font-medium text-green-700 dark:text-green-300">
                              {safeRelative(m.releasedAt) || safeDate(m.releasedAt)}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={cn('h-1.5 transition-all', bar.color)}
                          style={{ width: bar.width }}
                        />
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(m)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
                          >
                            Edit
                          </button>
                        )}
                        {canDeliver && (
                          <button
                            onClick={() => handleDeliver(m)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-secondary-500 hover:bg-secondary-600 rounded-lg disabled:opacity-50"
                          >
                            {busy ? 'Working...' : 'Mark Delivered'}
                          </button>
                        )}
                        {canRelease && (
                          <button
                            onClick={() => setConfirmRelease(m)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                          >
                            {busy ? 'Releasing...' : `Release ${money(Number(m.amount))}`}
                          </button>
                        )}
                        {canDispute && (
                          <button
                            onClick={() => setDisputeTarget(m)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg disabled:opacity-50"
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Attendance section ──────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Attendance</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isClient
                ? 'Your attendance history for this engagement.'
                : 'Track client attendance for each milestone.'}
            </p>
          </div>
          {isTrainer && (
            <button
              onClick={() => setAttOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Record Attendance
            </button>
          )}
        </div>

        {loadingAtt ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading attendance...
          </div>
        ) : visibleAttendance.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No attendance records yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {visibleAttendance.map((a) => {
              const label = PRESENCE_LABEL[a.presenceStatus] || PRESENCE_LABEL.PRESENT;
              const name = a.user
                ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim()
                : a.userId === currentUserId
                  ? 'You'
                  : 'Attendee';
              const linkedMilestone = a.milestoneId
                ? milestones.find((m) => m.id === a.milestoneId)
                : undefined;
              return (
                <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {name}
                      </p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', label.classes)}>
                        {label.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {linkedMilestone ? linkedMilestone.title : 'Whole booking'}
                      {a.note ? ` — ${a.note}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                    {safeRelative(a.recordedAt || a.createdAt) || safeDate(a.recordedAt || a.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      <MilestoneFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initial={formInitial}
        mode={formMode}
        saving={saving}
      />
      <ConfirmDialog
        isOpen={!!confirmRelease}
        onClose={() => setConfirmRelease(null)}
        onConfirm={handleRelease}
        title="Release Payment"
        message={
          confirmRelease
            ? `Release ${money(Number(confirmRelease.amount))} from escrow for "${confirmRelease.title}"? This cannot be undone.`
            : ''
        }
        confirmText="Release Funds"
        variant="info"
        isLoading={actionId === confirmRelease?.id}
      />
      <DisputeModal
        isOpen={!!disputeTarget}
        onClose={() => setDisputeTarget(null)}
        onSubmit={handleDisputeSubmit}
        submitting={disputing}
      />
      <AttendanceModal
        isOpen={attOpen}
        onClose={() => setAttOpen(false)}
        milestones={milestones}
        clientUser={booking.client || null}
        onSubmit={handleRecordAttendance}
        submitting={attSaving}
      />
    </div>
  );
}
