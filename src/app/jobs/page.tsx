'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { jobsService } from '@/lib/services/jobs';
import type { Job, JobType } from '@/lib/uteo-types';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];

function formatSalary(min?: number, max?: number, currency = 'KES') {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  return `Up to ${currency} ${fmt(max!)}`;
}

function jobTypeColor(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME:   'bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-white/70',
    PART_TIME:   'bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-white/70',
    CONTRACT:    'bg-[#F77B0F]/10 dark:bg-[#F77B0F]/20 text-[#F77B0F]',
    INTERNSHIP:  'bg-[#F77B0F]/10 dark:bg-[#F77B0F]/20 text-[#F77B0F]',
    REMOTE:      'bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-white/70',
    HYBRID:      'bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-white/70',
  };
  return map[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
}

function jobTypeLabel(type: string) {
  return JOB_TYPES.find((t) => t.value === type)?.label ?? type;
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

// ─── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[#192C67] dark:hover:border-[#5b8bc7] hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        {job.company.logoUrl ? (
          <img
            src={job.company.logoUrl}
            alt={job.company.name}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#192C67] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
            {job.company.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">{job.company.name}</span>
            {job.company.isVerified && (
              <svg className="w-3.5 h-3.5 text-[#192C67] dark:text-white/70 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] transition-colors line-clamp-1 mt-0.5">
            {job.title}
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(job.createdAt)}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {job.location && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {job.location}
          </span>
        )}
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${jobTypeColor(job.jobType)}`}>
          {jobTypeLabel(job.jobType)}
        </span>
        {salary && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-[#F77B0F]">
            {salary}
          </span>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#192C67]/8 dark:bg-[#192C67]/20 text-[#192C67] dark:text-white/70"
              style={{ backgroundColor: 'rgba(25,44,103,0.08)' }}
            >
              {skill.name}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] text-gray-400">+{skills.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function JobsPageInner() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '');
  const [location, setLocation] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<JobType>>(new Set());
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (keyword.trim()) params.search = keyword.trim();
      if (location.trim()) params.location = location.trim();
      if (selectedTypes.size > 0) params.jobType = [...selectedTypes].join(',');
      if (salaryMin) params.salaryMin = Number(salaryMin);
      if (salaryMax) params.salaryMax = Number(salaryMax);
      const data = await jobsService.list(params);
      setJobs(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(Math.ceil((data?.total ?? 0) / LIMIT) || 1);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, location, selectedTypes, salaryMin, salaryMax, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const toggleType = (type: JobType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword('');
    setLocation('');
    setSelectedTypes(new Set());
    setSalaryMin('');
    setSalaryMax('');
    setPage(1);
  };

  const filterSidebar = (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-6 sticky top-24">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Filters</h3>
        <button onClick={clearFilters} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Clear all
        </button>
      </div>

      {/* Job Type */}
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Job Type</p>
        <div className="space-y-2">
          {JOB_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTypes.has(type.value)}
                onChange={() => toggleType(type.value)}
                className="w-4 h-4 rounded text-[#192C67] border-gray-300 focus:ring-[#192C67]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Location</p>
        <input
          type="text"
          value={location}
          onChange={(e) => { setLocation(e.target.value); setPage(1); }}
          placeholder="City or country"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
        />
      </div>

      {/* Salary */}
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Salary Range</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={salaryMin}
            onChange={(e) => { setSalaryMin(e.target.value); setPage(1); }}
            placeholder="Min"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
          />
          <input
            type="number"
            value={salaryMax}
            onChange={(e) => { setSalaryMax(e.target.value); setPage(1); }}
            placeholder="Max"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Jobs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {total > 0 ? `${total.toLocaleString()} jobs found` : 'Search and filter thousands of opportunities'}
        </p>
      </div>

      {/* Search + mobile filter toggle */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="Job title, company, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#192C67] outline-none"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {(selectedTypes.size > 0 || location || salaryMin || salaryMax) && (
            <span className="w-5 h-5 rounded-full bg-[#192C67] text-white text-[10px] font-bold flex items-center justify-center">
              {selectedTypes.size + (location ? 1 : 0) + (salaryMin || salaryMax ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
          {filterSidebar}
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description="Try adjusting your search or filters."
              action={{ label: 'Clear Filters', onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobsPageInner />
    </Suspense>
  );
}
