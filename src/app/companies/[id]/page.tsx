'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { companiesService } from '@/lib/services/companies';
import { jobsService } from '@/lib/services/jobs';
import type { Company, Job } from '@/lib/uteo-types';
import { PageSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Job Card (compact) ────────────────────────────────────────────────────────

function CompactJobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-[#192C67] dark:hover:border-[#5b8bc7] hover:bg-white dark:hover:bg-gray-800 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] transition-colors line-clamp-1">
          {job.title}
        </h3>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(job.createdAt)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {job.location && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {job.location}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${jobTypeColor(job.jobType)}`}>
          {jobTypeLabel(job.jobType)}
        </span>
        {salary && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            {salary}
          </span>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 3).map((skill) => (
            <span
              key={skill.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#192C67]/8 text-[#192C67] dark:text-[#5b8bc7]"
              style={{ backgroundColor: 'rgba(25,44,103,0.08)' }}
            >
              {skill.name}
            </span>
          ))}
          {skills.length > 3 && (
            <span className="text-[9px] text-gray-400">+{skills.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}

// ─── Company Profile Page ──────────────────────────────────────────────────────

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setLoading(true);
    companiesService.get(id)
      .then((data) => {
        setCompany(data);
        // Load active jobs from this company
        setJobsLoading(true);
        jobsService.list({ companyId: id, status: 'ACTIVE', limit: 20, page: 1 })
          .then((res) => {
            setJobs(res?.items ?? []);
            setJobsTotal(res?.total ?? 0);
          })
          .catch(() => setJobs([]))
          .finally(() => setJobsLoading(false));
      })
      .catch(() => setError('Company not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (error || !company) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{error || 'Company not found'}</h1>
      <Link href="/jobs" className="text-[#192C67] dark:text-[#5b8bc7] font-medium hover:underline">
        Browse Jobs
      </Link>
    </div>
  );

  const initials = company.name.slice(0, 2).toUpperCase();

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

      {/* Company header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#192C67] text-white text-2xl font-black flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
              {company.isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
              {company.industry && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {company.industry}
                </span>
              )}
              {company.size && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {company.size} employees
                </span>
              )}
              {company.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {company.location}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#192C67] dark:text-[#5b8bc7] hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Follow button (placeholder) */}
            <button
              onClick={() => setFollowing((f) => !f)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                following
                  ? 'bg-[#192C67] text-white'
                  : 'border border-[#192C67] text-[#192C67] dark:text-[#5b8bc7] dark:border-[#5b8bc7] hover:bg-[#192C67]/5'
              }`}
            >
              {following ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Following
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Follow
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:flex gap-6">
        {/* About */}
        <div className="flex-1 space-y-6">
          {company.description && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About {company.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {company.description}
              </p>
            </div>
          )}

          {/* Active jobs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Open Positions
                {jobsTotal > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]">
                    {jobsTotal}
                  </span>
                )}
              </h2>
            </div>

            {jobsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No open positions at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {jobs.map((job) => (
                  <CompactJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar stats */}
        <aside className="w-full lg:w-56 flex-shrink-0 mt-6 lg:mt-0">
          <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Company Info</h3>

            {company.industry && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Industry</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{company.industry}</p>
              </div>
            )}
            {company.size && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Company Size</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{company.size} employees</p>
              </div>
            )}
            {company.location && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Location</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{company.location}</p>
              </div>
            )}
            {jobsTotal > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Open Roles</p>
                <p className="text-sm font-semibold text-[#192C67] dark:text-[#5b8bc7]">{jobsTotal} positions</p>
              </div>
            )}

            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
