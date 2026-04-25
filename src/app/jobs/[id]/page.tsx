'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import type { Job } from '@/lib/uteo-types';
import { useAuth } from '@/lib/auth';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatSalary(min?: number, max?: number, currency = 'KES') {
  if (!min && !max) return null;
  const fmt = (n: number) => new Intl.NumberFormat().format(n);
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)} / year`;
  if (min) return `${currency} ${fmt(min)}+ / year`;
  return `Up to ${currency} ${fmt(max!)} / year`;
}

function jobTypeLabel(type: string) {
  const map: Record<string, string> = {
    FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
    INTERNSHIP: 'Internship', REMOTE: 'Remote', HYBRID: 'Hybrid',
  };
  return map[type] ?? type;
}

function jobTypeColor(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    PART_TIME: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    CONTRACT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    INTERNSHIP: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    REMOTE: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    HYBRID: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  };
  return map[type] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
      await applicationsService.apply({
        jobId: job.id,
        coverLetter: coverLetter || undefined,
        resumeUrl: resumeUrl || undefined,
      });
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
            rows={6}
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

// ─── Job Detail Page ───────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoading(true);
    jobsService.get(id)
      .then((data) => {
        setJob(data);
        // Load similar jobs from same company
        if (data?.company?.id) {
          jobsService.list({ companyId: data.company.id, limit: 4, page: 1 })
            .then((res) => {
              setSimilarJobs((res?.items ?? []).filter((j) => j.id !== id));
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Job not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveToggle = async () => {
    if (!user) { router.push('/login'); return; }
    setSavingToggle(true);
    const wasS = isSaved;
    setIsSaved(!wasS);
    try {
      wasS ? await jobsService.unsave(id) : await jobsService.save(id);
      showToast('success', wasS ? 'Job removed from saved.' : 'Job saved!');
    } catch {
      setIsSaved(wasS);
      showToast('error', 'Could not update saved jobs.');
    } finally {
      setSavingToggle(false);
    }
  };

  const handleApply = () => {
    if (!user) { router.push('/login'); return; }
    setShowApplyModal(true);
  };

  const handleApplySuccess = () => {
    setShowApplyModal(false);
    setApplied(true);
    showToast('success', 'Application submitted successfully!');
  };

  if (loading) return <PageSkeleton />;
  if (error || !job) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{error || 'Job not found'}</h1>
      <Link href="/jobs" className="text-[#192C67] dark:text-[#5b8bc7] font-medium hover:underline">
        Browse all jobs
      </Link>
    </div>
  );

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>

      <div className="lg:flex gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Header card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4 mb-4">
              {job.company.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#192C67] text-white text-lg font-black flex items-center justify-center flex-shrink-0">
                  {job.company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/companies/${job.company.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-[#192C67] dark:hover:text-[#5b8bc7] transition-colors mb-1"
                >
                  {job.company.name}
                  {job.company.isVerified && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
              </div>
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {job.location && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {job.location}
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${jobTypeColor(job.jobType)}`}>
                {jobTypeLabel(job.jobType)}
              </span>
              {salary && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  {salary}
                </span>
              )}
              {job._count && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job._count.applications} applicants
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">Posted {formatDate(job.createdAt)}</p>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Description</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                {job.requirements}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Similar jobs */}
          {similarJobs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                More from {job.company.name}
              </h2>
              <div className="space-y-3">
                {similarJobs.map((sj) => (
                  <Link
                    key={sj.id}
                    href={`/jobs/${sj.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#192C67] dark:hover:border-[#5b8bc7] transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7]">
                        {sj.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sj.location && <span className="text-xs text-gray-500 dark:text-gray-400">{sj.location}</span>}
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${jobTypeColor(sj.jobType)}`}>
                          {jobTypeLabel(sj.jobType)}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 mt-6 lg:mt-0">
          <div className="sticky top-24 space-y-4">
            {/* CTA card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              {applied ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Application Submitted</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">You've applied to this role. Track it in your applications.</p>
                  <Link
                    href="/applications"
                    className="block w-full py-2.5 border border-[#192C67] text-[#192C67] dark:text-[#5b8bc7] dark:border-[#5b8bc7] font-semibold rounded-xl hover:bg-[#192C67]/5 transition-colors text-center text-sm"
                  >
                    View My Applications
                  </Link>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleApply}
                    className="block w-full py-3 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#14234f] transition-colors text-center mb-3"
                  >
                    Apply Now
                  </button>
                  <button
                    onClick={handleSaveToggle}
                    disabled={savingToggle}
                    className={`flex items-center justify-center gap-2 w-full py-3 border rounded-xl font-medium text-sm transition-colors ${
                      isSaved
                        ? 'border-[#F77B0F] bg-[#F77B0F]/10 text-[#F77B0F]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {isSaved ? 'Saved' : 'Save Job'}
                  </button>
                </>
              )}
            </div>

            {/* Company card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">About the Company</h3>
              <div className="flex items-center gap-3 mb-3">
                {job.company.logoUrl ? (
                  <img src={job.company.logoUrl} alt={job.company.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#192C67] text-white text-xs font-black flex items-center justify-center">
                    {job.company.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{job.company.name}</p>
                  {job.company.industry && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{job.company.industry}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                {job.company.size && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.company.size} employees
                  </div>
                )}
                {job.company.location && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {job.company.location}
                  </div>
                )}
                {job.company.website && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="text-[#192C67] dark:text-[#5b8bc7] hover:underline">
                      {job.company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              <Link
                href={`/companies/${job.company.id}`}
                className="block w-full py-2.5 text-center text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                View Company Profile
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <ApplyModal job={job} onClose={() => setShowApplyModal(false)} onSuccess={handleApplySuccess} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
