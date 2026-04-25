"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import RatingStars from "@/components/ui/RatingStars";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import Modal from "@/components/ui/Modal";
import FollowButton from "@/components/FollowButton";
import FavoriteButton from "@/components/FavoriteButton";
import { PublicPerformanceCard } from "@/components/performance/PerformanceCard";
import { Trainer, Review, RatingDistribution } from "@/lib/types";
import { trainerService } from "@/lib/services/trainers";
import { reviewService } from "@/lib/services/reviews";
import { bookingService } from "@/lib/services/bookings";
import { followsService, type FollowUser } from "@/lib/services/follows";
import { performanceService, type Performance } from "@/lib/services/performance";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { formatCurrency, DAYS_OF_WEEK, formatDate } from "@/lib/utils";

type TabKey = "overview" | "courses" | "reviews" | "followers" | "portfolio";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "portfolio", label: "Portfolio" },
  { key: "courses", label: "Courses" },
  { key: "reviews", label: "Reviews" },
  { key: "followers", label: "Followers" },
];

// ─── Availability Calendar ──────────────────────────────────────────────────
function AvailabilityCalendar({ availability, trainerId }: { availability: any[]; trainerId: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

  // Build available day-of-week set (0-6)
  const availableDows = new Set(availability.map((s) => s.dayOfWeek));

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{MONTH_NAMES[month]} {year}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-gray-400 pb-1">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const dow = (firstDay + day - 1) % 7;
          const isAvail = availableDows.has(dow);
          const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <Link
              key={i}
              href={isAvail && !isPast ? `/book/${trainerId}?date=${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '#'}
              onClick={(!isAvail || isPast) ? (e) => e.preventDefault() : undefined}
              className={`text-xs rounded-lg py-1.5 font-medium transition-colors ${
                isPast ? 'text-gray-300 dark:text-gray-700 cursor-default' :
                isAvail ? 'bg-[#192C67] text-white hover:bg-[#162d4a] cursor-pointer' :
                'text-gray-400 dark:text-gray-600 cursor-default'
              }`}
            >
              {day}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#192C67] inline-block" />Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700 inline-block" />Unavailable</span>
      </div>
    </div>
  );
}

// ─── AI Ranking Badges ──────────────────────────────────────────────────────
function AIBadges({ trainer }: { trainer: any }) {
  const badges: { label: string; color: string }[] = [];

  if (Number(trainer.rating || 0) >= 4.5 && Number(trainer.reviewCount || 0) >= 5) {
    const skill = typeof trainer.skills?.[0] === 'string' ? trainer.skills[0] : trainer.skills?.[0]?.name;
    badges.push({ label: skill ? `Top Rated in ${skill}` : 'Top Rated', color: 'bg-[#F77B0F] text-white' });
  }
  if ((trainer.availability || []).length >= 5) {
    badges.push({ label: 'Highly Available', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' });
  }
  if (trainer.isVerified) {
    badges.push({ label: 'Verified Trainer', color: 'bg-[#192C67] text-white' });
  }
  if (Number(trainer.experience || 0) >= 5) {
    badges.push({ label: `${trainer.experience}+ Years Experience`, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export default function TrainerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [ratingDist, setRatingDist] = useState<RatingDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");

  // Performance (tier + composite only shown publicly)
  const [performance, setPerformance] = useState<Performance | null>(null);

  // Followers
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followersTotalPages, setFollowersTotalPages] = useState(1);
  const [followersLoading, setFollowersLoading] = useState(false);

  // Courses (best-effort)
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Portfolio
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<any | null>(null);

  // Org affiliations
  const [orgs, setOrgs] = useState<any[]>([]);

  // Write a review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookings, setReviewBookings] = useState<any[]>([]);
  const [reviewBookingsLoading, setReviewBookingsLoading] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const openReviewModal = async () => {
    setShowReviewModal(true);
    setReviewRating(0);
    setReviewComment('');
    setSelectedBookingId('');
    setReviewBookingsLoading(true);
    try {
      const res = await bookingService.list({ trainerId: id, status: 'COMPLETED' } as any);
      const items = (res as any).items ?? (Array.isArray(res) ? res : []);
      setReviewBookings(items);
      if (items.length === 1) setSelectedBookingId(items[0].id);
    } catch {
      setReviewBookings([]);
    } finally {
      setReviewBookingsLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedBookingId || reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      await reviewService.create({ bookingId: selectedBookingId, rating: reviewRating, comment: reviewComment || undefined });
      addToast('success', 'Review submitted — thank you!');
      setShowReviewModal(false);
      // Refresh reviews list and jump to that tab
      const rv = await reviewService.getTrainerReviews(id, { page: 1, limit: 5 });
      const items = Array.isArray(rv) ? rv : (rv as any)?.items ?? [];
      setReviews(items);
      setReviewsTotalPages((rv as any)?.totalPages ?? 1);
      setTab('reviews');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to submit review. You may have already reviewed this booking.');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      trainerService.getById(id),
      reviewService.getTrainerReviews(id, { page: 1, limit: 5 }),
      reviewService.getRatingDistribution(id),
    ]).then(([t, r, d]) => {
      if (t.status === "fulfilled") {
        const tr = t.value as any;
        setTrainer(tr);
        // Org affiliations — try embedded first, then dedicated endpoint
        const embedded = tr?.organizations ?? tr?.firms ?? tr?.teamMemberships ?? tr?.orgMemberships ?? [];
        if (embedded.length > 0) {
          setOrgs(embedded);
        } else {
          import("@/lib/api").then(({ default: api }) =>
            api.get(`/trainers/${id}/organizations`).then((res: any) => {
              const list = Array.isArray(res) ? res : res?.data ?? [];
              if (list.length > 0) setOrgs(list);
            }).catch(() => {})
          );
        }
      } else {
        setError("Trainer not found");
      }
      if (r.status === "fulfilled") { const rv = r.value; const items = Array.isArray(rv) ? rv : rv?.items ?? []; setReviews(items); setReviewsTotalPages(rv?.totalPages ?? 1); }
      if (d.status === "fulfilled") setRatingDist(d.value);
    }).finally(() => setLoading(false));
  }, [id]);


  // Fetch performance for the public card once we know the trainer's userId
  useEffect(() => {
    if (!trainer) return;
    const userId = (trainer as any).userId || (trainer as any).user?.id;
    if (!userId) return;
    performanceService
      .getForUser(userId)
      .then(setPerformance)
      .catch(() => setPerformance(null));
  }, [trainer]);

  useEffect(() => {
    if (reviewsPage === 1) return;
    reviewService.getTrainerReviews(id, { page: reviewsPage, limit: 5 }).then((d: any) => { const items = Array.isArray(d) ? d : d?.items ?? []; setReviews(items); setReviewsTotalPages(d?.totalPages ?? 1); }).catch(() => {});
  }, [reviewsPage, id]);

  // Load followers when followers tab opens
  useEffect(() => {
    if (tab !== "followers" || !trainer) return;
    const userId = (trainer as any).userId || (trainer as any).user?.id;
    if (!userId) return;
    setFollowersLoading(true);
    followsService
      .followers(userId, { page: followersPage, limit: 20 })
      .then((res) => {
        setFollowers(res.items || []);
        setFollowersTotalPages(res.totalPages || 1);
      })
      .catch(() => setFollowers([]))
      .finally(() => setFollowersLoading(false));
  }, [tab, trainer, followersPage]);

  // Load portfolio when portfolio tab opens
  useEffect(() => {
    if (tab !== "portfolio" || !trainer) return;
    setPortfolioLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/trainers/${id}/portfolio`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const env = d?.data ?? d;
        setPortfolio(Array.isArray(env) ? env : env?.items ?? []);
      })
      .catch(() => {
        // Fallback: use portfolio items from trainer object if available
        const items = (trainer as any).portfolio || (trainer as any).portfolioItems || [];
        setPortfolio(items);
      })
      .finally(() => setPortfolioLoading(false));
  }, [tab, trainer, id]);

  // Load courses when courses tab opens
  useEffect(() => {
    if (tab !== "courses" || !trainer) return;
    setCoursesLoading(true);
    const userId = (trainer as any).userId || (trainer as any).user?.id;
    // Best effort: try trainer-scoped endpoint, fall back to filtered /courses
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/trainers/${id}/courses`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const env = d?.data ?? d;
        const items = Array.isArray(env) ? env : env?.items ?? [];
        setCourses(items);
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
    void userId;
  }, [tab, trainer, id]);

  if (loading) return <PageSkeleton />;
  if (error || !trainer) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{error || "Not found"}</h1><Link href="/trainers" className="text-[#F77B0F] font-medium">Browse Trainers</Link></div>;

  const totalRatings = ratingDist ? Object.values(ratingDist).reduce((a, b) => a + b, 0) : 0;
  const trainerUserId = (trainer as any).userId || (trainer as any).user?.id || "";

  // Resolve name + avatar from either flat fields or nested user object
  const t = trainer as any;
  const firstName  = t.firstName  || t.user?.firstName  || "";
  const lastName   = t.lastName   || t.user?.lastName   || "";
  const avatarUrl  = t.avatarUrl  || t.user?.avatarUrl  || t.user?.avatar || "";
  const isVerified = t.isVerified ?? t.user?.isVerified ?? t.verificationStatus === "VERIFIED";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/trainers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Trainers
      </Link>
      <div className="lg:flex gap-8">
        <div className="flex-1 space-y-6">
          {/* Hero */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar src={avatarUrl} firstName={firstName} lastName={lastName} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{firstName} {lastName}</h1>
                  {isVerified && <Badge variant="accent">Verified</Badge>}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {trainerUserId && <FollowButton userId={trainerUserId} />}
                  {trainerUserId && (
                    <FavoriteButton
                      trainerUserId={trainerUserId}
                      iconOnly={false}
                      className="!rounded-full !px-4 !py-2 !text-xs !font-semibold border border-gray-200 dark:border-gray-600"
                    />
                  )}
                </div>
                {trainer.specialization && <p className="text-gray-500 dark:text-gray-400 mb-2">{trainer.specialization}</p>}
                <div className="flex items-center gap-2 mb-3"><RatingStars rating={trainer.rating || 0} size="sm" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{Number(trainer.rating || 0).toFixed(1)}</span><span className="text-sm text-gray-500">({trainer.reviewCount || 0} reviews)</span></div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {trainer.location && <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>{trainer.location}</span>}
                  {trainer.experience && <span>{trainer.experience} years exp</span>}
                  {trainer.hourlyRate && <span className="font-semibold text-[#F77B0F] dark:text-[#F77B0F]/80">{formatCurrency(trainer.hourlyRate)}/hr</span>}
                </div>
              </div>
            </div>
          </div>

          {/* AI ranking badges — below hero card */}
          <AIBadges trainer={trainer} />

          {/* Intro video — shown if trainer has introVideoUrl */}
          {(trainer as any).introVideoUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 pt-5 pb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Intro Video</h2>
              </div>
              <video
                src={(trainer as any).introVideoUrl}
                controls
                className="w-full max-h-80 bg-black"
                poster={(trainer as any).introVideoThumbnail || undefined}
              />
            </div>
          )}

          {/* Public performance card - below avatar, above bio */}
          {performance && <PublicPerformanceCard performance={performance} />}

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "text-[#192C67] dark:text-white/70 border-b-2 border-[#192C67] dark:border-[#F77B0F]/50 bg-[#192C67]/5"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 sm:p-8">
              {/* Overview */}
              {tab === "overview" && (
                <div className="space-y-6">
                  {trainer.bio && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About</h2>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{trainer.bio}</p>
                    </div>
                  )}
                  {orgs.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Affiliated Organizations</h2>
                      <div className="space-y-2">
                        {orgs.map((org: any, i: number) => {
                          const name = org.name ?? org.orgName ?? org.firmName ?? org.organization?.name ?? org.firm?.name ?? "Organization";
                          const role = org.teamRole ?? org.role ?? org.memberRole;
                          const logo = org.logo ?? org.logoUrl ?? org.organization?.logo ?? org.firm?.logo;
                          const initials = name.slice(0, 2).toUpperCase();
                          return (
                            <div key={org.id ?? i} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 px-4 py-3">
                              {logo ? (
                                <img src={logo} alt={name} className="h-9 w-9 rounded-lg object-contain bg-white" />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-[#192C67] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                                {role && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role.toLowerCase().replace(/_/g, " ")}</p>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(trainer.skills || []).length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {trainer.skills.map((s: any, i: number) => {
                          const skillName = typeof s === "string"
                            ? s
                            : s?.skill?.name || s?.name || s?.skillId || "";
                          if (!skillName) return null;
                          return (
                            <Badge key={s?.id || s?.skillId || skillName || i} variant="primary" size="md">
                              {skillName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(trainer.certifications || []).length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Credentials & Certifications</h2>
                      <div className="space-y-3">
                        {trainer.certifications.map((cert: any) => {
                          const isVerified = cert.verificationStatus === "APPROVED" || cert.verified;
                          return (
                            <div key={cert.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                              <div className="shrink-0 mt-0.5">
                                {isVerified ? (
                                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{cert.name}</p>
                                  {isVerified && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cert.issuer}{cert.year ? ` - ${cert.year}` : ""}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(trainer.availability || []).length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Availability</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weekly slots */}
                        <div className="space-y-2">
                          {DAYS_OF_WEEK.map((day, i) => {
                            const slots = trainer.availability.filter((s) => s.dayOfWeek === i);
                            return (
                              <div key={day} className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <span className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300">{day}</span>
                                {slots.length > 0 ? (
                                  <div className="flex gap-2">
                                    {slots.map((s) => (
                                      <Badge key={s.id} variant="accent" size="sm">{s.startTime}-{s.endTime}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">Unavailable</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Calendar */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Book a Date</p>
                          <AvailabilityCalendar availability={trainer.availability} trainerId={trainer.id} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Portfolio */}
              {tab === "portfolio" && (
                <div>
                  {portfolioLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading portfolio...</div>
                  ) : portfolio.length === 0 ? (
                    <EmptyState title="No portfolio items" description="This trainer hasn't uploaded any portfolio items yet." />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {portfolio.map((item: any, i: number) => {
                        const url = item.url || item.fileUrl || item.mediaUrl || '';
                        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) || item.type === 'IMAGE';
                        const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url) || item.type === 'VIDEO';
                        const isPdf = /\.pdf(\?|$)/i.test(url) || item.type === 'DOCUMENT';
                        return (
                          <button
                            key={item.id || i}
                            onClick={() => setLightboxItem(item)}
                            className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-[#192C67] transition-colors aspect-square bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center"
                          >
                            {isImage ? (
                              <img src={url} alt={item.title || `Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                            ) : isVideo ? (
                              <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                <svg className="w-10 h-10 text-[#192C67] dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                                <span className="text-xs font-medium">{item.title || 'Video'}</span>
                              </div>
                            ) : isPdf ? (
                              <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                <span className="text-xs font-medium">{item.title || 'Document'}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-gray-400">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                <span className="text-xs font-medium">{item.title || 'File'}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Lightbox */}
                  {lightboxItem && (() => {
                    const url = lightboxItem.url || lightboxItem.fileUrl || lightboxItem.mediaUrl || '';
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) || lightboxItem.type === 'IMAGE';
                    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url) || lightboxItem.type === 'VIDEO';
                    return (
                      <div
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setLightboxItem(null)}
                      >
                        <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setLightboxItem(null)}
                            className="absolute -top-10 right-0 text-white text-sm font-medium flex items-center gap-1 hover:text-gray-300"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            Close
                          </button>
                          {isImage && <img src={url} alt={lightboxItem.title || ''} className="max-h-[80vh] mx-auto rounded-xl object-contain" />}
                          {isVideo && <video src={url} controls autoPlay className="max-h-[80vh] mx-auto rounded-xl w-full" />}
                          {!isImage && !isVideo && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                              <p className="font-semibold text-gray-900 dark:text-white mb-4">{lightboxItem.title || 'Document'}</p>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#192C67] text-white rounded-lg font-medium hover:bg-[#162d4a]">Download</a>
                            </div>
                          )}
                          {lightboxItem.title && <p className="text-white text-center mt-3 text-sm">{lightboxItem.title}</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Courses */}
              {tab === "courses" && (
                <>
                  {coursesLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading courses...</div>
                  ) : courses.length === 0 ? (
                    <EmptyState title="No courses yet" description="This trainer hasn't published any courses." />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {courses.map((c: any) => (
                        <Link
                          key={c.id}
                          href={`/courses/${c.id}`}
                          className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-[#192C67] transition-colors"
                        >
                          <p className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{c.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.description}</p>
                          <p className="mt-2 text-sm font-bold text-[#192C67] dark:text-white/70">
                            {c.price ? formatCurrency(c.price) : "Free"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reviews */}
              {tab === "reviews" && (
                <div>
                  {ratingDist && totalRatings > 0 && (
                    <div className="flex items-center gap-8 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">{Number(trainer.rating || 0).toFixed(1)}</p>
                        <RatingStars rating={trainer.rating || 0} size="sm" className="mt-1" />
                        <p className="text-sm text-gray-500 mt-1">{totalRatings} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {([5, 4, 3, 2, 1] as const).map((star) => (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-sm w-3 text-gray-600 dark:text-gray-400">{star}</span>
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-secondary-500 rounded-full" style={{ width: `${totalRatings > 0 ? (ratingDist[star] / totalRatings) * 100 : 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{ratingDist[star]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(reviews || []).length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((r) => (
                        <div key={r.id} className="pb-6 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3 mb-2">
                            {r.reviewer && <Avatar src={r.reviewer.avatarUrl} firstName={r.reviewer.firstName} lastName={r.reviewer.lastName} size="sm" />}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "User"}</p>
                              <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                            </div>
                          </div>
                          <RatingStars rating={r.rating} size="sm" className="mb-2" />
                          <p className="text-gray-600 dark:text-gray-300 text-sm">{r.comment}</p>
                          {/* Trainer reply */}
                          {(r as any).trainerResponse && (
                            <div className="mt-3 ml-6 pl-4 border-l-2 border-[#192C67]/20 dark:border-[#192C67]/40">
                              <p className="text-[10px] font-semibold text-[#192C67] dark:text-white/70 mb-1">Trainer replied:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 italic">{(r as any).trainerResponse}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      <Pagination currentPage={reviewsPage} totalPages={reviewsTotalPages} onPageChange={setReviewsPage} />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No reviews yet.</p>
                  )}
                </div>
              )}

              {/* Followers */}
              {tab === "followers" && (
                <div>
                  {followersLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading followers...</div>
                  ) : followers.length === 0 ? (
                    <EmptyState title="No followers yet" description="Be the first to follow this trainer." />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {followers.map((f) => {
                          const firstName = f.firstName || "";
                          const lastName = f.lastName || "";
                          const specialization = f.specialization || f.trainerProfile?.specialization;
                          return (
                            <Link
                              key={f.id}
                              href={f.role === "TRAINER" && f.trainerProfile?.id ? `/trainers/${f.trainerProfile.id}` : "#"}
                              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-[#192C67] transition-colors"
                            >
                              <Avatar
                                src={f.avatarUrl || f.avatar}
                                firstName={firstName}
                                lastName={lastName}
                                size="md"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {firstName} {lastName}
                                </p>
                                {specialization && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{specialization}</p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      {followersTotalPages > 1 && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={followersPage}
                            totalPages={followersTotalPages}
                            onPageChange={setFollowersPage}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Write a Review Modal ─── */}
        <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title={`Review ${firstName} ${lastName}`} size="md">
          {reviewBookingsLoading ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading your sessions...</div>
          ) : reviewBookings.length === 0 ? (
            <div className="py-8 text-center px-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No completed sessions yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">You need to complete a session with {firstName} before you can leave a review.</p>
              <Link
                href={`/book/${trainer.id}`}
                onClick={() => setShowReviewModal(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#192C67] text-white rounded-xl font-semibold text-sm hover:bg-[#162d4a] transition-colors"
              >
                Book a Session
              </Link>
            </div>
          ) : (
            <div className="space-y-5 p-1">
              {reviewBookings.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Session to review</label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67]"
                  >
                    <option value="">Select a session...</option>
                    {reviewBookings.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {formatDate(b.scheduledAt || b.date || b.createdAt)} — {b.sessionType || 'Session'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setReviewHoverRating(star)}
                      onMouseLeave={() => setReviewHoverRating(0)}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <svg
                        className={`w-9 h-9 transition-colors ${(reviewHoverRating || reviewRating) >= star ? 'text-[#F77B0F]' : 'text-gray-300 dark:text-gray-600'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][reviewRating]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Comment <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder={`Share your experience with ${firstName}...`}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#192C67] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={!selectedBookingId || reviewRating === 0 || submittingReview}
                  className="px-5 py-2.5 rounded-xl bg-[#192C67] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 mt-6 lg:mt-0">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <p className="text-sm text-gray-500">Starting from</p>
              <p className="text-3xl font-bold text-[#F77B0F] dark:text-[#F77B0F]/80">{trainer.hourlyRate ? formatCurrency(trainer.hourlyRate) : "Contact"}</p>
              <p className="text-sm text-gray-500 mb-4">per hour</p>
              <Link href={`/book/${trainer.id}`} className="block w-full py-3 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#14234f] transition-colors text-center mb-2">Book This Trainer</Link>
              <Link href={`/messages?userId=${trainerUserId || id}&name=${encodeURIComponent(`${firstName} ${lastName}`.trim())}`} className="block w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center mb-2">Send Message</Link>
              {user?.role === 'CLIENT' && (
                <button
                  onClick={openReviewModal}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-2"
                >
                  <svg className="w-4 h-4 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Write a Review
                </button>
              )}
              {trainerUserId && (
                <FavoriteButton
                  trainerUserId={trainerUserId}
                  iconOnly={false}
                  className="w-full justify-center !rounded-xl !py-3 !text-sm !font-semibold border border-gray-200 dark:border-gray-600 !bg-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 !text-gray-600 dark:!text-gray-300 hover:!text-red-500 dark:hover:!text-red-400 hover:!border-red-300"
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
