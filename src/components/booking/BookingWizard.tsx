'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost } from '@/lib/api';
import { trainerService } from '@/lib/services/trainers';
import { bookingService } from '@/lib/services/bookings';
import Avatar from '@/components/ui/Avatar';
import SearchBar from '@/components/ui/SearchBar';
import type { Trainer, User, Booking, SessionType, Paginated, AvailabilitySlot } from '@/lib/types';
import { formatCurrency, formatTime, formatDate, cn, DAYS_OF_WEEK } from '@/lib/utils';
import { format, startOfDay, addMonths, subMonths, startOfMonth, endOfMonth, getDay, getDaysInMonth } from 'date-fns';

/* ============================================================
   Uteo Interview Booking Wizard
   Supports BOTH:
     - RECRUITER scheduling interviews with candidates
     - JOB_SEEKER booking interview slots with a recruiter
   ============================================================ */

// ── Step definitions ──────────────────────────────────────────
const RECRUITER_STEPS = [
  { id: 1, label: 'Select Candidate', icon: 'user' },
  { id: 2, label: 'Interview Details', icon: 'file' },
  { id: 3, label: 'Date & Time', icon: 'calendar' },
  { id: 4, label: 'Review & Confirm', icon: 'check' },
] as const;

const CANDIDATE_STEPS = [
  { id: 1, label: 'Select Recruiter', icon: 'user' },
  { id: 2, label: 'Interview Details', icon: 'file' },
  { id: 3, label: 'Date & Time', icon: 'calendar' },
  { id: 4, label: 'Review & Confirm', icon: 'check' },
] as const;

// ── SVG icons ─────────────────────────────────────────────────
function StepIcon({ type, size = 20 }: { type: string; size?: number }) {
  switch (type) {
    case 'user':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'file':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'calendar':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'check':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'search':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'clock':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'map-pin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'video':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      );
    case 'shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'wallet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'play':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case 'phone':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Duration options ──────────────────────────────────────────
const DURATIONS = [30, 60, 90, 120, 180] as const;

// ── Props ─────────────────────────────────────────────────────
interface BookingWizardProps {
  /** If provided, trainer is pre-selected (client flow from /book/[trainerId]) */
  preselectedTrainer?: Trainer | null;
  /** Called when wizard is closed/cancelled */
  onClose?: () => void;
  /** Called on successful booking */
  onSuccess?: (booking: Booking) => void;
  /** Display inline (no modal chrome) or as modal overlay */
  inline?: boolean;
}

export default function BookingWizard({ preselectedTrainer, onClose, onSuccess, inline = false }: BookingWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const isRecruiter = user?.role === 'TRAINER';
  const steps = isRecruiter ? RECRUITER_STEPS : CANDIDATE_STEPS;

  // ── Wizard state ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');

  // Step 1: Candidate/Recruiter selection
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(preselectedTrainer || null);
  const [trainerSearch, setTrainerSearch] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);

  // Step 1 (recruiter flow): candidate selection
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Interviewer/department assignment (recruiter flow)
  const [teamMembers, setTeamMembers] = useState<{ id: string; userId: string; role: string; title?: string; user: { id: string; firstName: string; lastName: string; avatar?: string } }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; _count?: { members: number } }[]>([]);
  const [assignMode, setAssignMode] = useState<'self' | 'team' | 'department' | 'individual'>('self');
  const [assignedConsultantId, setAssignedConsultantId] = useState<string>('');
  const [assignedDepartmentId, setAssignedDepartmentId] = useState<string>('');

  // Step 2: Session details
  const [sessionType, setSessionType] = useState<SessionType>('VIRTUAL');
  const [duration, setDuration] = useState<number>(60);
  const [topic, setTopic] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Step 2: Advanced session options
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [planBreakoutRooms, setPlanBreakoutRooms] = useState(false);
  const [breakoutRoomCount, setBreakoutRoomCount] = useState(2);
  const [breakoutAssignMode, setBreakoutAssignMode] = useState<'auto' | 'manual'>('auto');
  const [recordSession, setRecordSession] = useState(false);
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [reminders, setReminders] = useState<string[]>(['24h']);

  // Step 3: Date & Time
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 4: Payment
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Trainer the session is with ─────────────────────────
  const activeTrainer = isRecruiter ? null : selectedTrainer;
  const trainerId = isRecruiter ? user?.id : (selectedTrainer?.userId || selectedTrainer?.id);

  // ── Calculate amount ────────────────────────────────────
  const hourlyRate = isRecruiter
    ? (user?.hourlyRate || 0)
    : (selectedTrainer?.hourlyRate || 0);
  const amount = hourlyRate * (duration / 60);

  // ── Search trainers (client flow) ───────────────────────
  useEffect(() => {
    if (isRecruiter || preselectedTrainer) return;
    setTrainersLoading(true);
    const params: any = { limit: 20 };
    if (trainerSearch) params.keyword = trainerSearch;
    trainerService.search(params)
      .then((res) => setTrainers(res.items))
      .catch(() => setTrainers([]))
      .finally(() => setTrainersLoading(false));
  }, [trainerSearch, isRecruiter, preselectedTrainer]);

  // ── Search candidates (recruiter flow) ──────────────────
  useEffect(() => {
    if (!isRecruiter || clientMode !== 'existing') return;
    setClientsLoading(true);
    const q = clientSearch ? `?search=${encodeURIComponent(clientSearch)}` : '';
    apiGet<any>(`/users?role=CLIENT${clientSearch ? '&search=' + encodeURIComponent(clientSearch) : ''}`)
      .then((data: any) => {
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setClients(items);
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, [clientSearch, isRecruiter, clientMode]);

  // ── Fetch team members + departments (trainer flow) ─────
  useEffect(() => {
    if (!isRecruiter) return;
    apiGet<any>('/team/members')
      .then((data: any) => {
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setTeamMembers(items.filter((m: any) => m.isActive && m.user));
      })
      .catch(() => setTeamMembers([]));
    apiGet<any>('/departments')
      .then((data: any) => {
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setDepartments(items.filter((d: any) => d.isActive !== false));
      })
      .catch(() => setDepartments([]));
  }, [isRecruiter]);


  // ── Fetch availability slots when date changes ──────────
  useEffect(() => {
    if (!selectedDate || !trainerId) return;
    setSlotsLoading(true);
    setSelectedTime(null);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    trainerService.getAvailableSlots(trainerId, dateStr)
      .then((slots) => {
        if (slots.length > 0) {
          setAvailableSlots(slots.map((s) => ({
            time: s.startTime,
            available: true,
          })));
        } else {
          // Generate fallback slots from availability
          setAvailableSlots(generateFallbackSlots(selectedDate));
        }
      })
      .catch(() => {
        setAvailableSlots(generateFallbackSlots(selectedDate));
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, trainerId]);

  // ── Generate fallback time slots ────────────────────────
  function generateFallbackSlots(date: Date): { time: string; available: boolean }[] {
    const slots: { time: string; available: boolean }[] = [];
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    for (let h = 7; h <= 20; h++) {
      for (const m of [0, 30]) {
        if (h === 20 && m === 30) break;
        if (isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()))) continue;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push({ time: `${hh}:${mm}`, available: true });
      }
    }
    return slots;
  }

  // ── Calendar grid ───────────────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(calendarMonth);
    const startPad = getDay(firstDay);
    const days: (Date | null)[] = Array(startPad).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calendarMonth]);

  const canGoPrevMonth = calendarMonth > startOfMonth(new Date());

  // ── Navigation helpers ──────────────────────────────────
  const goNext = () => {
    setAnimDir('forward');
    setCurrentStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => {
    setAnimDir('back');
    setCurrentStep((s) => Math.max(s - 1, 1));
  };
  const goToStep = (step: number) => {
    if (step < currentStep) {
      setAnimDir('back');
      setCurrentStep(step);
    }
  };

  // ── Step 1 validation ──────────────────────────────────
  const step1Valid = isRecruiter
    ? (clientMode === 'existing' ? !!selectedClient : (newClientName.trim().length >= 2 && newClientEmail.includes('@') && newClientPhone.length >= 10))
    : !!selectedTrainer;

  // ── Step 2 validation ──────────────────────────────────
  const step2Valid = duration > 0 && (sessionType !== 'PHYSICAL' || location.trim().length > 0);

  // ── Step 3 validation ──────────────────────────────────
  const step3Valid = !!selectedDate && !!selectedTime;

  // ── Submit booking ─────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [hh, mm] = selectedTime.split(':');
      const scheduledAt = `${dateStr}T${hh}:${mm}:00`;

      // Build endTime based on duration
      const startMinutes = parseInt(hh) * 60 + parseInt(mm);
      const endMinutes = startMinutes + duration;
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
      const endM = String(endMinutes % 60).padStart(2, '0');

      const payload: any = {
        trainerId: isRecruiter
          ? (assignMode === 'individual' && assignedConsultantId ? assignedConsultantId : user?.id)
          : (selectedTrainer?.userId || selectedTrainer?.id),
        ...(isRecruiter && assignMode === 'department' && assignedDepartmentId ? { departmentId: assignedDepartmentId } : {}),
        ...(isRecruiter && assignMode === 'team' ? { assignToTeam: true } : {}),
        amount: 0,
        date: dateStr,
        startTime: selectedTime,
        endTime: `${endH}:${endM}`,
        scheduledAt,
        duration,
        sessionType,
        notes: topic || undefined,
        location: sessionType === 'PHYSICAL' || sessionType === 'HYBRID' ? location : undefined,
        ...(meetingLink ? { meetingLink } : {}),
        timezone,
        ...(reminders.length > 0 ? { reminders } : {}),
        ...(recordSession ? { recordSession: true } : {}),
        ...(isGroupSession ? { isGroupSession: true, maxParticipants } : {}),
        ...(isGroupSession && planBreakoutRooms ? { breakoutRooms: { count: breakoutRoomCount, assignMode: breakoutAssignMode } } : {}),
      };

      if (isRecruiter) {
        if (clientMode === 'existing' && selectedClient) {
          payload.clientId = selectedClient.id;
        } else {
          payload.clientName = newClientName;
          payload.clientEmail = newClientEmail;
          payload.clientPhone = newClientPhone;
        }
      }

      const booking = await bookingService.create(payload);
      addToast('success', 'Interview scheduled successfully!');
      if (onSuccess) {
        onSuccess(booking);
      } else {
        router.push(`/bookings/${booking.id}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create booking. Please try again.';
      setSubmitError(msg);
      addToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render step indicator (vertical sidebar version) ──
  const renderStepIndicator = () => (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <button
              onClick={() => goToStep(step.id)}
              disabled={step.id >= currentStep}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all shrink-0',
                currentStep > step.id && 'bg-white border-white text-[#192C67] cursor-pointer hover:bg-white/90',
                currentStep === step.id && 'border-white bg-white/20 text-white',
                currentStep < step.id && 'border-white/25 text-white/30 bg-transparent cursor-default'
              )}
            >
              {currentStep > step.id ? <StepIcon type="check" size={15} /> : <StepIcon type={step.icon} size={15} />}
            </button>
            {i < steps.length - 1 && (
              <div className={cn('w-0.5 h-7 mt-1 transition-colors', currentStep > step.id ? 'bg-white/50' : 'bg-white/15')} />
            )}
          </div>
          <div className={cn('pt-1.5', i < steps.length - 1 && 'pb-7')}>
            <p className={cn('text-sm font-semibold leading-tight transition-colors', currentStep >= step.id ? 'text-white' : 'text-white/35')}>
              {step.label}
            </p>
            {currentStep === step.id && (
              <p className="text-[11px] text-white/50 mt-0.5">In progress</p>
            )}
            {currentStep > step.id && (
              <p className="text-[11px] text-[#F77B0F] mt-0.5">Done</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Step 1: Select Candidate (Recruiter flow) ───────────
  const renderTrainerStep1 = () => (
    <div className="transition-all duration-300">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setClientMode('existing')}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2',
            clientMode === 'existing'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
          )}
        >
          Existing Candidate
        </button>
        <button
          onClick={() => setClientMode('new')}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2',
            clientMode === 'new'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
          )}
        >
          New Candidate
        </button>
      </div>

      {clientMode === 'existing' ? (
        <>
          <SearchBar
            placeholder="Search candidates by name or email..."
            onSearch={setClientSearch}
            className="mb-4"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {clientsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" /></div>
                </div>
              ))
            ) : clients.length > 0 ? ( // candidates list
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                    selectedClient?.id === client.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 hover:shadow-sm'
                  )}
                >
                  <Avatar firstName={client.firstName} lastName={client.lastName} src={client.avatarUrl || client.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{client.firstName} {client.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.email}</p>
                  </div>
                  {selectedClient?.id === client.id && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white flex-shrink-0">
                      <StepIcon type="check" size={14} />
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No candidates found</p>
                <button onClick={() => setClientMode('new')} className="text-primary-500 hover:text-primary-600 text-sm font-medium">
                  + Add a new candidate instead
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone *</label>
            <input
              type="tel"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition placeholder-gray-400"
            />
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 1: Select Recruiter (Candidate flow) ───────────
  const renderClientStep1 = () => (
    <div className="transition-all duration-300">
      <SearchBar
        placeholder="Search recruiters or employers..."
        onSearch={setTrainerSearch}
        className="mb-4"
      />

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {trainersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-2" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" /></div>
            </div>
          ))
        ) : trainers.length > 0 ? (
          trainers.map((trainer) => (
            <button
              key={trainer.id}
              onClick={() => {
                setSelectedTrainer(trainer);
              }}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all hover:shadow-md',
                selectedTrainer?.id === trainer.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
              )}
            >
              <div className="flex items-center gap-4">
                <Avatar
                  firstName={trainer.firstName || trainer.user?.firstName || '?'}
                  lastName={trainer.lastName || trainer.user?.lastName || '?'}
                  src={trainer.avatarUrl || trainer.user?.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {trainer.firstName || trainer.user?.firstName} {trainer.lastName || trainer.user?.lastName}
                    </h3>
                    {selectedTrainer?.id === trainer.id && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                        <StepIcon type="check" size={12} />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">
                    {trainer.specialization || 'Recruiter'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-secondary-500 dark:text-secondary-400">
                      {formatCurrency(trainer.hourlyRate || 0)}/hr
                    </span>
                    {trainer.rating > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                        <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        {Number(trainer.rating || 0).toFixed(1)} ({trainer.totalReviews})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recruiters found. Try a different search.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 2: Session Details ─────────────────────────────
  const renderStep2 = () => (
    <div className="transition-all duration-300">
      <div className="space-y-6">
        {/* Session Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Interview Type</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'VIRTUAL' as const, label: 'Video Call', desc: 'Online interview', icon: 'video' },
              { value: 'PHYSICAL' as const, label: 'On-Site', desc: 'In-person interview', icon: 'map-pin' },
              { value: 'HYBRID' as const, label: 'Hybrid', desc: 'Flexible format', icon: 'phone' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSessionType(opt.value)}
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-all',
                  sessionType === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                  sessionType === opt.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                )}>
                  <StepIcon type={opt.icon} size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Duration</label>
          <div className="grid grid-cols-5 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  'py-3 rounded-xl text-sm font-medium transition-all border-2',
                  duration === d
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-300 bg-white dark:bg-gray-800'
                )}
              >
                {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d}m`}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Interviews on Uteo are always free for candidates.</p>
        </div>

        {/* Role / Position */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role / Position (optional)</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="Which role or position is this interview for?"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition resize-none placeholder-gray-400"
          />
        </div>

        {/* Location (physical/hybrid) */}
        {(sessionType === 'PHYSICAL' || sessionType === 'HYBRID') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter interview location or office address..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition placeholder-gray-400"
            />
          </div>
        )}

        {/* Meeting link (virtual/hybrid) */}
        {(sessionType === 'VIRTUAL' || sessionType === 'HYBRID') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Meeting Link (optional)
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.jitsi.si/... or Zoom/Google Meet link"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">A Jitsi meeting room will be generated automatically if not provided.</p>
          </div>
        )}

        {/* Group Session */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Panel Interview</p>
              <p className="text-xs text-gray-400 mt-0.5">Multiple interviewers joining the same call</p>
            </div>
            <button
              type="button"
              onClick={() => setIsGroupSession((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors',
                isGroupSession ? 'bg-primary-500 border-primary-500' : 'bg-gray-200 dark:bg-gray-600 border-transparent'
              )}
            >
              <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', isGroupSession ? 'translate-x-5' : 'translate-x-1')} />
            </button>
          </div>
          {isGroupSession && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Max Interviewers: <span className="text-primary-500">{maxParticipants}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={50}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>2</span><span>50</span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Breakout Rooms</p>
                    <p className="text-xs text-gray-400 mt-0.5">Split interviewers into separate breakout rooms</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanBreakoutRooms((v) => !v)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors',
                      planBreakoutRooms ? 'bg-primary-500 border-primary-500' : 'bg-gray-200 dark:bg-gray-600 border-transparent'
                    )}
                  >
                    <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', planBreakoutRooms ? 'translate-x-5' : 'translate-x-1')} />
                  </button>
                </div>
                {planBreakoutRooms && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        Number of Rooms: <span className="text-primary-500">{breakoutRoomCount}</span>
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[2,3,4,5,6,7,8,9,10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setBreakoutRoomCount(n)}
                            className={cn(
                              'w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all',
                              breakoutRoomCount === n
                                ? 'border-primary-500 bg-primary-500 text-white'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Assignment Mode</label>
                      <div className="flex gap-2">
                        {([
                          { value: 'auto' as const, label: 'Auto-assign', desc: 'System distributes evenly' },
                          { value: 'manual' as const, label: 'Manual', desc: 'You assign participants' },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setBreakoutAssignMode(opt.value)}
                            className={cn(
                              'flex-1 p-3 rounded-xl border-2 text-left transition-all',
                              breakoutAssignMode === opt.value
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            )}
                          >
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Session Recording */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Record Session</p>
              <p className="text-xs text-gray-400 mt-0.5">Record the interview for post-interview review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecordSession((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors ml-4 shrink-0',
              recordSession ? 'bg-red-500 border-red-500' : 'bg-gray-200 dark:bg-gray-600 border-transparent'
            )}
          >
            <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', recordSession ? 'translate-x-5' : 'translate-x-1')} />
          </button>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition"
          >
            <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
            <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
            <option value="Africa/Cairo">Africa/Cairo (EET, UTC+2)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET, UTC+1)</option>
            <option value="America/New_York">America/New_York (EST, UTC-5)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST, UTC-8)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Interview Reminders</label>
          <p className="text-xs text-gray-400 mb-3">Automated reminders sent to all participants before the interview</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: '24h', label: '24 hours before' },
              { value: '1h', label: '1 hour before' },
              { value: '15m', label: '15 min before' },
            ]).map((r) => {
              const checked = reminders.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReminders((prev) =>
                    checked ? prev.filter((x) => x !== r.value) : [...prev, r.value]
                  )}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    checked
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  <span className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border-2 text-[9px] transition-all shrink-0',
                    checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {checked && '✓'}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assign To (trainer/firm flow only) */}
        {isRecruiter && (teamMembers.length > 0 || departments.length > 0) && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assign To</label>
            <p className="text-xs text-gray-400 mb-3">Who will conduct this interview?</p>

            {/* Mode selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { mode: 'self' as const, label: 'Myself', icon: '👤' },
                { mode: 'team' as const, label: 'Entire Team', icon: '👥' },
                ...(departments.length > 0 ? [{ mode: 'department' as const, label: 'Department', icon: '🏢' }] : []),
                ...(teamMembers.length > 0 ? [{ mode: 'individual' as const, label: 'Individual', icon: '🎯' }] : []),
              ].map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setAssignMode(mode); setAssignedConsultantId(''); setAssignedDepartmentId(''); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    assignMode === mode
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>

            {/* Department selection */}
            {assignMode === 'department' && departments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setAssignedDepartmentId(dept.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      assignedDepartmentId === dept.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
                      <svg className="h-4 w-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{dept.name}</p>
                      <p className="text-xs text-gray-400">{(dept as any)._count?.members ?? '?'} members</p>
                    </div>
                    {assignedDepartmentId === dept.id && (
                      <svg className="ml-auto h-5 w-5 text-primary-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Individual consultant selection */}
            {assignMode === 'individual' && teamMembers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teamMembers.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => setAssignedConsultantId(tm.user.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      assignedConsultantId === tm.user.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-secondary-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {tm.user.firstName?.[0] || '?'}{tm.user.lastName?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tm.user.firstName} {tm.user.lastName}</p>
                      <p className="text-xs text-gray-400">{tm.title || tm.role}</p>
                    </div>
                    {assignedConsultantId === tm.user.id && (
                      <svg className="ml-auto h-5 w-5 text-primary-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Info text */}
            <p className="text-xs text-gray-400 mt-3">
              {assignMode === 'self' && 'You will personally conduct this interview.'}
              {assignMode === 'team' && 'Any available interviewer from your team can join this session.'}
              {assignMode === 'department' && 'Any member of the selected department can conduct this interview.'}
              {assignMode === 'individual' && 'This interviewer will be assigned to conduct the interview.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: Date & Time ─────────────────────────────────
  const renderStep3 = () => (
    <div className="transition-all duration-300">
      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            disabled={!canGoPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <StepIcon type="chevron-left" size={18} />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {format(calendarMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <StepIcon type="chevron-right" size={18} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`pad-${idx}`} />;
            const isPast = day < startOfDay(new Date());
            const isSelected = selectedDate?.toDateString() === day.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <button
                key={day.toISOString()}
                disabled={isPast}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                  isSelected && 'bg-primary-500 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/40',
                  !isSelected && isToday && 'border-2 border-primary-400 text-primary-600 dark:text-primary-400',
                  !isSelected && !isToday && isPast && 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                  !isSelected && !isToday && !isPast && 'text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700'
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <StepIcon type="clock" size={16} />
            Available times on {format(selectedDate, 'EEEE, MMM d')}
          </h3>

          {slotsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl h-11 bg-gray-100 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
              <StepIcon type="calendar" size={32} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2">No available slots</p>
              <p className="text-xs text-gray-400 mt-1">Please select another date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => setSelectedTime(slot.time)}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-medium border-2 transition-all',
                    !slot.available && 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed',
                    slot.available && selectedTime === slot.time && 'border-primary-500 bg-primary-500 text-white',
                    slot.available && selectedTime !== slot.time && 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-700 dark:hover:bg-primary-900/20'
                  )}
                >
                  {formatTime(slot.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 4: Review & Confirm ────────────────────────────
  const renderStep4 = () => {
    const clientName = isRecruiter
      ? (clientMode === 'existing' && selectedClient
        ? `${selectedClient.firstName} ${selectedClient.lastName}`
        : newClientName)
      : null;
    const trainerName = selectedTrainer
      ? `${selectedTrainer.firstName || selectedTrainer.user?.firstName || ''} ${selectedTrainer.lastName || selectedTrainer.user?.lastName || ''}`.trim()
      : (isRecruiter ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : '');

    return (
      <div className="transition-all duration-300">
        {/* Summary card */}
        <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Interview Summary</h3>
          <div className="space-y-3 text-sm">
            {isRecruiter && clientName && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Candidate</span>
                <span className="font-medium text-gray-900 dark:text-white">{clientName}</span>
              </div>
            )}
            {!isRecruiter && trainerName && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Recruiter</span>
                <span className="font-medium text-gray-900 dark:text-white">{trainerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Interview Type</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {sessionType === 'VIRTUAL' ? 'Video Call' : sessionType === 'PHYSICAL' ? 'On-Site' : 'Hybrid'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Duration</span>
              <span className="font-medium text-gray-900 dark:text-white">{duration} minutes</span>
            </div>
            {topic && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Role</span>
                <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{topic}</span>
              </div>
            )}
            {location && sessionType !== 'VIRTUAL' && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Location</span>
                <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{location}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedDate ? format(selectedDate, 'EEE, MMM d yyyy') : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Time</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedTime ? formatTime(selectedTime) : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Timezone</span>
              <span className="font-medium text-gray-900 dark:text-white">{timezone.replace(/_/g, ' ')}</span>
            </div>
            {isGroupSession && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Format</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Panel · {maxParticipants} interviewers{planBreakoutRooms ? ` · ${breakoutRoomCount} breakout rooms` : ''}
                </span>
              </div>
            )}
            {recordSession && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Recording</span>
                <span className="font-medium text-red-500">Enabled</span>
              </div>
            )}
            <div className="flex justify-between border-t border-primary-100 dark:border-primary-800/30 pt-3 mt-3">
              <span className="font-semibold text-gray-900 dark:text-white text-base">Cost</span>
              <span className="font-bold text-2xl text-emerald-500">Free</span>
            </div>
          </div>
        </div>

        {/* Rescheduling Policy */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-4 mb-6">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Rescheduling Policy</p>
            <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 space-y-1">
              <li>• Cancel or reschedule more than 24 hours before — <strong>no penalty</strong></li>
              <li>• Cancellations under 24 hours — <strong>may affect your profile score</strong></li>
            </ul>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 px-4 py-3 mb-4 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}
      </div>
    );
  };

  // ── Step subtitle helper ────────────────────────────────
  const stepSubtitle: Record<number, string> = {
    1: isRecruiter ? 'Choose an existing candidate or add someone new' : 'Search recruiters or employers by name',
    2: 'Configure interview type, duration and role details',
    3: 'Choose the interview date and time',
    4: 'Review all details before confirming',
  };

  // ── Sidebar summary (what has been picked so far) ───────
  const renderSidebarSummary = () => {
    const trainerName = selectedTrainer
      ? `${selectedTrainer.firstName || selectedTrainer.user?.firstName || ''} ${selectedTrainer.lastName || selectedTrainer.user?.lastName || ''}`.trim()
      : null;
    const clientName = selectedClient
      ? `${selectedClient.firstName} ${selectedClient.lastName}`
      : newClientName || null;
    const personName = isRecruiter ? clientName : trainerName;

    const hasSomething = personName || selectedDate || (amount > 0 && currentStep >= 2);
    if (!hasSomething) return null;

    return (
      <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Your interview</p>
        {personName && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#F77B0F]/20 border border-[#F77B0F]/40 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-[#F77B0F]">{personName[0]}</span>
            </div>
            <p className="text-sm text-white/80 font-medium truncate">{personName}</p>
          </div>
        )}
        {currentStep >= 2 && (
          <div className="flex items-center gap-2 text-xs text-white/55 flex-wrap">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
              sessionType === 'VIRTUAL' ? 'bg-blue-500/20 text-blue-300' :
              sessionType === 'PHYSICAL' ? 'bg-amber-500/20 text-amber-300' :
              sessionType === 'HYBRID' ? 'bg-purple-500/20 text-purple-300' :
              'bg-teal-500/20 text-teal-300'
            )}>
              {sessionType === 'VIRTUAL' ? 'Virtual' : sessionType === 'PHYSICAL' ? 'In-Person' : sessionType === 'HYBRID' ? 'Hybrid' : 'Pre-recorded'}
            </span>
            <span>·</span>
            <span>{duration >= 60 ? `${duration / 60}h` : `${duration}m`}</span>
            {isGroupSession && <><span>·</span><span className="text-emerald-300">Panel · {maxParticipants}</span></>}
          </div>
        )}
        {selectedDate && selectedTime && (
          <p className="text-xs text-white/60">
            {format(selectedDate, 'EEE, d MMM')} at {formatTime(selectedTime)}
          </p>
        )}
        {amount > 0 && currentStep >= 2 && (
          <p className="text-xl font-black text-[#F77B0F]">{formatCurrency(amount)}</p>
        )}
      </div>
    );
  };

  // ── Main content ────────────────────────────────────────
  const content = (
    <div className="flex w-full" style={{ height: 'min(88vh, 740px)' }}>

      {/* ─ Left sidebar ─ */}
      <div className="w-64 shrink-0 bg-[#192C67] flex flex-col p-7 rounded-l-2xl overflow-hidden">
        {/* Brand */}
        <div className="mb-10 shrink-0">
          <span className="text-lg font-black text-white tracking-tight">Uteo</span>
        </div>

        {/* Steps */}
        <div className="shrink-0">
          {renderStepIndicator()}
        </div>

        {/* Dynamic summary of selections */}
        {renderSidebarSummary()}
      </div>

      {/* ─ Right panel ─ */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0d1325] rounded-r-2xl overflow-hidden min-w-0">

        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-8 pt-7 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#F77B0F] mb-1">
              Step {currentStep} of {steps.length}
            </p>
            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {steps[currentStep - 1].label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stepSubtitle[currentStep]}</p>
          </div>
          {onClose && !inline && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0 ml-4 mt-0.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="shrink-0 h-0.5 bg-gray-100 dark:bg-white/5 mx-8 rounded-full mb-5">
          <div
            className="h-full bg-[#F77B0F] rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          {currentStep === 1 && (isRecruiter ? renderTrainerStep1() : renderClientStep1())}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer navigation */}
        <div className="shrink-0 flex items-center justify-between px-8 py-5 border-t border-gray-100 dark:border-white/5">
          {currentStep > 1 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <StepIcon type="chevron-left" size={15} />
              Back
            </button>
          ) : <span />}

          {currentStep < 4 ? (
            <button
              onClick={goNext}
              disabled={
                (currentStep === 1 && !step1Valid) ||
                (currentStep === 2 && !step2Valid) ||
                (currentStep === 3 && !step3Valid)
              }
              className="flex items-center gap-1.5 px-6 py-2.5 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#0f1e47] disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
            >
              Continue
              <StepIcon type="chevron-right" size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 bg-[#F77B0F] text-white font-bold rounded-xl hover:bg-[#d96a0c] disabled:opacity-40 transition-colors text-sm shadow-md min-w-[190px] justify-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <StepIcon type="check" size={15} />
                  Confirm Interview
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Modal wrapper or inline ─────────────────────────────
  if (inline) return <div className="rounded-2xl overflow-hidden shadow-2xl">{content}</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[860px] shadow-2xl rounded-2xl overflow-hidden">
        {content}
      </div>
    </div>
  );
}
