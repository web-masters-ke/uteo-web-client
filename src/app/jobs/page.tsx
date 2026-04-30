'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SmartImg from '@/components/ui/SmartImg';
import { jobsService } from '@/lib/services/jobs';
import { companiesService } from '@/lib/services/companies';
import { useAuth } from '@/lib/auth';
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

// ─── Card Share Button ─────────────────────────────────────────────────────────

function CardShareButton({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const jobUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/jobs/${jobId}`
    : `/jobs/${jobId}`;

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: Math.min(r.right - 208, window.innerWidth - 220) });
    }
    setOpen((o) => !o);
  };

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { await navigator.clipboard.writeText(jobUrl); } catch { /* */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const encoded = encodeURIComponent(jobUrl);
  const titleEncoded = encodeURIComponent(`We're hiring: ${jobTitle}`);

  const socials = [
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, color: 'text-[#0077b5] hover:bg-[#0077b5]/10', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
    { name: 'X / Twitter', href: `https://twitter.com/intent/tweet?url=${encoded}&text=${titleEncoded}`, color: 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { name: 'WhatsApp', href: `https://wa.me/?text=${titleEncoded}%20${encoded}`, color: 'text-[#25d366] hover:bg-[#25d366]/10', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        title="Share this job"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-400 hover:text-[#192C67] hover:bg-[#192C67]/8 transition-colors"
        style={{ backgroundColor: open ? 'rgba(25,44,103,0.06)' : undefined }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {open && dropPos && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="fixed z-[999] w-52 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 overflow-hidden"
            style={{ top: dropPos.top, left: dropPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={copy}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
            >
              {copied
                ? <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              }
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${s.color}`}
              >
                {s.icon}
                {s.name}
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const showSalary = (job as any).showSalary === true;
  const salary = showSalary ? formatSalary(job.salaryMin, job.salaryMax, job.currency) : null;
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];
  return (
    <div
      className="relative rounded-2xl transition-all duration-200 group hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(25,44,103,0.16),0_4px_12px_rgba(0,0,0,0.08)]"
      style={{
        background: 'linear-gradient(160deg,#ffffff 0%,#f6f8ff 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07),0 4px 14px rgba(25,44,103,0.07),0 0 0 1px rgba(0,0,0,0.055)',
      }}
    >
      {/* top-light edge */}
      <div className="h-px w-full rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      <Link href={`/jobs/${job.id}`} className="block p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <SmartImg
              src={job.company.logoUrl}
              alt={job.company.name}
              className="w-11 h-11 object-cover"
              fallback={
                <div className="w-11 h-11 bg-[#192C67] text-white text-xs font-black flex items-center justify-center">
                  {job.company.name.slice(0, 2).toUpperCase()}
                </div>
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-500 truncate">{job.company.name}</span>
              {job.company.isVerified && (
                <svg className="w-3.5 h-3.5 text-[#192C67] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <h3 className="font-bold text-gray-900 group-hover:text-[#192C67] transition-colors leading-snug mt-0.5">
              {job.title}
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(job.createdAt)}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {job.location && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-100/80 text-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {job.location}
            </span>
          )}
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ${jobTypeColor(job.jobType)}`}>
            {jobTypeLabel(job.jobType)}
          </span>
          {salary && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-[#F77B0F] shadow-[inset_0_1px_2px_rgba(247,123,15,0.12)]" style={{ backgroundColor: 'rgba(247,123,15,0.08)' }}>
              {salary}
            </span>
          )}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 4).map((skill) => (
              <span
                key={skill.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#192C67] shadow-[inset_0_1px_2px_rgba(25,44,103,0.1)]"
                style={{ backgroundColor: 'rgba(25,44,103,0.07)' }}
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


      {/* Share button row — outside Link so it doesn't trigger navigation */}
      <div className="px-5 pb-3 flex justify-end">
        <CardShareButton jobId={job.id} jobTitle={job.title} />
      </div>

      {/* bottom edge */}
      <div className="h-0.5 w-full rounded-b-2xl bg-gradient-to-r from-transparent via-[#192C67]/10 to-transparent" />
    </div>
  );
}

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function JobsPageInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isRecruiter = user?.role === 'TRAINER'; // TRAINER = recruiter role in this system
  const [recruiterCompanyId, setRecruiterCompanyId] = useState<string | null>(null);

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

  // For recruiters: fetch their company once so we can scope the job list
  useEffect(() => {
    if (!isRecruiter) return;
    companiesService.mine().then((c) => { if (c?.id) setRecruiterCompanyId(c.id); }).catch(() => {});
  }, [isRecruiter]);

  const fetchJobs = useCallback(async () => {
    // If user is a recruiter and we haven't resolved their company yet, wait
    if (isRecruiter && recruiterCompanyId === null) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (keyword.trim()) params.search = keyword.trim();
      if (location.trim()) params.location = location.trim();
      if (selectedTypes.size > 0) params.jobType = [...selectedTypes].join(',');
      if (salaryMin) params.salaryMin = Number(salaryMin);
      if (salaryMax) params.salaryMax = Number(salaryMax);
      // Scope to recruiter's own company so they only see their own listings
      if (isRecruiter && recruiterCompanyId) params.companyId = recruiterCompanyId;
      const data = await jobsService.list(params);
      setJobs(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(Math.ceil((data?.total ?? 0) / LIMIT) || 1);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, location, selectedTypes, salaryMin, salaryMax, page, isRecruiter, recruiterCompanyId]);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isRecruiter ? 'Your Company Jobs' : 'Browse Jobs'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isRecruiter
            ? total > 0
              ? `${total.toLocaleString()} jobs posted by your company`
              : 'All job listings posted under your company'
            : total > 0
              ? `${total.toLocaleString()} jobs found`
              : 'Search and filter thousands of opportunities'}
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
