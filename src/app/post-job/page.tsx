'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { companiesService } from '@/lib/services/companies';
import { apiGet, apiPost } from '@/lib/api';
import type { Company } from '@/lib/uteo-types';

interface Skill { id: string; name: string; }

interface HiringStage {
  order: number;
  name: string;
  description: string;
}

const DEFAULT_STAGES: HiringStage[] = [
  { order: 1, name: 'Application Review', description: 'Initial screening of applications' },
  { order: 2, name: 'Phone / Video Screen', description: 'Short 15–30 min introductory call' },
  { order: 3, name: 'Technical Assessment', description: 'Skills test or take-home task' },
  { order: 4, name: 'Final Interview', description: 'In-depth interview with the team' },
  { order: 5, name: 'Offer', description: 'Extend offer to successful candidate' },
];

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] text-sm";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PostedSuccess({
  job,
  jobUrl,
  copied,
  onCopy,
  recruiterFirstName,
  companySocial,
}: {
  job: { id: string; title: string; companyName: string };
  jobUrl: string;
  copied: boolean;
  onCopy: () => void;
  recruiterFirstName?: string;
  companySocial?: {
    linkedinHandle?: string | null;
    linkedinPageUrl?: string | null;
    twitterHandle?: string | null;
    facebookPageUrl?: string | null;
    instagramHandle?: string | null;
  } | null;
}) {
  // Template style: "Personal" puts the recruiter's name first ("Sarah is hiring..."),
  // "Company" leads with the company ("WebMasters is hiring..."). Default to Company
  // when there's a real company, else Personal.
  const [tone, setTone] = useState<'company' | 'personal'>(job.companyName ? 'company' : 'personal');
  const [textCopied, setTextCopied] = useState(false);

  const company = job.companyName?.trim() || '';
  const fname = recruiterFirstName?.trim() || 'I';

  // Strip leading @ from handles so we control the formatting per platform
  const liHandle = companySocial?.linkedinHandle?.replace(/^@/, '').trim();
  const xHandle = companySocial?.twitterHandle?.replace(/^@/, '').trim();

  // Per-platform announcement: include the right handle so the post is branded
  // even when the user copies the text manually.
  const baseAnnouncement =
    tone === 'company' && company
      ? `${company} is hiring for a ${job.title}.`
      : `${fname} is hiring${company ? ` at ${company}` : ''} — looking for a ${job.title}.`;

  const linkedinText = liHandle
    ? `${baseAnnouncement.replace(company, `${company} (linkedin.com/company/${liHandle})`)}\n\nApply here: ${jobUrl}`
    : `${baseAnnouncement}\n\nApply here: ${jobUrl}`;

  const twitterText = xHandle
    ? `${baseAnnouncement.replace(company, `@${xHandle}`)}\n\n${jobUrl}`
    : `${baseAnnouncement}\n\n${jobUrl}`;

  const genericText = `${baseAnnouncement}\n\nApply here: ${jobUrl}`;

  const encodedUrl = encodeURIComponent(jobUrl);
  const announcement = genericText; // for clipboard copy

  const platforms = [
    {
      name: 'LinkedIn',
      color: 'text-[#0A66C2]',
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedinText)}`,
    },
    {
      name: 'X / Twitter',
      color: 'text-gray-900 dark:text-white',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`,
    },
    {
      name: 'WhatsApp',
      color: 'text-[#25D366]',
      href: `https://wa.me/?text=${encodeURIComponent(genericText)}`,
    },
    {
      name: 'Facebook',
      color: 'text-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(genericText)}`,
    },
  ];

  const copyAnnouncement = async () => {
    try {
      await navigator.clipboard.writeText(announcement);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="max-w-lg mx-auto py-16 px-4 space-y-8">
      <div className="text-center space-y-2">
        <div className="text-4xl mb-3">&#x1F389;</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job posted!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{job.title}</span>
          {company && <span> &middot; {company}</span>}
        </p>
      </div>

      {/* Announcement template — copyable + tone toggle */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Announcement</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Copy and post anywhere.</p>
          </div>
          {company && (
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 p-0.5 text-[11px] font-bold uppercase tracking-widest">
              <button
                type="button"
                onClick={() => setTone('company')}
                className={`px-3 py-1.5 rounded-full transition-colors ${tone === 'company' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Company
              </button>
              <button
                type="button"
                onClick={() => setTone('personal')}
                className={`px-3 py-1.5 rounded-full transition-colors ${tone === 'personal' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Personal
              </button>
            </div>
          )}
        </div>

        <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
{announcement}
        </pre>

        <button
          type="button"
          onClick={copyAnnouncement}
          className="w-full text-sm font-bold text-[#F77B0F] border border-[#F77B0F]/30 hover:bg-[#F77B0F]/5 rounded-xl py-2.5 transition-colors"
        >
          {textCopied ? 'Copied to clipboard ✓' : 'Copy announcement'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Share your listing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Post to your networks to reach more candidates</p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity"
            >
              <span className={`text-sm font-semibold ${p.color}`}>{p.name}</span>
              <span className="ml-auto text-xs text-gray-400">Share &#x2192;</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5">
          <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{jobUrl}</span>
          <button type="button" onClick={onCopy} className="text-xs font-semibold text-[#F77B0F] hover:underline shrink-0">
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <a href="/recruiter" className="text-gray-500 dark:text-gray-400 hover:underline">&#x2190; Back to dashboard</a>
        <a href={`/jobs/${job.id}`} className="font-semibold text-[#F77B0F] hover:underline">View job listing &#x2192;</a>
      </div>
    </div>
  );
}

function PostJobContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  const [form, setForm] = useState({
    title: '',
    companyId: '',
    description: '',
    requirements: '',
    jobType: 'FULL_TIME',
    location: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'KES',
    expiresAt: '',
    experienceLevel: '',
    remotePolicy: '',
  });
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [hiringStages, setHiringStages] = useState<HiringStage[]>(DEFAULT_STAGES);
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [companyMode, setCompanyMode] = useState<'select' | 'new'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLogo, setNewCompanyLogo] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [posterUploading, setPosterUploading] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [postedJob, setPostedJob] = useState<{
    id: string;
    title: string;
    companyName: string;
    companySocial?: {
      linkedinHandle?: string | null;
      linkedinPageUrl?: string | null;
      twitterHandle?: string | null;
      facebookPageUrl?: string | null;
      instagramHandle?: string | null;
    } | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/post-job'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    loadCompanies();
    loadSkills();
  }, [isAuthenticated, isRecruiter]);

  async function loadCompanies() {
    try {
      const data = await companiesService.list();
      const items: Company[] = (data as any)?.items ?? [];
      setCompanies(items);
      if (items.length === 1) setForm((f) => ({ ...f, companyId: items[0].id }));
    } catch { /* silent */ }
  }

  async function loadSkills() {
    try {
      const data = await apiGet<{ items: Skill[] }>('/skills');
      setAllSkills((data as any)?.items ?? []);
    } catch { /* silent */ }
  }

  function toggleSkill(skill: Skill) {
    setSelectedSkills((prev) =>
      prev.find((s) => s.id === skill.id) ? prev.filter((s) => s.id !== skill.id) : [...prev, skill]
    );
  }

  async function addNewSkill(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setSkillSearch('');
      return;
    }
    setAddingSkill(true);
    try {
      const created = await apiPost<Skill>('/skills', { name: trimmed });
      const skill: Skill = { id: (created as any)?.id, name: (created as any)?.name ?? trimmed };
      setSelectedSkills((prev) => [...prev, skill]);
      setAllSkills((prev) => prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]);
      setSkillSearch('');
    } catch {
      // skill creation failed silently — don't block
    } finally {
      setAddingSkill(false);
    }
  }

  // Hiring stages helpers
  function addStage() {
    const next = hiringStages.length + 1;
    setHiringStages((s) => [...s, { order: next, name: '', description: '' }]);
    setEditingStage(next - 1);
  }

  function removeStage(idx: number) {
    setHiringStages((s) => s.filter((_, i) => i !== idx).map((st, i) => ({ ...st, order: i + 1 })));
    if (editingStage === idx) setEditingStage(null);
  }

  function updateStage(idx: number, field: 'name' | 'description', val: string) {
    setHiringStages((s) => s.map((st, i) => i === idx ? { ...st, [field]: val } : st));
  }

  function moveStage(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= hiringStages.length) return;
    setHiringStages((s) => {
      const arr = [...s];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((st, i) => ({ ...st, order: i + 1 }));
    });
  }

  const filteredSkills = allSkills.filter(
    (s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.find((sel) => sel.id === s.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError('Job title is required'); return; }
    if (companyMode === 'select' && !form.companyId) { setError('Please select a company'); return; }
    if (companyMode === 'new' && !newCompanyName.trim()) { setError('Please enter a company name'); return; }
    if (!form.description.trim()) { setError('Job description is required'); return; }
    const invalidStage = hiringStages.find((s) => !s.name.trim());
    if (invalidStage) { setError('All hiring stages must have a name'); return; }

    setSubmitting(true);
    try {
      let companyId = form.companyId;
      if (companyMode === 'new') {
        const created = await companiesService.create({
          name: newCompanyName.trim(),
          logoUrl: newCompanyLogo || undefined,
        });
        companyId = (created as any)?.id ?? (created as any)?.data?.id;
        if (!companyId) throw new Error('Failed to create company');
      }

      const payload: Record<string, any> = {
        title: form.title.trim(),
        companyId,
        description: form.description.trim(),
        jobType: form.jobType,
      };
      if (form.requirements.trim()) payload.requirements = form.requirements.trim();
      if (posterUrl) payload.posterUrl = posterUrl;
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.salaryMin) payload.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) payload.salaryMax = Number(form.salaryMax);
      if (form.currency) payload.currency = form.currency;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      if (selectedSkills.length > 0) payload.skillIds = selectedSkills.map((s) => s.id);
      if (hiringStages.length > 0) payload.hiringStages = hiringStages;

      const job = await jobsService.create(payload);
      const jobId = (job as any)?.id ?? (job as any)?.data?.id;
      const jobTitle = (job as any)?.title ?? form.title;
      const jobCompany = (job as any)?.company?.name ?? newCompanyName ?? '';
      const jobCompanyObj = (job as any)?.company ?? {};
      if (jobId) {
        setPostedJob({
          id: jobId,
          title: jobTitle,
          companyName: jobCompany,
          companySocial: {
            linkedinHandle: jobCompanyObj.linkedinHandle,
            linkedinPageUrl: jobCompanyObj.linkedinPageUrl,
            twitterHandle: jobCompanyObj.twitterHandle,
            facebookPageUrl: jobCompanyObj.facebookPageUrl,
            instagramHandle: jobCompanyObj.instagramHandle,
          },
        });
      } else {
        router.push('/recruiter');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  const jobUrl = postedJob
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/${postedJob.id}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) { /* silent */ }
  };

  if (postedJob) {
    return (
      <PostedSuccess
        job={postedJob}
        jobUrl={jobUrl}
        copied={copied}
        onCopy={copyLink}
        recruiterFirstName={(user as any)?.firstName}
        companySocial={postedJob.companySocial}
      />
    );
  }

  const sections = ['Basic Info', 'Details', 'Compensation', 'Skills', 'Hiring Pipeline', 'Publish'];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post a Job</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Build a detailed listing to attract the right candidates</p>
      </div>

      {/* Section progress pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {sections.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(i)}
            className={`px-3 py-1 text-xs font-medium transition-colors border-b-2 rounded-none ${
              activeSection === i
                ? 'border-[#F77B0F] text-[#F77B0F] font-semibold'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── 1. Basic Info ────────────────────────────────────────────────── */}
        <SectionCard title="1. Basic Information" subtitle="The essentials that appear at the top of your listing">
          <div>
            <label className={labelCls}>Job Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Senior Frontend Engineer, Product Manager, Data Scientist"
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Company <span className="text-red-500">*</span>
              </label>
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCompanyMode((m) => m === 'select' ? 'new' : 'select');
                    setNewCompanyName('');
                    setForm((f) => ({ ...f, companyId: '' }));
                  }}
                  className="text-xs font-medium text-[#F77B0F] hover:underline"
                >
                  {companyMode === 'select' ? '+ Add company' : '← Select existing'}
                </button>
              )}
            </div>

            {companyMode === 'new' || companies.length === 0 ? (
              <>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Company name e.g. Safaricom, Andela, YourStartup..."
                  className={inputCls}
                  autoFocus={companyMode === 'new'}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Added to the platform — other recruiters will see it in their list too.
                </p>

                {/* Logo upload */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    {newCompanyLogo ? (
                      <img src={newCompanyLogo} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : logoUploading ? (
                      <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center px-4 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                      {newCompanyLogo ? 'Change logo' : 'Upload company logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        disabled={logoUploading}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 5 * 1024 * 1024) {
                            setError('Logo must be 5MB or smaller');
                            return;
                          }
                          setLogoUploading(true);
                          setError(null);
                          try {
                            const fd = new FormData();
                            fd.append('file', f);
                            const url = await apiPost<{ url: string }>('/media/upload?folder=company-logos', fd);
                            const finalUrl = (url as any)?.url ?? (url as any)?.data?.url ?? '';
                            if (!finalUrl) throw new Error('Upload returned no URL');
                            setNewCompanyLogo(finalUrl);
                          } catch (err: any) {
                            setError(err?.message ?? 'Logo upload failed');
                          } finally {
                            setLogoUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">PNG, JPG, SVG or WebP · max 5MB · stored in S3</p>
                  </div>
                </div>
              </>
            ) : (
              <select
                value={form.companyId}
                onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Job Type</label>
              <select value={form.jobType} onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))} className={inputCls}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Experience Level</label>
              <select value={form.experienceLevel} onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))} className={inputCls}>
                <option value="">Any level</option>
                <option value="ENTRY">Entry Level (0-2 yrs)</option>
                <option value="MID">Mid Level (2-5 yrs)</option>
                <option value="SENIOR">Senior (5-10 yrs)</option>
                <option value="LEAD">Lead / Principal (10+ yrs)</option>
                <option value="EXECUTIVE">Executive / C-Suite</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Nairobi, Kenya"
                className={inputCls}
              />
            </div>
          </div>

          {/* Poster image (optional) */}
          <div className="mt-6">
            <label className={labelCls}>Poster image <span className="text-gray-400 font-normal">(optional)</span></label>
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">Add a banner image that shows on the job card and detail page. Recommended 1200×630.</p>

            {posterUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-600 group">
                <img src={posterUrl} alt="Job poster preview" className="w-full max-h-72 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <label className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-semibold cursor-pointer hover:bg-gray-100">
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={posterUploading}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 8 * 1024 * 1024) { setError('Poster must be 8MB or smaller'); return; }
                          setPosterUploading(true);
                          setError(null);
                          try {
                            const fd = new FormData();
                            fd.append('file', f);
                            const r = await apiPost<{ url: string }>('/media/upload?folder=job-posters', fd);
                            const url = (r as any)?.url ?? (r as any)?.data?.url ?? '';
                            if (!url) throw new Error('Upload returned no URL');
                            setPosterUrl(url);
                          } catch (err: any) {
                            setError(err?.message ?? 'Poster upload failed');
                          } finally {
                            setPosterUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPosterUrl('')}
                      className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:border-[#F77B0F] hover:bg-orange-50/30 dark:hover:bg-gray-700 transition-colors">
                {posterUploading ? (
                  <>
                    <svg className="w-6 h-6 animate-spin text-[#F77B0F]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Uploading…</p>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload a poster</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">PNG, JPG or WebP · max 8MB · stored in S3</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={posterUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 8 * 1024 * 1024) { setError('Poster must be 8MB or smaller'); return; }
                    setPosterUploading(true);
                    setError(null);
                    try {
                      const fd = new FormData();
                      fd.append('file', f);
                      const r = await apiPost<{ url: string }>('/media/upload?folder=job-posters', fd);
                      const url = (r as any)?.url ?? (r as any)?.data?.url ?? '';
                      if (!url) throw new Error('Upload returned no URL');
                      setPosterUrl(url);
                    } catch (err: any) {
                      setError(err?.message ?? 'Poster upload failed');
                    } finally {
                      setPosterUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}
          </div>
        </SectionCard>

        {/* ── 2. Description & Requirements ───────────────────────────────── */}
        <SectionCard title="2. Job Details" subtitle="Describe the role clearly to attract the right people">
          <div>
            <label className={labelCls}>Job Description <span className="text-red-500">*</span></label>
            <textarea
              rows={7}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, team, key responsibilities, and what success looks like in this position..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{form.description.length} characters · Aim for at least 200</p>
          </div>

          <div>
            <label className={labelCls}>Requirements & Qualifications</label>
            <textarea
              rows={5}
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              placeholder={`• Bachelor's degree in Computer Science or related field\n• 3+ years of experience with React\n• Strong communication skills\n• Experience with TypeScript is a plus`}
              className={`${inputCls} resize-none`}
            />
          </div>
        </SectionCard>

        {/* ── 3. Compensation ──────────────────────────────────────────────── */}
        <SectionCard title="3. Compensation" subtitle="Transparent salary ranges increase application rates by up to 30%">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="ZAR">ZAR</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Min Salary</label>
              <input type="number" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} placeholder="e.g. 80000" min="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Salary</label>
              <input type="number" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} placeholder="e.g. 120000" min="0" className={inputCls} />
            </div>
          </div>
        </SectionCard>

        {/* ── 4. Skills ────────────────────────────────────────────────────── */}
        <SectionCard title="4. Required Skills" subtitle="Skills are used to match your listing with qualified candidates">
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <span key={skill.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-sm font-medium">
                  {skill.name}
                  <button type="button" onClick={() => toggleSkill(skill)} className="hover:text-red-500 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredSkills.length > 0) {
                    toggleSkill(filteredSkills[0]);
                    setSkillSearch('');
                  } else if (skillSearch.trim()) {
                    addNewSkill(skillSearch);
                  }
                }
              }}
              placeholder="Search skills — React, Python, Project Management, SQL..."
              className={inputCls}
            />
            {addingSkill && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent block" />
              </div>
            )}
          </div>

          {skillSearch && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              {filteredSkills.slice(0, 12).map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => { toggleSkill(skill); setSkillSearch(''); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
                  {skill.name}
                </button>
              ))}
              {/* Always show "Add" row at the bottom if typed text isn't an exact match */}
              {skillSearch.trim() && !selectedSkills.some((s) => s.name.toLowerCase() === skillSearch.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => addNewSkill(skillSearch)}
                  disabled={addingSkill}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-[#F77B0F] hover:bg-[#F77B0F]/5 dark:hover:bg-[#F77B0F]/10 border-t border-gray-100 dark:border-gray-700 disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add "{skillSearch.trim()}" as new skill
                </button>
              )}
            </div>
          )}

          {!skillSearch && selectedSkills.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Type to search existing skills, or type a new skill name and press Enter (or click "+ Add") to create it.
            </p>
          )}
        </SectionCard>

        {/* ── 5. Hiring Pipeline / Stages ──────────────────────────────────── */}
        <SectionCard title="5. Hiring Pipeline" subtitle="Define the stages candidates will go through. These show up on their application timeline.">
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {hiringStages.map((stage, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800/40">
                {editingStage === idx ? (
                  /* ── edit mode ── */
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {stage.order}
                      </span>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => updateStage(idx, 'name', e.target.value)}
                        placeholder="Stage name"
                        autoFocus
                        className="flex-1 text-sm font-medium bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 border-b border-gray-200 dark:border-gray-600 pb-0.5 focus:border-[#F77B0F]"
                      />
                    </div>
                    <div className="pl-8">
                      <input
                        type="text"
                        value={stage.description}
                        onChange={(e) => updateStage(idx, 'description', e.target.value)}
                        placeholder="Brief description — what happens at this stage (optional)"
                        className="w-full text-xs text-gray-500 dark:text-gray-400 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                    </div>
                    <div className="pl-8 flex items-center gap-4 pt-1">
                      <button type="button" onClick={() => setEditingStage(null)} className="text-xs font-medium text-[#F77B0F] hover:underline">Done</button>
                      <button type="button" onClick={() => removeStage(idx)} disabled={hiringStages.length <= 1} className="text-xs text-red-500 hover:underline disabled:opacity-30">Remove</button>
                    </div>
                  </div>
                ) : (
                  /* ── view mode ── */
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {stage.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {stage.name || <span className="text-gray-400 italic font-normal">Unnamed stage</span>}
                      </p>
                      {stage.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stage.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      <button type="button" onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25">↑</button>
                      <button type="button" onClick={() => moveStage(idx, 1)} disabled={idx === hiringStages.length - 1} className="hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25">↓</button>
                      <button type="button" onClick={() => setEditingStage(idx)} className="hover:text-[#F77B0F]">Edit</button>
                      <button type="button" onClick={() => removeStage(idx)} disabled={hiringStages.length <= 1} className="hover:text-red-500 disabled:opacity-25">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addStage}
            className="text-sm font-medium text-[#F77B0F] hover:underline"
          >
            + Add Stage
          </button>
        </SectionCard>

        {/* ── 6. Publish / Expiry ──────────────────────────────────────────── */}
        <SectionCard title="6. Publish Settings" subtitle="Control when your listing goes live and when it expires">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Listing Expires On
                </span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Leave blank to keep it active indefinitely.</p>
            </div>
            <div className="rounded-xl bg-[#192C67]/5 dark:bg-[#192C67]/15 p-4">
              <p className="text-xs font-semibold text-[#192C67] dark:text-blue-400 mb-2">Listing Preview</p>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Title</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{form.title || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="font-medium text-gray-900 dark:text-white">{form.jobType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location</span>
                  <span className="font-medium text-gray-900 dark:text-white">{form.location || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Skills</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedSkills.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span>Pipeline</span>
                  <span className="font-medium text-gray-900 dark:text-white">{hiringStages.length} stages</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires</span>
                  <span className="font-medium text-gray-900 dark:text-white">{form.expiresAt || 'Never'}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#F77B0F] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
                Posting...
              </>
            ) : (
              'Post Job →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>}>
      <PostJobContent />
    </Suspense>
  );
}
