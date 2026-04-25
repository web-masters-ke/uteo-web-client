'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import type { Job } from '@/lib/uteo-types';
import Modal from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatSalary(min?: number, max?: number, currency = 'KES') {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  return `Up to ${currency} ${fmt(max!)}`;
}

function jobTypeLabel(type: string) {
  const map: Record<string, string> = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
  };
  return map[type] ?? type;
}

function jobTypeColor(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME:   'bg-[#192C67]/10 text-[#192C67] dark:bg-white/8 dark:text-white/70',
    PART_TIME:   'bg-[#192C67]/10 text-[#192C67] dark:bg-white/8 dark:text-white/70',
    CONTRACT:    'bg-[#F77B0F]/10 text-[#F77B0F]',
    INTERNSHIP:  'bg-[#F77B0F]/10 text-[#F77B0F]',
    REMOTE:      'bg-[#192C67]/10 text-[#192C67] dark:bg-white/8 dark:text-white/70',
    HYBRID:      'bg-[#192C67]/10 text-[#192C67] dark:bg-white/8 dark:text-white/70',
  };
  return map[type] ?? 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Apply Modal ───────────────────────────────────────────────────────────────

function ApplyModal({
  job,
  onClose,
  onSuccess,
}: {
  job: Job;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await applicationsService.apply({ jobId: job.id, coverLetter: coverLetter || undefined, resumeUrl: resumeUrl || undefined });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Apply — ${job.title}`} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
          {job.company.logoUrl ? (
            <img src={job.company.logoUrl} alt={job.company.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#192C67] text-white text-xs font-black flex items-center justify-center">
              {job.company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{job.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{job.company.name}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Cover Letter <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={5}
            placeholder="Tell the employer why you're a great fit for this role..."
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Resume URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            placeholder="https://drive.google.com/... or LinkedIn profile URL"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#192C67] text-white text-sm font-semibold hover:bg-[#14234f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Job Feed Card ─────────────────────────────────────────────────────────────

function JobFeedCard({
  job,
  onApply,
  onSaveToggle,
  savedIds,
}: {
  job: Job;
  onApply: (job: Job) => void;
  onSaveToggle: (job: Job) => void;
  savedIds: Set<string>;
}) {
  const isSaved = savedIds.has(job.id);
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/6 p-6 hover:border-[#F77B0F]/40 dark:hover:border-[#F77B0F]/30 transition-all hover:shadow-md group">
      {/* Company row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <Link href={`/companies/${job.company.id}`} className="flex items-center gap-3 min-w-0">
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={job.company.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#192C67]/10 dark:bg-white/8 text-[#192C67] dark:text-white/70 text-sm font-black flex items-center justify-center flex-shrink-0 border border-[#192C67]/10 dark:border-white/8">
              {job.company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{job.company.name}</span>
              {job.company.isVerified && (
                <svg className="w-4 h-4 text-[#192C67] dark:text-[#F77B0F] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {job.company.industry && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.company.industry}</p>
            )}
          </div>
        </Link>
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(job.createdAt)}</span>
      </div>

      {/* Title */}
      <Link href={`/jobs/${job.id}`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#192C67] dark:group-hover:text-white transition-colors line-clamp-2">
          {job.title}
        </h3>
      </Link>

      {/* Pills row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {job.location && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {job.location}
          </span>
        )}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${jobTypeColor(job.jobType)}`}>
          {jobTypeLabel(job.jobType)}
        </span>
        {salary && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-[#F77B0F]">
            {salary}
          </span>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills.slice(0, 5).map((skill) => (
            <span
              key={skill.id}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/6 text-gray-600 dark:text-white/55"
            >
              {skill.name}
            </span>
          ))}
          {skills.length > 5 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-400">
              +{skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Match score bar */}
      {job.matchScore !== undefined && job.matchScore !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Match Score</span>
            <span className="text-[11px] font-bold text-[#F77B0F]">{job.matchScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F77B0F] rounded-full transition-all"
              style={{ width: `${job.matchScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/6">
        <button
          onClick={() => onApply(job)}
          className="flex-1 py-2.5 rounded-xl border border-[#192C67] dark:border-white/20 text-[#192C67] dark:text-white text-sm font-semibold hover:bg-[#192C67]/5 dark:hover:bg-white/5 transition-colors"
        >
          Apply Now
        </button>
        <button
          onClick={() => onSaveToggle(job)}
          className={`p-2.5 rounded-xl border transition-colors ${
            isSaved
              ? 'border-[#F77B0F] bg-[#F77B0F]/10 text-[#F77B0F]'
              : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-[#F77B0F] hover:text-[#F77B0F]'
          }`}
          title={isSaved ? 'Unsave job' : 'Save job'}
        >
          <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Feed Page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshAvailable, setRefreshAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const LIMIT = 10;

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial load
  const loadFeed = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await jobsService.feed({ page: p, limit: LIMIT });
      const items = data?.items ?? [];
      setTotal(data?.total ?? 0);
      setJobs((prev) => append ? [...prev, ...items] : items);
    } catch {
      // fall through with empty state
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadFeed(1, false);
      // Show refresh banner after 30s of staying on page
      const t = setTimeout(() => setRefreshAvailable(true), 30000);
      return () => clearTimeout(t);
    }
  }, [authLoading, user, loadFeed]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && jobs.length < total) {
          const next = page + 1;
          setPage(next);
          loadFeed(next, true);
        }
      },
      { threshold: 0.5 }
    );
    const el = bottomRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [loadingMore, jobs.length, total, page, loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await jobsService.refreshFeed();
      setPage(1);
      await loadFeed(1, false);
      setRefreshAvailable(false);
    } catch {
      showToast('error', 'Could not refresh feed right now.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveToggle = async (job: Job) => {
    const wasSaved = savedIds.has(job.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(job.id) : next.add(job.id);
      return next;
    });
    try {
      if (wasSaved) {
        await jobsService.unsave(job.id);
        showToast('success', 'Job removed from saved.');
      } else {
        await jobsService.save(job.id);
        showToast('success', 'Job saved!');
      }
    } catch {
      // Revert optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(job.id) : next.delete(job.id);
        return next;
      });
      showToast('error', 'Could not update saved jobs.');
    }
  };

  const handleApplySuccess = () => {
    if (applyJob) {
      setAppliedIds((prev) => new Set([...prev, applyJob.id]));
      setApplyJob(null);
      showToast('success', 'Application submitted!');
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Job Feed</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personalized jobs matched to your profile and skills
        </p>
      </div>

      {/* Refresh banner */}
      {refreshAvailable && (
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full mb-4 py-2.5 rounded-xl bg-[#192C67]/10 dark:bg-[#192C67]/20 border border-[#192C67]/20 dark:border-[#5b8bc7]/30 text-[#192C67] dark:text-[#5b8bc7] text-sm font-semibold hover:bg-[#192C67]/20 transition-colors flex items-center justify-center gap-2"
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'New jobs available — refresh feed'}
        </button>
      )}

      {/* Feed list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#192C67]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#192C67]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Your feed is being personalized
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            Complete your profile and add skills to get job recommendations tailored to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#192C67] text-white rounded-xl text-sm font-semibold hover:bg-[#14234f] transition-colors"
            >
              Complete Profile
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) =>
            appliedIds.has(job.id) ? (
              <div key={job.id} className="relative">
                <JobFeedCard job={job} onApply={setApplyJob} onSaveToggle={handleSaveToggle} savedIds={savedIds} />
                <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 rounded-2xl flex items-center justify-center">
                  <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-[#5b8bc7] text-sm font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Applied
                  </span>
                </div>
              </div>
            ) : (
              <JobFeedCard
                key={job.id}
                job={job}
                onApply={setApplyJob}
                onSaveToggle={handleSaveToggle}
                savedIds={savedIds}
              />
            )
          )}

          {/* Infinite scroll sentinel */}
          <div ref={bottomRef} className="py-2 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading more jobs...
              </div>
            )}
            {!loadingMore && jobs.length >= total && jobs.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">You've seen all {total} jobs</p>
            )}
          </div>
        </div>
      )}

      {/* Apply modal */}
      {applyJob && (
        <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} onSuccess={handleApplySuccess} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-[#192C67] text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
