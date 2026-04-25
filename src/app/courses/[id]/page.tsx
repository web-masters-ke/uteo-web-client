"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { coursesService } from "@/lib/services/courses";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import MilestoneEditor from "@/components/courses/MilestoneEditor";
import MyProgressPanel from "@/components/courses/MyProgressPanel";
import LessonAssessmentRunner from "@/components/courses/LessonAssessmentRunner";
import AssessmentBuilder from "@/components/courses/AssessmentBuilder";
import GradingInbox from "@/components/courses/GradingInbox";
import LessonEditor from "@/components/courses/LessonEditor";

const COURSE_THUMB_FALLBACKS = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Stars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${sz} ${
            i <= Math.round(rating)
              ? "text-[#F77B0F]"
              : "text-zinc-200 dark:text-zinc-700"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

type TabKey = "overview" | "lessons" | "grading" | "progress" | "inbox";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [gradeRefreshKey, setGradeRefreshKey] = useState(0);

  function handleQuizSubmitted(passed: boolean, score: number) {
    setGradeRefreshKey((k) => k + 1);
    // Refresh enrollment progress in sidebar after submission
    coursesService.myEnrolled().then((list: any) => {
      const items: any[] = Array.isArray(list) ? list : list?.items ?? list?.data ?? [];
      const mine = items.find((e: any) => e.courseId === id || e.course?.id === id);
      if (mine) setProgress(Number(mine.progress) || 0);
    }).catch(() => {});
    if (passed) {
      addToast("success", `Great job! Score: ${score}% — check My Progress for your updated grade.`);
    }
  }

  // Instructor course settings state (lazy-initialized from course data after load)
  const [courseSettings, setCourseSettings] = useState({
    aiDetection: true, readingMetrics: true, proctoring: false, accessType: 'LIFETIME',
  });
  const [courseCertConfig, setCourseCertConfig] = useState({
    autoIssue: true, minPassingGrade: 70, templateStyle: 'PROFESSIONAL',
    signatoryName: '', signatoryTitle: '', certNumberPrefix: 'CERT',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadCourse() {
    try {
      const data = await coursesService.getById(id);
      setCourse(data);
      // Backend findOne is @Public() — it doesn't include enrollment status.
      // Check via the authenticated my-enrolled endpoint when user is logged in.
      if (data.isEnrolled || data.enrollment) {
        setEnrolled(true);
        setProgress(data.enrollment?.progress ?? data.progress ?? 0);
      } else if (user) {
        try {
          const myList = await coursesService.myEnrolled();
          const items: any[] = Array.isArray(myList) ? myList : myList?.items ?? myList?.data ?? [];
          const mine = items.find((e: any) => e.courseId === id || e.course?.id === id);
          if (mine) {
            setEnrolled(true);
            setProgress(Number(mine.progress) || 0);
          }
        } catch { /* not enrolled or not logged in */ }
      }
      if (data.settings) {
        setCourseSettings((s) => ({ ...s, ...data.settings }));
      }
      if (data.certConfig) {
        setCourseCertConfig((s) => ({ ...s, ...data.certConfig }));
      }
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    setLoading(true);
    loadCourse().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey, user?.id]); // re-run when auth resolves so enrollment status is correct

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await coursesService.update(id, { settings: courseSettings, certConfig: courseCertConfig });
      addToast("success", "Course settings saved");
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setEnrolling(true);
    setError("");
    try {
      await coursesService.enroll(id);
      setEnrolled(true);
      setProgress(0);
      addToast("success", "Enrolled successfully!");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setEnrolled(true);
        addToast("info", "You're already enrolled in this course");
      } else {
        setError(
          err?.response?.data?.message || "Failed to enroll. Please try again."
        );
      }
    } finally {
      setEnrolling(false);
    }
  };

  const isInstructor = useMemo(() => {
    if (!course || !user) return false;
    const ids = [
      course.instructorId,
      course.trainerId,
      course.instructor?.id,
      course.trainer?.userId,
      course.trainer?.user?.id,
      course.trainer?.id,
    ].filter(Boolean);
    return ids.includes(user.id);
  }, [course, user]);

  if (loading) return <PageSkeleton />;

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Course Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This course may have been removed or is unavailable.
        </p>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#192C67] text-white rounded-lg hover:bg-[#192C67]/90 text-sm font-medium"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  const instructor =
    course.instructor || course.trainer?.user || course.trainer || {};
  const instructorName = `${instructor.firstName || "Unknown"} ${instructor.lastName || "Instructor"}`;
  const instructorAvatar = instructor.avatarUrl || instructor.avatar;
  const instructorInitials = `${(instructor.firstName || "U")[0]}${(instructor.lastName || "I")[0]}`.toUpperCase();
  const rawLessons: any[] = course.lessons || course.modules || [];
  const lessons = [...rawLessons].sort(
    (a, b) => (a.sortOrder ?? a.orderIndex ?? 0) - (b.sortOrder ?? b.orderIndex ?? 0)
  );

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "lessons", label: "Lessons", show: true },
    { key: "grading", label: "Grading", show: isInstructor },
    { key: "inbox", label: "Grading Inbox", show: isInstructor },
    { key: "progress", label: "My Progress", show: !!enrolled && !isInstructor },
  ];

  return (
    <>
      {/* Back */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-[#192C67] dark:text-[#5b8bc7] hover:underline font-medium mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course header */}
          <div>
            <div className="relative h-64 w-full rounded-xl overflow-hidden mb-6">
              <img
                src={
                  (course as any).thumbnail ||
                  course.thumbnailUrl ||
                  course.imageUrl ||
                  COURSE_THUMB_FALLBACKS[hashId(course.id) % COURSE_THUMB_FALLBACKS.length]
                }
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {course.level && (
                <span className="rounded-full bg-[#192C67]/10 px-3 py-1 text-xs font-bold uppercase text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]">
                  {course.level}
                </span>
              )}
              {course.category && (
                <span className="rounded-full bg-[#F77B0F]/10 px-3 py-1 text-xs font-medium text-[#F77B0F]">
                  {typeof course.category === "string"
                    ? course.category
                    : course.category?.name}
                </span>
              )}
              {isInstructor && (
                <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  INSTRUCTOR VIEW
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              {course.title}
            </h1>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Stars rating={Number(course.rating || 0)} />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {Number(course.rating || 0).toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400">
                  ({course.totalReviews || course.reviewCount || 0} reviews)
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {course.enrolledCount ?? course._count?.enrollments ?? course.enrollments ?? 0} enrolled
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs
                .filter((t) => t.show)
                .map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? "border-[#F77B0F] text-[#192C67] dark:text-[#5b8bc7]"
                        : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  About this course
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {course.description || "No description provided."}
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  About the Instructor
                </h2>
                <div className="flex items-start gap-4">
                  {instructorAvatar ? (
                    <img
                      src={instructorAvatar}
                      alt={instructorName}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#192C67]/10 text-sm font-bold text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]">
                      {instructorInitials}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/trainers/${course.trainerId || instructor.id || ""}`}
                      className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:text-[#192C67] dark:hover:text-[#5b8bc7] transition-colors"
                    >
                      {instructorName}
                    </Link>
                    {(instructor.specialization || instructor.title) && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {instructor.specialization || instructor.title}
                      </p>
                    )}
                    {(instructor.bio || course.instructorBio) && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                        {instructor.bio || course.instructorBio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "lessons" && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Lessons{" "}
                <span className="text-sm font-normal text-zinc-400">
                  ({lessons.length})
                </span>
              </h2>
              {lessons.length > 0 ? (
                <div className="space-y-2">
                  {lessons.map((lesson: any, idx: number) => {
                    const isFree =
                      lesson.isFree || lesson.isPreview || idx === 0;
                    const canView = enrolled || isInstructor || isFree;
                    return (
                      <details
                        key={lesson.id || idx}
                        id={`lesson-${lesson.id}`}
                        className="border border-zinc-200 dark:border-zinc-800 rounded-lg group"
                      >
                        <summary className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors list-none">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {lesson.title || `Lesson ${idx + 1}`}
                            </p>
                            {lesson.duration && (
                              <p className="text-xs text-zinc-400">
                                {lesson.duration} min
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                lesson.contentType === "VIDEO"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                  : lesson.contentType === "TEXT"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : lesson.contentType === "QUIZ"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {lesson.contentType || "CONTENT"}
                            </span>
                            {lesson.milestoneId && (
                              <span className="rounded-full bg-[#192C67]/10 text-[#192C67] dark:text-[#5b8bc7] px-2 py-0.5 text-[10px] font-medium">
                                MILESTONE
                              </span>
                            )}
                            {isFree && (
                              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                                Free
                              </span>
                            )}
                            {!canView && (
                              <svg
                                className="h-4 w-4 text-zinc-300 dark:text-zinc-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            )}
                            <svg
                              className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-180"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </summary>
                        <div className="px-4 pb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                          {canView ? (
                            <>
                              {lesson.description && (
                                <p className="text-xs text-zinc-500 mb-3">
                                  {lesson.description}
                                </p>
                              )}

                              {/* QUIZ lesson — show runner first, prominently */}
                              {lesson.contentType === "QUIZ" && !isInstructor && (
                                enrolled ? (
                                  <LessonAssessmentRunner lessonId={lesson.id} timeLimitMin={lesson.timeLimitMin ?? undefined} maxAttempts={lesson.maxAttempts ?? undefined} onSubmitted={handleQuizSubmitted} />
                                ) : (
                                  <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-center">
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Quiz locked</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Enroll in this course to take this quiz and get graded.</p>
                                  </div>
                                )
                              )}

                              {lesson.contentType === "VIDEO" && lesson.videoUrl && (
                                <div className="mb-3">
                                  <video
                                    controls
                                    className="w-full rounded-lg max-h-[400px] bg-black"
                                    src={lesson.videoUrl}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              )}
                              {lesson.contentType === "VIDEO" && !lesson.videoUrl && (
                                <p className="text-xs text-zinc-400 italic mb-3">
                                  Video not available yet.
                                </p>
                              )}
                              {lesson.contentType === "TEXT" &&
                                (lesson.textContent || lesson.content) && (
                                  <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                      {lesson.textContent || lesson.content}
                                    </p>
                                  </div>
                                )}

                              {/* Non-QUIZ lessons: assessment runner for enrolled learners */}
                              {lesson.contentType !== "QUIZ" && enrolled && !isInstructor && (
                                <LessonAssessmentRunner lessonId={lesson.id} timeLimitMin={lesson.timeLimitMin ?? undefined} maxAttempts={lesson.maxAttempts ?? undefined} onSubmitted={handleQuizSubmitted} />
                              )}

                              {/* Instructor lesson content editor + assessment builder */}
                              {isInstructor && (
                                <>
                                  <LessonEditor
                                    courseId={id}
                                    lesson={{
                                      id: lesson.id,
                                      title: lesson.title,
                                      contentType: lesson.contentType,
                                      videoUrl: lesson.videoUrl,
                                      textContent: lesson.textContent,
                                    }}
                                    onSaved={() => setRefreshKey((k) => k + 1)}
                                  />
                                  <AssessmentBuilder lessonId={lesson.id} />
                                </>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-zinc-400 text-center py-3">
                              Enroll to access this lesson.
                            </p>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-4">
                  No lessons published yet.
                </p>
              )}
            </div>
          )}

          {activeTab === "grading" && isInstructor && (
            <MilestoneEditor
              courseId={id}
              lessons={lessons.map((l: any) => ({
                id: l.id,
                title: l.title,
                milestoneId: l.milestoneId,
                sortOrder: l.sortOrder ?? l.orderIndex,
                contentType: l.contentType,
              }))}
              onLessonsChanged={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {activeTab === "inbox" && isInstructor && (
            <GradingInbox courseId={id} />
          )}

          {activeTab === "progress" && enrolled && !isInstructor && (
            <MyProgressPanel
              key={gradeRefreshKey}
              courseId={id}
              lessons={lessons.map((l: any) => ({
                id: l.id,
                title: l.title,
                milestoneId: l.milestoneId,
                sortOrder: l.sortOrder ?? l.orderIndex,
                completed: l.completed ?? l.isCompleted ?? false,
              }))}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
            <div className="text-center">
              <span className="text-3xl font-bold text-[#192C67] dark:text-[#F77B0F]">
                {course.price === 0 || course.isFree
                  ? "Free"
                  : formatCurrency(Number(course.price || 0))}
              </span>
            </div>

            {isInstructor ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#192C67]/5 dark:bg-[#192C67]/20 px-4 py-3 text-center text-xs text-[#192C67] dark:text-[#5b8bc7] font-medium">
                  INSTRUCTOR VIEW — use the Grading tab for milestones and the Grading Inbox for submissions.
                </div>

                {/* Course Settings */}
                <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100 flex items-center justify-between list-none hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span>Course Settings</span>
                    <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-zinc-200 dark:border-zinc-800">
                    {([
                      ['aiDetection', 'AI Detection'],
                      ['readingMetrics', 'Reading Metrics'],
                      ['proctoring', 'Proctoring'],
                    ] as [keyof typeof courseSettings, string][]).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs text-zinc-600 dark:text-zinc-300">{label}</span>
                        <div
                          className={`relative w-9 h-5 rounded-full transition-colors ${courseSettings[key] ? 'bg-[#F77B0F]' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                          onClick={() => setCourseSettings((s) => ({ ...s, [key]: !s[key] }))}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${courseSettings[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                      </label>
                    ))}
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Access Type</label>
                      <select
                        value={courseSettings.accessType}
                        onChange={(e) => setCourseSettings((s) => ({ ...s, accessType: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="LIFETIME">Lifetime</option>
                        <option value="30_DAYS">30 Days</option>
                        <option value="90_DAYS">90 Days</option>
                        <option value="1_YEAR">1 Year</option>
                      </select>
                    </div>
                  </div>
                </details>

                {/* Certificate Config */}
                <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100 flex items-center justify-between list-none hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span>Certificate Config</span>
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-zinc-200 dark:border-zinc-800">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">Auto-Issue Certificate</span>
                      <div
                        className={`relative w-9 h-5 rounded-full transition-colors ${courseCertConfig.autoIssue ? 'bg-[#F77B0F]' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                        onClick={() => setCourseCertConfig((s) => ({ ...s, autoIssue: !s.autoIssue }))}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${courseCertConfig.autoIssue ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Passing Grade (%)</label>
                      <input
                        type="number" min={0} max={100}
                        value={courseCertConfig.minPassingGrade}
                        onChange={(e) => setCourseCertConfig((s) => ({ ...s, minPassingGrade: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Signatory Name</label>
                      <input
                        type="text"
                        value={courseCertConfig.signatoryName}
                        onChange={(e) => setCourseCertConfig((s) => ({ ...s, signatoryName: e.target.value }))}
                        placeholder="e.g. Dr. Jane Smith"
                        className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Signatory Title</label>
                      <input
                        type="text"
                        value={courseCertConfig.signatoryTitle}
                        onChange={(e) => setCourseCertConfig((s) => ({ ...s, signatoryTitle: e.target.value }))}
                        placeholder="e.g. Head of Training"
                        className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Cert Number Prefix</label>
                      <input
                        type="text"
                        value={courseCertConfig.certNumberPrefix}
                        onChange={(e) => setCourseCertConfig((s) => ({ ...s, certNumberPrefix: e.target.value }))}
                        placeholder="e.g. CERT"
                        className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </div>
                </details>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full rounded-lg bg-[#192C67] py-2.5 text-sm font-semibold text-white hover:bg-[#192C67]/90 transition-colors disabled:opacity-50"
                >
                  {savingSettings ? "Saving…" : "Save Settings"}
                </button>
              </div>
            ) : enrolled ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#F77B0F] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <button
                  onClick={() => setActiveTab("lessons")}
                  className="mt-4 w-full rounded-lg bg-[#192C67] py-3 text-sm font-semibold text-white hover:bg-[#192C67]/90 transition-colors"
                >
                  Continue Learning
                </button>
              </div>
            ) : (
              <div>
                {error && (
                  <p className="text-xs text-red-500 mb-2 text-center">{error}</p>
                )}
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full rounded-lg bg-[#192C67] py-3 text-sm font-semibold text-white hover:bg-[#192C67]/90 transition-colors disabled:opacity-50"
                >
                  {enrolling ? "Enrolling..." : "Enroll Now"}
                </button>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 text-sm">
                <svg
                  className="h-4 w-4 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
                <span className="text-zinc-600 dark:text-zinc-300">
                  {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                </span>
              </div>
              {course.level && (
                <div className="flex items-center gap-3 text-sm">
                  <svg
                    className="h-4 w-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
                  </span>
                </div>
              )}
              {(course.enrolledCount != null || course._count?.enrollments != null || course.enrollments != null) && (
                <div className="flex items-center gap-3 text-sm">
                  <svg
                    className="h-4 w-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {course.enrolledCount ?? course._count?.enrollments ?? course.enrollments ?? 0} students
                  </span>
                </div>
              )}
              {course.duration && (
                <div className="flex items-center gap-3 text-sm">
                  <svg
                    className="h-4 w-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {course.duration}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
