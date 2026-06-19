'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { applicationsService } from '@/lib/services/applications';
import { assessmentsService } from '@/lib/services/assessments';
import type { Application, ApplicationStatus } from '@/lib/uteo-types';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ALL_STATUSES: ApplicationStatus[] = [
  'SUBMITTED', 'ASSESSMENT', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED',
];

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; dot: string }> = {
  SUBMITTED:   { label: 'Submitted',   color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',       dot: 'bg-gray-400' },
  ASSESSMENT:  { label: 'Assessment',  color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  REVIEWED:    { label: 'Reviewed',    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
  SHORTLISTED: { label: 'Shortlisted', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  INTERVIEW:   { label: 'Interview',   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  HIRED:       { label: 'Hired',       color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  REJECTED:    { label: 'Rejected',    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',         dot: 'bg-red-500' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function jobTypeLabel(type: string) {
  const map: Record<string, string> = {
    FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
    INTERNSHIP: 'Internship', REMOTE: 'Remote', HYBRID: 'Hybrid',
  };
  return map[type] ?? type;
}

type TabKey = 'ALL' | ApplicationStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  ...ALL_STATUSES.map((s) => ({ key: s, label: STATUS_CONFIG[s].label })),
];

// ─── Application Row ───────────────────────────────────────────────────────────

function ApplicationRow({ app }: { app: Application }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.SUBMITTED;
  const router = useRouter();
  const attempt = app.assessmentAttempt;
  const pending = !!attempt && (attempt.status === 'SENT' || attempt.status === 'STARTED');
  const done = !!attempt && (attempt.status === 'GRADED' || attempt.status === 'SUBMITTED');
  const [going, setGoing] = useState(false);

  const takeAssessment = async () => {
    setGoing(true);
    try {
      const link = await assessmentsService.myLink(app.id);
      if (link?.token && !link.done && !link.expired) {
        router.push(`/assessment/${link.token}`);
        return;
      }
    } catch { /* fall through */ }
    setGoing(false);
    // No usable link — open the application so they at least see the status.
    router.push(`/applications/${app.id}`);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${pending ? 'border-[#F77B0F]/40' : 'border-gray-200 dark:border-gray-700'}`}>
    <Link
      href={`/applications/${app.id}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-all group"
    >
      {/* Company logo */}
      {app.job?.company?.logoUrl ? (
        <img
          src={app.job.company.logoUrl}
          alt={app.job.company.name}
          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
        />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-[#192C67] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
          {(app.job?.company?.name ?? 'CO').slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] truncate">
          {app.job?.title ?? 'Unknown Position'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {app.job?.company?.name ?? ''}
          </span>
          {app.job?.jobType && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{jobTypeLabel(app.job.jobType)}</span>
            </>
          )}
          {((app.job as any)?.status === 'CLOSED' || (app.job as any)?.status === 'EXPIRED') && (
            <span className="px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wide">
              No longer available
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block">
        {formatDate(app.appliedAt)}
      </span>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>

    {pending && (
      <div className="px-4 pb-4 -mt-1">
        <button
          onClick={takeAssessment}
          disabled={going}
          className="w-full flex items-center justify-center gap-2 bg-[#F77B0F] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e06d00] disabled:opacity-50"
        >
          {going ? 'Opening…' : '📝 Take assessment now'}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-1.5">A short test is required for this application. You can do it right here.</p>
      </div>
    )}
    {done && (
      <div className="px-4 pb-4 -mt-1">
        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium">
          ✓ Assessment completed{attempt?.score != null ? ` — scored ${attempt.score}%` : ''}
        </div>
      </div>
    )}
    </div>
  );
}

// ─── Applications Page ─────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statsTotal, setStatsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 50, page: 1 };
      if (activeTab !== 'ALL') params.status = activeTab;
      const data = await applicationsService.list(params);
      setApplications(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!authLoading && user) fetchApplications();
  }, [authLoading, user, fetchApplications]);

  // Per-tab counts from the backend (accurate, independent of the active tab).
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const s = await applicationsService.stats();
      setCounts((s as any)?.byStatus ?? {});
      setStatsTotal((s as any)?.total ?? 0);
    } catch { /* non-critical */ }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchStats();
  }, [authLoading, user, fetchStats, total]);

  if (authLoading) return null;

  return (
    <div className="max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {total > 0 ? `${total} application${total !== 1 ? 's' : ''}` : 'Track all your job applications in one place'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-[#192C67] text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#192C67] hover:text-[#192C67] dark:hover:text-[#5b8bc7]'
            }`}
          >
            {tab.label}
            {(() => {
              const c = tab.key === 'ALL' ? statsTotal : (counts[tab.key] ?? 0);
              return c > 0 ? <span className="ml-1.5 opacity-70">{c}</span> : null;
            })()}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : applications.length === 0 ? (
        activeTab === 'ALL' ? (
          <EmptyState
            title="No applications yet"
            description="Start applying to jobs to track your progress here."
            action={{ label: 'Browse Jobs', onClick: () => router.push('/jobs') }}
          />
        ) : (
          <EmptyState
            title={`No ${STATUS_CONFIG[activeTab as ApplicationStatus]?.label.toLowerCase() ?? ''} applications`}
            description="No applications match this status."
            action={{ label: 'View All', onClick: () => setActiveTab('ALL') }}
          />
        )
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationRow key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
