'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { applicationsService } from '@/lib/services/applications';
import { apiPatch, apiPost } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { format, startOfDay, addMonths, subMonths, startOfMonth, getDay, getDaysInMonth } from 'date-fns';

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  notes: string | null;
  scheduledAt?: string | null;
  jitsiRoom?: string | null;
  job?: { id: string; title: string; company?: { name: string; logoUrl?: string } };
  user?: { id: string; firstName: string; lastName: string; avatar?: string; email: string };
}

const JAAS_APP_ID = 'vpaas-magic-cookie-315e6ce2ff244da49ecbd19f303846d7';
function buildRoomName(appId: string) { return `uteo-interview-${appId.slice(-12)}`; }
function buildJaasUrl(roomName: string, displayName?: string, email?: string) {
  const base = `https://8x8.vc/${JAAS_APP_ID}/${roomName}`;
  const params = new URLSearchParams();
  if (displayName) params.set('userInfo.displayName', displayName);
  if (email) params.set('userInfo.email', email);
  const hash = params.toString();
  return hash ? `${base}#${hash}` : base;
}
function launchJitsi(roomName: string, displayName?: string, email?: string) {
  const w = 960, h = 720;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(buildJaasUrl(roomName, displayName, email), 'uteo-interview', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`);
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const DURATIONS = [15, 30, 45, 60, 90] as const;
const TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, UTC+3)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, UTC+1)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, UTC+2)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'UTC', label: 'UTC' },
];

function StepIcon({ type, size = 18 }: { type: string; size?: number }) {
  const s = size;
  if (type === 'user') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
  if (type === 'file') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
  if (type === 'calendar') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  if (type === 'check') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
  if (type === 'chevron-left') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
  if (type === 'chevron-right') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
  if (type === 'clock') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  if (type === 'video') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>;
  if (type === 'phone') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>;
  if (type === 'map-pin') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
  if (type === 'search') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
  return null;
}

// ─── Interview Scheduling Wizard ─────────────────────────────────────────────
// When `preselectedApp` is provided → 3 steps (Session Details, Date & Time, Review)
// When null → 4 steps (Select Candidate, Session Details, Date & Time, Review)
function InterviewWizard({
  preselectedApp,
  allApplications,
  onClose,
  onSaved,
  recruiterName,
  recruiterEmail,
}: {
  preselectedApp: Application | null;
  allApplications: Application[];
  onClose: () => void;
  recruiterName?: string;
  recruiterEmail?: string;
  onSaved: () => void;
}) {
  const { addToast } = useToast();
  const hasPreselected = !!preselectedApp;

  const STEPS = hasPreselected
    ? [
        { id: 1, label: 'Session Details', icon: 'file' },
        { id: 2, label: 'Date & Time', icon: 'calendar' },
        { id: 3, label: 'Review & Confirm', icon: 'check' },
      ]
    : [
        { id: 1, label: 'Select Candidate', icon: 'user' },
        { id: 2, label: 'Session Details', icon: 'file' },
        { id: 3, label: 'Date & Time', icon: 'calendar' },
        { id: 4, label: 'Review & Confirm', icon: 'check' },
      ];

  const [step, setStep] = useState(1);

  // Step: Select Candidate (new interview only)
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(preselectedApp);

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.toLowerCase();
    return allApplications.filter((a) => {
      if (!q) return true;
      const name = `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.toLowerCase();
      const title = (a.job?.title ?? '').toLowerCase();
      const email = (a.user?.email ?? '').toLowerCase();
      return name.includes(q) || title.includes(q) || email.includes(q);
    });
  }, [allApplications, candidateSearch]);

  // Session details
  const [sessionType, setSessionType] = useState<'VIRTUAL' | 'PHONE' | 'IN_PERSON'>('VIRTUAL');
  const [duration, setDuration] = useState<number>(45);
  const [agenda, setAgenda] = useState(preselectedApp?.notes ?? '');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [reminders, setReminders] = useState<string[]>(['24h']);

  // AI Questions
  const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);

  async function generateAiQuestions() {
    const currentApp = selectedApp;
    if (!currentApp) return;
    setAiQuestionsLoading(true);
    try {
      const candidateName = `${currentApp.user?.firstName ?? ''} ${currentApp.user?.lastName ?? ''}`.trim();
      const questions = await apiPost<string[]>('/ai/interview-questions', {
        jobTitle: currentApp.job?.title ?? '',
        skills: [],
        candidateName: candidateName || undefined,
        notes: agenda || undefined,
      });
      setAiQuestions(Array.isArray(questions) ? questions : []);
    } catch {
      // silently fail
    } finally {
      setAiQuestionsLoading(false);
    }
  }

  // Date & Time
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    preselectedApp?.scheduledAt ? startOfDay(new Date(preselectedApp.scheduledAt)) : null,
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    preselectedApp?.scheduledAt ? format(new Date(preselectedApp.scheduledAt), 'HH:mm') : null,
  );
  const [saving, setSaving] = useState(false);

  const canGoPrevMonth = calendarMonth > startOfMonth(new Date());

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    if (!selectedDate) return slots;
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    for (let h = 7; h <= 20; h++) {
      for (const m of [0, 30]) {
        if (h === 20 && m === 30) break;
        if (isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()))) continue;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(calendarMonth);
    const startPad = getDay(new Date(year, month, 1));
    const days: (Date | null)[] = Array(startPad).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);

  // Validation per step
  const stepValid = useMemo(() => {
    if (!hasPreselected && step === 1) return !!selectedApp;
    const detailsStep = hasPreselected ? 1 : 2;
    const dateStep = hasPreselected ? 2 : 3;
    if (step === detailsStep) return sessionType !== 'IN_PERSON' || location.trim().length > 0;
    if (step === dateStep) return !!selectedDate && !!selectedTime;
    return true;
  }, [step, hasPreselected, selectedApp, sessionType, location, selectedDate, selectedTime]);

  async function submit() {
    const app = selectedApp;
    if (!app || !selectedDate || !selectedTime) return;
    setSaving(true);
    try {
      const [hh, mm] = selectedTime.split(':');
      const scheduledAt = `${format(selectedDate, 'yyyy-MM-dd')}T${hh}:${mm}:00`;
      const roomName = buildRoomName(app.id);
      const videoUrl = sessionType === 'VIRTUAL'
        ? (meetingLink || buildJaasUrl(roomName, recruiterName, recruiterEmail))
        : null;

      // Build the agenda note that also stores the schedule details
      const fullNotes = [
        agenda,
        `Scheduled: ${format(selectedDate, 'EEEE, MMMM d yyyy')} at ${fmtTime(selectedTime)} (${timezone})`,
        sessionType === 'IN_PERSON' && location ? `Location: ${location}` : null,
        videoUrl ? `Meeting link: ${videoUrl}` : null,
      ].filter(Boolean).join('\n');

      await apiPatch(`/applications/${app.id}/status`, {
        status: 'INTERVIEW',
        notes: fullNotes,
        scheduledAt,
        meetingLink: videoUrl || undefined,
      });

      // Send candidate a direct message with all the details so they get
      // an immediate notification and have the link in their inbox
      try {
        const conv = await apiPost<any>('/conversations', {
          participantIds: [app.user?.id],
          type: 'DIRECT',
        });
        const convId = conv?.id ?? (conv as any)?.data?.id;
        if (convId && app.user?.id) {
          const formatLabel = sessionType === 'VIRTUAL' ? 'Video Call' : sessionType === 'PHONE' ? 'Phone Call' : 'In-Person';
          const durationLabel = duration >= 60 ? `${duration / 60}h${duration % 60 ? ` ${duration % 60}m` : ''}` : `${duration} min`;
          const lines = [
            `Hi ${app.user.firstName} 👋 Your interview for the **${app.job?.title}** role has been scheduled!`,
            ``,
            `📅  ${format(selectedDate, 'EEEE, MMMM d yyyy')}`,
            `🕐  ${fmtTime(selectedTime)} (${timezone.replace(/_/g, ' ')})`,
            `⏱  ${durationLabel} · ${formatLabel}`,
            sessionType === 'IN_PERSON' && location ? `📍  ${location}` : null,
            videoUrl ? `🔗  Join here: ${videoUrl}` : null,
            agenda ? `\n📋  Agenda: ${agenda}` : null,
            ``,
            sessionType === 'VIRTUAL'
              ? `You can join the link above at any time — just wait in the room and the interviewer will join shortly.`
              : null,
            `Good luck! 🎉`,
          ].filter((l) => l !== null).join('\n');

          await apiPost(`/conversations/${convId}/messages`, {
            content: lines,
            messageType: 'TEXT',
          });
        }
      } catch { /* notification failure must not block the schedule save */ }

      addToast('success', 'Interview scheduled — candidate notified');
      onSaved();
    } catch {
      addToast('error', 'Failed to schedule interview');
    } finally {
      setSaving(false);
    }
  }

  const app = selectedApp;
  const candidateName = app ? `${app.user?.firstName ?? ''} ${app.user?.lastName ?? ''}`.trim() : null;

  // ── Left sidebar ─────────────────────────────────────────────────────────
  const sidebar = (
    <div className="w-60 shrink-0 bg-gray-50 dark:bg-gray-800/60 border-r border-gray-100 dark:border-white/5 flex flex-col p-7 rounded-l-2xl overflow-hidden">
      <div className="mb-8 shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Uteo Hire</p>
        <p className="text-gray-900 dark:text-white font-black text-lg leading-tight">Schedule Interview</p>
      </div>

      <div className="shrink-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => { if (s.id < step) setStep(s.id); }}
                disabled={s.id >= step}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all shrink-0',
                  step > s.id && 'bg-[#F77B0F] border-[#F77B0F] text-white cursor-pointer',
                  step === s.id && 'border-[#F77B0F] bg-[#F77B0F]/10 text-[#F77B0F]',
                  step < s.id && 'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 bg-transparent cursor-default',
                )}
              >
                {step > s.id ? <StepIcon type="check" size={15} /> : <StepIcon type={s.icon} size={15} />}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('w-0.5 h-7 mt-1', step > s.id ? 'bg-[#F77B0F]/40' : 'bg-gray-200 dark:bg-gray-700')} />
              )}
            </div>
            <div className={cn('pt-1.5', i < STEPS.length - 1 && 'pb-7')}>
              <p className={cn('text-sm font-semibold leading-tight', step >= s.id ? 'text-gray-900 dark:text-white' : 'text-gray-400')}>
                {s.label}
              </p>
              {step === s.id && <p className="text-[11px] text-gray-400 mt-0.5">In progress</p>}
              {step > s.id && <p className="text-[11px] text-[#F77B0F] mt-0.5">Done</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Live summary */}
      {(candidateName || selectedDate) && (
        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-white/5 space-y-2">
          {candidateName && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Candidate</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#F77B0F]/10 border border-[#F77B0F]/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#F77B0F]">{candidateName[0]}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate">{candidateName}</p>
              </div>
              {app?.job?.title && <p className="text-xs text-gray-400 truncate">{app.job.title}</p>}
            </>
          )}
          {(hasPreselected ? step >= 2 : step >= 3) && (
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F77B0F]/10 text-[#F77B0F]">
                {sessionType === 'VIRTUAL' ? 'Video' : sessionType === 'PHONE' ? 'Phone' : 'In-Person'}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {duration}min
              </span>
            </div>
          )}
          {selectedDate && selectedTime && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {format(selectedDate, 'EEE, d MMM')} at {fmtTime(selectedTime)}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // ── Step: Select Candidate ───────────────────────────────────────────────
  const selectCandidateContent = (
    <div className="space-y-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <StepIcon type="search" size={16} />
        </span>
        <input
          type="text"
          value={candidateSearch}
          onChange={(e) => setCandidateSearch(e.target.value)}
          placeholder="Search by name, job title or email..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] transition"
        />
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {candidateSearch ? `No candidates match "${candidateSearch}"` : 'No candidates found'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {candidateSearch ? 'Try a different name, email, or job title' : 'Candidates appear here once applicants apply to your jobs'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredCandidates.map((a) => {
            const name = `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.trim();
            const isSelected = selectedApp?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedApp(a)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? 'border-[#F77B0F] bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10'
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#F77B0F]/40',
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm shrink-0">
                  {a.user?.avatar
                    ? <img src={a.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : ((a.user?.firstName?.[0] ?? '') + (a.user?.lastName?.[0] ?? '')).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.job?.title} {a.job?.company?.name ? `· ${a.job.company.name}` : ''}</p>
                  <p className="text-xs text-gray-400 truncate">{a.user?.email}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                  a.status === 'SHORTLISTED' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  a.status === 'REVIEWED' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                  a.status === 'SUBMITTED' && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                  a.status === 'INTERVIEW' && 'bg-[#F77B0F]/10 text-[#F77B0F]',
                )}>
                  {a.status}
                </span>
                {isSelected && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F77B0F] text-white shrink-0">
                    <StepIcon type="check" size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Step: Session Details ────────────────────────────────────────────────
  const sessionDetailsContent = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Interview Format</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'VIRTUAL' as const, label: 'Video Call', desc: 'Online meeting', icon: 'video' },
            { value: 'PHONE' as const, label: 'Phone Call', desc: 'Audio only', icon: 'phone' },
            { value: 'IN_PERSON' as const, label: 'In-Person', desc: 'Meet on-site', icon: 'map-pin' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSessionType(opt.value)}
              className={cn(
                'flex flex-col items-center p-4 rounded-2xl border-2 transition-all',
                sessionType === opt.value
                  ? 'border-[#F77B0F] bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#F77B0F]/40',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                sessionType === opt.value ? 'bg-[#F77B0F] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500',
              )}>
                <StepIcon type={opt.icon} size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Duration</label>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                duration === d
                  ? 'border-[#F77B0F] bg-[#F77B0F] text-white'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#F77B0F]/40 bg-white dark:bg-gray-800',
              )}
            >
              {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d}m`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Interview Agenda (optional)</label>
        <textarea
          rows={3}
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="e.g. Technical round — system design, 2 coding problems. Bring portfolio."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] resize-none transition"
        />
      </div>

      {/* AI Questions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">AI Interview Questions</label>
          <button
            type="button"
            onClick={generateAiQuestions}
            disabled={aiQuestionsLoading || !selectedApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#F77B0F] text-[#F77B0F] hover:bg-[#F77B0F]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {aiQuestionsLoading ? (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <span>✨</span>
            )}
            {aiQuestionsLoading ? 'Generating...' : 'AI Questions'}
          </button>
        </div>
        {aiQuestions.length > 0 && (
          <div className="rounded-xl bg-[#F77B0F]/5 border border-[#F77B0F]/20 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F77B0F] mb-2">Suggested Questions</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {aiQuestions.map((q, i) => (
                <li key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{q}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {sessionType === 'IN_PERSON' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Location *</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Westlands Office, 3rd floor, Delta Corner"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] transition"
          />
        </div>
      )}

      {sessionType === 'VIRTUAL' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Custom Meeting Link (optional)</label>
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Zoom, Google Meet, Teams... or leave blank for auto-generated room"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] transition"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#F77B0F] transition"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Candidate Reminders</label>
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
                onClick={() => setReminders((p) => checked ? p.filter((x) => x !== r.value) : [...p, r.value])}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                  checked
                    ? 'border-[#F77B0F] bg-[#F77B0F]/5 dark:bg-[#F77B0F]/15 text-[#F77B0F]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300',
                )}
              >
                <span className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border-2 text-[9px] shrink-0',
                  checked ? 'bg-[#F77B0F] border-[#F77B0F] text-white' : 'border-gray-300 dark:border-gray-600',
                )}>{checked && '✓'}</span>
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Step: Date & Time ────────────────────────────────────────────────────
  const dateTimeContent = (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            disabled={!canGoPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <StepIcon type="chevron-left" size={18} />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{format(calendarMonth, 'MMMM yyyy')}</span>
          <button
            onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <StepIcon type="chevron-right" size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1.5">{d}</div>
          ))}
        </div>

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
                onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                className={cn(
                  'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                  isSelected && 'bg-[#F77B0F] text-white shadow-md',
                  !isSelected && isToday && 'border-2 border-[#F77B0F] text-[#F77B0F]',
                  !isSelected && !isToday && isPast && 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                  !isSelected && !isToday && !isPast && 'text-gray-700 dark:text-gray-200 hover:bg-[#F77B0F]/10 hover:text-[#F77B0F]',
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <StepIcon type="clock" size={16} />
            Available slots — {format(selectedDate, 'EEEE, MMM d')}
          </h3>
          {timeSlots.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
              <p className="text-sm text-gray-500">No slots available today. Choose another date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-medium border-2 transition-all',
                    selectedTime === slot
                      ? 'border-[#F77B0F] bg-[#F77B0F] text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-[#F77B0F]/50 hover:bg-[#F77B0F]/5',
                  )}
                >
                  {fmtTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Step: Review ─────────────────────────────────────────────────────────
  const reviewContent = (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Interview Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Candidate</span>
            <span className="font-medium text-gray-900 dark:text-white">{candidateName}</span>
          </div>
          {app?.job?.title && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Position</span>
              <span className="font-medium text-gray-900 dark:text-white">{app.job.title}</span>
            </div>
          )}
          {app?.job?.company?.name && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Company</span>
              <span className="font-medium text-gray-900 dark:text-white">{app.job.company.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Format</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {sessionType === 'VIRTUAL' ? 'Video Call' : sessionType === 'PHONE' ? 'Phone Call' : 'In-Person'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Duration</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {duration >= 60 ? `${duration / 60}h${duration % 60 ? ` ${duration % 60}m` : ''}` : `${duration} min`}
            </span>
          </div>
          {selectedDate && selectedTime && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{format(selectedDate, 'EEEE, MMMM d yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Time</span>
                <span className="font-medium text-gray-900 dark:text-white">{fmtTime(selectedTime)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Timezone</span>
            <span className="font-medium text-gray-900 dark:text-white">{timezone.replace(/_/g, ' ')}</span>
          </div>
          {sessionType === 'IN_PERSON' && location && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Location</span>
              <span className="font-medium text-gray-900 dark:text-white text-right max-w-[55%]">{location}</span>
            </div>
          )}
          {agenda && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-1">Agenda</p>
              <p className="text-gray-700 dark:text-gray-200 text-xs leading-relaxed">{agenda}</p>
            </div>
          )}
          {reminders.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Reminders</span>
              <span className="font-medium text-gray-900 dark:text-white">{reminders.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 px-4 py-3 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          A calendar invite will be sent to <strong>{app?.user?.email}</strong>.
        </p>
      </div>
    </div>
  );

  const stepSubtitles: Record<number, string> = hasPreselected
    ? {
        1: 'Choose format, duration and agenda',
        2: 'Pick a date and time slot',
        3: 'Review everything before sending the invite',
      }
    : {
        1: 'Search and pick the candidate to interview',
        2: 'Choose format, duration and agenda',
        3: 'Pick a date and time slot',
        4: 'Review everything before sending the invite',
      };

  const currentStepLabel = STEPS[step - 1]?.label ?? '';

  function renderStepContent() {
    if (!hasPreselected) {
      if (step === 1) return selectCandidateContent;
      if (step === 2) return sessionDetailsContent;
      if (step === 3) return dateTimeContent;
      return reviewContent;
    }
    if (step === 1) return sessionDetailsContent;
    if (step === 2) return dateTimeContent;
    return reviewContent;
  }

  const isLastStep = step === STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[860px] shadow-2xl rounded-2xl overflow-hidden flex" style={{ height: 'min(90vh, 720px)' }}>
        {sidebar}

        {/* Right panel */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-r-2xl overflow-hidden min-w-0">
          {/* Header */}
          <div className="shrink-0 flex items-start justify-between px-8 pt-7 pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#F77B0F] mb-1">
                Step {step} of {STEPS.length}
              </p>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{currentStepLabel}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stepSubtitles[step]}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0 ml-4 mt-0.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="shrink-0 h-0.5 bg-gray-100 dark:bg-white/5 mx-8 rounded-full mb-5">
            <div className="h-full bg-gray-300 dark:bg-white/15 rounded-full transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-4">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-8 py-5 border-t border-gray-100 dark:border-white/5">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <StepIcon type="chevron-left" size={15} />
                Back
              </button>
            ) : <span />}

            {!isLastStep ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Continue
                <StepIcon type="chevron-right" size={15} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={saving}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#F77B0F] text-white font-bold rounded-xl hover:bg-[#d96a0c] disabled:opacity-40 transition-colors text-sm shadow-md min-w-[200px] justify-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <StepIcon type="check" size={15} />
                    Send Interview Invite
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Interview card ──────────────────────────────────────────────────────────
function InterviewCard({ app, onSchedule, onJoin, onUpdateStatus }: {
  app: Application;
  onSchedule: () => void;
  onJoin: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  const hasDateTime = !!app.scheduledAt;
  const interviewTime = app.scheduledAt ? new Date(app.scheduledAt) : null;
  const isPast = interviewTime ? interviewTime < new Date() : false;
  const isToday = interviewTime ? interviewTime.toDateString() === new Date().toDateString() : false;

  return (
    <div className={`rounded-2xl border bg-white dark:bg-gray-800/50 p-5 transition-all hover:shadow-sm ${
      isToday ? 'border-[#F77B0F]/50 shadow-sm' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {isToday && (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[#F77B0F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F] animate-pulse" />
          Interview Today
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-sm overflow-hidden shrink-0">
          {app.user?.avatar
            ? <img src={app.user.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            : ((app.user?.firstName?.[0] ?? '') + (app.user?.lastName?.[0] ?? '')).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{app.user?.firstName} {app.user?.lastName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{app.job?.title} · {app.job?.company?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{app.user?.email}</p>
            </div>
            {hasDateTime && interviewTime && (
              <div className="text-right shrink-0">
                <div className={`text-xs font-semibold ${isToday ? 'text-[#F77B0F]' : isPast ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {interviewTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {interviewTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>

          {app.notes && (
            <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              {app.notes}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <button onClick={onJoin} className="flex items-center gap-1 text-xs font-semibold text-[#F77B0F] hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
              Join Call
            </button>
            <button onClick={onSchedule} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {hasDateTime ? 'Reschedule' : 'Schedule'}
            </button>
            <a href={`/messages?userId=${app.user?.id}`} className="flex items-center gap-1 text-xs font-medium text-[#F77B0F] hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Message
            </a>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => onUpdateStatus('HIRED')} className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline">Hire</button>
              <button onClick={() => onUpdateStatus('REJECTED')} className="text-xs font-semibold text-red-500 dark:text-red-400 hover:underline">Reject</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
function InterviewsContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER';
  const { addToast } = useToast();

  const [interviews, setInterviews] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  // null = closed, 'new' = new interview wizard, or Application = reschedule
  const [wizardTarget, setWizardTarget] = useState<'new' | Application | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/interviews'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  async function loadInterviews() {
    try {
      const d = await applicationsService.list({ status: 'INTERVIEW', limit: 100 } as any);
      setInterviews((d as any)?.items ?? []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    loadInterviews();
    applicationsService.list({ limit: 100 } as any)
      .then((d) => setAllApplications((d as any)?.items ?? []))
      .catch(() => {});
  }, [isAuthenticated, isRecruiter]);

  async function handleUpdateStatus(appId: string, status: string) {
    try {
      await apiPatch(`/applications/${appId}/status`, { status });
      setInterviews((apps) => apps.filter((a) => a.id !== appId));
      addToast('success', status === 'HIRED' ? 'Candidate hired!' : 'Application updated.');
    } catch {
      addToast('error', 'Failed to update status');
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>;
  }

  const now = new Date();
  const filtered = interviews.filter((a) => {
    if (filter === 'all') return true;
    const t = a.scheduledAt ? new Date(a.scheduledAt) : null;
    if (filter === 'today') return t?.toDateString() === now.toDateString();
    if (filter === 'upcoming') return t ? t > now : true;
    if (filter === 'past') return t ? t < now : false;
    return true;
  });

  const todayCount = interviews.filter((a) => a.scheduledAt && new Date(a.scheduledAt).toDateString() === now.toDateString()).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interviews</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Schedule and manage candidate interviews</p>
        </div>
        <div className="flex items-center gap-3">
          {todayCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F77B0F]/10 border border-[#F77B0F]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F] animate-pulse" />
              <span className="text-xs font-semibold text-[#F77B0F]">{todayCount} today</span>
            </div>
          )}
          <button
            onClick={() => setWizardTarget('new')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'today', 'upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-1 py-1 text-xs font-semibold capitalize transition-colors border-b-2 ${
              filter === f
                ? 'border-[#F77B0F] text-[#F77B0F]'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f} {f === 'all' ? `(${interviews.length})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">
            {interviews.length === 0 ? 'No interviews scheduled yet' : 'No interviews match this filter'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Click the button above to schedule your first interview.
          </p>
          <button
            onClick={() => setWizardTarget('new')}
            className="text-sm font-semibold text-[#F77B0F] hover:underline"
          >
            + Schedule Interview
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <InterviewCard
              key={app.id}
              app={app}
              onSchedule={() => setWizardTarget(app)}
              onJoin={() => launchJitsi(
                buildRoomName(app.id),
                `${(user as any)?.firstName ?? ''} ${(user as any)?.lastName ?? ''}`.trim() || undefined,
                (user as any)?.email || undefined,
              )}
              onUpdateStatus={(status) => handleUpdateStatus(app.id, status)}
            />
          ))}
        </div>
      )}

      {/* Wizard */}
      {wizardTarget !== null && (
        <InterviewWizard
          preselectedApp={wizardTarget === 'new' ? null : wizardTarget}
          allApplications={allApplications}
          recruiterName={`${(user as any)?.firstName ?? ''} ${(user as any)?.lastName ?? ''}`.trim() || undefined}
          recruiterEmail={(user as any)?.email || undefined}
          onClose={() => setWizardTarget(null)}
          onSaved={async () => {
            setFilter('all');
            setWizardTarget(null);
            await loadInterviews();
          }}
        />
      )}
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>}>
      <InterviewsContent />
    </Suspense>
  );
}
