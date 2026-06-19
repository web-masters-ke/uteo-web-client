'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { applicationsService } from '@/lib/services/applications';
import { jobsService } from '@/lib/services/jobs';
import { assessmentsService } from '@/lib/services/assessments';
import type { Application, Job, ApplicationStatus } from '@/lib/uteo-types';

const ALL_STATUSES: ApplicationStatus[] = [
  'SUBMITTED', 'ASSESSMENT', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED',
];

// Linear hiring pipeline order (REJECTED/WITHDRAWN are off-pipeline outcomes).
// Used to offer HR "move back" steps to any earlier stage.
const PIPELINE: ApplicationStatus[] = ['SUBMITTED', 'ASSESSMENT', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED'];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Submitted',
  ASSESSMENT: 'Assessment',
  REVIEWED: 'Reviewed',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ASSESSMENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  REVIEWED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SHORTLISTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INTERVIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  HIRED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const NEXT_ACTIONS: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string; color: string }[]>> = {
  SUBMITTED: [
    { status: 'REVIEWED', label: 'Mark Reviewed', color: 'text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/20' },
    { status: 'INTERVIEW', label: 'Invite to Interview', color: 'text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-900/20' },
    { status: 'REJECTED', label: 'Reject', color: 'text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20' },
  ],
  // A candidate mid-assessment can still be advanced — e.g. invite to interview
  // regardless of whether they've completed the test.
  ASSESSMENT: [
    { status: 'INTERVIEW', label: 'Invite to Interview', color: 'text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-900/20' },
    { status: 'REVIEWED', label: 'Mark Reviewed', color: 'text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/20' },
    { status: 'REJECTED', label: 'Reject', color: 'text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20' },
  ],
  REVIEWED: [
    { status: 'SHORTLISTED', label: 'Shortlist', color: 'text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20' },
    { status: 'REJECTED', label: 'Reject', color: 'text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20' },
  ],
  SHORTLISTED: [
    { status: 'INTERVIEW', label: 'Invite to Interview', color: 'text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-900/20' },
    { status: 'REJECTED', label: 'Reject', color: 'text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20' },
  ],
  INTERVIEW: [
    { status: 'HIRED', label: 'Hire', color: 'text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20' },
    { status: 'REJECTED', label: 'Reject', color: 'text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20' },
  ],
};

function RecruiterApplicationsContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> }>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [filterJobId, setFilterJobId] = useState(searchParams.get('jobId') ?? '');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | ''>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/recruiter/applications');
      return;
    }
    if (!authLoading && isAuthenticated && !isRecruiter) {
      router.replace('/feed');
    }
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    fetchJobs();
  }, [isAuthenticated, isRecruiter]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    fetchApplications();
  }, [isAuthenticated, isRecruiter, filterJobId, filterStatus]);

  // Status chip counts come from the backend and intentionally ignore the
  // status filter, so selecting one chip doesn't zero out the others. They
  // still respect the job filter. Refetched only when the job scope changes.
  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    fetchStats();
  }, [isAuthenticated, isRecruiter, filterJobId]);

  // Auto-refresh every 30s so brand-new applications surface without a full reload.
  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    const id = window.setInterval(() => {
      // skip the auto-refresh while a status update is in-flight to avoid jitter
      if (!updatingId) { fetchApplications(); fetchStats(); }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, isRecruiter, filterJobId, filterStatus, updatingId]);

  async function fetchJobs() {
    try {
      // The recruiter's OWN jobs (every status), not the public ACTIVE-only
      // listing — so the filter dropdown matches the jobs they actually posted.
      const data = await jobsService.mine();
      setJobs((data as any)?.items ?? []);
    } catch {
      // non-critical
    }
  }

  async function fetchStats() {
    try {
      const params: Record<string, any> = {};
      if (filterJobId) params.jobId = filterJobId;
      const data = await applicationsService.stats(params);
      setStats({ total: (data as any)?.total ?? 0, byStatus: (data as any)?.byStatus ?? {} });
    } catch {
      // non-critical — chips just won't render
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      // Respects the active filters: a job filter → that job's report, otherwise
      // a consolidated report of every applicant across the recruiter's jobs.
      const params: Record<string, any> = {};
      if (filterJobId) params.jobId = filterJobId;
      if (filterStatus) params.status = filterStatus;
      const jobTitle = jobs.find((j) => j.id === filterJobId)?.title;
      const scope = (jobTitle || 'all-jobs').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      const date = new Date().toISOString().slice(0, 10);
      await applicationsService.downloadReport(params, `applicants-${scope}-${date}.xlsx`);
    } catch {
      setError('Could not generate the report. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    try {
      // Page through ALL matching applications (the API caps limit at 100), so
      // "all of them" really means all — nothing silently dropped behind a cap.
      const base: Record<string, any> = { limit: 100 };
      if (filterJobId) base.jobId = filterJobId;
      if (filterStatus) base.status = filterStatus;

      const first = await applicationsService.list({ ...base, page: 1 });
      const items = [...((first as any)?.items ?? [])];
      const totalCount = (first as any)?.total ?? items.length;
      const pages = Math.ceil(totalCount / 100);
      for (let pg = 2; pg <= pages; pg++) {
        const more = await applicationsService.list({ ...base, page: pg });
        items.push(...((more as any)?.items ?? []));
      }
      setApplications(items);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(appId: string, status: ApplicationStatus) {
    // Sending someone to ASSESSMENT only works if the job has an active test.
    // If it doesn't, route HR straight to the builder to set one up first
    // (instead of silently sending nothing).
    if (status === 'ASSESSMENT') {
      const jobId = applications.find((a) => a.id === appId)?.jobId;
      if (jobId) {
        try {
          const a = await assessmentsService.getForJob(jobId);
          const ready = !!a && a.isActive && (a.questions?.length ?? 0) > 0;
          if (!ready) {
            router.push(`/recruiter/jobs/${jobId}/assessment?setup=1`);
            return;
          }
        } catch {
          /* check failed — fall through and let the backend decide */
        }
      }
    }
    setUpdatingId(appId);
    try {
      await applicationsService.updateStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
      fetchStats(); // counts shifted between statuses — keep chips accurate
    } catch {
      // silently fail — status stays unchanged
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  // Status summary counts come from the backend (accurate + filter-independent),
  // not from the currently-loaded/filtered rows.
  const counts = stats.byStatus;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {loading
              ? 'Loading...'
              : (filterJobId || filterStatus)
                ? `${applications.length} application${applications.length !== 1 ? 's' : ''} (filtered)`
                : `${stats.total} application${stats.total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || stats.total === 0}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[#F77B0F] text-white font-medium hover:bg-[#e06d00] disabled:opacity-50"
            title={filterJobId ? 'Download applicants for this job (Excel)' : 'Download all applicants (Excel)'}
          >
            <svg className={`w-4 h-4 ${downloading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {downloading
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />}
            </svg>
            {downloading ? 'Preparing…' : 'Download report'}
          </button>
          <button
            type="button"
            onClick={() => fetchApplications()}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#F77B0F] disabled:opacity-50"
            title="Refresh — new applications come in real-time but you can also force-pull"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link
            href="/recruiter"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Status summary chips */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            counts[s] > 0 && (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterStatus === s
                    ? STATUS_COLORS[s] + ' border-transparent ring-2 ring-offset-1 ring-[#F77B0F]'
                    : STATUS_COLORS[s] + ' border-transparent'
                }`}
              >
                {STATUS_LABELS[s]} · {counts[s]}
              </button>
            )
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterJobId}
          onChange={(e) => setFilterJobId(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#F77B0F]"
        >
          <option value="">All Jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ApplicationStatus | '')}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#F77B0F]"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {(filterJobId || filterStatus) && (
          <button
            onClick={() => { setFilterJobId(''); setFilterStatus(''); }}
            className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={fetchApplications} className="ml-3 underline font-medium">Retry</button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && applications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No applications yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {filterJobId || filterStatus ? 'Try adjusting your filters' : 'Applications will appear here once candidates apply to your jobs'}
          </p>
          {!filterJobId && !filterStatus && (
            <Link href="/post-job" className="text-sm font-semibold text-[#F77B0F] hover:underline">
              Post a Job →
            </Link>
          )}
        </div>
      )}

      {/* Applications list */}
      {!loading && !error && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              updating={updatingId === app.id}
              onStatusChange={(status) => updateStatus(app.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  updating,
  onStatusChange,
}: {
  application: Application;
  updating: boolean;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const actions = NEXT_ACTIONS[application.status] ?? [];

  // "Move back" options: every pipeline stage earlier than the current one,
  // nearest first. Lets HR reverse a step — e.g. pull a candidate back from
  // Interview to Assessment to be tested first. Moving to Assessment re-sends
  // the test automatically (handled server-side).
  const curIdx = PIPELINE.indexOf(application.status);
  const backStages: ApplicationStatus[] = curIdx > 0 ? PIPELINE.slice(0, curIdx).reverse() : [];
  const backLabel = (s: ApplicationStatus) =>
    s === 'ASSESSMENT' ? 'Send assessment / re-test' : `Move back to ${STATUS_LABELS[s]}`;

  const candidateName =
    (application as any)?.user?.firstName
      ? `${(application as any).user.firstName} ${(application as any).user.lastName ?? ''}`
      : `Applicant #${application.id.slice(-5)}`;

  const candidateInitials = candidateName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const avatarUrl = (application as any)?.user?.avatarUrl;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 hover:border-[#F77B0F]/40 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        {/* Candidate avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">
              {candidateInitials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{candidateName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Applied for{' '}
                <Link
                  href={`/jobs/${application.jobId}`}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-[#F77B0F] dark:hover:text-[#F77B0F]"
                >
                  {application.job?.title ?? 'this job'}
                </Link>
              </p>
              {(() => {
                const a = (application as any).assessmentAttempt;
                if (!a) return null;
                const done = a.status === 'GRADED' || a.status === 'SUBMITTED';
                if (done) return (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    Test: {a.score != null ? `${a.score}%` : 'done'} {a.passed ? '· passed' : '· review'}
                  </span>
                );
                return <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Test: not yet taken</span>;
              })()}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {updating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[application.status]}`}>
                  {STATUS_LABELS[application.status]}
                </span>
              )}
            </div>
          </div>

          {/* Cover letter preview */}
          {application.coverLetter && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {application.coverLetter}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Applied {new Date(application.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>

            <div className="flex items-center gap-2">
              {/* Open full application detail */}
              <Link
                href={`/recruiter/applications/${application.id}`}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#F77B0F] border border-[#F77B0F]/50 rounded-lg hover:bg-[#F77B0F]/10 transition-colors"
              >
                View details
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Resume link */}
              {application.resumeUrl && (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resume
                </a>
              )}

              {/* Status actions */}
              {(actions.length > 0 || backStages.length > 0) && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions((o) => !o)}
                    disabled={updating}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#F77B0F] border border-[#F77B0F]/50 rounded-lg hover:bg-[#F77B0F]/10 transition-colors disabled:opacity-50"
                  >
                    Update Status
                    <svg className={`w-3 h-3 transition-transform ${showActions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showActions && (
                    <div className="absolute right-0 top-8 z-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 min-w-[190px]">
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          onClick={() => {
                            onStatusChange(action.status);
                            setShowActions(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm border-b border-transparent last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ))}

                      {backStages.length > 0 && (
                        <>
                          <div className="mt-1 mb-0.5 px-4 pt-1.5 border-t border-gray-100 dark:border-gray-700 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Step back
                          </div>
                          {backStages.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                onStatusChange(s);
                                setShowActions(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-gray-600 dark:text-gray-300"
                            >
                              {s === 'ASSESSMENT' ? '✨ ' : '↩ '}{backLabel(s)}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
        </div>
      }
    >
      <RecruiterApplicationsContent />
    </Suspense>
  );
}
