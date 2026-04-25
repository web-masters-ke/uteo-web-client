"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { courseGradingService } from "@/lib/services/courseGrading";
import type { MyGradeResponse } from "@/lib/types";

interface Props {
  courseId: string;
  lessons: Array<{ id: string; title: string; milestoneId?: string | null; sortOrder?: number; completed?: boolean }>;
}

export default function MyProgressPanel({ courseId, lessons }: Props) {
  const [grade, setGrade] = useState<MyGradeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    courseGradingService
      .myGrade(courseId)
      .then(setGrade)
      .catch((e: any) => setError(e?.response?.data?.message || "Failed to load grade"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const nextUncompleted =
    lessons.find((l) => !l.completed) || lessons[0];

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-sm text-zinc-400">
        Loading your progress…
      </div>
    );
  }

  if (error || !grade) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          {error || "No grade information available."}
        </p>
      </div>
    );
  }

  const finalGrade = Math.round(grade.finalGrade || 0);
  const passed = grade.allMilestonesPassed;

  return (
    <div className="space-y-4">
      {/* Final Grade Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
              Current Grade
            </p>
            <div className="flex items-end gap-3">
              <span
                className={`text-5xl font-bold ${
                  passed
                    ? "text-green-600 dark:text-green-400"
                    : finalGrade > 0
                    ? "text-[#F77B0F]"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {finalGrade}
              </span>
              <span className="text-lg text-zinc-400 mb-1">/ 100</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  passed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${passed ? "bg-green-500" : "bg-zinc-400"}`} />
                {passed ? "Passed" : "In Progress"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {grade.milestoneCount} milestone{grade.milestoneCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {nextUncompleted && (
            <Link
              href={`#lesson-${nextUncompleted.id}`}
              className="rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192C67]/90 transition-colors"
            >
              Continue Learning
            </Link>
          )}
        </div>
      </div>

      {/* Per-milestone progress */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Milestone Progress
        </h3>
        {grade.milestones.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            This course does not have any milestones yet.
          </p>
        ) : (
          <div className="space-y-4">
            {grade.milestones.map((m) => {
              const passing = m.passingScore ?? 70;
              const best = Math.round(m.bestScore || 0);
              const pct = Math.max(0, Math.min(100, best));
              const status = m.passed ? "PASSED" : best > 0 ? "FAILED" : "PENDING";
              const statusClass =
                status === "PASSED"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : status === "FAILED"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
              return (
                <div key={m.milestoneId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {m.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {best} / {passing}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        m.passed ? "bg-green-500" : best > 0 ? "bg-[#F77B0F]" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* Passing-score marker */}
                    <div
                      className="absolute top-0 h-full w-px bg-zinc-400 dark:bg-zinc-500"
                      style={{ left: `${Math.max(0, Math.min(100, passing))}%` }}
                      title={`Passing: ${passing}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
