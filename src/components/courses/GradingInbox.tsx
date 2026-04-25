"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { courseGradingService } from "@/lib/services/courseGrading";
import type { LessonSubmission } from "@/lib/types";

interface Props {
  courseId: string;
}

interface GradeDraft {
  score: number;
  passed: boolean;
  feedback: string;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function GradingInbox({ courseId }: Props) {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState<LessonSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<LessonSubmission | null>(null);
  const [draft, setDraft] = useState<GradeDraft>({ score: 0, passed: false, feedback: "" });
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await courseGradingService.listPendingSubmissions(courseId);
      const arr = Array.isArray(data) ? data : ((data as any)?.items ?? []);
      setSubmissions(arr);
      setUnavailable(false);
    } catch (e: any) {
      // If the endpoint isn't implemented yet, hide the inbox gracefully.
      if (e?.response?.status === 404) {
        setUnavailable(true);
      } else {
        addToast("error", e?.response?.data?.message || "Failed to load pending submissions");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (courseId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function openGrade(s: LessonSubmission) {
    setActive(s);
    setDraft({
      score: s.score || 0,
      passed: s.passed || false,
      feedback: s.feedback || "",
    });
  }

  async function submitGrade() {
    if (!active) return;
    if (draft.score < 0 || draft.score > 100) {
      addToast("warning", "Score must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await courseGradingService.gradeSubmission(active.id, {
        score: Number(draft.score),
        passed: !!draft.passed,
        feedback: draft.feedback.trim() || undefined,
      });
      addToast("success", "Submission graded");
      setActive(null);
      load();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to grade submission");
    } finally {
      setSaving(false);
    }
  }

  if (unavailable) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Grading Inbox</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Text and file submissions awaiting manual grading.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-zinc-400">Loading…</div>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
          Nothing to grade. You are all caught up.
        </p>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => {
            const learnerName = s.user
              ? `${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim() || "Learner"
              : "Learner";
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {s.lesson?.title || "Lesson submission"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {learnerName} · Submitted {formatDate(s.submittedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 text-[10px] font-semibold">
                  PENDING
                </span>
                <button
                  onClick={() => openGrade(s)}
                  className="rounded-md bg-[#192C67] text-white text-xs font-semibold px-3 py-1.5 hover:bg-[#192C67]/90"
                >
                  Grade
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!active}
        onClose={() => setActive(null)}
        title="Grade Submission"
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {active.lesson?.title || "Lesson"} ·{" "}
                {active.user
                  ? `${active.user.firstName ?? ""} ${active.user.lastName ?? ""}`.trim()
                  : ""}
              </p>
              <p className="text-xs text-zinc-400">Submitted {formatDate(active.submittedAt)}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Answers</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(active.answers || {}).map(([qid, ans]) => (
                  <div
                    key={qid}
                    className="px-3 py-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  >
                    <p className="text-[11px] text-zinc-400 mb-1">Question {qid.slice(0, 8)}</p>
                    {typeof ans === "string" &&
                    /^https?:\/\//.test(ans) ? (
                      <a
                        href={ans}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#192C67] dark:text-[#5b8bc7] underline break-all"
                      >
                        {ans}
                      </a>
                    ) : (
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
                        {Array.isArray(ans) ? ans.join(", ") : String(ans)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Score (0–100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.score}
                  onChange={(e) => setDraft({ ...draft, score: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Outcome
                </label>
                <div className="flex items-center gap-2 h-[38px]">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      checked={draft.passed === true}
                      onChange={() => setDraft({ ...draft, passed: true })}
                      className="accent-green-600"
                    />
                    <span className="text-green-700 dark:text-green-400 font-medium">Pass</span>
                  </label>
                  <label className="flex items-center gap-1 text-sm ml-4">
                    <input
                      type="radio"
                      checked={draft.passed === false}
                      onChange={() => setDraft({ ...draft, passed: false })}
                      className="accent-red-600"
                    />
                    <span className="text-red-700 dark:text-red-400 font-medium">Fail</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Feedback (optional)
              </label>
              <textarea
                rows={3}
                value={draft.feedback}
                onChange={(e) => setDraft({ ...draft, feedback: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActive(null)}
                className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={submitGrade}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#192C67] hover:bg-[#192C67]/90 rounded-md disabled:opacity-50"
              >
                {saving ? "Saving…" : "Submit Grade"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
