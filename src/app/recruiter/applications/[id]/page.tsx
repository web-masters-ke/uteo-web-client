'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { applicationsService } from '@/lib/services/applications';
import { offersService } from '@/lib/services/offers';
import { assessmentsService, type AssessmentResult } from '@/lib/services/assessments';
import { openSignedFile } from '@/lib/s3-url';
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

// Shows the candidate's recorded assessment responses + grading, with a manual
// score override for the recruiter.
function AssessmentResultSection({ applicationId }: { applicationId: string }) {
  const { addToast } = useToast();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreInput, setScoreInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await assessmentsService.result(applicationId);
      setResult(r);
      if (r?.score != null) setScoreInput(String(r.score));
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !result) return null; // no assessment taken → nothing to show

  async function saveScore() {
    const score = Number(scoreInput);
    if (!Number.isFinite(score) || score < 0 || score > 100) { addToast('error', 'Score must be 0–100'); return; }
    setSaving(true);
    try {
      const res = await assessmentsService.overrideScore(applicationId, score);
      setResult((r) => (r ? { ...r, score: res.score, passed: res.passed } : r));
      addToast('success', `Score updated to ${res.score}% (${res.passed ? 'pass' : 'fail'})`);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message ?? 'Could not update score');
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assessment responses</h2>
        <div className="flex items-center gap-3">
          {result.score != null && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${result.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'}`}>
              {result.score}% · {result.passed ? 'Pass' : 'Below'} (mark {result.passThreshold}%)
            </span>
          )}
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={100} value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
              className="w-16 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white" />
            <button onClick={saveScore} disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#F77B0F] text-[#F77B0F] hover:bg-[#F77B0F]/5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Override'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {result.questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{i + 1}. {q.prompt}</p>
              {q.isCorrect === true && <span className="text-xs text-emerald-600 shrink-0">✓ Correct</span>}
              {q.isCorrect === false && <span className="text-xs text-red-500 shrink-0">✗ Incorrect</span>}
              {q.isCorrect === null && <span className="text-xs text-gray-400 shrink-0">AI-graded</span>}
            </div>
            {q.type === 'FREE_TEXT' ? (
              <div className="mt-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{q.response.text || <span className="italic text-gray-400">No answer</span>}</p>
                {q.aiFeedback && <p className="mt-1 text-xs text-gray-500 italic">AI: {q.aiFeedback.feedback} ({q.aiFeedback.points}/{q.points})</p>}
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {(q.options ?? []).map((opt) => {
                  const chosen = q.response.optionIds.includes(opt.id);
                  const isAnswer = q.correct.includes(opt.id);
                  return (
                    <div key={opt.id} className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${chosen ? 'bg-[#F77B0F]/10' : ''}`}>
                      <span className={`text-xs ${isAnswer ? 'text-emerald-600' : 'text-gray-300'}`}>{isAnswer ? '✓' : '○'}</span>
                      <span className={`${chosen ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{opt.text}</span>
                      {chosen && <span className="text-[10px] text-[#F77B0F] ml-auto">their answer</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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
          <button
            type="button"
            onClick={async () => {
              const ok = await openSignedFile(app.resumeUrl!);
              if (!ok) addToast('error', 'Could not open resume');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F77B0F]/40 text-[#F77B0F] hover:bg-[#F77B0F]/10 transition-colors text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Open resume
          </button>
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

      {/* Assessment responses + score override */}
      <AssessmentResultSection applicationId={id} />

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
