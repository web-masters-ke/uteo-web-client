'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { jobsService } from '@/lib/services/jobs';
import { apiGet, apiPost, api } from '@/lib/api';
import { unwrap } from '@/lib/api';

interface Skill { id: string; name: string; }

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] text-sm';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'];
const STATUSES: { value: string; label: string; desc: string }[] = [
  { value: 'ACTIVE',  label: 'Active',  desc: 'Live and accepting applications.' },
  { value: 'PAUSED',  label: 'Paused',  desc: 'Hidden from public listings; existing applicants keep access.' },
  { value: 'CLOSED',  label: 'Closed',  desc: 'No longer accepting applications. Cannot be reopened from this dropdown — re-post if needed.' },
  { value: 'DRAFT',   label: 'Draft',   desc: 'Not yet published.' },
];

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [addingSkill, setAddingSkill] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [posterUploading, setPosterUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    jobType: 'FULL_TIME',
    location: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'KES',
    expiresAt: '',
    status: 'ACTIVE',
    vacancies: '1',
    showSalary: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace(`/login?redirect=/recruiter/jobs/${id}/edit`); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [authLoading, isAuthenticated, isRecruiter, router, id]);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const job = await jobsService.get(id);
      const j = job as any;
      setForm({
        title: j.title ?? '',
        description: j.description ?? '',
        requirements: j.requirements ?? '',
        jobType: j.jobType ?? 'FULL_TIME',
        location: j.location ?? '',
        salaryMin: j.salaryMin != null ? String(j.salaryMin) : '',
        salaryMax: j.salaryMax != null ? String(j.salaryMax) : '',
        currency: j.currency ?? 'KES',
        expiresAt: j.expiresAt ? String(j.expiresAt).split('T')[0] : '',
        status: j.status ?? 'ACTIVE',
        vacancies: j.vacancies != null ? String(j.vacancies) : '1',
        showSalary: j.showSalary === true,
      });
      const skills: Skill[] = (j.jobSkills ?? []).map((js: any) => js.skill).filter(Boolean);
      setSelectedSkills(skills);
      setPosterUrl(j.posterUrl ?? '');
    } catch (e: any) {
      addToast('error', e?.message ?? 'Could not load job');
      router.replace('/recruiter/jobs');
    } finally {
      setLoading(false);
    }
  }, [id, router, addToast]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    loadJob();
    apiGet<{ items: Skill[] }>('/skills')
      .then((d) => setAllSkills((d as any)?.items ?? []))
      .catch(() => null);
  }, [isAuthenticated, isRecruiter, loadJob]);

  function toggleSkill(skill: Skill) {
    setSelectedSkills((prev) =>
      prev.find((s) => s.id === skill.id) ? prev.filter((s) => s.id !== skill.id) : [...prev, skill],
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
      const next = (created as any)?.id ? created : ((created as any)?.data ?? created);
      setSelectedSkills((prev) => [...prev, next as Skill]);
      setAllSkills((prev) => [...prev, next as Skill]);
      setSkillSearch('');
    } catch (e: any) {
      addToast('error', e?.message ?? 'Could not add skill');
    } finally {
      setAddingSkill(false);
    }
  }

  async function save() {
    if (!form.title.trim()) { addToast('error', 'Title is required'); return; }
    if (!form.description.trim()) { addToast('error', 'Description is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        description: form.description.trim(),
        jobType: form.jobType,
        status: form.status,
        currency: form.currency || 'KES',
      };
      if (form.requirements.trim()) payload.requirements = form.requirements.trim();
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.salaryMin) payload.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) payload.salaryMax = Number(form.salaryMax);
      if (form.expiresAt) payload.expiresAt = form.expiresAt;
      if (form.vacancies) payload.vacancies = Number(form.vacancies);
      payload.posterUrl = posterUrl || null;
      payload.showSalary = form.showSalary;
      payload.skillIds = selectedSkills.map((s) => s.id);

      await jobsService.update(id, payload);
      addToast('success', 'Job updated');
      router.push('/recruiter/jobs');
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }

  const filteredSkills = skillSearch.trim()
    ? allSkills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase())).slice(0, 8)
    : [];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/recruiter/jobs" className="hover:text-gray-900 dark:hover:text-white">My Jobs</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Job</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Update the role, change status, or refresh required skills.</p>
      </div>

      {/* Cover image */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Cover image</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shown on the job listing card and the public job page. PNG, JPG or WebP, up to 8MB.</p>
        </div>
        {posterUrl ? (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={posterUrl} alt="Job cover" className="w-full max-h-72 object-cover" />
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Cover ready</p>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-[#F77B0F] hover:underline cursor-pointer">
                  Replace
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={posterUploading}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 8 * 1024 * 1024) { addToast('error', 'Cover must be 8MB or smaller'); e.target.value = ''; return; }
                      setPosterUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', f);
                        const r = await api.post<any>('/media/upload?folder=job-posters', fd);
                        const body = unwrap<any>(r.data) as { url?: string };
                        if (!body?.url) throw new Error('Upload returned no URL');
                        setPosterUrl(body.url);
                      } catch (err: any) {
                        addToast('error', err?.message ?? 'Cover upload failed');
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
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#F77B0F] hover:bg-[#F77B0F]/5 transition-colors p-10 cursor-pointer">
            {posterUploading ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload a cover</p>
            <p className="text-xs text-gray-400">PNG, JPG or WebP, max 8MB · 1200×630 looks best</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={posterUploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 8 * 1024 * 1024) { addToast('error', 'Cover must be 8MB or smaller'); e.target.value = ''; return; }
                setPosterUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', f);
                  const r = await api.post<any>('/media/upload?folder=job-posters', fd);
                  const body = unwrap<any>(r.data) as { url?: string };
                  if (!body?.url) throw new Error('Upload returned no URL');
                  setPosterUrl(body.url);
                } catch (err: any) {
                  addToast('error', err?.message ?? 'Cover upload failed');
                } finally {
                  setPosterUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
        <div>
          <label className={labelCls}>Job title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job type</label>
            <select value={form.jobType} onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))} className={inputCls}>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Nairobi, Remote, …" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={6} className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>Requirements <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} rows={4} className={`${inputCls} resize-none`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Currency</label>
            <input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Salary min</label>
            <input type="number" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Salary max</label>
            <input type="number" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-[#F77B0F] transition-colors">
          <input
            type="checkbox"
            checked={form.showSalary}
            onChange={(e) => setForm((f) => ({ ...f, showSalary: e.target.checked }))}
            className="w-4 h-4 accent-[#F77B0F]"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Show salary range publicly</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              When off (default), the salary band is hidden from candidates on the job listing and detail page. Recruiters always see it.
            </p>
          </div>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Expires on <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Vacancies</label>
            <input type="number" min={1} value={form.vacancies} onChange={(e) => setForm((f) => ({ ...f, vacancies: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Job status</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Controls whether the post is visible and accepting applications.</p>
        </div>
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <label
              key={s.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.status === s.value ? 'border-[#F77B0F] bg-[#F77B0F]/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={s.value}
                checked={form.status === s.value}
                onChange={() => setForm((f) => ({ ...f, status: s.value }))}
                className="mt-0.5 accent-[#F77B0F]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Required skills</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Used for candidate match scoring.</p>
        </div>
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((s) => (
              <span key={s.id} className="px-3 py-1 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-xs font-medium flex items-center gap-1.5">
                {s.name}
                <button type="button" onClick={() => toggleSkill(s)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
        <div>
          <input
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addNewSkill(skillSearch); }
            }}
            placeholder="Search or add a skill — press Enter to add"
            className={inputCls}
          />
          {filteredSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredSkills.map((s) => {
                const sel = selectedSkills.some((x) => x.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    disabled={sel}
                    className={`px-2.5 py-1 rounded-full text-xs border ${sel ? 'border-gray-200 text-gray-300 dark:border-gray-600 dark:text-gray-500' : 'border-gray-200 dark:border-gray-600 hover:border-[#F77B0F] hover:text-[#F77B0F]'}`}
                  >
                    + {s.name}
                  </button>
                );
              })}
            </div>
          )}
          {addingSkill && <p className="text-xs text-gray-400 mt-2">Adding…</p>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href="/recruiter/jobs" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          ← Cancel
        </Link>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
