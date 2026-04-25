"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { coursesService } from "@/lib/services/courses";
import { categoryService } from "@/lib/services/categories";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import CourseBuilder from "@/components/CourseBuilder";

// ─── Constants ──────────────────────────────────────────────────────────────

const UNSPLASH_FALLBACKS = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
];

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"];
const CONTENT_TYPES = ["VIDEO", "TEXT", "QUIZ", "ASSIGNMENT"];

const LEVEL_BADGE: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INTERMEDIATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADVANCED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ALL_LEVELS: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const CONTENT_TYPE_BADGE: Record<string, string> = {
  VIDEO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  TEXT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  QUIZ: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ASSIGNMENT: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

type TabKey = "all" | "created" | "enrolled" | "create" | "analytics";

const ic = "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]/30";

// ─── Stars ──────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`${s} ${i <= Math.round(rating) ? "text-[#F77B0F]" : "text-gray-200 dark:text-gray-700"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Inline lesson types ────────────────────────────────────────────────────

type InlineQuestion = { question: string; type: string; options: string[]; correctAnswer: string; explanation: string; points: number };
type InlineLesson = {
  _key: string; title: string; description: string; contentType: string;
  duration: number; sortOrder: number; isFree: boolean; content: string; videoUrl: string;
  timeLimitMin: number; maxAttempts: number;
  _questions: InlineQuestion[];
};

function emptyLesson(sortOrder: number): InlineLesson {
  return { _key: `l-${Date.now()}-${Math.random()}`, title: "", description: "", contentType: "VIDEO", duration: 30, sortOrder, isFree: false, content: "", videoUrl: "", timeLimitMin: 0, maxAttempts: 0, _questions: [] };
}
function emptyQuestion(): InlineQuestion {
  return { question: "", type: "MCQ", options: ["", "", "", ""], correctAnswer: "", explanation: "", points: 1 };
}

// ─── Rich Text Content Renderer ─────────────────────────────────────────────
// Parses lesson content to render images, PDFs, docs inline

function LessonContent({ content }: { content: string }) {
  if (!content) return null;
  // Split content into blocks separated by URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlPattern);
  return (
    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
      {parts.map((part, i) => {
        if (part.match(/^https?:\/\//)) {
          const lower = part.toLowerCase();
          const cleanUrl = part.replace(/[.,;)\]]+$/, ""); // strip trailing punctuation
          // Image
          if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(cleanUrl)) {
            return <img key={i} src={cleanUrl} alt="" className="max-w-full rounded-lg border border-gray-200 dark:border-gray-700" />;
          }
          // PDF — embed with iframe
          if (/\.pdf(\?|$)/i.test(cleanUrl)) {
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                  <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-700 dark:text-red-300 hover:underline flex-1 truncate">{cleanUrl.split("/").pop()}</a>
                  <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-red-700 dark:text-red-300 px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200">Open</a>
                </div>
                <iframe src={cleanUrl} className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700" title="PDF preview" />
              </div>
            );
          }
          // Office docs — use Office Online viewer or offer download
          if (/\.(doc|docx|ppt|pptx|xls|xlsx)(\?|$)/i.test(cleanUrl)) {
            const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;
            const ext = cleanUrl.match(/\.(doc|docx|ppt|pptx|xls|xlsx)(\?|$)/i)?.[1]?.toLowerCase() || "doc";
            const colors: Record<string, string> = { doc: "blue", docx: "blue", ppt: "orange", pptx: "orange", xls: "green", xlsx: "green" };
            const color = colors[ext] || "blue";
            return (
              <div key={i} className="space-y-2">
                <div className={`flex items-center gap-2 p-3 bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-lg`}>
                  <svg className={`w-6 h-6 text-${color}-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                  <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className={`text-sm text-${color}-700 dark:text-${color}-300 hover:underline flex-1 truncate`}>{cleanUrl.split("/").pop()}</a>
                  <span className={`text-[10px] font-bold uppercase text-${color}-700 dark:text-${color}-300`}>{ext}</span>
                  <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className={`text-xs font-medium text-${color}-700 dark:text-${color}-300 px-2 py-1 rounded bg-${color}-100 dark:bg-${color}-900/50 hover:bg-${color}-200`}>Download</a>
                </div>
                <iframe src={officeViewer} className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700" title="Document preview" />
              </div>
            );
          }
          // Generic link
          return <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-[#192C67] dark:text-white/70 hover:underline break-all">{cleanUrl}</a>;
        }
        // Plain text
        if (!part.trim()) return null;
        return <p key={i} className="whitespace-pre-wrap leading-relaxed">{part}</p>;
      })}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isTrainer = user?.role === "TRAINER";

  const initialTab = (searchParams.get("tab") as TabKey) || "all";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "all") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  // My Created + Enrolled state
  const [myCreated, setMyCreated] = useState<any[]>([]);
  const [myEnrolled, setMyEnrolled] = useState<any[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [managingCourseId, setManagingCourseId] = useState<string | null>(null);

  // ── Shared data ──
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"popular" | "newest" | "highest_rated" | "price_asc" | "price_desc">("popular");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(100000);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // ── Categories ──
  const [categories, setCategories] = useState<any[]>([]);

  // ── Action state ──
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Detail modal ──
  const [detailCourse, setDetailCourse] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Lesson questions (lazy-loaded in detail modal) ──
  const [lessonQuestions, setLessonQuestions] = useState<Record<string, any[]>>({});
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);

  // ── Edit Lesson ──
  const [editingLesson, setEditingLesson] = useState<{ courseId: string; lesson: any } | null>(null);
  const [editLessonForm, setEditLessonForm] = useState<{ title: string; description: string; contentType: string; duration: number; sortOrder: number; isFree: boolean; content: string; videoUrl: string; timeLimitMin: number; maxAttempts: number; _questions: InlineQuestion[] }>({ title: "", description: "", contentType: "VIDEO", duration: 30, sortOrder: 1, isFree: false, content: "", videoUrl: "", timeLimitMin: 0, maxAttempts: 0, _questions: [] });
  const [savingLesson, setSavingLesson] = useState(false);
  const [loadingEditQuestions, setLoadingEditQuestions] = useState(false);
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);

  // ── Add Lesson to existing course ──
  const [addingLessonForCourse, setAddingLessonForCourse] = useState<string | null>(null);
  const [addLessonForm, setAddLessonForm] = useState<{ title: string; description: string; contentType: string; duration: number; sortOrder: number; isFree: boolean; content: string; videoUrl: string; timeLimitMin: number; maxAttempts: number; _questions: InlineQuestion[] }>({ title: "", description: "", contentType: "VIDEO", duration: 30, sortOrder: 1, isFree: false, content: "", videoUrl: "", timeLimitMin: 0, maxAttempts: 0, _questions: [] });
  const [addLessonSaving, setAddLessonSaving] = useState(false);
  const [addLessonUploading, setAddLessonUploading] = useState(false);

  // ── Create tab state ──
  const [createForm, setCreateForm] = useState({ title: "", description: "", category: "", level: "BEGINNER", price: 0, tags: "" });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [lessons, setLessons] = useState<InlineLesson[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch categories once
  useEffect(() => { categoryService.getAll().then(setCategories).catch(() => {}); }, []);

  // ── Fetch courses ──
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await coursesService.list({
        page, limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || (isTrainer ? "ALL" : undefined),
        category: categoryFilter || undefined,
        level: levelFilter || undefined,
      } as any);
      const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setCourses(items);
      setTotalPages(data?.totalPages || 1);
      setTotal(data?.total || items.length);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, categoryFilter, levelFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ── Client-side sort + price filter ──
  const sortedFilteredCourses = useCallback(() => {
    let result = courses.filter((c) => {
      const p = Number(c.price) || 0;
      return p >= priceMin && p <= priceMax;
    });
    switch (sortOrder) {
      case 'newest': result = [...result].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
      case 'highest_rated': result = [...result].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)); break;
      case 'price_asc': result = [...result].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
      case 'price_desc': result = [...result].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
      default: result = [...result].sort((a, b) => getEnrolled(b) - getEnrolled(a)); break; // popular
    }
    return result;
  }, [courses, sortOrder, priceMin, priceMax]);

  // Fetch my created courses
  const fetchMyCreated = useCallback(async () => {
    if (!isTrainer) return;
    setMyLoading(true);
    try {
      const d = await coursesService.myCreated();
      const items = Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
      setMyCreated(items);
    } catch { setMyCreated([]); } finally { setMyLoading(false); }
  }, [isTrainer]);

  // Fetch my enrolled courses
  const fetchMyEnrolled = useCallback(async () => {
    setMyLoading(true);
    try {
      const d = await coursesService.myEnrolled();
      const items = Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
      setMyEnrolled(items);
    } catch { setMyEnrolled([]); } finally { setMyLoading(false); }
  }, []);

  // ── Enroll handler (free + paid both use POST /courses/:id/enroll) ──
  const handlePurchase = useCallback(async (courseId: string, _price: number) => {
    setPurchasingId(courseId);
    try {
      await coursesService.enroll(courseId);
      addToast('success', 'Enrolled successfully!');
      fetchMyEnrolled();
      fetchCourses();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        // Already enrolled — refresh enrolled list so badge appears
        fetchMyEnrolled();
        addToast('info', 'You are already enrolled in this course.');
      } else {
        const msg = e?.response?.data?.message || 'Failed to enroll. Please try again.';
        addToast('error', msg);
      }
    } finally {
      setPurchasingId(null);
    }
  }, [addToast, fetchCourses, fetchMyEnrolled]);

  useEffect(() => {
    if (tab === "created") fetchMyCreated();
    if (tab === "enrolled") fetchMyEnrolled();
  }, [tab, fetchMyCreated, fetchMyEnrolled]);

  // Always load enrolled so we can show "Enrolled" badges on Browse tab
  useEffect(() => { fetchMyEnrolled(); }, [fetchMyEnrolled]);

  // ── Helpers ──
  function getThumb(c: any, idx: number) { return c.thumbnail || c.thumbnailUrl || UNSPLASH_FALLBACKS[idx % UNSPLASH_FALLBACKS.length]; }
  function getEnrolled(c: any) { return c.totalEnrolled || c.enrolledCount || c._count?.enrollments || 0; }
  function getLessonCount(c: any) { return c.lessons?.length || c._count?.lessons || 0; }
  function getLessonBreakdown(c: any) {
    const ls = c.lessons || [];
    if (ls.length === 0) return "";
    const types: Record<string, number> = {};
    for (const l of ls) { const t = (l.contentType || l.type || "OTHER").toUpperCase(); types[t] = (types[t] || 0) + 1; }
    return Object.entries(types).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(", ");
  }
  function getCatName(c: any) { if (typeof c.category === "object" && c.category) return c.category.name; return c.category as string || ""; }
  function getInstructor(c: any) {
    const i = c.instructor;
    if (!i) return null;
    const name = i.name || `${i.firstName || ""} ${i.lastName || ""}`.trim();
    const firmName = i.trainerProfile?.firmName || null;
    const trainerType = i.trainerProfile?.trainerType || null;
    return { name, avatar: i.avatar, email: i.email, id: i.id, firmName, trainerType };
  }
  function getCourseRevenue(c: any) { return (Number(c.price) || 0) * getEnrolled(c); }
  function getInitials(a?: string, b?: string) { return ((a?.[0] || "") + (b?.[0] || "")).toUpperCase() || "?"; }

  // ── Stats ──
  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;
  const draftCount = courses.filter((c) => c.status === "DRAFT").length;
  const totalEnrolled = courses.reduce((s, c) => s + getEnrolled(c), 0);
  const totalRevenue = courses.reduce((s, c) => s + getCourseRevenue(c), 0);

  // ── Actions ──
  async function handleStatusChange(courseId: string, newStatus: string) {
    setActionLoading(courseId);
    try {
      if (newStatus === "PUBLISHED") { await coursesService.publish(courseId); }
      else { await coursesService.update(courseId, { status: newStatus } as any); }
      fetchCourses();
    } catch (e: any) {
      addToast("error", e?.response?.status === 403 ? "This course isn't yours — only the owner can change its status" : "Failed to update course status");
    }
    finally { setActionLoading(null); }
  }

  async function handleDelete(courseId: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setActionLoading(courseId);
    try { await coursesService.delete(courseId); fetchCourses(); }
    catch (e: any) {
      addToast("error", e?.response?.status === 403 ? "This course isn't yours — only the owner can delete it" : "Failed to delete course");
    }
    finally { setActionLoading(null); }
  }

  // ── Detail ──
  async function openDetail(courseId: string) {
    setDetailLoading(true);
    try { const c = await coursesService.getById(courseId); setDetailCourse(c); }
    catch { addToast("error", "Failed to load course details"); }
    finally { setDetailLoading(false); }
  }

  // ── Edit Lesson ──
  async function openEditLesson(courseId: string, lesson: any) {
    setEditingLesson({ courseId, lesson });
    setEditLessonForm({
      title: lesson.title || "", description: lesson.description || "",
      contentType: lesson.contentType || "VIDEO", duration: Number(lesson.duration) || 30,
      sortOrder: Number(lesson.sortOrder) || 1, isFree: !!lesson.isFree,
      content: lesson.textContent || lesson.content || "", videoUrl: lesson.videoUrl || "",
      timeLimitMin: lesson.timeLimitMin || 0, maxAttempts: lesson.maxAttempts || 0, _questions: [],
    });
    if ((lesson.contentType === "QUIZ" || lesson.type === "QUIZ") && courseId && lesson.id) {
      setLoadingEditQuestions(true);
      try {
        const existing = await coursesService.getAssessments(courseId, lesson.id);
        const arr = Array.isArray(existing) ? existing : (existing as any)?.items ?? [];
        setEditLessonForm((prev) => ({
          ...prev,
          _questions: arr.map((a: any) => ({
            question: a.question || "",
            type: a.type === "MULTIPLE_CHOICE" ? "MCQ" : a.type === "TRUE_FALSE" ? "TRUE_FALSE" : a.type === "CHECKBOX" ? "CHECKBOX" : "SHORT_ANSWER",
            options: Array.isArray(a.options) ? [...a.options, "", "", "", ""].slice(0, 4) : ["", "", "", ""],
            correctAnswer: Array.isArray(a.correctAnswer) ? (a.correctAnswer as string[]).join(", ") : (a.correctAnswer || ""),
            explanation: a.explanation || "",
            points: a.points || 10,
          })),
        }));
      } catch {}
      finally { setLoadingEditQuestions(false); }
    }
  }

  async function handleEditLesson() {
    if (!editingLesson) return;
    setSavingLesson(true);
    try {
      const payload: any = {
        title: editLessonForm.title,
        description: editLessonForm.description,
        contentType: editLessonForm.contentType,
        duration: Number(editLessonForm.duration) || 30,
        sortOrder: Number(editLessonForm.sortOrder) || 1,
        isFree: editLessonForm.isFree,
      };
      payload.timeLimitMin = editLessonForm.timeLimitMin > 0 ? editLessonForm.timeLimitMin : null;
      payload.maxAttempts = editLessonForm.maxAttempts > 0 ? editLessonForm.maxAttempts : null;
      payload.videoUrl = editLessonForm.videoUrl || null;
      payload.textContent = editLessonForm.content || null;
      await coursesService.updateLesson(editingLesson.courseId, editingLesson.lesson.id, payload);
      // Always sync quiz assessments for QUIZ lessons (wipe + recreate = source of truth)
      if (editLessonForm.contentType === "QUIZ") {
        const existingRaw = await coursesService.getAssessments(editingLesson.courseId, editingLesson.lesson.id);
        const existingArr = Array.isArray(existingRaw) ? existingRaw : (existingRaw as any)?.items ?? [];
        for (const eq of existingArr) {
          await coursesService.deleteAssessment(editingLesson.courseId, editingLesson.lesson.id, eq.id);
        }
        for (const q of editLessonForm._questions) {
          if (!q.question.trim()) continue;
          const qType = q.type === "MCQ" ? "MULTIPLE_CHOICE" : q.type === "CHECKBOX" ? "CHECKBOX" : q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "TEXT";
          await coursesService.addAssessment(editingLesson.courseId, editingLesson.lesson.id, {
            question: q.question, type: qType,
            options: (q.type === "MCQ" || q.type === "CHECKBOX") ? q.options.filter(Boolean) : null,
            correctAnswer: q.correctAnswer || null,
            explanation: q.explanation || null,
            points: q.points || 10,
          });
        }
      }
      addToast("success", "Lesson updated");
      const courseId = editingLesson.courseId;
      setEditingLesson(null);
      try {
        const c = await coursesService.getById(courseId);
        setDetailCourse(c);
      } catch {}
      fetchCourses();
      if (tab === "created") fetchMyCreated();
    } catch (e: any) {
      addToast("error", e?.response?.status === 403 ? "This course isn't yours — only the owner or an admin can edit lessons" : e?.response?.data?.message || "Failed to update lesson");
    }
    finally { setSavingLesson(false); }
  }

  // ── Add Lesson ──
  function openAddLesson(courseId: string) {
    setAddingLessonForCourse(courseId);
    const fromDetail = detailCourse?.id === courseId ? (detailCourse.lessons || []).length : 0;
    const fromCreated = myCreated.find((c) => c.id === courseId)?.lessons?.length || 0;
    const existingCount = Math.max(fromDetail, fromCreated);
    setAddLessonForm({ title: "", description: "", contentType: "VIDEO", duration: 30, sortOrder: existingCount + 1, isFree: false, content: "", videoUrl: "", timeLimitMin: 0, maxAttempts: 0, _questions: [] });
  }
  async function handleAddLesson() {
    if (!addingLessonForCourse) return;
    setAddLessonSaving(true);
    try {
      const payload: any = {
        title: addLessonForm.title,
        description: addLessonForm.description,
        contentType: addLessonForm.contentType,
        duration: Number(addLessonForm.duration) || 30,
        sortOrder: Number(addLessonForm.sortOrder) || 1,
        isFree: addLessonForm.isFree,
      };
      if (addLessonForm.timeLimitMin > 0) payload.timeLimitMin = addLessonForm.timeLimitMin;
      if (addLessonForm.maxAttempts > 0) payload.maxAttempts = addLessonForm.maxAttempts;
      if (addLessonForm.videoUrl) payload.videoUrl = addLessonForm.videoUrl;
      if (addLessonForm.content) payload.textContent = addLessonForm.content;
      const newLesson = await coursesService.addLesson(addingLessonForCourse, payload);
      if (addLessonForm.contentType === "QUIZ") {
        for (const q of addLessonForm._questions) {
          if (!q.question.trim()) continue;
          const qType = q.type === "MCQ" ? "MULTIPLE_CHOICE" : q.type === "CHECKBOX" ? "CHECKBOX" : q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "TEXT";
          await coursesService.addAssessment(addingLessonForCourse, newLesson.id, {
            question: q.question, type: qType,
            options: (q.type === "MCQ" || q.type === "CHECKBOX") ? q.options.filter(Boolean) : null,
            correctAnswer: q.correctAnswer || null, explanation: q.explanation || null, points: q.points || 10,
          });
        }
      }
      addToast("success", "Lesson added");
      setAddingLessonForCourse(null);
      fetchMyCreated();
      if (detailCourse?.id === addingLessonForCourse) {
        const c = await coursesService.getById(addingLessonForCourse);
        setDetailCourse(c);
      }
    } catch (e: any) { addToast("error", e?.response?.data?.message || "Failed to add lesson"); }
    finally { setAddLessonSaving(false); }
  }

  // ── Delete Lesson ──
  async function handleDeleteLesson(courseId: string, lessonId: string, title: string) {
    if (!window.confirm(`Delete lesson "${title}"? This cannot be undone.`)) return;
    setDeletingLesson(lessonId);
    try {
      await coursesService.deleteLesson(courseId, lessonId);
      addToast("success", "Lesson deleted");
      setLessonQuestions((prev) => { const next = { ...prev }; delete next[lessonId]; return next; });
      const c = await coursesService.getById(courseId);
      setDetailCourse(c);
      fetchMyCreated();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to delete lesson");
    } finally { setDeletingLesson(null); }
  }

  // ── Upload ──
  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return (res.data as any)?.data?.url || (res.data as any)?.url || "";
  }

  // ── Lesson builder helpers ──
  function addLesson() { setLessons([...lessons, emptyLesson(lessons.length + 1)]); }
  function updateLesson(idx: number, data: Record<string, any>) { setLessons(lessons.map((l, i) => i === idx ? { ...l, ...data } : l)); }
  function removeLesson(idx: number) { setLessons(lessons.filter((_, i) => i !== idx)); }
  function addQuestion(li: number) { const ls = [...lessons]; ls[li]._questions.push(emptyQuestion()); setLessons(ls); }
  function updateQuestion(li: number, qi: number, data: Record<string, any>) { const ls = [...lessons]; ls[li]._questions[qi] = { ...ls[li]._questions[qi], ...data }; setLessons(ls); }
  function removeQuestion(li: number, qi: number) { const ls = [...lessons]; ls[li]._questions = ls[li]._questions.filter((_, i) => i !== qi); setLessons(ls); }

  // ── Create course ──
  async function handleCreate() {
    if (!createForm.title) return;
    setCreating(true);
    try {
      let thumbnailUrl = "";
      if (thumbnailFile) thumbnailUrl = await uploadFile(thumbnailFile);
      const tags = createForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const course = await coursesService.create({
        title: createForm.title, description: createForm.description,
        category: createForm.category, level: createForm.level,
        price: Number(createForm.price) || 0, tags,
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      });
      // Add lessons
      for (const lesson of lessons) {
        const ld: any = { title: lesson.title, description: lesson.description, contentType: lesson.contentType, duration: Number(lesson.duration) || 30, sortOrder: Number(lesson.sortOrder) || 1, isFree: lesson.isFree };
        if (lesson.contentType === "TEXT") ld.content = lesson.content;
        if (lesson.contentType === "VIDEO" && lesson.videoUrl) ld.videoUrl = lesson.videoUrl;
        if (lesson.timeLimitMin > 0) ld.timeLimitMin = lesson.timeLimitMin;
        if (lesson.maxAttempts > 0) ld.maxAttempts = lesson.maxAttempts;
        const newLesson = await coursesService.addLesson(course.id, ld);
        if (lesson.contentType === "QUIZ" && lesson._questions.length > 0) {
          for (const q of lesson._questions) {
            if (!q.question.trim()) continue;
            const qType = q.type === "MCQ" ? "MULTIPLE_CHOICE" : q.type === "CHECKBOX" ? "CHECKBOX" : q.type === "TRUE_FALSE" ? "TRUE_FALSE" : "TEXT";
            await coursesService.addAssessment(course.id, newLesson.id, {
              question: q.question, type: qType,
              options: (q.type === "MCQ" || q.type === "CHECKBOX") ? q.options.filter(Boolean) : null,
              correctAnswer: q.correctAnswer || null, explanation: q.explanation || null, points: q.points || 10,
            });
          }
        }
      }
      if (createStatus === "PUBLISHED" && lessons.length > 0) { try { await coursesService.publish(course.id); } catch {} }
      setCreateForm({ title: "", description: "", category: "", level: "BEGINNER", price: 0, tags: "" });
      setThumbnailFile(null); setThumbnailPreview(null); setLessons([]); setTab("all"); fetchCourses();
    } catch (e: any) { addToast("error", e?.response?.data?.message || "Failed to create course"); }
    finally { setCreating(false); }
  }

  // ── Analytics data ──
  const topByEnrollment = [...courses].sort((a, b) => getEnrolled(b) - getEnrolled(a)).slice(0, 10).map((c) => ({ label: c.title?.slice(0, 25), value: getEnrolled(c) }));
  const revenueByLevel = (() => { const m: Record<string, number> = {}; courses.forEach((c) => { const l = c.level || "OTHER"; m[l] = (m[l] || 0) + getCourseRevenue(c); }); return Object.entries(m).filter(([_, v]) => v > 0).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })); })();
  const topInstructors = (() => {
    const map = new Map<string, { name: string; courses: number; enrolled: number; revenue: number }>();
    courses.forEach((c) => { const inst = getInstructor(c); if (!inst) return; const ex = map.get(inst.id) || { name: inst.name, courses: 0, enrolled: 0, revenue: 0 }; ex.courses++; ex.enrolled += getEnrolled(c); ex.revenue += getCourseRevenue(c); map.set(inst.id, ex); });
    return [...map.values()].sort((a, b) => b.enrolled - a.enrolled).slice(0, 10);
  })();

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-8">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=4096&q=100" alt="Courses" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#192C67]/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">Uteo Academy</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">Training Courses</h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">
            {isTrainer ? "Create, manage, and publish training courses for your clients." : "Master new skills with on-demand courses from Kenya's top trainers."}
          </p>
          {total > 0 && <p className="mt-2 text-sm text-white/50">{total} total courses</p>}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 w-fit overflow-x-auto max-w-full">
        {(() => {
          const tabs: [TabKey, string][] = [];
          if (isTrainer) tabs.push(["created", "Created"]);
          else tabs.push(["all", "Browse"]);
          tabs.push(["enrolled", "Enrolled"]);
          if (isTrainer) tabs.push(["all", "Browse"], ["create", "New Course"], ["analytics", "Analytics"]);
          return tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${tab === key ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
              {label}
            </button>
          ));
        })()}
      </div>

      {/* ═══════════════════════ TAB: ALL COURSES ═══════════════════════ */}
      {tab === "all" && (
        <>
          {/* Stats row */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Total Courses", value: total, color: "#192C67", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
                { label: "Published", value: publishedCount, color: "#0D9488", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Draft", value: draftCount, color: "#F77B0F", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
                { label: "Total Enrolled", value: totalEnrolled, color: "#8B5CF6", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
                { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "#22c55e", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                      <svg className="w-5 h-5" style={{ color: stat.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category chip pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => { setCategoryFilter(""); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!categoryFilter ? "bg-[#192C67] text-white border-[#192C67]" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-[#192C67] hover:text-[#192C67]"}`}>All</button>
              {categories.map((cat: any) => (
                <button key={cat.id} onClick={() => { setCategoryFilter(cat.name); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryFilter === cat.name ? "bg-[#192C67] text-white border-[#192C67]" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-[#192C67] hover:text-[#192C67]"}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..." className={`${ic} pl-9 w-56`} />
            </div>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className={`${ic} w-36`}>
              <option value="">All Levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l.replace(/_/g, " ")}</option>)}
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className={`${ic} w-44`}>
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            {isTrainer && (
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${ic} w-36`}>
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            )}
            {/* Price range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Price:</span>
              <input type="range" min={0} max={100000} step={500} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-28 accent-[#192C67]" title={`Max: ${formatCurrency(priceMax)}`} />
              <span className="text-xs text-gray-500 whitespace-nowrap">{priceMax >= 100000 ? 'Any' : `≤ ${formatCurrency(priceMax)}`}</span>
            </div>
            {(search || statusFilter || categoryFilter || levelFilter || priceMax < 100000) && (
              <button onClick={() => { setSearch(""); setStatusFilter(""); setCategoryFilter(""); setLevelFilter(""); setPriceMax(100000); setPage(1); }} className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Clear Filters</button>
            )}
          </div>

          {total > 0 && !loading && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Showing {sortedFilteredCourses().length} of {total} courses</p>}

          {/* Featured courses horizontal scroll */}
          {!loading && courses.some((c) => c.isFeatured) && (
            <div className="mb-8">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F77B0F] inline-block" />
                Featured Courses
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                {courses.filter((c) => c.isFeatured).map((course, idx) => (
                  <div key={course.id} className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-xl border border-[#F77B0F]/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative h-32 overflow-hidden">
                      <img src={getThumb(course, idx)} alt={course.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#F77B0F] text-white text-[9px] font-bold rounded-full uppercase">Featured</span>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">{course.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-[#192C67] dark:text-white/70">{(Number(course.price) || 0) === 0 ? <span className="text-[#0D9488]">Free</span> : formatCurrency(Number(course.price))}</span>
                        <Link href={`/courses/${course.id}`} className="text-[10px] font-medium text-[#192C67] dark:text-white/70 hover:underline">View</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && <div className="space-y-4">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>}

          {/* Empty */}
          {!loading && sortedFilteredCourses().length === 0 && (
            <EmptyState title="No courses found" description="Try adjusting your filters or check back later." action={isTrainer ? { label: "Create Course", onClick: () => setTab("create") } : { label: "Clear Filters", onClick: () => { setSearch(""); setStatusFilter(""); setCategoryFilter(""); setLevelFilter(""); setPriceMax(100000); } }} />
          )}

          {/* Course cards — same layout as admin */}
          {!loading && sortedFilteredCourses().length > 0 && (
            <div className="space-y-4">
              {sortedFilteredCourses().map((course, idx) => {
                const inst = getInstructor(course);
                const isLoading = actionLoading === course.id;
                const enrolled = getEnrolled(course);
                const revenue = getCourseRevenue(course);
                const lessonCount = getLessonCount(course);
                const breakdown = getLessonBreakdown(course);

                return (
                  <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="sm:w-52 h-40 sm:h-auto shrink-0 overflow-hidden relative">
                        <img src={getThumb(course, idx)} alt={course.title} className="h-full w-full object-cover" />
                        {course.isFeatured && <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#F77B0F] text-white text-[10px] font-bold rounded-full uppercase">Featured</span>}
                      </div>
                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${course.status === "PUBLISHED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : course.status === "DRAFT" ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>{course.status}</span>
                          {course.level && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${LEVEL_BADGE[course.level] || LEVEL_BADGE.ALL_LEVELS}`}>{course.level.replace(/_/g, " ")}</span>}
                          {getCatName(course) && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{getCatName(course)}</span>}
                        </div>

                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                        {course.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{course.description}</p>}

                        {inst && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-[#192C67]/10 flex items-center justify-center text-[10px] font-bold text-[#192C67] dark:text-white/70 shrink-0 overflow-hidden">
                              {inst.avatar ? <img src={inst.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(inst.name.split(" ")[0], inst.name.split(" ")[1])}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{inst.name}</span>
                            {inst.firmName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 font-medium">{inst.firmName}</span>}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                            {enrolled} enrolled
                          </span>
                          <span className="flex items-center gap-1"><Stars rating={Number(course.rating || 0)} /> {Number(course.rating || 0).toFixed(1)}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{(Number(course.price) || 0) === 0 ? <span className="text-[#0D9488]">Free</span> : formatCurrency(Number(course.price))}</span>
                          {revenue > 0 && <span className="text-[#22c55e] font-semibold">Rev: {formatCurrency(revenue)}</span>}
                        </div>

                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">{lessonCount} lesson{lessonCount !== 1 ? "s" : ""}{breakdown ? ` (${breakdown})` : ""}</p>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 mt-auto">
                          <button onClick={() => openDetail(course.id)} disabled={isLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 hover:bg-[#192C67]/20 transition-colors disabled:opacity-50">View Detail</button>
                          {isTrainer && course.instructor?.id === user?.id && course.status === "DRAFT" && <button onClick={() => handleStatusChange(course.id, "PUBLISHED")} disabled={isLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 disabled:opacity-50 transition-colors">Publish</button>}
                          {isTrainer && course.instructor?.id === user?.id && course.status === "PUBLISHED" && <button onClick={() => handleStatusChange(course.id, "DRAFT")} disabled={isLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 disabled:opacity-50 transition-colors">Unpublish</button>}
                          <Link href={`/courses/${course.id}`} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Open</Link>
                          {/* Enrollment CTA for clients */}
                          {!isTrainer && course.status === "PUBLISHED" && (() => {
                            const isEnrolled = myEnrolled.some((e: any) => e.courseId === course.id || e.course?.id === course.id);
                            if (isEnrolled) {
                              return <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Enrolled</span>;
                            }
                            const price = Number(course.price) || 0;
                            return (
                              <button onClick={() => handlePurchase(course.id, price)} disabled={purchasingId === course.id} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#192C67] text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                                {purchasingId === course.id ? 'Enrolling...' : price === 0 ? 'Enroll Free' : `Buy — ${formatCurrency(price)}`}
                              </button>
                            );
                          })()}
                          {isTrainer && course.instructor?.id === user?.id && <button onClick={() => handleDelete(course.id, course.title)} disabled={isLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 disabled:opacity-50 transition-colors ml-auto">Delete</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">Previous</button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">Next</button>
            </div>
          )}

        </>
      )}

      {/* ═══════════════════════ TAB: MY CREATED ═══════════════════════ */}
      {tab === "created" && isTrainer && (
        <>
          {myLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : myCreated.length === 0 ? (
            <EmptyState title="You haven't created any courses yet" description="Start sharing your expertise with clients across Kenya." action={{ label: "Create Course", onClick: () => setTab("create") }} />
          ) : (
            <div className="space-y-4">
              {myCreated.map((course, idx) => {
                const isManaging = managingCourseId === course.id;
                const img = course.thumbnail || course.thumbnailUrl || UNSPLASH_FALLBACKS[idx % UNSPLASH_FALLBACKS.length];
                const courseLessons = (course.lessons || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
                return (
                  <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden"><img src={img} alt={course.title} className="h-full w-full object-cover" /></div>
                      <div className="flex-1 p-5 flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${course.status === "PUBLISHED" ? "bg-green-100 text-green-700" : course.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>{course.status}</span>
                          {course.level && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${LEVEL_BADGE[course.level] || LEVEL_BADGE.ALL_LEVELS}`}>{course.level.replace(/_/g, " ")}</span>}
                          {course.category && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500">{typeof course.category === "string" ? course.category : course.category?.name}</span>}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                        {course.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{course.description}</p>}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>{course.totalEnrolled || course._count?.enrollments || 0} enrolled</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{Number(course.price || 0) === 0 ? "Free" : formatCurrency(Number(course.price))}</span>
                          {getCourseRevenue(course) > 0 && <span className="text-green-600 font-semibold">Rev: {formatCurrency(getCourseRevenue(course))}</span>}
                          <span>{courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          <button onClick={() => openDetail(course.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 hover:bg-[#192C67]/20">View Detail</button>
                          <button onClick={() => setManagingCourseId(isManaging ? null : course.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F77B0F]/10 text-[#F77B0F] hover:bg-[#F77B0F]/20">{isManaging ? "Close Lessons" : "Manage Lessons"}</button>
                          {course.status === "DRAFT" && <button onClick={async () => { try { await coursesService.publish(course.id); addToast("success", "Published"); fetchMyCreated(); } catch { addToast("error", "Publish failed"); } }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200">Publish</button>}
                          {course.status === "PUBLISHED" && <button onClick={async () => { try { await coursesService.update(course.id, { status: "DRAFT" } as any); addToast("success", "Unpublished"); fetchMyCreated(); } catch { addToast("error", "Failed"); } }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200">Unpublish</button>}
                          <Link href={`/courses/${course.id}`} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200">Preview</Link>
                          <button onClick={async () => { if (!window.confirm(`Delete "${course.title}"?`)) return; try { await coursesService.delete(course.id); addToast("success", "Deleted"); fetchMyCreated(); } catch { addToast("error", "Delete failed"); } }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 ml-auto">Delete</button>
                        </div>
                      </div>
                    </div>
                    {isManaging && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Lessons ({courseLessons.length})</h4>
                          <button onClick={() => openAddLesson(course.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F77B0F] text-white hover:bg-[#c49a3a] transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Lesson
                          </button>
                        </div>
                        {courseLessons.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">No lessons yet. Click &quot;Add Lesson&quot; to start.</p>
                        ) : (
                          <div className="space-y-2">
                            {courseLessons.map((lesson: any, li: number) => (
                              <details key={lesson.id} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 group">
                                <summary className="flex items-center gap-3 p-3 cursor-pointer list-none">
                                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 text-xs font-bold">{lesson.sortOrder || li + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CONTENT_TYPE_BADGE[lesson.contentType] || "bg-gray-100 text-gray-600"}`}>{lesson.contentType}</span>
                                      {lesson.isFree && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">FREE</span>}
                                    </div>
                                  </div>
                                  {lesson.duration && <span className="text-[11px] text-gray-400">{lesson.duration} min</span>}
                                  <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </summary>
                                <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                  <div className="flex items-center justify-between mb-2">
                                    {lesson.description && <p className="text-xs text-gray-500 flex-1">{lesson.description}</p>}
                                    <button onClick={() => openEditLesson(course.id, lesson)} className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 hover:bg-[#192C67]/20 shrink-0 ml-2">Edit Lesson</button>
                                  </div>
                                  {lesson.videoUrl && <video controls className="w-full rounded-lg max-h-[300px] bg-black mb-2" src={lesson.videoUrl}>Your browser does not support video.</video>}
                                  {lesson.contentType === "VIDEO" && !lesson.videoUrl && <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"><p className="text-xs text-yellow-700 dark:text-yellow-300">Video not uploaded yet. Click Edit Lesson.</p></div>}
                                  {(lesson.textContent || lesson.content) && <div className="mb-2"><LessonContent content={lesson.textContent || lesson.content} /></div>}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ TAB: MY ENROLLED ═══════════════════════ */}
      {tab === "enrolled" && (
        <>
          {myLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : myEnrolled.length === 0 ? (
            <EmptyState title="You haven't enrolled in any courses yet" description="Browse the catalog and find courses to start learning." action={{ label: "Browse Courses", onClick: () => setTab("all") }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEnrolled.map((e: any, idx: number) => {
                const course = e.course || e;
                const progress = Number(e.progress ?? course.progress ?? 0);
                const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started";
                const statusColor = progress >= 100 ? "bg-green-100 text-green-700" : progress > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
                const img = course.thumbnail || course.thumbnailUrl || UNSPLASH_FALLBACKS[idx % UNSPLASH_FALLBACKS.length];
                return (
                  <Link key={course.id || e.id} href={`/courses/${course.id}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="h-40 overflow-hidden"><img src={img} alt={course.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /></div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>{status}</span>
                        {course.level && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${LEVEL_BADGE[course.level] || ""}`}>{course.level}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{course.title}</h3>
                      {course.instructor?.name && <p className="text-xs text-gray-500 mb-3">{course.instructor.name}</p>}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${progress >= 75 ? "bg-green-500" : progress >= 25 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${progress}%` }} /></div>
                      </div>
                      <div className="text-xs text-[#192C67] dark:text-white/70 font-medium mt-3">{progress >= 100 ? "Review Course →" : progress > 0 ? "Continue Learning →" : "Start Learning →"}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ TAB: CREATE / UPLOAD ═══════════════════════ */}
      {tab === "create" && isTrainer && (
        <CourseBuilder onSuccess={() => { setTab("created"); fetchMyCreated(); }} />
      )}

      {/* ═══════════════════════ TAB: ANALYTICS ═══════════════════════ */}
      {tab === "analytics" && isTrainer && (
        <div className="space-y-6">
          {loading ? <div className="text-center py-12 text-gray-400">Loading analytics data...</div> : courses.length === 0 ? <div className="text-center py-12 text-gray-400">No course data available for analytics.</div> : (
            <>
              {/* Top Courses by Enrollment */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top Courses by Enrollment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Courses with most enrolled students</p>
                <div className="space-y-3">
                  {topByEnrollment.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.label}</span>
                          <span className="text-xs text-gray-500">{item.value} enrolled</span>
                        </div>
                        <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-[#192C67] rounded-full" style={{ width: `${topByEnrollment[0]?.value ? (item.value / topByEnrollment[0].value) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue by Level */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Revenue by Level</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Revenue broken down by course level</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {revenueByLevel.map((item, i) => (
                    <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-gray-500">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Instructors */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top Instructors</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">By course count and total enrolled students</p>
                {topInstructors.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No instructor data</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-2 text-xs font-medium text-gray-500">Instructor</th><th className="text-right py-2 text-xs font-medium text-gray-500">Courses</th><th className="text-right py-2 text-xs font-medium text-gray-500">Enrolled</th><th className="text-right py-2 text-xs font-medium text-gray-500">Revenue</th></tr></thead>
                      <tbody>
                        {topInstructors.map((inst, i) => (
                          <tr key={i} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white">{inst.name}</td>
                            <td className="py-2.5 text-right text-gray-500">{inst.courses}</td>
                            <td className="py-2.5 text-right text-gray-500">{inst.enrolled}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(inst.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Courses by Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Courses by Status</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {[
                    { label: "Published", value: publishedCount, color: "#22c55e" },
                    { label: "Draft", value: draftCount, color: "#F77B0F" },
                    { label: "Archived", value: total - publishedCount - draftCount, color: "#94a3b8" },
                  ].filter((d) => d.value > 0).map((d, i) => (
                    <div key={i} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${d.color}10` }}>
                      <p className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</p>
                      <p className="text-xs text-gray-500">{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Detail Modal (top-level so it works from any tab) ── */}
      {(detailCourse || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailCourse(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? <div className="p-12 text-center text-gray-400">Loading course details...</div> : detailCourse && (
              <>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${detailCourse.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{detailCourse.status}</span>
                        {detailCourse.level && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${LEVEL_BADGE[detailCourse.level] || ""}`}>{detailCourse.level.replace(/_/g, " ")}</span>}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detailCourse.title}</h2>
                      {detailCourse.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detailCourse.description}</p>}
                    </div>
                    <button onClick={() => setDetailCourse(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <div><span className="text-gray-400">Price:</span> <span className="font-semibold">{Number(detailCourse.price || 0) === 0 ? "Free" : formatCurrency(Number(detailCourse.price || 0))}</span></div>
                    <div><span className="text-gray-400">Enrolled:</span> <span className="font-semibold">{getEnrolled(detailCourse)}</span></div>
                    <div className="flex items-center gap-1"><span className="text-gray-400">Rating:</span> <Stars rating={Number(detailCourse.rating || 0)} /> <span className="font-semibold">{Number(detailCourse.rating || 0).toFixed(1)}</span></div>
                    {getCourseRevenue(detailCourse) > 0 && <div><span className="text-gray-400">Revenue:</span> <span className="font-semibold text-[#22c55e]">{formatCurrency(getCourseRevenue(detailCourse))}</span></div>}
                  </div>
                  {(() => { const inst = getInstructor(detailCourse); if (!inst) return null; return (<div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"><div className="w-10 h-10 rounded-full bg-[#192C67]/10 flex items-center justify-center text-sm font-bold text-[#192C67] dark:text-white/70 shrink-0 overflow-hidden">{inst.avatar ? <img src={inst.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(inst.name.split(" ")[0], inst.name.split(" ")[1])}</div><div><p className="text-sm font-semibold text-gray-900 dark:text-white">{inst.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{inst.email}</p></div></div>); })()}
                </div>
                {/* ── Course Content + Assessments separated ── */}
                {(() => {
                  const allLessons = [...(detailCourse.lessons || [])].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                  const contentLessons = allLessons.filter((l: any) => l.contentType !== "QUIZ");
                  const quizLessons = allLessons.filter((l: any) => l.contentType === "QUIZ");
                  const isOwner = isTrainer && detailCourse.instructor?.id === user?.id;
                  const typeLabel: Record<string, string> = { MULTIPLE_CHOICE: "Multiple Choice", TRUE_FALSE: "True / False", CHECKBOX: "Checkbox (multi)", TEXT: "Short Answer", FILE_UPLOAD: "File Upload" };

                  const renderLesson = (lesson: any, idx: number) => (
                    <details
                      key={lesson.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg group"
                      onToggle={(e) => {
                        if ((e.currentTarget as HTMLDetailsElement).open && lesson.contentType === "QUIZ" && !lessonQuestions[lesson.id]) {
                          coursesService.getAssessments(detailCourse.id, lesson.id)
                            .then((qs) => setLessonQuestions((prev) => ({ ...prev, [lesson.id]: Array.isArray(qs) ? qs : (qs as any)?.items ?? [] })))
                            .catch(() => setLessonQuestions((prev) => ({ ...prev, [lesson.id]: [] })));
                        }
                      }}
                    >
                      <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors list-none">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 text-xs font-bold shrink-0">{idx + 1}</span>
                          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</p>{lesson.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{lesson.description}</p>}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {lesson.contentType === "QUIZ" ? (
                            <>
                              {lesson.timeLimitMin > 0 && <span className="text-xs text-gray-400">⏱ {lesson.timeLimitMin}min</span>}
                              {lesson.maxAttempts > 0 && <span className="text-xs text-gray-400">{lesson.maxAttempts} attempt{lesson.maxAttempts !== 1 ? "s" : ""}</span>}
                            </>
                          ) : (
                            lesson.duration > 0 && <span className="text-xs text-gray-400">{lesson.duration}min</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CONTENT_TYPE_BADGE[lesson.contentType] || "bg-gray-100 text-gray-600"}`}>{lesson.contentType || "CONTENT"}</span>
                          {(lesson.isFree || lesson.isPreview) && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">FREE</span>}
                          <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </summary>
                      <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                        {isOwner && (
                          <div className="flex items-center gap-2 mb-2 justify-end">
                            <button onClick={() => openEditLesson(detailCourse.id, lesson)} className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-white/70 hover:bg-[#192C67]/20 transition-colors">
                              {lesson.contentType === "QUIZ" ? "Edit Quiz & Questions" : "Edit Lesson"}
                            </button>
                            <button
                              disabled={deletingLesson === lesson.id}
                              onClick={() => handleDeleteLesson(detailCourse.id, lesson.id, lesson.title)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                            >
                              {deletingLesson === lesson.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        )}
                        {lesson.contentType === "VIDEO" && lesson.videoUrl && <video controls className="w-full rounded-lg max-h-[400px] bg-black mb-2" src={lesson.videoUrl}>Your browser does not support video.</video>}
                        {lesson.contentType === "VIDEO" && !lesson.videoUrl && <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"><p className="text-xs text-yellow-700 dark:text-yellow-300">Video not uploaded yet. Click &quot;Edit Lesson&quot; to upload.</p></div>}
                        {(lesson.textContent || lesson.content) && <div className="mb-2"><LessonContent content={lesson.textContent || lesson.content} /></div>}
                        {lesson.contentType === "QUIZ" && (
                          <div className="mt-1">
                            {!lessonQuestions[lesson.id] ? (
                              <p className="text-[11px] text-gray-400 italic">Loading questions…</p>
                            ) : lessonQuestions[lesson.id].length === 0 ? (
                              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-300">No questions yet — click &quot;Edit Quiz &amp; Questions&quot; to add them.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{lessonQuestions[lesson.id].length} Question{lessonQuestions[lesson.id].length !== 1 ? "s" : ""}</p>
                                {lessonQuestions[lesson.id].map((q: any, qi: number) => {
                                  const correctArr: string[] = Array.isArray(q.correctAnswer) ? q.correctAnswer : q.correctAnswer ? [q.correctAnswer] : [];
                                  return (
                                    <div key={q.id} className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white flex-1">Q{qi + 1}. {q.question}</p>
                                        <span className="shrink-0 text-[10px] font-semibold text-[#192C67] dark:text-white/70">{q.points ?? 10}pts</span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5 mb-1">{typeLabel[q.type] || q.type}</p>
                                      {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                        <div className="space-y-0.5">
                                          {(q.options as string[]).map((opt: string, oi: number) => {
                                            const correct = correctArr.includes(opt);
                                            return (
                                              <p key={oi} className={`text-[11px] flex items-center gap-1.5 ${correct ? "text-green-600 dark:text-green-400 font-semibold" : "text-gray-400"}`}>
                                                <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold shrink-0 ${correct ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{String.fromCharCode(65 + oi)}</span>
                                                {opt || <span className="italic opacity-40">empty</span>}
                                                {correct && <span className="ml-auto text-green-600 dark:text-green-400 text-[9px] font-bold">✓</span>}
                                              </p>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {q.explanation && <p className="text-[10px] text-[#192C67] dark:text-white/70 mt-1.5 italic">💡 {q.explanation}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  );

                  return (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Course Content */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Course Content <span className="font-normal text-gray-400">({contentLessons.length})</span></h3>
                          {isOwner && (
                            <button onClick={() => openAddLesson(detailCourse.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#192C67] text-[#192C67] dark:border-[#F77B0F]/50 dark:text-white/70 hover:bg-[#192C67]/5 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              Add Lesson
                            </button>
                          )}
                        </div>
                        {contentLessons.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No content lessons yet.</p> : (
                          <div className="space-y-2">{contentLessons.map((l: any, i: number) => renderLesson(l, i))}</div>
                        )}
                      </div>
                      {/* Assessments / Quizzes */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assessments <span className="font-normal text-gray-400">({quizLessons.length} quiz{quizLessons.length !== 1 ? "zes" : ""})</span></h3>
                          {isOwner && (
                            <button onClick={() => { openAddLesson(detailCourse.id); setAddLessonForm((p) => ({ ...p, contentType: "QUIZ" })); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              Add Quiz
                            </button>
                          )}
                        </div>
                        {quizLessons.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No quizzes yet. Click &quot;Add Quiz&quot; to create one.</p> : (
                          <div className="space-y-2">{quizLessons.map((l: any, i: number) => renderLesson(l, i))}</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
                  {isTrainer && detailCourse.instructor?.id === user?.id && detailCourse.status === "DRAFT" && <button onClick={async () => { try { await coursesService.publish(detailCourse.id); setDetailCourse({ ...detailCourse, status: "PUBLISHED" }); fetchCourses(); fetchMyCreated(); } catch { addToast("error", "Failed to publish"); } }} className="px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600">Publish</button>}
                  {isTrainer && detailCourse.instructor?.id === user?.id && detailCourse.status === "PUBLISHED" && <button onClick={async () => { try { await coursesService.update(detailCourse.id, { status: "DRAFT" } as any); setDetailCourse({ ...detailCourse, status: "DRAFT" }); fetchCourses(); fetchMyCreated(); } catch { addToast("error", "Failed to unpublish"); } }} className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600">Unpublish</button>}
                  {isTrainer && detailCourse.instructor?.id === user?.id && detailCourse.status !== "ARCHIVED" && <button onClick={async () => { try { await coursesService.update(detailCourse.id, { status: "ARCHIVED" } as any); setDetailCourse({ ...detailCourse, status: "ARCHIVED" }); fetchCourses(); fetchMyCreated(); } catch { addToast("error", "Failed to archive"); } }} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-500/10 text-gray-600 hover:bg-gray-500/20">Archive</button>}
                  {isTrainer && detailCourse.instructor?.id === user?.id && detailCourse.status === "ARCHIVED" && <button onClick={async () => { try { await coursesService.update(detailCourse.id, { status: "DRAFT" } as any); setDetailCourse({ ...detailCourse, status: "DRAFT" }); fetchCourses(); fetchMyCreated(); } catch { addToast("error", "Failed to restore"); } }} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600">Restore to Draft</button>}
                  <button onClick={() => setDetailCourse(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Lesson Modal ── */}
      {addingLessonForCourse && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[5vh] pb-[5vh] bg-black/50 backdrop-blur-sm" onClick={() => { if (!addLessonSaving && !addLessonUploading) setAddingLessonForCourse(null); }}>
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl my-auto max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Lesson</h3>
              <button onClick={() => { if (!addLessonSaving && !addLessonUploading) setAddingLessonForCourse(null); }} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" value={addLessonForm.title} onChange={(e) => setAddLessonForm((p) => ({ ...p, title: e.target.value }))} className={`${ic} w-full`} placeholder="e.g. Introduction to Variables" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows={2} value={addLessonForm.description} onChange={(e) => setAddLessonForm((p) => ({ ...p, description: e.target.value }))} className={`${ic} w-full resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
                  <select value={addLessonForm.contentType} onChange={(e) => setAddLessonForm((p) => ({ ...p, contentType: e.target.value }))} className={`${ic} w-full`}>
                    {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                  <input type="number" min={1} value={addLessonForm.duration} onChange={(e) => setAddLessonForm((p) => ({ ...p, duration: Number(e.target.value) }))} className={`${ic} w-full`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                  <input type="number" min={1} value={addLessonForm.sortOrder} onChange={(e) => setAddLessonForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} className={`${ic} w-full`} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setAddLessonForm((p) => ({ ...p, isFree: !p.isFree }))} className={`w-11 h-6 rounded-full transition-colors ${addLessonForm.isFree ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${addLessonForm.isFree ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Free preview</label>
              </div>
              {addLessonForm.contentType === "VIDEO" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video URL (paste or upload)</label>
                  <input type="text" value={addLessonForm.videoUrl} onChange={(e) => setAddLessonForm((p) => ({ ...p, videoUrl: e.target.value }))} placeholder="https://..." disabled={addLessonUploading} className={`${ic} w-full`} />
                  <input type="file" accept="video/*" disabled={addLessonUploading} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setAddLessonUploading(true);
                    addToast("info", `Uploading ${f.name} (please wait)...`);
                    try {
                      const url = await uploadFile(f);
                      if (!url) throw new Error("Empty URL");
                      setAddLessonForm((p) => ({ ...p, videoUrl: url }));
                      addToast("success", "Video uploaded — click Save");
                    } catch { addToast("error", "Upload failed"); }
                    finally { setAddLessonUploading(false); }
                  }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50" />
                  {addLessonUploading && <p className="text-xs text-purple-600 animate-pulse">Uploading... do not close this modal</p>}
                  {!addLessonUploading && addLessonForm.videoUrl && <p className="text-xs text-green-600 break-all">✓ {addLessonForm.videoUrl}</p>}
                </div>
              )}
              {addLessonForm.contentType === "TEXT" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                  <textarea rows={6} value={addLessonForm.content} onChange={(e) => setAddLessonForm((p) => ({ ...p, content: e.target.value }))} className={`${ic} w-full resize-none font-mono`} placeholder="Write lesson content..." />
                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { addToast("info", `Uploading ${f.name}...`); const url = await uploadFile(f); setAddLessonForm((p) => ({ ...p, content: p.content + `\n\n📎 ${f.name}\n${url}` })); addToast("success", `${f.name} uploaded`); } catch { addToast("error", "Upload failed"); } }} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#192C67]/10 file:text-[#192C67] hover:file:bg-[#192C67]/20" />
                </div>
              )}
              {addLessonForm.contentType === "ASSIGNMENT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</label>
                  <textarea rows={4} value={addLessonForm.content} onChange={(e) => setAddLessonForm((p) => ({ ...p, content: e.target.value }))} className={`${ic} w-full resize-none`} placeholder="Describe the assignment..." />
                </div>
              )}
              {addLessonForm.contentType === "QUIZ" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div><label className="block text-[11px] text-amber-700 dark:text-amber-400 mb-0.5 font-medium">Timer (min, 0 = no limit)</label><input type="number" min={0} value={addLessonForm.timeLimitMin} onChange={(e) => setAddLessonForm((p) => ({ ...p, timeLimitMin: Number(e.target.value) }))} className={`${ic} w-full text-xs`} /></div>
                    <div><label className="block text-[11px] text-amber-700 dark:text-amber-400 mb-0.5 font-medium">Max attempts (0 = unlimited)</label><input type="number" min={0} value={addLessonForm.maxAttempts} onChange={(e) => setAddLessonForm((p) => ({ ...p, maxAttempts: Number(e.target.value) }))} className={`${ic} w-full text-xs`} /></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Questions ({addLessonForm._questions.length})</span>
                    <button type="button" onClick={() => setAddLessonForm((p) => ({ ...p, _questions: [...p._questions, emptyQuestion()] }))} className="text-xs font-medium text-[#192C67] dark:text-white/70 hover:underline">+ Add Question</button>
                  </div>
                  {addLessonForm._questions.map((q, qi) => (
                    <div key={qi} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                      <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-700 dark:text-gray-300">Q{qi + 1}</span><button type="button" onClick={() => setAddLessonForm((p) => ({ ...p, _questions: p._questions.filter((_, i) => i !== qi) }))} className="text-[10px] text-red-400 hover:text-red-600">Remove</button></div>
                      <input type="text" value={q.question} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], question: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Question text *" className={`${ic} w-full text-xs`} />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={q.type} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], type: e.target.value }; return { ...p, _questions: qs }; })} className={`${ic} w-full text-xs`}><option value="MCQ">Multiple Choice</option><option value="CHECKBOX">Checkbox (multi)</option><option value="TRUE_FALSE">True / False</option><option value="SHORT_ANSWER">Short Answer</option></select>
                        <input type="number" min={1} value={q.points} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], points: Number(e.target.value) }; return { ...p, _questions: qs }; })} className={`${ic} w-full text-xs`} placeholder="Points" />
                      </div>
                      {(q.type === "MCQ" || q.type === "CHECKBOX") && (
                        <div className="space-y-1">{q.options.map((opt, oi) => (<input key={oi} type="text" value={opt} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; const opts = [...qs[qi].options]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; return { ...p, _questions: qs }; })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className={`${ic} w-full text-xs`} />))}</div>
                      )}
                      <input type="text" value={q.correctAnswer} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], correctAnswer: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Correct answer *" className={`${ic} w-full text-xs`} />
                      <input type="text" value={q.explanation} onChange={(e) => setAddLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], explanation: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Explanation (optional)" className={`${ic} w-full text-xs`} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setAddingLessonForCourse(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={handleAddLesson} disabled={addLessonSaving || addLessonUploading || !addLessonForm.title} className="px-6 py-2 text-sm font-bold text-white bg-[#192C67] rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                  {addLessonSaving ? "Saving..." : addLessonUploading ? "Uploading..." : "Add Lesson"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Lesson Modal ── */}
      {editingLesson && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[5vh] pb-[5vh] bg-black/50 backdrop-blur-sm" onClick={() => { if (!savingLesson) setEditingLesson(null); }}>
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl my-auto max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Lesson</h3>
              <button onClick={() => { if (!savingLesson) setEditingLesson(null); }} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" value={editLessonForm.title} onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })} className={`${ic} w-full`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows={2} value={editLessonForm.description} onChange={(e) => setEditLessonForm({ ...editLessonForm, description: e.target.value })} className={`${ic} w-full resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
                  <select value={editLessonForm.contentType} onChange={(e) => setEditLessonForm({ ...editLessonForm, contentType: e.target.value })} className={`${ic} w-full`}>
                    {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                  <input type="number" min={1} value={editLessonForm.duration} onChange={(e) => setEditLessonForm({ ...editLessonForm, duration: Number(e.target.value) })} className={`${ic} w-full`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                  <input type="number" min={1} value={editLessonForm.sortOrder} onChange={(e) => setEditLessonForm({ ...editLessonForm, sortOrder: Number(e.target.value) })} className={`${ic} w-full`} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditLessonForm({ ...editLessonForm, isFree: !editLessonForm.isFree })} className={`w-11 h-6 rounded-full transition-colors ${editLessonForm.isFree ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${editLessonForm.isFree ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Free preview</label>
              </div>
              {editLessonForm.contentType === "VIDEO" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video URL (paste or upload)</label>
                  <input type="text" value={editLessonForm.videoUrl} onChange={(e) => setEditLessonForm((prev) => ({ ...prev, videoUrl: e.target.value }))} placeholder="https://..." disabled={uploadingLessonVideo} className={`${ic} w-full`} />
                  <input type="file" accept="video/*" disabled={uploadingLessonVideo} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadingLessonVideo(true);
                    addToast("info", `Uploading ${f.name} to S3 (please wait)...`);
                    try {
                      const url = await uploadFile(f);
                      if (!url) throw new Error("Upload returned empty URL");
                      console.log("[Upload] got URL:", url);
                      setEditLessonForm((prev) => { console.log("[Upload] setting prev.videoUrl from", prev.videoUrl, "to", url); return { ...prev, videoUrl: url }; });
                      addToast("success", "Video uploaded — click Save Changes");
                    } catch (err) {
                      console.error("Upload error:", err);
                      addToast("error", "Video upload failed — check console");
                    } finally {
                      setUploadingLessonVideo(false);
                    }
                  }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50" />
                  {uploadingLessonVideo && <p className="text-xs text-purple-600 dark:text-purple-400 animate-pulse">Uploading video... please wait, do not close this modal</p>}
                  {!uploadingLessonVideo && editLessonForm.videoUrl && <p className="text-xs text-green-600 break-all">✓ Uploaded: {editLessonForm.videoUrl}</p>}
                  {!uploadingLessonVideo && !editLessonForm.videoUrl && <p className="text-xs text-gray-400">Select a video file — it uploads directly to S3.</p>}
                </div>
              )}
              {editLessonForm.contentType === "TEXT" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                    <textarea rows={6} value={editLessonForm.content} onChange={(e) => setEditLessonForm({ ...editLessonForm, content: e.target.value })} className={`${ic} w-full resize-none font-mono`} placeholder="Write lesson content..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments (PPT, Word, PDF)</label>
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { addToast("info", `Uploading ${f.name}...`); const url = await uploadFile(f); setEditLessonForm({ ...editLessonForm, content: editLessonForm.content + `\n\n📎 Attachment: ${f.name}\n${url}` }); addToast("success", `${f.name} uploaded`); } catch { addToast("error", "Upload failed"); } } }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#192C67]/10 file:text-[#192C67] hover:file:bg-[#192C67]/20" />
                    <p className="text-[10px] text-gray-400 mt-1">Upload PPTs, Word docs, PDFs — the link will be appended to the content above.</p>
                  </div>
                </div>
              )}
              {editLessonForm.contentType === "ASSIGNMENT" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignment Instructions</label>
                    <textarea rows={4} value={editLessonForm.content} onChange={(e) => setEditLessonForm({ ...editLessonForm, content: e.target.value })} className={`${ic} w-full resize-none`} placeholder="Describe the assignment..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Files (PPT, Word, PDF)</label>
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { addToast("info", `Uploading ${f.name}...`); const url = await uploadFile(f); setEditLessonForm({ ...editLessonForm, content: editLessonForm.content + `\n\n📎 Reference: ${f.name}\n${url}` }); addToast("success", `${f.name} uploaded`); } catch { addToast("error", "Upload failed"); } } }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#192C67]/10 file:text-[#192C67] hover:file:bg-[#192C67]/20" />
                    <p className="text-[10px] text-gray-400 mt-1">Upload reference materials — links appended to instructions above.</p>
                  </div>
                </div>
              )}
              {editLessonForm.contentType === "QUIZ" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div><label className="block text-[11px] text-amber-700 dark:text-amber-400 mb-0.5 font-medium">Timer (min, 0 = no limit)</label><input type="number" min={0} value={editLessonForm.timeLimitMin} onChange={(e) => setEditLessonForm((p) => ({ ...p, timeLimitMin: Number(e.target.value) }))} className={`${ic} w-full text-xs`} /></div>
                    <div><label className="block text-[11px] text-amber-700 dark:text-amber-400 mb-0.5 font-medium">Max attempts (0 = unlimited)</label><input type="number" min={0} value={editLessonForm.maxAttempts} onChange={(e) => setEditLessonForm((p) => ({ ...p, maxAttempts: Number(e.target.value) }))} className={`${ic} w-full text-xs`} /></div>
                  </div>
                  {loadingEditQuestions ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 animate-pulse py-2">Loading questions...</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Questions ({editLessonForm._questions.length})</span>
                        <button type="button" onClick={() => setEditLessonForm((p) => ({ ...p, _questions: [...p._questions, emptyQuestion()] }))} className="text-xs font-medium text-[#192C67] dark:text-white/70 hover:underline">+ Add Question</button>
                      </div>
                      {editLessonForm._questions.map((q, qi) => (
                        <div key={qi} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                          <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-700 dark:text-gray-300">Q{qi + 1}</span><button type="button" onClick={() => setEditLessonForm((p) => ({ ...p, _questions: p._questions.filter((_, i) => i !== qi) }))} className="text-[10px] text-red-400 hover:text-red-600">Remove</button></div>
                          <input type="text" value={q.question} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], question: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Question text *" className={`${ic} w-full text-xs`} />
                          <div className="grid grid-cols-2 gap-2">
                            <select value={q.type} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], type: e.target.value }; return { ...p, _questions: qs }; })} className={`${ic} w-full text-xs`}><option value="MCQ">Multiple Choice</option><option value="CHECKBOX">Checkbox (multi)</option><option value="TRUE_FALSE">True / False</option><option value="SHORT_ANSWER">Short Answer</option></select>
                            <input type="number" min={1} value={q.points} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], points: Number(e.target.value) }; return { ...p, _questions: qs }; })} className={`${ic} w-full text-xs`} placeholder="Points" />
                          </div>
                          {(q.type === "MCQ" || q.type === "CHECKBOX") && (
                            <div className="space-y-1">{q.options.map((opt, oi) => (<input key={oi} type="text" value={opt} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; const opts = [...qs[qi].options]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; return { ...p, _questions: qs }; })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className={`${ic} w-full text-xs`} />))}</div>
                          )}
                          <input type="text" value={q.correctAnswer} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], correctAnswer: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Correct answer *" className={`${ic} w-full text-xs`} />
                          <input type="text" value={q.explanation} onChange={(e) => setEditLessonForm((p) => { const qs = [...p._questions]; qs[qi] = { ...qs[qi], explanation: e.target.value }; return { ...p, _questions: qs }; })} placeholder="Explanation (optional)" className={`${ic} w-full text-xs`} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingLesson(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                <button onClick={handleEditLesson} disabled={savingLesson || uploadingLessonVideo || loadingEditQuestions || !editLessonForm.title} className="px-6 py-2 text-sm font-bold text-white bg-[#192C67] rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                  {savingLesson ? "Saving..." : uploadingLessonVideo ? "Uploading..." : loadingEditQuestions ? "Loading questions…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
