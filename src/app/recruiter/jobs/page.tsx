'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { jobsService } from '@/lib/services/jobs';

interface MyJob {
  id: string;
  title: string;
  status: string;
  jobType?: string | null;
  location?: string | null;
  createdAt: string;
  _count?: { applications: number };
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  PAUSED:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  CLOSED:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  DRAFT:   'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
};

export default function RecruiterMyJobsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/jobs'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [authLoading, isAuthenticated, isRecruiter, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.mine();
      setJobs((data as any)?.items ?? []);
    } catch {
      addToast('error', 'Could not load your jobs');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { if (isAuthenticated && isRecruiter) load(); }, [isAuthenticated, isRecruiter, load]);

  async function pauseOrResume(id: string, currentStatus: string) {
    const next = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setBusyId(id);
    try {
      await jobsService.update(id, { status: next });
      addToast('success', next === 'ACTIVE' ? 'Job resumed' : 'Job paused');
      load();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to update job');
    } finally {
      setBusyId(null);
    }
  }

  async function closeJob(job: MyJob) {
    if (!window.confirm(`Close "${job.title}"? It will stop accepting new applications. Existing applicants keep access to their application.`)) return;
    setBusyId(job.id);
    try {
      await jobsService.remove(job.id);
      addToast('success', 'Job closed');
      load();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to close job');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Job Posts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {loading ? 'Loading…' : `${jobs.length} post${jobs.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/post-job"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Job
        </Link>
      </div>

      {/* Status filter tabs */}
      {jobs.length > 0 && (() => {
        const counts: Record<string, number> = { ALL: jobs.length };
        for (const j of jobs) counts[j.status] = (counts[j.status] || 0) + 1;
        const tabs = [
          { v: 'ALL',     label: 'All' },
          { v: 'ACTIVE',  label: 'Active' },
          { v: 'PAUSED',  label: 'Paused' },
          { v: 'DRAFT',   label: 'Drafts' },
          { v: 'CLOSED',  label: 'Closed' },
          { v: 'EXPIRED', label: 'Expired' },
        ];
        return (
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const n = counts[t.v] ?? 0;
              if (t.v !== 'ALL' && n === 0) return null;
              const selected = statusFilter === t.v;
              return (
                <button
                  key={t.v}
                  onClick={() => setStatusFilter(t.v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    selected
                      ? 'bg-[#F77B0F] text-white border-[#F77B0F]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#F77B0F] hover:text-[#F77B0F]'
                  }`}
                >
                  {t.label} · {n}
                </button>
              );
            })}
          </div>
        );
      })()}

      {!loading && jobs.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">You haven't posted any jobs yet.</p>
          <Link href="/post-job" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold">
            Post your first job
          </Link>
        </div>
      )}

      {jobs.length > 0 && (() => {
        const filtered = statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter);
        if (filtered.length === 0) {
          return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No jobs in this status. Switch tabs above.</p>
            </div>
          );
        }
        return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((j) => (
              <div key={j.id} className="p-5 flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      <Link href={`/jobs/${j.id}`} className="hover:underline">{j.title}</Link>
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[j.status] ?? 'bg-gray-100 text-gray-600'}`}>{j.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {j.jobType?.replace(/_/g, ' ')}{j.location ? ` · ${j.location}` : ''} · Posted {new Date(j.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Link href={`/recruiter/applications?jobId=${j.id}`} className="text-[#F77B0F] hover:underline">
                      {j._count?.applications ?? 0} application{(j._count?.applications ?? 0) === 1 ? '' : 's'}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/recruiter/jobs/${j.id}/edit`}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#F77B0F]"
                  >
                    Edit
                  </Link>
                  {j.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => pauseOrResume(j.id, j.status)}
                      disabled={busyId === j.id}
                      className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 disabled:opacity-50"
                    >
                      {j.status === 'PAUSED' ? 'Resume' : 'Pause'}
                    </button>
                  )}
                  {j.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => closeJob(j)}
                      disabled={busyId === j.id}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
