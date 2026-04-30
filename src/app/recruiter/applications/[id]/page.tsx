'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { applicationsService } from '@/lib/services/applications';
import { offersService } from '@/lib/services/offers';
import type { Application, ApplicationStatus } from '@/lib/uteo-types';

const STATUS_FLOW: ApplicationStatus[] = ['SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED'];
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  REVIEWED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  SHORTLISTED: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  INTERVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  HIRED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  WITHDRAWN: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RecruiterApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const isRecruiter = (user as any)?.role === 'TRAINER';

  const [app, setApp] = useState<Application | null>(null);
  const [offer, setOffer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await applicationsService.get(id);
      setApp(a as any);
      // try fetching the offer (404 if none)
      try {
        const offers = await offersService.list({ applicationId: id });
        setOffer(offers?.items?.[0] ?? null);
      } catch { setOffer(null); }
    } catch {
      addToast('error', 'Could not load application');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/applications/' + id);
  }, [authLoading, isAuthenticated, isRecruiter, router, id]);

  useEffect(() => { if (isAuthenticated && isRecruiter) load(); }, [isAuthenticated, isRecruiter, load]);

  async function setStatus(next: ApplicationStatus) {
    if (!app) return;
    setUpdating(true);
    try {
      await applicationsService.updateStatus(app.id, next);
      addToast('success', `Status updated to ${next}`);
      load();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message ?? 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  if (loading || !app) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse mb-4" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const candidate = (app as any).user || {};
  const job = (app as any).job || {};
  const candidateName = `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || candidate.email || 'Candidate';
  const initials = candidateName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const currentStatusIdx = STATUS_FLOW.indexOf(app.status as any);
  const isFinal = (app.status as string) === 'HIRED' || (app.status as string) === 'REJECTED' || (app.status as string) === 'WITHDRAWN';

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/recruiter/applications" className="hover:text-gray-900 dark:hover:text-white">Applications</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{candidateName}</span>
      </div>

      {/* Candidate header */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
        <div className="flex items-start gap-5">
          {candidate.avatar ? (
            <img src={candidate.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#192C67] text-white text-lg font-black flex items-center justify-center">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{candidateName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Applied for{' '}
              <Link href={`/jobs/${job.id}`} className="font-semibold text-gray-700 dark:text-gray-200 hover:text-[#F77B0F]">
                {job.title}
              </Link>
              {' · '}
              {fmtDate(app.appliedAt)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status] ?? STATUS_COLORS.SUBMITTED}`}>
                {app.status}
              </span>
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  ✉ {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                  📞 {candidate.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Status pipeline */}
        <div className="mt-7 grid grid-cols-5 gap-1.5 lg:gap-2">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="text-center">
              <div className={`h-1.5 rounded-full ${i <= currentStatusIdx ? 'bg-[#F77B0F]' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${i <= currentStatusIdx ? 'text-[#F77B0F]' : 'text-gray-400'}`}>{s}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {!isFinal && (
          <div className="mt-6 flex flex-wrap gap-2">
            {currentStatusIdx < 1 && (
              <button onClick={() => setStatus('REVIEWED')} disabled={updating}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                Mark as Reviewed
              </button>
            )}
            {currentStatusIdx < 2 && (
              <button onClick={() => setStatus('SHORTLISTED')} disabled={updating}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                Shortlist
              </button>
            )}
            {currentStatusIdx < 3 && (
              <button onClick={() => setStatus('INTERVIEW')} disabled={updating}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                Schedule Interview
              </button>
            )}
            {currentStatusIdx < 4 && (
              <button onClick={() => setStatus('HIRED')} disabled={updating}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                Hire
              </button>
            )}
            <button onClick={() => setStatus('REJECTED')} disabled={updating}
              className="ml-auto px-4 py-2 text-sm font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50">
              Reject
            </button>
          </div>
        )}

        {isFinal && app.status === 'HIRED' && (
          <div className="mt-6 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">🎉 {candidateName} is hired</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                  {offer ? `Offer status: ${offer.status}` : 'No offer letter created yet.'}
                </p>
              </div>
              {offer ? (
                <Link href={`/offers/${offer.id}`} className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  View offer →
                </Link>
              ) : (
                <Link href={`/recruiter/applications/${app.id}/offer`} className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  Create offer letter →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cover letter */}
      {app.coverLetter && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Cover letter</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{app.coverLetter}</p>
        </div>
      )}

      {/* Resume */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Resume / CV</h2>
        {app.resumeUrl ? (
          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F77B0F]/40 text-[#F77B0F] hover:bg-[#F77B0F]/10 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Open resume
          </a>
        ) : (
          <p className="text-sm text-gray-400">Candidate did not attach a resume.</p>
        )}
      </div>

      {/* Notes */}
      {(app as any).notes && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Internal notes</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{(app as any).notes}</p>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/recruiter/applications" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          ← Back to applications
        </Link>
        <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-[#F77B0F] hover:underline">
          View job posting →
        </Link>
      </div>
    </div>
  );
}
