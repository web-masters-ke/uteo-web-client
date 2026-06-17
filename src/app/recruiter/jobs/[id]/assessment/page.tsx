'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { assessmentsService, type AssessmentQuestion } from '@/lib/services/assessments';

const blankQuestion = (): AssessmentQuestion => ({
  type: 'MCQ',
  prompt: '',
  options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
  correct: [],
  points: 1,
});

export default function AssessmentBuilderPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState('Screening Assessment');
  const [instructions, setInstructions] = useState('');
  const [passThreshold, setPassThreshold] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace(`/login?redirect=/recruiter/jobs/${jobId}/assessment`);
  }, [authLoading, isAuthenticated, jobId, router]);

  useEffect(() => {
    assessmentsService
      .getForJob(jobId)
      .then((a) => {
        if (a) {
          setTitle(a.title);
          setInstructions(a.instructions ?? '');
          setPassThreshold(a.passThreshold);
          setIsActive(a.isActive);
          setQuestions(a.questions ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  async function generate() {
    setDrafting(true);
    setError(null);
    try {
      const { questions: drafted } = await assessmentsService.draft(jobId, 6);
      setQuestions((prev) => [...prev, ...drafted]);
    } catch (e: any) {
      setError(e?.message ?? 'AI draft failed.');
    } finally {
      setDrafting(false);
    }
  }

  async function importPasted() {
    if (!importText.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const { questions: imported } = await assessmentsService.importQuestions(jobId, importText);
      if (imported?.length) {
        setQuestions((prev) => [...prev, ...imported]);
        setImportText('');
        setShowImport(false);
      } else {
        setError('Could not read any questions from that text. Try clearer phrasing.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function updateQ(i: number, patch: Partial<AssessmentQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function removeQ(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Strip empty questions / options
      const clean = questions
        .filter((q) => q.prompt.trim())
        .map((q, i) => ({
          ...q,
          order: i,
          options: q.type === 'FREE_TEXT' ? [] : (q.options ?? []).filter((o) => o.text.trim()),
          correct: q.type === 'FREE_TEXT' ? [] : (q.correct ?? []),
        }));
      await assessmentsService.upsert(jobId, { title, instructions, passThreshold, isActive, questions: clean });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Screening Assessment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Applicants get emailed a link to take this. Those who meet the pass mark advance automatically; the rest are flagged for your review.
          </p>
        </div>
        <Link href={`/recruiter/jobs/${jobId}/edit`} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Job</Link>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Instructions (optional)</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
        </div>
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pass mark (%)</label>
            <input type="number" min={1} max={100} value={passThreshold}
              onChange={(e) => setPassThreshold(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
              className="w-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
          </div>
          <label className="flex items-center gap-2 mt-5 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#F77B0F] h-4 w-4" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active — send to new applicants</span>
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">Questions ({questions.length})</h2>
        <div className="flex gap-2">
          <button onClick={generate} disabled={drafting}
            className="text-sm px-3 py-1.5 rounded-lg border border-[#F77B0F] text-[#F77B0F] hover:bg-[#F77B0F]/5 disabled:opacity-50">
            {drafting ? 'Generating…' : '✨ Draft with AI'}
          </button>
          <button onClick={() => setShowImport((s) => !s)}
            className="text-sm px-3 py-1.5 rounded-lg border border-[#F77B0F] text-[#F77B0F] hover:bg-[#F77B0F]/5">
            ⬆ Paste questions
          </button>
          <button onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300">
            + Add
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#F77B0F]/30 p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Paste your questions (one per line, or numbered). The AI fills in the options, marks the correct
            answer, and writes a grading rubric for open-ended ones — so the system can mark them. You can edit
            everything afterwards.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            placeholder={"e.g.\n1. What does REST stand for?\n2. Describe a time you handled an angry customer.\n3. True or false: Node.js is single-threaded."}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]"
          />
          <div className="flex items-center gap-2">
            <button onClick={importPasted} disabled={importing || !importText.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-[#F77B0F] text-white font-medium hover:bg-[#e06d00] disabled:opacity-50">
              {importing ? 'Generating answers…' : 'Generate answers & add'}
            </button>
            <button onClick={() => { setShowImport(false); setImportText(''); }}
              className="text-sm px-3 py-2 rounded-lg text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[#F77B0F] font-semibold">{i + 1}.</span>
              <select value={q.type} onChange={(e) => updateQ(i, { type: e.target.value as any })}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-300">
                <option value="MCQ">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="FREE_TEXT">Free text (AI-graded)</option>
              </select>
              <input type="number" min={1} max={20} value={q.points ?? 1} onChange={(e) => updateQ(i, { points: Number(e.target.value) || 1 })}
                title="Points" className="w-16 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-300" />
              <span className="text-xs text-gray-400">pts</span>
              <button onClick={() => removeQ(i)} className="ml-auto text-xs text-red-500 hover:underline">Remove</button>
            </div>

            <textarea value={q.prompt} onChange={(e) => updateQ(i, { prompt: e.target.value })} rows={2} placeholder="Question prompt…"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />

            {q.type === 'FREE_TEXT' ? (
              <textarea value={q.rubric ?? ''} onChange={(e) => updateQ(i, { rubric: e.target.value })} rows={2}
                placeholder="Grading rubric for the AI — what does a full-mark answer contain?"
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:border-[#F77B0F]" />
            ) : (
              <div className="space-y-2">
                {(q.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${i}`} checked={(q.correct ?? []).includes(opt.id)}
                      onChange={() => updateQ(i, { correct: [opt.id] })} className="accent-[#F77B0F]" title="Mark correct" />
                    <input value={opt.text}
                      onChange={(e) => updateQ(i, { options: (q.options ?? []).map((o, x) => x === oi ? { ...o, text: e.target.value } : o) })}
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F]" />
                    <button onClick={() => updateQ(i, { options: (q.options ?? []).filter((_, x) => x !== oi) })} className="text-gray-400 hover:text-red-500 text-sm">×</button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const next = String.fromCharCode(97 + (q.options?.length ?? 0));
                    updateQ(i, { options: [...(q.options ?? []), { id: next, text: '' }] });
                  }}
                  className="text-xs text-[#F77B0F] hover:underline">+ Add option</button>
                <p className="text-xs text-gray-400">Select the radio next to the correct option.</p>
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            No questions yet. Draft with AI or add one manually.
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 sticky bottom-4">
        <button onClick={save} disabled={saving}
          className="bg-[#F77B0F] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#e06d00] disabled:opacity-50 shadow-lg">
          {saving ? 'Saving…' : 'Save assessment'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        {isActive && questions.length === 0 && <span className="text-sm text-amber-600">Add at least one question before it sends.</span>}
      </div>
    </div>
  );
}
