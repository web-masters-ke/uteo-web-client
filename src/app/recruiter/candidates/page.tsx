'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { Job } from '@/lib/uteo-types';

interface Skill { id: string; name: string; }
interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  email: string;
  headline: string | null;
  location: string | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  skills: Skill[];
  matchScore: number;
  scoreBreakdown: { skillScore: number; locationScore: number; profileScore: number };
  matchedSkills: string[];
  applied?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'SUBMITTED',   label: 'Applied',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'REVIEWED',    label: 'Reviewed',     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'SHORTLISTED', label: 'Shortlisted',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'INTERVIEW',   label: 'Interview',    color: 'bg-[#F77B0F]/10 text-[#F77B0F]' },
  { value: 'HIRED',       label: 'Hired',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'REJECTED',    label: 'Rejected',     color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
];

const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] transition-colors [&:-webkit-autofill]:![box-shadow:inset_0_0_0_1000px_white] dark:[&:-webkit-autofill]:![box-shadow:inset_0_0_0_1000px_rgb(55,65,81)] [&:-webkit-autofill]:!text-gray-900 dark:[&:-webkit-autofill]:!text-white";

function ScoreRing({ score }: { score: number }) {
  const max = 75;
  const pct = Math.min(score / max, 1);
  const color = pct >= 0.7 ? '#22c55e' : pct >= 0.4 ? '#F77B0F' : '#94a3b8';
  const r = 18;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-gray-100 dark:text-gray-700" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-900 dark:text-white">{score}</span>
    </div>
  );
}

// ── Add Candidate Modal ──────────────────────────────────────────────────────
function AddCandidateModal({ jobs, onClose, onSaved }: { jobs: Job[]; onClose: () => void; onSaved: (jobId: string) => void }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [existingUser, setExistingUser] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('SUBMITTED');
  const [notes, setNotes] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { addToast('error', 'Email is required'); return; }
    if (!firstName.trim()) { addToast('error', 'First name is required'); return; }
    if (!existingUser && !password) { addToast('error', 'Password is required for new candidates'); return; }
    setSaving(true);
    try {
      await apiPost('/applications/manual', {
        candidateEmail: email.trim().toLowerCase(),
        candidateFirstName: firstName.trim(),
        candidateLastName: lastName.trim() || undefined,
        candidatePhone: phone.trim() || undefined,
        candidatePassword: password || undefined,
        jobId: jobId || undefined,
        status: jobId ? status : undefined,
        notes: notes.trim() || undefined,
      });
      addToast('success', jobId ? 'Candidate added and application created' : 'Candidate account created');
      onSaved(jobId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to add candidate';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Add Candidate</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Create a candidate account and optionally link them to a job</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Existing user toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setExistingUser(!existingUser); setPassword(''); }}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${existingUser ? 'bg-[#F77B0F]' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${existingUser ? 'left-4' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {existingUser ? 'Adding existing user (no password needed)' : 'Creating new user account'}
            </span>
          </div>

          {/* Personal info */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Candidate Info</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" className={inputCls} />
                </div>
                {!existingUser && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Temp Password <span className="text-red-500">*</span></label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" className={inputCls} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Application details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Application (Optional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Link to Job</label>
                <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputCls}>
                  <option value="">— No job selected —</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company?.name ? ` — ${j.company.name}` : ''}</option>)}
                </select>
              </div>
              {jobId && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Application Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_OPTIONS.filter((s) => s.value !== 'HIRED' && s.value !== 'REJECTED').map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStatus(s.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                            status === s.value
                              ? 'border-[#F77B0F] bg-[#F77B0F]/5 text-[#F77B0F]'
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Internal recruiter notes about this candidate..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !firstName.trim() || !email.trim() || (!existingUser && !password)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#F77B0F] hover:underline disabled:opacity-40 transition-opacity"
          >
            {saving ? (
              <><span className="w-3.5 h-3.5 border-2 border-[#F77B0F] border-t-transparent rounded-full animate-spin" />Adding…</>
            ) : jobId ? 'Add Candidate + Create Application →' : 'Add Candidate →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function CandidatesContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});

  async function loadInsight(candidate: Candidate) {
    if (aiInsights[candidate.id]) return;
    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    try {
      const insight = await apiPost<string>('/ai/candidate-insight', {
        candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
        headline: candidate.headline ?? undefined,
        skills: candidate.skills.map((s) => s.name),
        matchedSkills: candidate.matchedSkills,
        jobTitle: selectedJob?.title ?? '',
      });
      if (typeof insight === 'string') {
        setAiInsights((prev) => ({ ...prev, [candidate.id]: insight }));
      }
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/candidates'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    jobsService.list({ limit: 100 } as any).then((d) => {
      const items = (d as any)?.items ?? [];
      setJobs(items);
      const active = items.filter((j: any) => j.status === 'ACTIVE');
      if (active.length > 0) setSelectedJobId(active[0].id);
      else if (items.length > 0) setSelectedJobId(items[0].id);
    }).finally(() => setLoadingJobs(false));
  }, [isAuthenticated, isRecruiter]);

  useEffect(() => {
    if (!selectedJobId) { setCandidates([]); return; }
    setLoadingCandidates(true);
    apiGet<{ items: Candidate[]; total: number }>(`/jobs/${selectedJobId}/candidates`)
      .then((d) => setCandidates((d as any)?.items ?? []))
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [selectedJobId, refreshKey]);

  useEffect(() => {
    if (candidates.length === 0) return;
    candidates.slice(0, 5).forEach((c) => loadInsight(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>;
  }

  const filtered = useMemo(() => candidates.filter((c) => {
    if (skillFilter && !c.skills.some((s) => s.name.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
    if (locationFilter && !c.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (c.matchScore < minScore) return false;
    return true;
  }), [candidates, skillFilter, locationFilter, minScore]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Candidate Discovery</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">AI-ranked candidates open to work, matched against your job requirements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-2 py-1.5 text-[#F77B0F] text-sm font-semibold hover:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Candidate
        </button>
      </div>

      {/* Job selector + filters */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Match Against Job</label>
            {loadingJobs ? (
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet. <a href="/recruiter/post-job" className="text-[#F77B0F] hover:underline">Post one first.</a></p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#F77B0F]"
              >
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company?.name ? ` — ${j.company.name}` : ''}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Skill Filter</label>
              <input type="text" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="e.g. React"
                className="w-36 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Location</label>
              <input type="text" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="e.g. Nairobi"
                className="w-36 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Min Score</label>
              <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]">
                <option value={0}>Any</option>
                <option value={20}>20+</option>
                <option value={35}>35+</option>
                <option value={50}>50+</option>
                <option value={60}>60+</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Score legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="font-semibold uppercase tracking-wide">Score key:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Strong (53+)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F77B0F]" />Good (30–52)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Partial (&lt;30)</span>
        <span className="ml-auto">Max possible: 75</span>
      </div>

      {/* Candidates list */}
      {loadingCandidates ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">No candidates found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            {candidates.length > 0 ? 'Try adjusting your filters.' : 'No candidates are currently open to work for this job.'}
          </p>
          <button onClick={() => setShowAddModal(true)} className="text-sm font-semibold text-[#F77B0F] hover:underline">
            + Add a candidate manually
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, rank) => (
            <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 hover:border-[#F77B0F]/40 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                {/* Rank + avatar */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">#{rank + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm overflow-hidden">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      (c.firstName[0] + c.lastName[0]).toUpperCase()
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{c.firstName} {c.lastName}</h3>
                        {c.applied && <span className="px-2 py-0.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[10px] font-bold uppercase tracking-wide">Applied</span>}
                      </div>
                      {c.headline && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.headline}</p>}
                      {aiInsights[c.id] && (
                        <p className="text-xs italic text-gray-400 dark:text-gray-500 mt-0.5">{aiInsights[c.id]}</p>
                      )}
                      {c.location && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {c.location}
                        </p>
                      )}
                    </div>
                    <ScoreRing score={c.matchScore} />
                  </div>

                  {/* Matched skills */}
                  {c.matchedSkills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.matchedSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[11px] font-medium">✓ {s}</span>
                      ))}
                      {c.skills.filter((s) => !c.matchedSkills.includes(s.name)).slice(0, 3).map((s) => (
                        <span key={s.id} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-[11px]">{s.name}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-4">
                    {c.resumeUrl && (
                      <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#F77B0F] hover:underline transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Resume
                      </a>
                    )}
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#F77B0F] hover:underline transition-colors">
                        LinkedIn
                      </a>
                    )}
                    <a href={`/messages?userId=${c.id}`} className="flex items-center gap-1 text-xs font-medium text-[#F77B0F] hover:underline">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      Message
                    </a>
                    <a href={`/recruiter/candidates/${c.id}`} className="flex items-center gap-1 text-xs font-semibold text-[#192C67] dark:text-blue-400 hover:underline">
                      View profile
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </a>
                    <div className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <span>Skills: {c.scoreBreakdown.skillScore}</span>
                      <span>·</span>
                      <span>Location: {c.scoreBreakdown.locationScore}</span>
                      <span>·</span>
                      <span>Profile: {c.scoreBreakdown.profileScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
          Showing {filtered.length} of {candidates.length} candidates open to work
        </p>
      )}

      {/* Add Candidate modal */}
      {showAddModal && (
        <AddCandidateModal
          jobs={jobs}
          onClose={() => setShowAddModal(false)}
          onSaved={(savedJobId) => {
            setShowAddModal(false);
            if (savedJobId && savedJobId !== selectedJobId) {
              setSelectedJobId(savedJobId);
            } else {
              setRefreshKey((k) => k + 1);
            }
          }}
        />
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>}>
      <CandidatesContent />
    </Suspense>
  );
}
