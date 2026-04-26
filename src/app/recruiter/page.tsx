'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import type { Job, Application } from '@/lib/uteo-types';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEWED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SHORTLISTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INTERVIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  HIRED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

function RecruiterDashboardContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/recruiter');
      return;
    }
    if (!authLoading && isAuthenticated && !isRecruiter) {
      router.replace('/feed');
    }
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    fetchJobs();
    fetchRecentApplications();
  }, [isAuthenticated, isRecruiter]);

  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const data = await jobsService.list({ limit: 50 });
      setJobs((data as any)?.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load jobs');
    } finally {
      setLoadingJobs(false);
    }
  }

  async function fetchRecentApplications() {
    setLoadingApps(true);
    try {
      const data = await applicationsService.list({ limit: 5, sort: 'recent' });
      setRecentApplications((data as any)?.items ?? []);
    } catch {
      // non-critical
    } finally {
      setLoadingApps(false);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.status === 'ACTIVE');
  const totalApplications = jobs.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0);
  const pendingReview = recentApplications.filter((a) => a.status === 'SUBMITTED').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening with your hiring</p>
        </div>
        <Link
          href="/post-job"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#F77B0F] hover:underline shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Post a Job
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Active Listings"
          value={loadingJobs ? '—' : String(activeJobs.length)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="orange"
        />
        <StatCard
          label="Total Applications"
          value={loadingJobs ? '—' : String(totalApplications)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="navy"
        />
        <StatCard
          label="Pending Review"
          value={loadingApps ? '—' : String(pendingReview)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          label="Total Jobs Posted"
          value={loadingJobs ? '—' : String(jobs.length)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="green"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posted jobs — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Job Listings</h2>
            <Link href="/post-job" className="text-sm font-medium text-[#F77B0F] hover:underline">
              + New job
            </Link>
          </div>

          {loadingJobs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No jobs posted yet</p>
              <Link
                href="/post-job"
                className="text-sm font-semibold text-[#F77B0F] hover:underline"
              >
                Post your first job →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 8).map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
              {jobs.length > 8 && (
                <p className="text-center text-sm text-gray-400 pt-2">
                  +{jobs.length - 8} more · <Link href="/recruiter/jobs" className="text-[#F77B0F] hover:underline">View all</Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent applications — 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Applications</h2>
            <Link href="/recruiter/applications" className="text-sm font-medium text-[#F77B0F] hover:underline">
              View all
            </Link>
          </div>

          {loadingApps ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
                  <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : recentApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <p className="text-sm text-gray-400">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentApplications.map((app) => (
                <ApplicationRow key={app.id} application={app} />
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 space-y-1 mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Quick Actions</p>
            {[
              { href: '/post-job', label: 'Post New Job' },
              { href: '/recruiter/applications', label: 'Review Applications' },
              { href: '/recruiter/candidates', label: 'Browse Candidates' },
              { href: '/recruiter/ai-tools', label: '✦ AI Hiring Tools' },
              { href: '/recruiter/company', label: 'Company Profile' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              >
                {label}
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'orange' | 'navy' | 'yellow' | 'green';
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <div className="text-gray-400 dark:text-gray-500 mb-3">
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    EXPIRED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 hover:border-[#F77B0F]/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/jobs/${job.id}`}
            className="font-semibold text-gray-900 dark:text-white hover:text-[#F77B0F] dark:hover:text-[#F77B0F] transition-colors"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{job.company.name}</span>
            {job.location && <><span>·</span><span>{job.location}</span></>}
            <span>·</span>
            <span>{JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[job.status] ?? ''}`}>
            {job.status}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">{job._count?.applications ?? 0}</span> application{(job._count?.applications ?? 0) !== 1 ? 's' : ''}
        </span>
        <Link
          href={`/recruiter/applications?jobId=${job.id}`}
          className="text-xs font-medium text-[#F77B0F] hover:underline"
        >
          View applications →
        </Link>
      </div>
    </div>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {application.job?.title ?? 'Job listing'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(application.appliedAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[application.status] ?? ''}`}>
          {application.status}
        </span>
      </div>
    </div>
  );
}

export default function RecruiterDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
        </div>
      }
    >
      <RecruiterDashboardContent />
    </Suspense>
  );
}
