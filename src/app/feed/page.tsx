'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import { api, unwrap } from '@/lib/api';
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

const inputCls = "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F77B0F]/30 focus:border-[#F77B0F] placeholder:text-gray-400 dark:placeholder:text-white/30 transition-all";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5";

function ApplyModal({ job, onClose, onSuccess }: { job: Job; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Personal & Work Details
  const [fullName, setFullName] = useState((user as any)?.name ?? '');
  const [email, setEmail] = useState((user as any)?.email ?? '');
  const [phone, setPhone] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [education, setEducation] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [languages, setLanguages] = useState('');

  // Step 2 — Documents & Logistics
  const [resumeUrl, setResumeUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availability, setAvailability] = useState('');
  const [workAuth, setWorkAuth] = useState('');
  const [relocation, setRelocation] = useState('');

  // Step 3 — Your Pitch
  const [whyRole, setWhyRole] = useState('');
  const [keyAchievement, setKeyAchievement] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError('File too large — max 10MB'); return; }
    setUploading(true);
    setUploadError('');
    try {
      // Backend-proxied upload: browser → /media/upload → S3 (avoids browser-to-S3 CORS).
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<any>('/media/upload?folder=resumes', fd);
      const body = unwrap(res.data) as { url?: string; publicUrl?: string };
      const url = body.url ?? body.publicUrl;
      if (!url) throw new Error('Upload returned no URL');
      setResumeUrl(url);
      setUploadedFileName(file.name);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unknown error';
      setUploadError(`Upload failed: ${msg}`);
      console.error('[upload]', e?.response?.status, e?.response?.data, e?.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const salary = job.salaryMin && job.salaryMax
    ? `${job.currency ?? 'KES'} ${(job.salaryMin / 1000).toFixed(0)}k – ${(job.salaryMax / 1000).toFixed(0)}k`
    : null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const combinedCover = [
      whyRole ? `WHY I'M THE RIGHT FIT:\n${whyRole}` : '',
      keyAchievement ? `KEY ACHIEVEMENT:\n${keyAchievement}` : '',
      coverLetter ? `COVER LETTER:\n${coverLetter}` : '',
    ].filter(Boolean).join('\n\n') || undefined;
    try {
      await applicationsService.apply({
        jobId: job.id,
        coverLetter: combinedCover,
        resumeUrl: resumeUrl || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Personal Details', 'Documents & Logistics', 'Your Pitch'];

  return (
    <Modal isOpen onClose={onClose} title="" size="lg">
      <div className="flex flex-col" style={{ maxHeight: '88vh' }}>
        {/* Job summary header */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/6 mb-5">
          {job.company?.logoUrl ? (
            <img src={job.company.logoUrl} alt={job.company?.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#192C67]/10 dark:bg-white/8 text-[#192C67] dark:text-white text-sm font-black flex items-center justify-center shrink-0">
              {(job.company?.name ?? 'CO').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{job.title}</p>
            <p className="text-xs text-gray-500 dark:text-white/50 truncate">{job.company?.name}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
          {salary && <span className="text-xs font-semibold text-[#F77B0F] shrink-0">{salary}</span>}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-5">
          {steps.map((label, idx) => {
            const s = (idx + 1) as 1 | 2 | 3;
            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${step >= s ? 'bg-[#F77B0F] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-white/40'}`}>{s}</div>
                  <span className={`text-[11px] font-medium hidden sm:block truncate ${step >= s ? 'text-gray-700 dark:text-white/70' : 'text-gray-400 dark:text-white/30'}`}>{label}</span>
                </div>
                {s < 3 && <div className="flex-1 h-px bg-gray-200 dark:bg-white/10 mx-2" />}
              </div>
            );
          })}
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">

          {/* ── Step 1: Personal & Work Details ── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
                </div>
                <div>
                  <label className={labelCls}>Current / Last Job Title</label>
                  <input className={inputCls} value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} placeholder="e.g. Junior Financial Analyst" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Years of Experience</label>
                  <select className={inputCls} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)}>
                    <option value="">Select</option>
                    <option value="0">No experience (fresher)</option>
                    <option value="1">Less than 1 year</option>
                    <option value="2">1 – 2 years</option>
                    <option value="3">3 – 5 years</option>
                    <option value="6">6 – 10 years</option>
                    <option value="11">10+ years</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Highest Education Level</label>
                  <select className={inputCls} value={education} onChange={(e) => setEducation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="high_school">High School / A-Level</option>
                    <option value="diploma">Diploma / Certificate</option>
                    <option value="bachelors">Bachelor's Degree</option>
                    <option value="masters">Master's Degree</option>
                    <option value="phd">PhD / Doctorate</option>
                    <option value="professional">Professional Qualification (CPA, ACCA, etc.)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Field of Study / Major</label>
                  <input className={inputCls} value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="e.g. Finance, Computer Science" />
                </div>
                <div>
                  <label className={labelCls}>Languages Spoken</label>
                  <input className={inputCls} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. English, Swahili, French" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Documents & Logistics ── */}
          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Resume / CV</label>
                {resumeUrl && uploadedFileName ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[#F77B0F]/30 bg-[#F77B0F]/5">
                    <svg className="w-5 h-5 text-[#F77B0F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 text-sm text-gray-700 dark:text-white/80 truncate">{uploadedFileName}</span>
                    <button onClick={() => { setResumeUrl(''); setUploadedFileName(''); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploading ? 'border-[#F77B0F]/40 bg-[#F77B0F]/5' : 'border-gray-200 dark:border-white/10 hover:border-[#F77B0F]/50 hover:bg-[#F77B0F]/5'}`}
                    >
                      {uploading ? (
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-300 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      )}
                      <p className="text-sm text-gray-500 dark:text-white/40 text-center">
                        {uploading ? 'Uploading to S3...' : <><span className="text-[#F77B0F] font-medium">Click to upload</span> your resume</>}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-white/25">PDF, DOC, DOCX · max 10MB</p>
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                    </div>
                    {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                    <p className="text-center text-[11px] text-gray-400 dark:text-white/25">— or paste a public link —</p>
                    <input type="url" className={inputCls} value={resumeUrl} onChange={(e) => { setResumeUrl(e.target.value); setUploadedFileName(''); }} placeholder="Google Drive, Dropbox, or any hosted URL" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>LinkedIn Profile <span className="normal-case font-normal">(optional)</span></label>
                  <input type="url" className={inputCls} value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
                </div>
                <div>
                  <label className={labelCls}>Portfolio / GitHub <span className="normal-case font-normal">(optional)</span></label>
                  <input type="url" className={inputCls} value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://github.com/yourhandle" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Current Salary <span className="normal-case font-normal">(optional)</span></label>
                  <input className={inputCls} value={currentSalary} onChange={(e) => setCurrentSalary(e.target.value)} placeholder="e.g. KES 80,000/mo" />
                </div>
                <div>
                  <label className={labelCls}>Salary Expectation</label>
                  <input className={inputCls} value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder="e.g. KES 120,000/mo" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Notice Period</label>
                  <select className={inputCls} value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)}>
                    <option value="">Select</option>
                    <option value="immediately">Available immediately</option>
                    <option value="1week">1 week</option>
                    <option value="2weeks">2 weeks</option>
                    <option value="1month">1 month</option>
                    <option value="2months">2 months</option>
                    <option value="3months">3 months</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Start Date Availability</label>
                  <input type="date" className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} value={availability} onChange={(e) => setAvailability(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Work Authorization</label>
                  <select className={inputCls} value={workAuth} onChange={(e) => setWorkAuth(e.target.value)}>
                    <option value="">Select</option>
                    <option value="citizen">Citizen / Permanent Resident</option>
                    <option value="work_permit">Valid Work Permit</option>
                    <option value="sponsorship">Require Sponsorship</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Open to Relocation?</label>
                  <select className={inputCls} value={relocation} onChange={(e) => setRelocation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="yes">Yes, fully open to relocation</option>
                    <option value="within_country">Within the country only</option>
                    <option value="no">No, prefer current location</option>
                    <option value="remote_only">Remote only</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Your Pitch ── */}
          {step === 3 && (
            <>
              <div>
                <label className={labelCls}>Why are you the right fit for this role? *</label>
                <textarea
                  value={whyRole}
                  onChange={(e) => setWhyRole(e.target.value)}
                  rows={5}
                  placeholder={`What specifically makes you a strong candidate for ${job.title} at ${job.company?.name ?? 'this company'}? Mention relevant experience, skills, and what excites you about this role.`}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">{whyRole.length} chars · Be specific — generic answers are filtered out</p>
              </div>
              <div>
                <label className={labelCls}>Key Achievement Relevant to This Role <span className="normal-case font-normal">(optional)</span></label>
                <textarea
                  value={keyAchievement}
                  onChange={(e) => setKeyAchievement(e.target.value)}
                  rows={3}
                  placeholder="Describe one quantifiable achievement: 'Reduced reporting time by 40% by automating financial models...'"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Cover Letter <span className="normal-case font-normal">(optional)</span></label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={7}
                  placeholder={`Dear Hiring Manager at ${job.company?.name ?? 'the company'},\n\nIntroduce yourself, walk through your background, and explain why you'd thrive in this team...`}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">{coverLetter.length} characters · Aim for 200–500 words</p>
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-white/6">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl border-2 border-[#F77B0F] text-[#F77B0F] text-sm font-semibold hover:bg-[#F77B0F]/5 transition-colors">
                Next — Documents →
              </button>
            </>
          ) : step === 2 ? (
            <>
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl border-2 border-[#F77B0F] text-[#F77B0F] text-sm font-semibold hover:bg-[#F77B0F]/5 transition-colors">
                Next — Your Pitch →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !whyRole.trim()}
                className="px-6 py-2.5 rounded-xl border-2 border-[#192C67] dark:border-white/20 text-[#192C67] dark:text-white text-sm font-semibold hover:bg-[#192C67]/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Submitting...
                  </span>
                ) : 'Submit Application'}
              </button>
            </>
          )}
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
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70"
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
          className="w-full mb-4 py-2.5 rounded-xl bg-[#192C67]/10 dark:bg-[#192C67]/20 border border-[#192C67]/20 dark:border-[#F77B0F]/50/30 text-[#192C67] dark:text-white/70 text-sm font-semibold hover:bg-[#192C67]/20 transition-colors flex items-center justify-center gap-2"
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job) =>
            appliedIds.has(job.id) ? (
              <div key={job.id} className="relative">
                <JobFeedCard job={job} onApply={setApplyJob} onSaveToggle={handleSaveToggle} savedIds={savedIds} />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60 rounded-2xl flex items-center justify-center">
                  <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#192C67]/10 dark:bg-white/10 text-[#192C67] dark:text-white text-sm font-semibold">
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
