'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import { api, unwrap } from '@/lib/api';
import type { Job } from '@/lib/uteo-types';
import { useAuth } from '@/lib/auth';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';
import SmartImg from '@/components/ui/SmartImg';

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

const inputCls = "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F77B0F]/30 focus:border-[#F77B0F] placeholder:text-gray-400 dark:placeholder:text-white/30 transition-all";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5";

/** Renders an error string that may carry an embedded ::link::href::label:: marker. */
function ErrorBlock({ raw }: { raw: string }) {
  const m = raw.match(/^(.*?)\s*::link::([^:]+)::([^:]+)::\s*$/);
  return (
    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">
      <span>{m ? m[1] : raw}</span>
      {m && (
        <a href={m[2]} className="ml-2 font-semibold underline decoration-dotted hover:text-red-700">
          {m[3]} →
        </a>
      )}
    </div>
  );
}

function ApplyModal({
  job,
  onClose,
  onSuccess,
}: {
  job: Job;
  onClose: () => void;
  onSuccess: () => void;
}) {
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

  const salary = ((job as any).showSalary === true) && job.salaryMin && job.salaryMax
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
      const status = e?.response?.status;
      const data = e?.response?.data;
      const errBlock = data?.error;
      const existingId: string | undefined =
        errBlock?.applicationId ?? errBlock?.message?.applicationId ?? data?.applicationId;
      const rawMsg = (typeof errBlock?.message === 'string' && errBlock.message)
        || (typeof errBlock?.message?.message === 'string' && errBlock.message.message)
        || data?.message
        || e?.message
        || 'Failed to submit application.';
      if (status === 409 && existingId) {
        setError(`${rawMsg} ::link::/applications/${existingId}::View your application::`);
      } else if (status === 409) {
        setError(`${rawMsg} ::link::/applications::Open My Applications::`);
      } else {
        setError(rawMsg);
      }
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
          <SmartImg
            src={job.company.logoUrl}
            alt={job.company.name}
            className="w-12 h-12 rounded-xl object-cover shrink-0"
            fallback={
              <div className="w-12 h-12 rounded-xl bg-[#192C67]/10 dark:bg-white/8 text-[#192C67] dark:text-white text-sm font-black flex items-center justify-center shrink-0">
                {job.company.name.slice(0, 2).toUpperCase()}
              </div>
            }
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{job.title}</p>
            <p className="text-xs text-gray-500 dark:text-white/50 truncate">
              {job.company.name}{job.location ? ` · ${job.location}` : ''}
            </p>
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
                  placeholder={`What specifically makes you a strong candidate for ${job.title} at ${job.company.name}? Mention relevant experience, skills, and what excites you about this role.`}
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
                  placeholder="Describe one quantifiable achievement: 'Reduced reporting time by 40% by automating financial models using Excel macros...'"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Cover Letter <span className="normal-case font-normal">(optional)</span></label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={7}
                  placeholder={`Dear Hiring Manager at ${job.company.name},\n\nIntroduce yourself, walk through your background, and explain why you'd thrive in this team...`}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">{coverLetter.length} characters · Aim for 200–500 words</p>
              </div>
              {error && <ErrorBlock raw={error} />}
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
  const [myCompanyIds, setMyCompanyIds] = useState<string[]>([]);

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

    // Fetch the recruiter's company memberships so any HR teammate at the
    // same company (not just the literal postedById) sees Edit / View
    // Applicants on this page.
    if (user) {
      import('@/lib/api').then(({ apiGet }) => {
        apiGet<any>('/companies/mine')
          .then((c) => {
            const cid = c?.id;
            if (cid) setMyCompanyIds([cid]);
          })
          .catch(() => null);
      });
    }
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
      <Link href="/jobs" className="text-[#192C67] dark:text-white/70 font-medium hover:underline">
        Browse all jobs
      </Link>
    </div>
  );

  const showSalary = (job as any).showSalary === true;
  const salary = showSalary ? formatSalary(job.salaryMin, job.salaryMax, job.currency) : null;
  const skills = job.jobSkills?.map((js) => js.skill) ?? [];

  const userRole = (user as any)?.role;
  const isRecruiterUser = userRole === 'TRAINER' || userRole === 'RECRUITER' || userRole === 'EMPLOYER';
  const isOwnJobTopLevel = isRecruiterUser && (
    (user as any)?.id === job.postedById || myCompanyIds.includes(job.company.id)
  );
  // Job seekers must not see description/requirements for non-ACTIVE jobs
  const showContent = (job.status as string) === 'ACTIVE' || isOwnJobTopLevel;

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
              <SmartImg
                src={job.company.logoUrl}
                alt={job.company.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                fallback={
                  <div className="w-16 h-16 rounded-xl bg-[#192C67] text-white text-lg font-black flex items-center justify-center flex-shrink-0">
                    {job.company.name.slice(0, 2).toUpperCase()}
                  </div>
                }
              />
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

          {/* Description / Requirements / Skills — hidden for job seekers on non-ACTIVE postings */}
          {showContent ? (
            <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Description</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          </div>

          {job.requirements && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">
                {job.requirements}
              </p>
            </div>
          )}
            </>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">This job posting is not currently active.</p>
            </div>
          )}

          {/* Skills */}
          {showContent && skills.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70"
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
          {(() => {
            const isOwnJob = isOwnJobTopLevel;
            const isRecruiter = isRecruiterUser;
            return (
          <div className="sticky top-24 space-y-4">
            {/* CTA card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              {isRecruiter ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#192C67] dark:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {isOwnJob ? 'Your job posting' : 'Posted by another company'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {isOwnJob ? 'View applications, edit details, or manage the hiring pipeline.' : 'Recruiters can view but not apply to other companies\' jobs.'}
                  </p>
                  {isOwnJob ? (
                    <>
                      <Link
                        href={`/recruiter/applications?jobId=${job.id}`}
                        className="block w-full py-3 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#14234f] transition-colors text-center mb-3"
                      >
                        View Applicants
                      </Link>
                      <Link
                        href={`/recruiter/jobs/${job.id}/edit`}
                        className="block w-full py-2.5 bg-[#F77B0F] text-white font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors text-center mb-3"
                      >
                        Edit this job
                      </Link>
                      <Link
                        href="/recruiter/jobs"
                        className="block w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center text-sm"
                      >
                        All my jobs
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/recruiter"
                      className="block w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center text-sm"
                    >
                      Back to Dashboard
                    </Link>
                  )}
                </div>
              ) : ((job.status as string) === 'CLOSED' || (job.status as string) === 'EXPIRED' || (job.status as string) === 'DRAFT') ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">No longer available</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    This role is no longer accepting applications. Check the feed for similar openings.
                  </p>
                  <Link
                    href="/feed"
                    className="block w-full py-2.5 border border-[#192C67] text-[#192C67] dark:text-white/70 dark:border-[#F77B0F]/50 font-semibold rounded-xl hover:bg-[#192C67]/5 transition-colors text-center text-sm"
                  >
                    Browse similar jobs
                  </Link>
                </div>
              ) : (job.status as string) === 'PAUSED' ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Applications paused</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    The recruiter has temporarily paused this posting. Save it and check back later.
                  </p>
                </div>
              ) : applied ? (
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
                    className="block w-full py-2.5 border border-[#192C67] text-[#192C67] dark:text-white/70 dark:border-[#F77B0F]/50 font-semibold rounded-xl hover:bg-[#192C67]/5 transition-colors text-center text-sm"
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
                <SmartImg
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="w-10 h-10 rounded-xl object-cover"
                  fallback={
                    <div className="w-10 h-10 rounded-xl bg-[#192C67] text-white text-xs font-black flex items-center justify-center">
                      {job.company.name.slice(0, 2).toUpperCase()}
                    </div>
                  }
                />
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
                    <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="text-[#192C67] dark:text-white/70 hover:underline">
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
            );
          })()}
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
