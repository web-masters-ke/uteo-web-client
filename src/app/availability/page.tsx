'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost, extractItems } from '@/lib/api';
import { cn, DAYS_OF_WEEK, formatTime } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';

/* ───────── Constants ───────── */

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Backend uses 0=Sunday...6=Saturday; our grid shows Mon(1)...Sun(0)
const GRID_DAY_MAP = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_INDICES = [1, 2, 3, 4, 5]; // Mon-Fri

const TIMELINE_START = 6;  // 6 AM
const TIMELINE_END = 22;   // 10 PM
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START; // 16 hours displayed

// Generate 15-minute time options from 00:00 to 23:45
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

interface SlotConsultant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface SlotDepartment {
  id: string;
  name: string;
}

interface SlotDisplay {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  consultantId?: string | null;
  consultant?: SlotConsultant | null;
  departmentId?: string | null;
  department?: SlotDepartment | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  isActive?: boolean;
  _count?: { members: number };
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  title?: string;
  specialization?: string;
  isActive: boolean;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    email: string;
  };
}

type PresetKey = 'morning' | 'afternoon' | 'evening' | 'fullday' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
  icon: string;
  startTime: string;
  endTime: string;
  description: string;
}

const PRESETS: Preset[] = [
  { key: 'morning',   label: 'Morning',   icon: '\u2600', startTime: '08:00', endTime: '12:00', description: '08:00 - 12:00' },
  { key: 'afternoon', label: 'Afternoon', icon: '\u26C5', startTime: '13:00', endTime: '17:00', description: '13:00 - 17:00' },
  { key: 'evening',   label: 'Evening',   icon: '\uD83C\uDF19', startTime: '18:00', endTime: '21:00', description: '18:00 - 21:00' },
  { key: 'fullday',   label: 'Full Day',  icon: '\uD83D\uDCC5', startTime: '08:00', endTime: '17:00', description: '08:00 - 17:00' },
  { key: 'custom',    label: 'Custom',    icon: '\u270F\uFE0F', startTime: '09:00', endTime: '17:00', description: 'Pick your times' },
];

/* ───────── Helpers ───────── */

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function calcDurationLabel(start: string, end: string): string {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  if (diff <= 0) return '--';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}${period}`;
}

function computeWeeklyMinutes(slots: SlotDisplay[]): number {
  return slots
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);
}

/* ───────── Component ───────── */

export default function AvailabilityPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [slots, setSlots] = useState<SlotDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Add / Edit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSlot, setEditSlot] = useState<SlotDisplay | null>(null);

  // Copy-day modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number>(1);

  // Confirm modal for destructive actions
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Form state
  const [formDay, setFormDay] = useState(1);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('17:00');
  const [formActive, setFormActive] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('custom');
  const [lunchBreak, setLunchBreak] = useState(false);
  const [formConsultantId, setFormConsultantId] = useState<string | null>(null);
  const [formDepartmentId, setFormDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Hovered timeline slot
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const isTrainer = user?.role === 'TRAINER';
  const trainerId = user?.id;

  /* ───── Data fetch ───── */

  const fetchSlots = useCallback(async () => {
    if (!trainerId) return;
    setLoading(true);
    try {
      const data = await apiGet<any>(`/trainers/${trainerId}/availability`);
      const items = extractItems<any>(data).map((s: any) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek ?? 0,
        startTime: s.startTime ?? '09:00',
        endTime: s.endTime ?? '17:00',
        isActive: s.isActive !== false,
        consultantId: s.consultantId ?? null,
        consultant: s.consultant ?? null,
        departmentId: s.departmentId ?? null,
        department: s.department ?? null,
      }));
      setSlots(items);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const data = await apiGet<TeamMember[] | { items: TeamMember[] }>('/team/members');
      const members = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setTeamMembers(members.filter((m: TeamMember) => m.isActive));
    } catch {
      setTeamMembers([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await apiGet<DepartmentOption[] | { items: DepartmentOption[] }>('/departments');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setDepartments(items);
    } catch {
      setDepartments([]);
    }
  }, []);

  useEffect(() => { fetchSlots(); fetchTeamMembers(); fetchDepartments(); }, [fetchSlots, fetchTeamMembers, fetchDepartments]);

  /* ───── Sync to backend ───── */

  const syncSlots = async (newSlots: SlotDisplay[]) => {
    const payload = {
      slots: newSlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
        consultantId: s.consultantId || undefined,
        departmentId: s.departmentId || undefined,
      })),
    };
    const result = await apiPost<any>(`/trainers/${trainerId}/availability`, payload);
    const items = Array.isArray(result) ? result : result?.items ?? result?.data ?? [];
    return items;
  };

  const persistSlots = async (newSlots: SlotDisplay[], successMsg: string) => {
    setSaving(true);
    try {
      const saved = await syncSlots(newSlots);
      if (Array.isArray(saved) && saved.length > 0) {
        setSlots(saved.map((s: any) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek ?? 0,
          startTime: s.startTime ?? '09:00',
          endTime: s.endTime ?? '17:00',
          isActive: s.isActive !== false,
          consultantId: s.consultantId ?? null,
          consultant: s.consultant ?? null,
          departmentId: s.departmentId ?? null,
          department: s.department ?? null,
        })));
      } else {
        setSlots(newSlots);
      }
      addToast('success', successMsg);
      return true;
    } catch {
      addToast('error', 'Failed to save availability');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ───── Grouped data ───── */

  const slotsByDay = useMemo(() => {
    const map: Record<number, SlotDisplay[]> = {};
    for (const d of GRID_DAY_MAP) map[d] = [];
    slots.forEach((s) => {
      if (!map[s.dayOfWeek]) map[s.dayOfWeek] = [];
      map[s.dayOfWeek].push(s);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [slots]);

  /* ───── Summary stats ───── */

  const stats = useMemo(() => {
    const active = slots.filter((s) => s.isActive);
    const totalMinutes = computeWeeklyMinutes(slots);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return {
      totalSlots: slots.length,
      activeSlots: active.length,
      daysCovered: new Set(active.map((s) => s.dayOfWeek)).size,
      weeklyHours: hours,
      weeklyMins: mins,
      weeklyLabel: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`,
    };
  }, [slots]);

  /* ───── Open add/edit modal ───── */

  const openAdd = (dayOfWeek?: number) => {
    setEditSlot(null);
    setFormDay(dayOfWeek ?? 1);
    setFormStart('09:00');
    setFormEnd('17:00');
    setFormActive(true);
    setSelectedPreset('custom');
    setLunchBreak(false);
    setFormConsultantId(null);
    setFormDepartmentId(null);
    setShowAddModal(true);
  };

  const openEdit = (slot: SlotDisplay) => {
    setEditSlot(slot);
    setFormDay(slot.dayOfWeek);
    setFormStart(slot.startTime);
    setFormEnd(slot.endTime);
    setFormActive(slot.isActive);
    setSelectedPreset('custom');
    setLunchBreak(false);
    setFormConsultantId(slot.consultantId ?? null);
    setFormDepartmentId(slot.departmentId ?? null);
    setShowAddModal(true);
  };

  /* ───── Preset selection ───── */

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.key);
    if (preset.key !== 'custom') {
      setFormStart(preset.startTime);
      setFormEnd(preset.endTime);
    }
    // Show lunch break toggle for full day or when start covers morning+afternoon
    if (preset.key === 'fullday') {
      setLunchBreak(true);
    } else {
      setLunchBreak(false);
    }
  };

  /* ───── Save slot(s) ───── */

  const handleSave = async () => {
    if (formStart >= formEnd) {
      addToast('error', 'End time must be after start time');
      return;
    }

    // Determine the slot(s) to create
    let newEntries: Omit<SlotDisplay, 'id'>[] = [];

    const shouldSplitLunch = lunchBreak && (selectedPreset === 'fullday' || (formStart <= '08:00' && formEnd >= '17:00'));
    const selectedConsultant = formConsultantId ? teamMembers.find(m => m.user.id === formConsultantId)?.user ?? null : null;
    const selectedDepartment = formDepartmentId ? departments.find(d => d.id === formDepartmentId) ?? null : null;
    const consultantObj = selectedConsultant ? { id: selectedConsultant.id, firstName: selectedConsultant.firstName ?? '', lastName: selectedConsultant.lastName ?? '', avatar: selectedConsultant.avatar } : null;
    const departmentObj = selectedDepartment ? { id: selectedDepartment.id, name: selectedDepartment.name } : null;
    if (shouldSplitLunch) {
      // Split into morning + afternoon with lunch break
      const morningEnd = timeToMinutes(formEnd) > timeToMinutes('12:00') ? '12:00' : formEnd;
      const afternoonStart = timeToMinutes(formStart) < timeToMinutes('13:00') ? '13:00' : formStart;
      if (timeToMinutes(formStart) < timeToMinutes('12:00')) {
        newEntries.push({ dayOfWeek: formDay, startTime: formStart, endTime: morningEnd, isActive: formActive, consultantId: formConsultantId, consultant: consultantObj, departmentId: formDepartmentId, department: departmentObj });
      }
      if (timeToMinutes(formEnd) > timeToMinutes('13:00')) {
        newEntries.push({ dayOfWeek: formDay, startTime: afternoonStart, endTime: formEnd, isActive: formActive, consultantId: formConsultantId, consultant: consultantObj, departmentId: formDepartmentId, department: departmentObj });
      }
    } else {
      newEntries.push({ dayOfWeek: formDay, startTime: formStart, endTime: formEnd, isActive: formActive, consultantId: formConsultantId, consultant: consultantObj, departmentId: formDepartmentId, department: departmentObj });
    }

    let newSlots: SlotDisplay[];
    if (editSlot) {
      // Replace the edited slot (and add extra if lunch-split)
      newSlots = slots.filter((s) => s.id !== editSlot.id);
      newEntries.forEach((entry, i) => {
        newSlots.push({ ...entry, id: `tmp-${Date.now()}-${i}` });
      });
    } else {
      newSlots = [...slots];
      newEntries.forEach((entry, i) => {
        newSlots.push({ ...entry, id: `tmp-${Date.now()}-${i}` });
      });
    }

    const ok = await persistSlots(newSlots, editSlot ? 'Slot updated' : lunchBreak && newEntries.length > 1 ? 'Slots added with lunch break' : 'Slot added');
    if (ok) setShowAddModal(false);
  };

  /* ───── Delete slot ───── */

  const handleDelete = async (slotId: string) => {
    const newSlots = slots.filter((s) => s.id !== slotId);
    await persistSlots(newSlots, 'Slot removed');
  };

  /* ───── Toggle active ───── */

  const toggleActive = async (slot: SlotDisplay) => {
    const newSlots = slots.map((s) => (s.id === slot.id ? { ...s, isActive: !s.isActive } : s));
    setSlots(newSlots);
    try {
      await syncSlots(newSlots);
    } catch {
      setSlots(slots);
      addToast('error', 'Failed to update slot');
    }
  };

  /* ───── Copy day ───── */

  const openCopyDay = (sourceDay: number) => {
    setCopySourceDay(sourceDay);
    setShowCopyModal(true);
  };

  const copyDayTo = async (targetDays: number[]) => {
    const sourceSlots = slotsByDay[copySourceDay] ?? [];
    if (sourceSlots.length === 0) {
      addToast('error', 'No slots to copy from this day');
      return;
    }

    let newSlots = [...slots];
    // Remove existing slots on target days, then copy source slots
    newSlots = newSlots.filter((s) => !targetDays.includes(s.dayOfWeek));
    targetDays.forEach((day) => {
      sourceSlots.forEach((src, i) => {
        newSlots.push({
          id: `tmp-${Date.now()}-${day}-${i}`,
          dayOfWeek: day,
          startTime: src.startTime,
          endTime: src.endTime,
          isActive: src.isActive,
          consultantId: src.consultantId,
          consultant: src.consultant,
        });
      });
    });

    const ok = await persistSlots(newSlots, `Copied to ${targetDays.length} day${targetDays.length > 1 ? 's' : ''}`);
    if (ok) setShowCopyModal(false);
  };

  /* ───── Bulk actions ───── */

  const setStandardWorkWeek = async () => {
    const standardSlots: SlotDisplay[] = [];
    WEEKDAY_INDICES.forEach((day) => {
      standardSlots.push({
        id: `std-m-${day}`,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '12:00',
        isActive: true,
      });
      standardSlots.push({
        id: `std-a-${day}`,
        dayOfWeek: day,
        startTime: '13:00',
        endTime: '17:00',
        isActive: true,
      });
    });
    await persistSlots(standardSlots, 'Standard work week set (Mon-Fri, 8-12 + 1-5)');
  };

  const clearAll = async () => {
    await persistSlots([], 'All slots cleared');
  };

  const clearDay = async (dayOfWeek: number) => {
    const newSlots = slots.filter((s) => s.dayOfWeek !== dayOfWeek);
    await persistSlots(newSlots, `${DAYS_OF_WEEK[dayOfWeek]} cleared`);
  };

  /* ───── Non-trainer guard ───── */

  if (!isTrainer) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState title="Trainer Feature" description="Availability management is only available for trainers." />
      </div>
    );
  }

  if (loading) return <PageSkeleton />;

  /* ───────── Render ───────── */

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Availability Schedule</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your weekly schedule. Clients can only book during your available time slots.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setConfirmAction({
              title: 'Set Standard Work Week',
              message: 'This will replace ALL existing slots with a standard Mon-Fri schedule (8:00-12:00 + 13:00-17:00 with lunch break). Continue?',
              onConfirm: () => { setConfirmAction(null); setStandardWorkWeek(); },
            })}
            className="px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
          >
            Standard Work Week
          </button>
          <button
            onClick={() => {
              if (slots.length === 0) { addToast('error', 'No slots to clear'); return; }
              setConfirmAction({
                title: 'Clear All Slots',
                message: `This will remove all ${slots.length} slot${slots.length > 1 ? 's' : ''}. This cannot be undone. Continue?`,
                onConfirm: () => { setConfirmAction(null); clearAll(); },
              });
            }}
            className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => openAdd()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
          >
            + Add Slot
          </button>
        </div>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Slots', value: stats.totalSlots, color: 'text-gray-900 dark:text-white' },
          { label: 'Active Slots', value: stats.activeSlots, color: 'text-green-600 dark:text-green-400' },
          { label: 'Days Covered', value: `${stats.daysCovered}/7`, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Weekly Hours', value: stats.weeklyLabel, color: 'text-secondary-500 dark:text-secondary-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.label}</p>
            <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Visual Timeline ─── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Timeline</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Hover blocks to see details</p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">

            {/* Hour labels row */}
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              <div className="w-24 shrink-0" />
              <div className="flex-1 flex">
                {Array.from({ length: TIMELINE_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500 py-1.5 border-l border-gray-100 dark:border-gray-700 first:border-l-0"
                  >
                    {formatHour(TIMELINE_START + i)}
                  </div>
                ))}
              </div>
            </div>

            {/* Day rows */}
            {GRID_DAY_MAP.map((dayIdx, gridPos) => {
              const daySlots = slotsByDay[dayIdx] ?? [];
              const hasSlots = daySlots.length > 0;

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'flex border-b border-gray-100 dark:border-gray-700 last:border-b-0 group/row',
                    !hasSlots && 'opacity-60',
                  )}
                >
                  {/* Day label */}
                  <div className="w-24 shrink-0 flex items-center gap-2 px-3 py-3 border-r border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{SHORT_DAYS[gridPos]}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative h-12 bg-gray-50 dark:bg-gray-900/30">
                    {/* Hour gridlines */}
                    {Array.from({ length: TIMELINE_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-100 dark:border-gray-700/50"
                        style={{ left: `${(i / TIMELINE_HOURS) * 100}%` }}
                      />
                    ))}

                    {/* Lunch hour marker (12-13) */}
                    <div
                      className="absolute top-0 bottom-0 bg-gray-100 dark:bg-gray-800/60"
                      style={{
                        left: `${((12 - TIMELINE_START) / TIMELINE_HOURS) * 100}%`,
                        width: `${(1 / TIMELINE_HOURS) * 100}%`,
                      }}
                    />

                    {/* Slot blocks */}
                    {daySlots.map((slot) => {
                      const startMins = timeToMinutes(slot.startTime);
                      const endMins = timeToMinutes(slot.endTime);
                      const timelineStartMins = TIMELINE_START * 60;
                      const timelineEndMins = TIMELINE_END * 60;
                      const totalMins = timelineEndMins - timelineStartMins;

                      const leftPct = Math.max(0, ((startMins - timelineStartMins) / totalMins) * 100);
                      const widthPct = Math.max(0, ((Math.min(endMins, timelineEndMins) - Math.max(startMins, timelineStartMins)) / totalMins) * 100);

                      const isHovered = hoveredSlot === slot.id;

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            'absolute top-1 bottom-1 rounded-md cursor-pointer transition-all border',
                            slot.isActive
                              ? 'bg-primary-400/80 dark:bg-primary-500/60 border-primary-500 dark:border-primary-400 hover:bg-primary-500 dark:hover:bg-primary-500/80'
                              : 'bg-gray-300/60 dark:bg-gray-600/40 border-gray-400 dark:border-gray-500 hover:bg-gray-400/60',
                            isHovered && 'ring-2 ring-primary-300 dark:ring-primary-600 z-10',
                          )}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '12px' }}
                          onMouseEnter={() => setHoveredSlot(slot.id)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          onClick={() => openEdit(slot)}
                          title={`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (${calcDurationLabel(slot.startTime, slot.endTime)})${slot.consultant ? ` — ${slot.consultant.firstName} ${slot.consultant.lastName}` : teamMembers.length > 0 ? ' — Entire Team' : ''}`}
                        >
                          {/* Show time label + consultant if wide enough */}
                          {widthPct > 8 && (
                            <div className="absolute inset-0 flex items-center justify-center px-1 overflow-hidden gap-1">
                              {slot.consultant && widthPct > 12 && (
                                slot.consultant.avatar ? (
                                  <img src={slot.consultant.avatar} alt="" className="w-4 h-4 rounded-full shrink-0 border border-white/40" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center shrink-0 text-[7px] font-bold text-white">
                                    {(slot.consultant.firstName?.[0] ?? '').toUpperCase()}
                                  </div>
                                )
                              )}
                              <span className="text-[9px] font-medium text-white dark:text-gray-100 whitespace-nowrap truncate">
                                {slot.consultant ? `${slot.consultant.firstName}` : ''}{slot.consultant && widthPct > 15 ? ' · ' : slot.consultant ? '' : ''}{formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty state for day — add button */}
                    {!hasSlots && (
                      <button
                        onClick={() => openAdd(dayIdx)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                      >
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add slot
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Day actions */}
                  <div className="w-20 shrink-0 flex items-center justify-center gap-1 border-l border-gray-100 dark:border-gray-700 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    {hasSlots && (
                      <>
                        <button
                          onClick={() => openCopyDay(dayIdx)}
                          className="p-1 rounded text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Copy day"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openAdd(dayIdx)}
                          className="p-1 rounded text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Add slot"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmAction({
                            title: `Clear ${DAYS_OF_WEEK[dayIdx]}`,
                            message: `Remove all ${daySlots.length} slot${daySlots.length > 1 ? 's' : ''} from ${DAYS_OF_WEEK[dayIdx]}?`,
                            onConfirm: () => { setConfirmAction(null); clearDay(dayIdx); },
                          })}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Clear day"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Day-by-Day Detail Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GRID_DAY_MAP.map((dayIdx, gridPos) => {
          const daySlots = slotsByDay[dayIdx] ?? [];
          const dayMinutes = daySlots.filter(s => s.isActive).reduce((sum, s) => sum + Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime)), 0);
          const dayHours = Math.floor(dayMinutes / 60);
          const dayMins = dayMinutes % 60;

          return (
            <div key={dayIdx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    daySlots.length > 0
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
                  )}>
                    {SHORT_DAYS[gridPos]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{DAYS_OF_WEEK[dayIdx]}</p>
                    {daySlots.length > 0 && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {dayHours > 0 ? `${dayHours}h` : ''}{dayMins > 0 ? ` ${dayMins}m` : ''} active
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openAdd(dayIdx)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title={`Add slot to ${DAYS_OF_WEEK[dayIdx]}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Slots list */}
              <div className="p-3">
                {daySlots.length === 0 ? (
                  <button
                    onClick={() => openAdd(dayIdx)}
                    className="w-full py-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-primary-300 hover:text-primary-400 dark:hover:border-primary-700 dark:hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[10px]">No availability</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={cn(
                          'group relative flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
                          slot.isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                            : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50',
                        )}
                        onClick={() => openEdit(slot)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-1.5 h-8 rounded-full',
                            slot.isActive ? 'bg-primary-500 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-600',
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              'text-sm font-medium',
                              slot.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through',
                            )}>
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                {calcDurationLabel(slot.startTime, slot.endTime)}
                              </p>
                              {slot.consultant ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400">
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  {slot.consultant.avatar ? (
                                    <img src={slot.consultant.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-[7px] font-bold text-primary-600 dark:text-primary-400">
                                      {(slot.consultant.firstName?.[0] ?? '').toUpperCase()}
                                    </span>
                                  )}
                                  {slot.consultant.firstName}
                                </span>
                              ) : teamMembers.length > 0 ? (
                                <span className="text-[10px] text-gray-300 dark:text-gray-600">· Entire Team</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleActive(slot); }}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              slot.isActive ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600',
                            )}
                          >
                            <div className={cn(
                              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                              slot.isActive ? 'left-[18px]' : 'left-0.5',
                            )} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card footer — copy action */}
              {daySlots.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <button
                    onClick={() => openCopyDay(dayIdx)}
                    className="text-[10px] text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy to...
                  </button>
                  <button
                    onClick={() => setConfirmAction({
                      title: `Clear ${DAYS_OF_WEEK[dayIdx]}`,
                      message: `Remove all ${daySlots.length} slot${daySlots.length > 1 ? 's' : ''} from ${DAYS_OF_WEEK[dayIdx]}?`,
                      onConfirm: () => { setConfirmAction(null); clearDay(dayIdx); },
                    })}
                    className="text-[10px] text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
                  >
                    Clear day
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Empty state (no slots at all) ─── */}
      {slots.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <EmptyState
            title="No availability set"
            description="Add time slots to let clients know when you are available for sessions. Use the quick-start button to set a standard work week."
            action={{ label: 'Set Standard Work Week', onClick: () => setStandardWorkWeek() }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT SLOT MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editSlot ? 'Edit Availability Slot' : 'Add Availability Slot'} size="lg">
        <div className="space-y-5">

          {/* Day selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Day of Week</label>
            <div className="flex flex-wrap gap-2">
              {GRID_DAY_MAP.map((dayIdx, gridPos) => (
                <button
                  key={dayIdx}
                  onClick={() => setFormDay(dayIdx)}
                  className={cn(
                    'px-3 py-2 text-xs font-medium rounded-lg border transition-all',
                    formDay === dayIdx
                      ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600',
                  )}
                >
                  {SHORT_DAYS[gridPos]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick presets (only when adding) */}
          {!editSlot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Presets</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-all',
                      selectedPreset === preset.key
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-200 dark:hover:border-primary-700',
                    )}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lunch break toggle */}
          {(selectedPreset === 'fullday' || (formStart <= '08:00' && formEnd >= '17:00')) && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/10 border border-secondary-200 dark:border-secondary-800">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Lunch Break</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-splits into two slots with a 12:00 - 13:00 break
                </p>
              </div>
              <button
                onClick={() => setLunchBreak(!lunchBreak)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors shrink-0',
                  lunchBreak ? 'bg-secondary-500' : 'bg-gray-300 dark:bg-gray-600',
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  lunchBreak ? 'left-[22px]' : 'left-0.5',
                )} />
              </button>
            </div>
          )}

          {/* Preview: lunch break split */}
          {lunchBreak && (selectedPreset === 'fullday' || (formStart <= '08:00' && formEnd >= '17:00')) && (
            <div className="flex items-center gap-2 text-xs px-3">
              <div className="flex-1 py-2 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-center font-medium">
                {formatTime(formStart)} - 12:00 PM
              </div>
              <div className="px-2 py-2 text-gray-400 dark:text-gray-500 text-[10px]">
                LUNCH
              </div>
              <div className="flex-1 py-2 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-center font-medium">
                1:00 PM - {formatTime(formEnd)}
              </div>
            </div>
          )}

          {/* Time pickers (15-min dropdowns) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                ({calcDurationLabel(formStart, formEnd)})
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">Start</label>
                <select
                  value={formStart}
                  onChange={(e) => {
                    setFormStart(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">End</label>
                <select
                  value={formEnd}
                  onChange={(e) => {
                    setFormEnd(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  {TIME_OPTIONS.filter((t) => t > formStart).map((t) => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assign To — consultant selector (only if user has team members) */}
          {teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {/* All Team Members option */}
                <button
                  type="button"
                  onClick={() => { setFormConsultantId(null); setFormDepartmentId(null); }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    formConsultantId === null
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 ring-1 ring-primary-200 dark:ring-primary-700'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700',
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">All Team Members</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Any available consultant</p>
                  </div>
                  {formConsultantId === null && (
                    <svg className="w-4 h-4 ml-auto text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Individual team members */}
                {teamMembers.map((member) => (
                  <button
                    key={member.user.id}
                    type="button"
                    onClick={() => { setFormConsultantId(member.user.id); setFormDepartmentId(null); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                      formConsultantId === member.user.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 ring-1 ring-primary-200 dark:ring-primary-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700',
                    )}
                  >
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                          {(member.user.firstName?.[0] ?? member.user.email[0]).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.user.firstName ?? ''} {member.user.lastName ?? ''}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {member.title || member.role}
                      </p>
                    </div>
                    {formConsultantId === member.user.id && (
                      <svg className="w-4 h-4 ml-auto text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Department selector (only if departments exist) */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or assign to a department
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  (overrides individual consultant)
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {/* No department option */}
                <button
                  type="button"
                  onClick={() => { setFormDepartmentId(null); }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    formDepartmentId === null
                      ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">No department</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Use consultant selection above</p>
                  </div>
                </button>

                {/* Department options */}
                {departments.filter(d => d.isActive !== false).map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => { setFormDepartmentId(dept.id); setFormConsultantId(null); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                      formDepartmentId === dept.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 ring-1 ring-primary-200 dark:ring-primary-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700',
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-4h6v4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{dept.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{dept._count?.members ?? 0} members</p>
                    </div>
                    {formDepartmentId === dept.id && (
                      <svg className="w-4 h-4 ml-auto text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clients can book during this slot</p>
            </div>
            <button
              onClick={() => setFormActive(!formActive)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0',
                formActive ? 'bg-accent-500' : 'bg-gray-300 dark:bg-gray-600',
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                formActive ? 'left-[22px]' : 'left-0.5',
              )} />
            </button>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors text-sm shadow-sm"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Saving...
                </span>
              ) : editSlot ? 'Update Slot' : 'Add Slot'}
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COPY DAY MODAL                                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)} title={`Copy ${DAYS_OF_WEEK[copySourceDay]} Slots`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Copy {(slotsByDay[copySourceDay] ?? []).length} slot{(slotsByDay[copySourceDay] ?? []).length !== 1 ? 's' : ''} from{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{DAYS_OF_WEEK[copySourceDay]}</span>{' '}
            to other days. Existing slots on target days will be replaced.
          </p>

          {/* Quick copy options */}
          <div className="space-y-2">
            <button
              onClick={() => copyDayTo(WEEKDAY_INDICES.filter((d) => d !== copySourceDay))}
              disabled={saving}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              <span className="font-semibold">Copy to Weekdays</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Mon - Fri (excluding {SHORT_DAYS[GRID_DAY_MAP.indexOf(copySourceDay)]})</span>
            </button>

            <button
              onClick={() => copyDayTo(GRID_DAY_MAP.filter((d) => d !== copySourceDay))}
              disabled={saving}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              <span className="font-semibold">Copy to All Days</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Every day of the week</span>
            </button>
          </div>

          {/* Specific day selection */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Or copy to a specific day</p>
            <div className="grid grid-cols-4 gap-2">
              {GRID_DAY_MAP.filter((d) => d !== copySourceDay).map((dayIdx, gridPos) => {
                // Find the original grid position for this day
                const originalGridPos = GRID_DAY_MAP.indexOf(dayIdx);
                return (
                  <button
                    key={dayIdx}
                    onClick={() => copyDayTo([dayIdx])}
                    disabled={saving}
                    className="px-3 py-2.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-colors disabled:opacity-50"
                  >
                    {SHORT_DAYS[originalGridPos]}
                  </button>
                );
              })}
            </div>
          </div>

          {saving && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Copying...
            </div>
          )}

          <button
            onClick={() => setShowCopyModal(false)}
            className="w-full py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONFIRM MODAL                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title ?? 'Confirm'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{confirmAction?.message}</p>
          <div className="flex gap-3">
            <button
              onClick={confirmAction?.onConfirm}
              disabled={saving}
              className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Working...' : 'Yes, continue'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
