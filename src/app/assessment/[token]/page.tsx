'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { assessmentsService, type TakeAssessment, type SubmitAnswer } from '@/lib/services/assessments';

export default function AssessmentTakePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TakeAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { optionIds?: string[]; text?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean | null; needsManual: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    assessmentsService
      .take(token)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message ?? 'This assessment link is invalid or has expired.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Single-select for MCQ/true-false; multi-select toggle for MULTI.
  const setOption = (qid: string, optId: string, multi = false) =>
    setAnswers((a) => {
      if (!multi) return { ...a, [qid]: { optionIds: [optId] } };
      const cur = a[qid]?.optionIds ?? [];
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
      return { ...a, [qid]: { optionIds: next } };
    });
  const setText = (qid: string, text: string) =>
    setAnswers((a) => ({ ...a, [qid]: { text } }));

  const isAnswered = (q: { id: string; type: string }) => {
    const ans = answers[q.id];
    return q.type === 'FREE_TEXT' ? !!ans?.text?.trim() : !!ans?.optionIds?.length;
  };
  const answeredCount = data?.questions.filter(isAnswered).length ?? 0;
  const allAnswered = !!data && data.questions.every(isAnswered);

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: SubmitAnswer[] = data.questions.map((q) => ({ questionId: q.id, ...answers[q.id] }));
      const res = await assessmentsService.submit(token, payload);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assessment unavailable</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
          <Link href="/" className="mt-4 inline-block text-[#F77B0F] font-medium hover:underline">Go to Uteo</Link>
        </div>
      </div>
    );
  }

  if (result) {
    const passed = result.passed;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl ${passed === true ? 'bg-green-100 text-green-600' : passed === false ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
            {passed === true ? '✓' : passed === false ? '•' : '…'}
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Assessment submitted</h1>
          {typeof result.score === 'number' && (
            <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">
              {result.score}%
              <span className={`block text-sm font-semibold mt-1 ${passed === true ? 'text-green-600' : passed === false ? 'text-amber-600' : 'text-blue-600'}`}>
                {passed === true ? 'Passed' : passed === false ? 'Below the pass mark' : 'Received — pending review'}
              </span>
            </p>
          )}
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            {passed === true
              ? 'Thanks — you’ve advanced to the next stage. The hiring team will be in touch.'
              : passed === false
                ? 'Thanks for completing the assessment. The hiring team will review your application and follow up.'
                : 'Thanks — your responses have been received and will be reviewed by the hiring team.'}
          </p>
          <Link href="/applications" className="mt-5 inline-block bg-[#F77B0F] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#e06d00]">
            View my applications
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F77B0F]">{data.companyName}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assessment for {data.jobTitle}</p>
          {data.instructions && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{data.instructions}</p>}
          {data.timeLimitMins ? (
            <p className="mt-3 text-xs text-gray-400">Suggested time: {data.timeLimitMins} minutes</p>
          ) : null}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {data.questions.map((q, idx) => (
            <div key={q.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <p className="font-medium text-gray-900 dark:text-white">
                <span className="text-[#F77B0F] mr-2">{idx + 1}.</span>{q.prompt}
                <span className="ml-2 text-xs text-gray-400">({q.points} pt{q.points !== 1 ? 's' : ''})</span>
              </p>

              {q.type === 'FREE_TEXT' ? (
                <textarea
                  value={answers[q.id]?.text ?? ''}
                  onChange={(e) => setText(q.id, e.target.value)}
                  rows={5}
                  placeholder="Type your answer…"
                  className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]"
                />
              ) : (
                <div className="mt-3 space-y-2">
                  {q.type === 'MULTI' && <p className="text-xs text-gray-400 mb-1">Select all that apply</p>}
                  {(q.options ?? []).map((opt) => {
                    const isMulti = q.type === 'MULTI';
                    const selected = answers[q.id]?.optionIds?.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOption(q.id, opt.id, isMulti)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          selected
                            ? 'border-[#F77B0F] bg-[#F77B0F]/5 text-gray-900 dark:text-white'
                            : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#F77B0F]/50'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 border mr-3 align-middle ${isMulti ? 'rounded' : 'rounded-full'} ${selected ? 'border-[#F77B0F] bg-[#F77B0F]' : 'border-gray-300'}`} />
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Sticky submit bar — always visible so candidates can't miss it */}
        <div className="sticky bottom-4 mt-6 z-10">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg p-3">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
              {answeredCount} of {data.questions.length} answered
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !allAnswered}
              className="w-full bg-[#F77B0F] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e06d00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : allAnswered ? '✓ Submit assessment' : `Answer all ${data.questions.length} questions to submit`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
