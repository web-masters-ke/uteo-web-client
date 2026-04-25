"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/lib/toast";
import { formatDate, formatRelative } from "@/lib/utils";
import { coursesService } from "@/lib/services/courses";
import {
  transcriptService,
  type Transcript,
  type TranscriptCourse,
  type SessionRecording,
} from "@/lib/services/transcript";

const UNSPLASH_FALLBACKS = [
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
];

function getThumb(c: any, idx: number): string {
  return (
    c?.thumbnail ||
    c?.thumbnailUrl ||
    c?.course?.thumbnail ||
    c?.course?.thumbnailUrl ||
    UNSPLASH_FALLBACKS[idx % UNSPLASH_FALLBACKS.length]
  );
}

export default function MyLearningPage() {
  const { addToast } = useToast();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, enrolled, rec] = await Promise.all([
        transcriptService.getMine().catch(() => null),
        coursesService.myEnrolled().catch(() => null),
        transcriptService.getRecordings(1, 5).catch(() => null),
      ]);

      if (t) setTranscript(t);

      const enrolledItems = Array.isArray(enrolled)
        ? enrolled
        : enrolled?.items ?? enrolled?.data ?? [];
      setEnrollments(enrolledItems || []);

      setRecordings(rec?.items ?? []);
    } catch (e: any) {
      addToast(
        "error",
        e?.response?.data?.message || "Failed to load your learning dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Derive in-progress and completed from transcript + enrollments
  const byCourseId = new Map<string, TranscriptCourse>();
  (transcript?.courses || []).forEach((c) => byCourseId.set(c.courseId, c));

  type InProgress = {
    enrollmentId: string;
    courseId: string;
    title: string;
    thumb: string;
    progress: number; // 0-100
    instructorName?: string;
    category?: string;
  };

  const inProgress: InProgress[] = [];
  const completed: {
    courseId: string;
    title: string;
    thumb: string;
    letterGrade?: string | null;
    certificateId?: string | null;
    category?: string;
  }[] = [];

  // Pick from transcript first (has grade + cert data)
  (transcript?.courses || []).forEach((c, idx) => {
    const total = c.milestoneCount || 0;
    const done = c.passedMilestones || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isCompleted = !!c.completedAt || (total > 0 && done >= total);
    // Match a matching enrollment for a thumbnail
    const enr = enrollments.find(
      (e: any) =>
        e?.courseId === c.courseId ||
        e?.course?.id === c.courseId ||
        e?.id === c.enrollmentId,
    );
    const thumb = getThumb(enr?.course || enr || {}, idx);
    if (isCompleted) {
      completed.push({
        courseId: c.courseId,
        title: c.title,
        thumb,
        letterGrade: c.letterGrade,
        certificateId: c.certificateId,
        category: c.category,
      });
    } else {
      inProgress.push({
        enrollmentId: c.enrollmentId,
        courseId: c.courseId,
        title: c.title,
        thumb,
        progress: pct,
        instructorName: c.instructorName,
        category: c.category,
      });
    }
  });

  // Fallback: if transcript empty, derive in-progress from enrollments alone
  if (inProgress.length === 0 && (transcript?.courses || []).length === 0) {
    enrollments.forEach((e: any, idx: number) => {
      const course = e?.course || e;
      if (!course?.id) return;
      const pct = Math.round(Number(e?.progress ?? course?.progress ?? 0));
      const completedFlag = e?.completedAt || e?.isCompleted;
      const entry = {
        enrollmentId: e?.id || `${course.id}-enr`,
        courseId: course.id,
        title: course.title || "Untitled course",
        thumb: getThumb(course, idx),
        progress: Math.max(0, Math.min(100, pct)),
        instructorName: course?.instructor
          ? `${course.instructor.firstName ?? ""} ${course.instructor.lastName ?? ""}`.trim()
          : undefined,
        category:
          typeof course.category === "string"
            ? course.category
            : course.category?.name,
      };
      if (completedFlag) {
        completed.push({
          courseId: course.id,
          title: entry.title,
          thumb: entry.thumb,
          category: entry.category,
        });
      } else {
        inProgress.push(entry);
      }
    });
  }

  const summary = transcript?.summary || {
    totalCoursesEnrolled: enrollments.length,
    totalCoursesCompleted: completed.length,
    totalCertificates: completed.filter((c) => c.certificateId).length,
    cgpa: 0,
  };

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[32vh] flex items-end pb-10 overflow-hidden -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-8">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=4096&q=100"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-3">
            Keep going
          </p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">My Learning</h1>
          <p className="mt-3 text-base lg:text-lg text-white/80 max-w-2xl">
            Pick up where you left off, celebrate what you&apos;ve earned, and revisit past
            sessions.
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            <HeroStat label="Enrolled" value={summary.totalCoursesEnrolled} />
            <HeroStat label="Completed" value={summary.totalCoursesCompleted} />
            <HeroStat label="Certificates" value={summary.totalCertificates} />
            <HeroStat label="CGPA" value={(summary.cgpa ?? 0).toFixed(2)} />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* IN PROGRESS */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  In Progress
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pick up where you left off
                </p>
              </div>
              <Link
                href="/courses?tab=enrolled"
                className="text-xs font-semibold uppercase tracking-wider text-[#192C67] dark:text-white/70 hover:underline"
              >
                View all
              </Link>
            </div>

            {inProgress.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  You don&apos;t have any active courses yet.
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F77B0F] text-white font-semibold rounded-lg hover:bg-[#e26a00] text-sm transition-colors"
                >
                  Browse courses
                </Link>
              </div>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
                {inProgress.map((c) => (
                  <div
                    key={c.enrollmentId}
                    className="shrink-0 w-[320px] snap-start bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={c.thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {c.category && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-[10px] font-bold uppercase tracking-wider text-[#192C67] dark:text-white">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 min-h-[3rem]">
                        {c.title}
                      </h3>
                      {c.instructorName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          by {c.instructorName}
                        </p>
                      )}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Progress
                          </span>
                          <span className="text-[11px] font-bold text-[#192C67] dark:text-white/70">
                            {c.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#F77B0F] rounded-full transition-all"
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        href={`/courses/${c.courseId}`}
                        className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-white bg-[#F77B0F] rounded-lg py-2.5 hover:bg-[#e26a00] transition-colors"
                      >
                        Continue Learning
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* COMPLETED */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Completed
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Courses you&apos;ve finished
                </p>
              </div>
              <Link
                href="/certificates"
                className="text-xs font-semibold uppercase tracking-wider text-[#192C67] dark:text-white/70 hover:underline"
              >
                All certificates
              </Link>
            </div>

            {completed.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No completed courses yet. Finish a course to earn your first certificate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map((c) => (
                  <div
                    key={c.courseId}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={c.thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-emerald-500/30" />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase">
                        Completed
                      </span>
                      {c.letterGrade && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-white/95 text-[#192C67] text-xs font-black">
                          {c.letterGrade}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 min-h-[3rem]">
                        {c.title}
                      </h3>
                      {c.category && (
                        <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">
                          {c.category}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        {c.certificateId ? (
                          <Link
                            href={`/certificates/${c.certificateId}`}
                            className="flex-1 text-center text-sm font-bold text-[#192C67] dark:text-white border-2 border-[#192C67] dark:border-white/30 rounded-lg py-2 hover:bg-[#192C67] hover:text-white transition-colors"
                          >
                            View Certificate
                          </Link>
                        ) : (
                          <span className="flex-1 text-center text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg py-2">
                            Certificate pending
                          </span>
                        )}
                        <Link
                          href={`/courses/${c.courseId}`}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold"
                        >
                          Revisit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RECORDINGS */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Session Recordings
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Rewatch your last 5 sessions
                </p>
              </div>
            </div>

            {recordings.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No session recordings yet. Recordings appear here after your live sessions.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {recordings.slice(0, 5).map((r) => {
                  const title =
                    r.title || r.sessionTitle || r.courseTitle || "Session recording";
                  const when = r.recordedAt || r.endedAt || r.createdAt || r.startedAt;
                  return (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      <div className="h-11 w-11 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/30 flex items-center justify-center text-[#192C67] dark:text-white/70 shrink-0">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {when ? formatRelative(when) : "Recorded session"}
                          {r.courseTitle && r.courseTitle !== title && (
                            <> &middot; {r.courseTitle}</>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#192C67] dark:text-white/70 group-hover:underline shrink-0">
                        Play
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          {/* ACADEMIC RECORD CTA */}
          <section className="bg-gradient-to-br from-[#192C67] to-[#0D1942] rounded-xl p-8 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60 mb-2">
                  Your academic record
                </p>
                <h3 className="text-2xl font-black">Full transcript, all courses, all grades</h3>
                <p className="mt-2 text-sm text-white/70 max-w-xl">
                  See your complete academic record on Uteo — grades, milestones, CGPA,
                  and every certificate in one place. Print-ready for employers.
                </p>
              </div>
              <Link
                href="/transcript"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F77B0F] text-white font-bold rounded-full hover:bg-[#e26a00] shrink-0 text-sm uppercase tracking-wider"
              >
                Open Transcript
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
