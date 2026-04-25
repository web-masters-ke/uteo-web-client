"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import {
  recommendationsService,
  type OnboardingRecommendations,
  type RecommendedTrainer,
  type RecommendedCourse,
} from "@/lib/services/recommendations";

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `KES ${Math.round(n || 0).toLocaleString()}`;
  }
}

function ScoreChip({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const color =
    pct >= 80
      ? "bg-emerald-500/90 text-white"
      : pct >= 60
      ? "bg-[#F77B0F]/90 text-white"
      : "bg-white/20 text-white";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${color}`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77l-4.78 2.51.91-5.32L2.27 8.2l5.34-.78L10 2z" />
      </svg>
      {pct}% match
    </span>
  );
}

function ReasonsBlock({ reasons }: { reasons: string[] }) {
  const [open, setOpen] = useState(false);
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#192C67] dark:text-white/70 hover:underline"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Why this? ({reasons.length})
      </button>
      {open && (
        <ul className="mt-2 space-y-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <svg className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Trainer card ── */
function TrainerRecommendationCard({ rec }: { rec: RecommendedTrainer }) {
  const t = rec.trainer || {};
  const u = t.user || t;
  const firstName = u.firstName || t.firstName || "";
  const lastName = u.lastName || t.lastName || "";
  const avatarUrl = u.avatarUrl || u.avatar || t.avatarUrl;
  const specialization = t.specialization || u.specialization;
  const rating = Number(t.rating ?? u.rating ?? 0);
  const totalReviews = t.totalReviews ?? t.reviewCount ?? 0;
  const hourlyRate = t.hourlyRate ?? u.hourlyRate ?? 0;
  const location = t.city || t.county || t.location || u.location || "Kenya";
  const trainerId = t.id || t.trainerId;
  const href = trainerId ? `/trainers/${trainerId}` : "/trainers";

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={avatarUrl} firstName={firstName} lastName={lastName} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {firstName} {lastName}
          </h3>
          {specialization && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{specialization}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <svg className="w-3 h-3 text-[#F77B0F]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
            <span className="text-gray-400">({totalReviews}) · {location}</span>
          </div>
        </div>
        <ScoreChip score={rec.score} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-sm font-bold text-[#192C67] dark:text-[#F77B0F]">
          {hourlyRate ? `${formatCurrency(hourlyRate)}/hr` : "Contact"}
        </span>
        <span className="text-xs font-semibold text-[#192C67] dark:text-white/70 group-hover:underline">View profile →</span>
      </div>

      <ReasonsBlock reasons={rec.reasons || []} />
    </Link>
  );
}

/* ── Course card — background image, no gradient fill ── */
function CourseRecommendationCard({ rec }: { rec: RecommendedCourse }) {
  const c = rec.course || {};
  const courseId = c.id || c.courseId;
  const href = courseId ? `/courses/${courseId}` : "/courses";

  // Try every plausible field name the backend might use
  const coverUrl =
    c.thumbnail || c.thumbnailUrl || c.coverUrl || c.coverImage || c.imageUrl || null;

  const price = c.price ?? 0;
  const enrollments = c.enrollmentCount ?? c._count?.enrollments ?? 0;
  const title = c.title || "Course";
  const level = c.level;

  return (
    <Link
      href={href}
      className="group block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Cover — background image, falls back to profile-hero if no thumbnail */}
      <div className="h-40 relative overflow-hidden">
        <img
          src={coverUrl || "/images/profile-hero.jpg"}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient only for text legibility, no solid colour */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3">
          <ScoreChip score={rec.score} />
        </div>
        {level && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
              {level}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {enrollments > 0 ? `${enrollments.toLocaleString()} enrolled` : "New course"}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#192C67] dark:text-[#F77B0F]">
            {price > 0 ? formatCurrency(price) : "Free"}
          </span>
          <span className="text-xs font-semibold text-[#192C67] dark:text-white/70 group-hover:underline">Enrol →</span>
        </div>
        <ReasonsBlock reasons={rec.reasons || []} />
      </div>
    </Link>
  );
}

/* ── Page ── */
export default function RecommendationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<OnboardingRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await recommendationsService.onboarding();
        if (cancelled) return;
        setData(res);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 404) { router.replace("/onboarding"); return; }
        setError(err?.response?.data?.message || err?.message || "Could not load recommendations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authLoading, user, router]);

  if (authLoading || loading) return <PageSkeleton />;
  if (!user) return null;

  const trainers = (data?.trainers || []).slice(0, 10);
  const courses = (data?.courses || []).slice(0, 6);

  return (
    <div className="max-w-[1400px] mx-auto pb-16">

      {/* ── Hero — background image, no colour fill ── */}
      <div
        className="relative overflow-hidden min-h-[260px] flex items-end px-6 lg:px-10 py-10"
        style={{ backgroundImage: "url(/images/performance-hero.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative z-10 max-w-2xl">
          <p className="text-[#F77B0F] text-xs font-bold uppercase tracking-[0.25em] mb-2">For You</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            {user.firstName ? `${user.firstName}'s picks` : "Your recommendations"}
          </h1>
          <p className="mt-2 text-white/70 text-sm max-w-md">
            Trainers and courses matched to your learning goals, skill level, and budget.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/onboarding?edit=1"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update my needs
            </Link>
            <Link
              href="/trainers"
              className="inline-flex items-center gap-2 rounded-full bg-[#F77B0F] text-white px-4 py-2 text-xs font-semibold hover:bg-[#e36d04] transition-colors"
            >
              Browse all trainers
            </Link>
          </div>
        </div>

        {/* Stats in hero top-right */}
        <div className="hidden sm:flex absolute right-8 top-1/2 -translate-y-1/2 gap-6 z-10">
          <div className="text-center">
            <p className="text-3xl font-black text-white">{trainers.length}</p>
            <p className="text-xs text-white/50 mt-0.5 font-medium">Trainer matches</p>
          </div>
          <div className="w-px bg-white/15" />
          <div className="text-center">
            <p className="text-3xl font-black text-[#F77B0F]">{courses.length}</p>
            <p className="text-xs text-white/50 mt-0.5 font-medium">Courses for you</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 mt-10 space-y-14">
        {error && (
          <p className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {/* ── Trainers ── */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top trainer matches</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Our strongest matches for your goals and budget.</p>
            </div>
            <Link href="/trainers" className="text-xs font-semibold text-[#192C67] dark:text-white/70 hover:underline shrink-0">
              See all →
            </Link>
          </div>
          {trainers.length === 0 ? (
            <EmptyState
              title="No trainer matches yet"
              description="Try adjusting your needs profile or browse the full directory."
              action={{ label: "Update my needs", onClick: () => router.push("/onboarding?edit=1") }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {trainers.map((rec, i) => (
                <TrainerRecommendationCard key={rec.trainer?.id || i} rec={rec} />
              ))}
            </div>
          )}
        </section>

        {/* ── Courses ── */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recommended courses</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Self-paced learning aligned to your goals.</p>
            </div>
            <Link href="/courses" className="text-xs font-semibold text-[#192C67] dark:text-white/70 hover:underline shrink-0">
              Browse all →
            </Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState
              title="No course matches yet"
              description="Check back once new courses are added, or explore the full library."
              action={{ label: "Browse courses", onClick: () => router.push("/courses") }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((rec, i) => (
                <CourseRecommendationCard key={rec.course?.id || i} rec={rec} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
