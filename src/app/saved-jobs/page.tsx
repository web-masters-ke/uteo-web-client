'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import type { Job } from '@/lib/uteo-types';

function SavedJobsContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/saved-jobs');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSavedJobs();
  }, [isAuthenticated]);

  async function fetchSavedJobs() {
    try {
      setLoading(true);
      setError(null);
      const data = await jobsService.saved();
      setJobs(Array.isArray(data) ? data : (data as any)?.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsave(jobId: string) {
    setUnsavingId(jobId);
    try {
      await jobsService.unsave(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      // silently fail — job stays in list
    } finally {
      setUnsavingId(null);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Jobs</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Jobs you've bookmarked to apply later
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>
          <button
            onClick={fetchSavedJobs}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No saved jobs yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Browse jobs and click the bookmark icon to save ones you're interested in.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white rounded-xl font-medium hover:bg-[#e06a0d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse Jobs
          </Link>
        </div>
      )}

      {/* Jobs list */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {jobs.length} saved {jobs.length === 1 ? 'job' : 'jobs'}
          </p>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onUnsave={() => handleUnsave(job.id)}
              unsaving={unsavingId === job.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  onUnsave,
  unsaving,
}: {
  job: Job;
  onUnsave: () => void;
  unsaving: boolean;
}) {
  const jobTypeLabels: Record<string, string> = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
  };

  const salaryText =
    job.salaryMin && job.salaryMax
      ? `${job.currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
      : job.salaryMin
      ? `${job.currency} ${job.salaryMin.toLocaleString()}+`
      : null;

  const initials = job.company.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 hover:border-[#F77B0F]/50 hover:shadow-md transition-all">
      <div className="flex gap-4">
        {/* Company logo / initials */}
        <div className="shrink-0">
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={job.company.name}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#192C67] text-white text-sm font-bold">
              {initials}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/jobs/${job.id}`}
                className="text-base font-semibold text-gray-900 dark:text-white hover:text-[#F77B0F] dark:hover:text-[#F77B0F] transition-colors"
              >
                {job.title}
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">{job.company.name}</p>
            </div>
            {/* Unsave button */}
            <button
              onClick={onUnsave}
              disabled={unsaving}
              title="Remove from saved"
              className="shrink-0 p-1.5 rounded-lg text-[#F77B0F] hover:bg-[#F77B0F]/10 transition-colors disabled:opacity-50"
            >
              {unsaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {job.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {jobTypeLabels[job.jobType] ?? job.jobType}
            </span>
            {salaryText && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                {salaryText}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.jobSkills && job.jobSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.jobSkills.slice(0, 4).map(({ skill }) => (
                <span
                  key={skill.id}
                  className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300"
                >
                  {skill.name}
                </span>
              ))}
              {job.jobSkills.length > 4 && (
                <span className="px-2 py-0.5 text-[11px] text-gray-400">+{job.jobSkills.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Saved · {new Date(job.createdAt).toLocaleDateString()}
        </span>
        <Link
          href={`/jobs/${job.id}`}
          className="px-4 py-1.5 text-sm font-medium text-[#F77B0F] border border-[#F77B0F]/50 rounded-lg hover:bg-[#F77B0F] hover:text-white transition-all"
        >
          View Job
        </Link>
      </div>
    </div>
  );
}

export default function SavedJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
        </div>
      }
    >
      <SavedJobsContent />
    </Suspense>
  );
}
