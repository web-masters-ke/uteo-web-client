"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { courseGradingService } from "@/lib/services/courseGrading";
import { useToast } from "@/lib/toast";
import type { LessonAssessment, LessonSubmission } from "@/lib/types";

interface Props {
  lessonId: string;
  allowRetry?: boolean;
  timeLimitMin?: number;
  maxAttempts?: number;
  onSubmitted?: (passed: boolean, score: number) => void;
}

type Answer = string | string[];
type View = "taking" | "result" | "review";

function isCorrect(assessment: LessonAssessment, answer: Answer): boolean {
  if (!assessment.correctAnswer) return false;
  const correct = assessment.correctAnswer;
  if (Array.isArray(correct) && Array.isArray(answer)) {
    return [...correct].sort().join(",") === [...answer].sort().join(",");
  }
  const a = Array.isArray(answer) ? answer[0] : answer;
  const c = Array.isArray(correct) ? correct[0] : correct;
  return String(a).trim().toLowerCase() === String(c).trim().toLowerCase();
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LessonAssessmentRunner({
  lessonId,
  allowRetry = true,
  timeLimitMin,
  maxAttempts,
  onSubmitted,
}: Props) {
  const { addToast } = useToast();
  const [assessments, setAssessments] = useState<LessonAssessment[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<View>("taking");
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [priorSub, setPriorSub] = useState<LessonSubmission | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, Answer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    try {
      const [items, prior] = await Promise.all([
        courseGradingService.listAssessments(lessonId),
        courseGradingService.listMySubmissions(lessonId).catch(() => [] as LessonSubmission[]),
      ]);
      const arr = Array.isArray(items) ? items : ((items as any)?.items ?? []);
      arr.sort((a: LessonAssessment, b: LessonAssessment) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setAssessments(arr);
      const priorArr = Array.isArray(prior) ? prior : ((prior as any)?.items ?? []);
      setAttemptCount(priorArr.length);
      if (priorArr.length > 0) {
        const best = priorArr.reduce((b: LessonSubmission, s: LessonSubmission) =>
          s.score > b.score ? s : b
        );
        setPriorSub(best);
        setScore(best.score);
        setPassed(best.passed);
        setReviewAnswers(best.answers || {});
        setView("result");
      } else {
        setView("taking");
        if (timeLimitMin && timeLimitMin > 0) {
          setTimeLeft(timeLimitMin * 60);
        }
      }
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (lessonId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Timer
  useEffect(() => {
    if (view === "taking" && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, timeLeft !== null]);

  function setMC(id: string, opt: string) {
    setAnswers((a) => ({ ...a, [id]: opt }));
  }

  function toggleCheck(id: string, opt: string) {
    setAnswers((a) => {
      const cur = (a[id] as string[] | undefined) || [];
      return { ...a, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });
  }

  function setText(id: string, val: string) {
    setAnswers((a) => ({ ...a, [id]: val }));
  }

  async function handleFileUpload(id: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/media/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const url = (res.data as any)?.data?.url || (res.data as any)?.url || "";
      if (url) {
        setAnswers((a) => ({ ...a, [id]: url }));
        addToast("success", "File uploaded");
      }
    } catch { addToast("error", "Upload failed"); }
  }

  async function handleSubmit(autoSubmit = false) {
    if (!autoSubmit) {
      for (const a of assessments) {
        const v = answers[a.id];
        const empty = v == null || (Array.isArray(v) && v.length === 0) || (typeof v === "string" && v.trim() === "");
        if (empty && a.type !== "FILE_UPLOAD") {
          addToast("warning", "Please answer every question before submitting");
          return;
        }
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const resp = await courseGradingService.submitLesson(lessonId, { answers });
      setScore(resp.score);
      setPassed(resp.passed);
      setReviewAnswers({ ...answers });
      setAttemptCount((c) => c + 1);
      setView("result");
      onSubmitted?.(resp.passed, resp.score);
      addToast(resp.passed ? "success" : "info", resp.passed ? `Passed! Score: ${resp.score}%` : `Score: ${resp.score}% — keep practising!`);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function startRetake() {
    setAnswers({});
    setReviewAnswers({});
    setPriorSub(null);
    setView("taking");
    if (timeLimitMin && timeLimitMin > 0) setTimeLeft(timeLimitMin * 60);
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-zinc-400">Loading assessment…</div>;
  }

  if (assessments.length === 0) return null;

  const totalPoints = assessments.reduce((s, a) => s + (a.points ?? 10), 0);
  const correctCount = view !== "taking"
    ? assessments.filter((a) => reviewAnswers[a.id] != null && isCorrect(a, reviewAnswers[a.id])).length
    : 0;

  /* ─── REVIEW VIEW ─────────────────────────────────────────────────────── */
  if (view === "review") {
    return (
      <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Answer Review</h4>
          <button onClick={() => setView("result")} className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ← Back to results
          </button>
        </div>
        <div className="px-5 py-4 space-y-5 bg-white dark:bg-zinc-900">
          {assessments.map((q, idx) => {
            const userAns = reviewAnswers[q.id];
            const correct = isCorrect(q, userAns ?? "");
            const hasAnswer = userAns != null && (Array.isArray(userAns) ? userAns.length > 0 : userAns.trim() !== "");
            const correctAns = q.correctAnswer;

            return (
              <div key={q.id} className={`rounded-lg border p-4 ${hasAnswer && correct ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : hasAnswer ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-zinc-200 dark:border-zinc-700"}`}>
                <div className="flex items-start gap-2 mb-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasAnswer && correct ? "bg-green-500 text-white" : hasAnswer ? "bg-red-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"}`}>
                    {hasAnswer ? (correct ? "✓" : "✗") : "–"}
                  </span>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 flex-1">Q{idx + 1}. {q.question}</p>
                  <span className="text-[11px] text-zinc-400 shrink-0">{q.points ?? 10} pts</span>
                </div>

                {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
                  <div className="space-y-1.5 pl-8">
                    {(q.options || []).map((opt, oi) => {
                      const isUserChoice = Array.isArray(userAns) ? userAns.includes(opt) : userAns === opt;
                      const isCorrectOpt = Array.isArray(correctAns) ? correctAns.includes(opt) : correctAns === opt;
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            isCorrectOpt
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium"
                              : isUserChoice
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${isCorrectOpt ? "border-green-500 bg-green-500 text-white" : isUserChoice ? "border-red-400 bg-red-100 text-red-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          {isCorrectOpt && <span className="ml-auto text-green-600 dark:text-green-400 text-xs font-semibold">Correct</span>}
                          {isUserChoice && !isCorrectOpt && <span className="ml-auto text-red-500 text-xs">Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "TEXT" && (
                  <div className="pl-8 space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Your answer:</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-md px-3 py-2">{userAns as string || "—"}</p>
                    {correctAns && (
                      <>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Model answer:</p>
                        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2">{Array.isArray(correctAns) ? correctAns.join(", ") : correctAns}</p>
                      </>
                    )}
                  </div>
                )}

                {(q as any).explanation && (
                  <p className="mt-3 pl-8 text-xs text-[#192C67] dark:text-[#5b8bc7] italic">
                    💡 {(q as any).explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── RESULT VIEW ─────────────────────────────────────────────────────── */
  if (view === "result") {
    return (
      <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-5 bg-white dark:bg-zinc-900 text-center space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${passed ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
            {passed ? "✓ PASSED" : "✗ FAILED"}
          </div>
          <div>
            <span className={`text-5xl font-black ${passed ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{Math.round(score)}</span>
            <span className="text-2xl text-zinc-400 font-light">%</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{correctCount} / {assessments.length} correct</span>
            <span>·</span>
            <span>{totalPoints} pts total</span>
            {priorSub?.gradedAt ? (
              <><span>·</span><span className="text-green-600 dark:text-green-400">Graded</span></>
            ) : priorSub && (
              <><span>·</span><span className="text-amber-500">Awaiting manual grading</span></>
            )}
          </div>
          {priorSub?.feedback && (
            <div className="mt-2 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-left">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Instructor feedback</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{priorSub.feedback}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setView("review")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-[#192C67] text-white hover:bg-[#192C67]/90 transition-colors"
          >
            📋 Review Answers
          </button>
          {allowRetry && (
            maxAttempts && attemptCount >= maxAttempts ? (
              <span className="text-xs text-zinc-400 italic">Max {maxAttempts} attempt{maxAttempts !== 1 ? "s" : ""} reached</span>
            ) : (
              <button
                onClick={startRetake}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Retake Quiz {maxAttempts ? `(${attemptCount}/${maxAttempts})` : ""}
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  /* ─── TAKING VIEW ─────────────────────────────────────────────────────── */
  const answered = assessments.filter((a) => {
    const v = answers[a.id];
    return v != null && (Array.isArray(v) ? v.length > 0 : v.trim() !== "");
  }).length;

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Quiz · {assessments.length} question{assessments.length !== 1 ? "s" : ""}
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">{answered} of {assessments.length} answered</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${timeLeft <= 60 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"}`}>
            ⏱ {fmtTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full bg-[#F77B0F] transition-all duration-300"
          style={{ width: `${assessments.length > 0 ? (answered / assessments.length) * 100 : 0}%` }}
        />
      </div>

      {/* Questions */}
      <div className="px-5 py-5 space-y-6 bg-white dark:bg-zinc-900">
        {assessments.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/20 text-[#192C67] dark:text-[#5b8bc7] text-xs font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 flex-1">{q.question}</p>
              <span className="shrink-0 text-[11px] text-zinc-400">{q.points ?? 10} pts</span>
            </div>

            {q.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2 pl-8">
                {(q.options || []).map((opt, oi) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setMC(q.id, opt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${
                        selected
                          ? "border-[#192C67] bg-[#192C67]/5 dark:bg-[#192C67]/20 text-[#192C67] dark:text-[#5b8bc7] font-medium"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "border-[#192C67] bg-[#192C67]" : "border-zinc-300 dark:border-zinc-600"}`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "CHECKBOX" && (
              <div className="space-y-2 pl-8">
                {(q.options || []).map((opt, oi) => {
                  const cur = (answers[q.id] as string[] | undefined) || [];
                  const checked = cur.includes(opt);
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => toggleCheck(q.id, opt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${
                        checked
                          ? "border-[#F77B0F] bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10 text-zinc-900 dark:text-zinc-50 font-medium"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? "border-[#F77B0F] bg-[#F77B0F]" : "border-zinc-300 dark:border-zinc-600"}`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                    </button>
                  );
                })}
                <p className="text-[10px] text-zinc-400 pl-2">Select all that apply</p>
              </div>
            )}

            {q.type === "TEXT" && (
              <textarea
                rows={4}
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setText(q.id, e.target.value)}
                placeholder="Type your answer here…"
                className="ml-8 w-[calc(100%-2rem)] px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 focus:border-[#192C67] dark:focus:border-[#5b8bc7] focus:outline-none resize-none transition-colors"
              />
            )}

            {q.type === "FILE_UPLOAD" && (
              <div className="ml-8">
                <div
                  onClick={() => fileInputs.current[q.id]?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(q.id, f); }}
                  className="cursor-pointer border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl px-6 py-8 text-center hover:border-[#F77B0F] transition-colors"
                >
                  {answers[q.id] ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ File uploaded</p>
                      <a href={answers[q.id] as string} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-[#192C67] dark:text-[#5b8bc7] underline break-all">{answers[q.id] as string}</a>
                      <p className="text-[11px] text-zinc-400 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Click or drop file here</p>
                      <p className="text-[11px] text-zinc-400">PDF, DOCX, images · max 10MB</p>
                    </div>
                  )}
                  <input ref={(el) => { fileInputs.current[q.id] = el; }} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(q.id, f); }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">{answered} of {assessments.length} answered</p>
        <button
          disabled={submitting}
          onClick={() => handleSubmit(false)}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-[#192C67] hover:bg-[#192C67]/90 rounded-xl disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting…" : "Submit Quiz"}
        </button>
      </div>
    </div>
  );
}
