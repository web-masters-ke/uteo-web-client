'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { jobsService } from '@/lib/services/jobs';
import { apiGet } from '@/lib/api';

interface MyJob {
  id: string;
  title: string;
  status: string;
  jobType?: string | null;
  location?: string | null;
  createdAt: string;
  _count?: { applications: number };
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  PAUSED:  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  CLOSED:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  DRAFT:   'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
};

// ─── Simple CSV parser (handles quoted fields) ─────────────────────────────────

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

const CSV_HEADERS = [
  'title', 'jobtype', 'location', 'description', 'requirements',
  'salarymin', 'salarymax', 'currency', 'vacancies', 'expiresat', 'skills',
];

const CSV_TEMPLATE = [
  CSV_HEADERS.join(','),
  '"Senior Frontend Engineer","FULL_TIME","Nairobi, Kenya","We are looking for an experienced frontend engineer to join our team.","3+ years React|TypeScript required",150000,250000,"KES",2,"2026-12-31","JavaScript|React|TypeScript|Next.js"',
].join('\n');

function csvRowToJob(headers: string[], row: string[], companyId: string): Record<string, any> | null {
  const get = (k: string) => row[headers.indexOf(k)]?.trim() ?? '';
  const title = get('title');
  const description = get('description');
  if (!title || !description) return null;

  const skillNames = get('skills').split('|').map((s) => s.trim()).filter(Boolean);

  return {
    companyId,
    title,
    description,
    requirements: get('requirements') || undefined,
    jobType: get('jobtype') || 'FULL_TIME',
    location: get('location') || undefined,
    salaryMin: get('salarymin') ? Number(get('salarymin')) : undefined,
    salaryMax: get('salarymax') ? Number(get('salarymax')) : undefined,
    currency: get('currency') || 'KES',
    vacancies: get('vacancies') ? Number(get('vacancies')) : undefined,
    expiresAt: get('expiresat') || undefined,
    skillNames,
    status: 'DRAFT',
  };
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({
  onClose,
  onDone,
  companyId,
}: {
  onClose: () => void;
  onDone: () => void;
  companyId: string;
}) {
  const { addToast } = useToast();
  const [preview, setPreview] = useState<ReturnType<typeof csvRowToJob>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);
      const missing = CSV_HEADERS.filter((h) => !['skills', 'requirements', 'salarymin', 'salarymax', 'currency', 'vacancies', 'expiresat'].includes(h) && !headers.includes(h));
      if (missing.length > 0) {
        setParseError(`Missing required columns: ${missing.join(', ')}`);
        setPreview([]);
        return;
      }
      const jobs = rows
        .map((row) => csvRowToJob(headers, row, companyId))
        .filter(Boolean);
      if (jobs.length === 0) {
        setParseError('No valid rows found. Check that title and description are filled.');
        return;
      }
      setPreview(jobs as any);
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  async function submit() {
    if (!preview.length) return;
    setUploading(true);
    try {
      const res = await jobsService.bulkCreate(preview as any);
      addToast('success', `${(res as any)?.created ?? preview.length} job${preview.length === 1 ? '' : 's'} created as drafts`);
      onDone();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'uteo-jobs-template.csv';
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bulk Upload Jobs</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How it works</p>
            <p>Upload a CSV with one job per row. All jobs are created as <strong>Drafts</strong> — review and publish from My Jobs.</p>
            <button onClick={downloadTemplate} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV template
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select CSV file</label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-[#F77B0F] transition-colors bg-gray-50 dark:bg-gray-700/50">
              <svg className="w-7 h-7 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">{fileName || 'Click to select .csv file'}</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {parseError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">
              {parseError}
            </p>
          )}

          {preview.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{preview.length} job{preview.length === 1 ? '' : 's'} ready to import</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-56 overflow-y-auto">
                  {preview.map((j, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{(j as any).title}</p>
                        <p className="text-xs text-gray-400">{(j as any).jobType?.replace(/_/g, ' ')} {(j as any).location ? `· ${(j as any).location}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={uploading || preview.length === 0}
            className="px-5 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[#e06a0d]"
          >
            {uploading ? 'Importing…' : `Import ${preview.length || ''} job${preview.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function RecruiterMyJobsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClosing, setBulkClosing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/jobs'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [authLoading, isAuthenticated, isRecruiter, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.mine();
      setJobs((data as any)?.items ?? []);
    } catch {
      addToast('error', 'Could not load your jobs');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated && isRecruiter) {
      load();
      // Fetch company ID for bulk upload
      apiGet<any>('/companies/mine').then((c) => {
        if (c?.id) setCompanyId(c.id);
      }).catch(() => {});
    }
  }, [isAuthenticated, isRecruiter, load]);

  async function pauseOrResume(id: string, currentStatus: string) {
    const next = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setBusyId(id);
    try {
      await jobsService.update(id, { status: next });
      addToast('success', next === 'ACTIVE' ? 'Job resumed' : 'Job paused');
      load();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to update job');
    } finally {
      setBusyId(null);
    }
  }

  async function closeJob(job: MyJob) {
    if (!window.confirm(`Close "${job.title}"? It will stop accepting new applications.`)) return;
    setBusyId(job.id);
    try {
      await jobsService.remove(job.id);
      addToast('success', 'Job closed');
      load();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to close job');
    } finally {
      setBusyId(null);
    }
  }

  async function bulkClose() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Close ${ids.length} selected job${ids.length === 1 ? '' : 's'}? They will stop accepting new applications.`)) return;
    setBulkClosing(true);
    try {
      const res = await jobsService.bulkClose(ids);
      const r = res as any;
      addToast('success', `${r?.closed ?? ids.length} job${ids.length === 1 ? '' : 's'} closed`);
      setSelected(new Set());
      load();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Bulk close failed');
    } finally {
      setBulkClosing(false);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  const filteredJobs = statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter);
  const visibleIds = new Set(filteredJobs.filter((j) => j.status !== 'CLOSED').map((j) => j.id));
  const selectableFiltered = filteredJobs.filter((j) => j.status !== 'CLOSED');
  const allSelected = selectableFiltered.length > 0 && selectableFiltered.every((j) => selected.has(j.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableFiltered.forEach((j) => next.delete(j.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableFiltered.forEach((j) => next.add(j.id));
        return next;
      });
    }
  }

  const selectedInView = [...selected].filter((id) => visibleIds.has(id)).length;

  return (
    <>
      {showUpload && companyId && (
        <UploadModal
          companyId={companyId}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); load(); }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Job Posts</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {loading ? 'Loading…' : `${jobs.length} post${jobs.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:border-[#F77B0F] hover:text-[#F77B0F]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Bulk Upload
            </button>
            <Link
              href="/post-job"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Job
            </Link>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedInView > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#192C67]/5 dark:bg-[#192C67]/20 border border-[#192C67]/20 dark:border-[#192C67]/30">
            <span className="text-sm font-semibold text-[#192C67] dark:text-white/80">
              {selectedInView} selected
            </span>
            <button
              onClick={bulkClose}
              disabled={bulkClosing}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {bulkClosing ? 'Closing…' : 'Close selected'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
        )}

        {/* Status filter tabs */}
        {jobs.length > 0 && (() => {
          const counts: Record<string, number> = { ALL: jobs.length };
          for (const j of jobs) counts[j.status] = (counts[j.status] || 0) + 1;
          const tabs = [
            { v: 'ALL',     label: 'All' },
            { v: 'ACTIVE',  label: 'Active' },
            { v: 'PAUSED',  label: 'Paused' },
            { v: 'DRAFT',   label: 'Drafts' },
            { v: 'CLOSED',  label: 'Closed' },
            { v: 'EXPIRED', label: 'Expired' },
          ];
          return (
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => {
                const n = counts[t.v] ?? 0;
                if (t.v !== 'ALL' && n === 0) return null;
                const sel = statusFilter === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => setStatusFilter(t.v)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      sel
                        ? 'bg-[#F77B0F] text-white border-[#F77B0F]'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#F77B0F] hover:text-[#F77B0F]'
                    }`}
                  >
                    {t.label} · {n}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {!loading && jobs.length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">You haven't posted any jobs yet.</p>
            <Link href="/post-job" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold">
              Post your first job
            </Link>
          </div>
        )}

        {jobs.length > 0 && (
          filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No jobs in this status. Switch tabs above.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
              {/* Select-all header — only if there are selectable rows */}
              {selectableFiltered.length > 0 && (
                <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded text-[#192C67] border-gray-300 focus:ring-[#192C67]"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Select all</span>
                </div>
              )}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredJobs.map((j) => {
                  const canSelect = j.status !== 'CLOSED';
                  const isSelected = selected.has(j.id);
                  return (
                    <div key={j.id} className={`p-5 flex items-start gap-4 ${isSelected ? 'bg-[#192C67]/3 dark:bg-[#192C67]/10' : ''}`}>
                      <div className="flex-shrink-0 pt-0.5">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(j.id)}
                            className="w-4 h-4 rounded text-[#192C67] border-gray-300 focus:ring-[#192C67]"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            <Link href={`/jobs/${j.id}`} className="hover:underline">{j.title}</Link>
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {j.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {j.jobType?.replace(/_/g, ' ')}{j.location ? ` · ${j.location}` : ''} · Posted {new Date(j.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Link href={`/recruiter/applications?jobId=${j.id}`} className="text-[#F77B0F] hover:underline">
                            {j._count?.applications ?? 0} application{(j._count?.applications ?? 0) === 1 ? '' : 's'}
                          </Link>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/recruiter/jobs/${j.id}/edit`}
                          className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#F77B0F]"
                        >
                          Edit
                        </Link>
                        {j.status !== 'CLOSED' && (
                          <button
                            type="button"
                            onClick={() => pauseOrResume(j.id, j.status)}
                            disabled={busyId === j.id}
                            className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 disabled:opacity-50"
                          >
                            {j.status === 'PAUSED' ? 'Resume' : 'Pause'}
                          </button>
                        )}
                        {j.status !== 'CLOSED' && (
                          <button
                            type="button"
                            onClick={() => closeJob(j)}
                            disabled={busyId === j.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
