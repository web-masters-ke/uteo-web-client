"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { performanceService, type Performance, TIER_COLORS } from "@/lib/services/performance";

const PERIOD_OPTIONS = [
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 6 months" },
  { value: 365, label: "Last year" },
];

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `KES ${Math.round(n || 0).toLocaleString()}`;
  }
}

const BREAKDOWN_META = [
  {
    key: "completion" as const,
    label: "Completion",
    cap: 30,
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  {
    key: "satisfaction" as const,
    label: "Satisfaction",
    cap: 30,
    bar: "bg-[#F77B0F]",
    text: "text-[#F77B0F]",
    ring: "ring-[#F77B0F]/20",
  },
  {
    key: "disputes" as const,
    label: "Low disputes",
    cap: 20,
    bar: "bg-[#192C67]",
    text: "text-[#192C67] dark:text-[#7ba3e0]",
    ring: "ring-[#192C67]/20",
  },
  {
    key: "responsiveness" as const,
    label: "Responsiveness",
    cap: 20,
    bar: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
];

export default function PerformancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState(90);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await performanceService.getMine(period);
        if (!cancelled) setPerf(res);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled)
          setError(e?.response?.data?.message || e?.message || "Could not load performance");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, period]);

  if (authLoading || loading) return <PageSkeleton />;
  if (!user) return null;

  const composite = perf
    ? Math.max(0, Math.min(100, Math.round(perf.compositeScore || 0)))
    : 0;
  const tier = perf?.tier ?? "BRONZE";
  const tierColors = TIER_COLORS[tier];
  const breakdown = perf?.scoreBreakdown ?? {
    completion: 0,
    satisfaction: 0,
    disputes: 0,
    responsiveness: 0,
  };
  const completionRatePct = Math.round((perf?.summary?.completionRate || 0) * 100);
  const disputeRatePct = ((perf?.disputes?.disputeRate || 0) * 100).toFixed(1);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 lg:px-10 py-10"
        style={{
          backgroundImage: "url('/images/performance-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay + decorative SVG on top of photo */}
        <div className="pointer-events-none absolute inset-0">
          <svg
            className="w-full h-full"
            viewBox="0 0 1200 340"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="photoOverlay" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#000000" stopOpacity="0.78" />
                <stop offset="55%"  stopColor="#000000" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
              </linearGradient>
              <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F77B0F" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#F77B0F" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Photo overlay — left darker for text, right lighter to show image */}
            <rect width="1200" height="340" fill="url(#photoOverlay)" />

            {/* Concentric score rings — right side */}
            <g transform="translate(960,170)" opacity="0.22">
              <circle cx="0" cy="0" r="55"  fill="none" stroke="#F77B0F" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="105" fill="none" stroke="#F77B0F" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="155" fill="none" stroke="rgba(255,200,120,0.7)" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="210" fill="none" stroke="rgba(255,200,120,0.4)" strokeWidth="0.4" />
              <circle cx="0" cy="0" r="265" fill="none" stroke="rgba(255,200,120,0.25)" strokeWidth="0.3" />
              <line x1="-265" y1="0" x2="265" y2="0" stroke="#F77B0F" strokeWidth="0.4" opacity="0.35" />
              <line x1="0" y1="-265" x2="0" y2="265" stroke="#F77B0F" strokeWidth="0.4" opacity="0.35" />
              <line x1="-187" y1="-187" x2="187" y2="187" stroke="#F77B0F" strokeWidth="0.3" opacity="0.2" />
              <line x1="187" y1="-187" x2="-187" y2="187" stroke="#F77B0F" strokeWidth="0.3" opacity="0.2" />
              <circle cx="0" cy="0" r="5"  fill="#F77B0F" opacity="0.9" />
              <circle cx="0" cy="0" r="10" fill="none" stroke="#F77B0F" strokeWidth="1.5" opacity="0.5" />
            </g>
            <ellipse cx="960" cy="170" rx="130" ry="130" fill="url(#ringGlow)" />

            {/* Horizontal scan lines — lower band */}
            <g opacity="0.05">
              {[0,8,16,24,32].map((y) => (
                <line key={y} x1="0" y1={300+y} x2="1200" y2={300+y} stroke="white" strokeWidth="1" />
              ))}
            </g>

            {/* Particles — warm tones only */}
            <circle cx="80"  cy="30"  r="2"   fill="#F77B0F" opacity="0.5" />
            <circle cx="260" cy="55"  r="1.5" fill="white"   opacity="0.3" />
            <circle cx="460" cy="20"  r="1"   fill="#F77B0F" opacity="0.4" />
            <circle cx="620" cy="70"  r="2"   fill="white"   opacity="0.2" />
            <circle cx="750" cy="25"  r="1.5" fill="#F77B0F" opacity="0.45"/>
            <circle cx="110" cy="190" r="1.5" fill="white"   opacity="0.2" />
            <circle cx="380" cy="250" r="2"   fill="#F77B0F" opacity="0.3" />
            <circle cx="550" cy="290" r="1"   fill="white"   opacity="0.18"/>
            <circle cx="690" cy="300" r="1.5" fill="#F77B0F" opacity="0.28"/>
            <circle cx="200" cy="310" r="1"   fill="white"   opacity="0.15"/>

            {/* Trophy silhouette */}
            <g transform="translate(855,22)" opacity="0.15" fill="rgba(255,200,120,1)">
              <path d="M50 0h100v88c0 41.42-22.39 75-50 75s-50-33.58-50-75V0z"/>
              <path d="M50 20H28c0 27.61 14.74 50 32.86 50" stroke="rgba(255,200,120,1)" strokeWidth="10" strokeLinecap="round" fill="none"/>
              <path d="M150 20h22c0 27.61-14.74 50-32.86 50" stroke="rgba(255,200,120,1)" strokeWidth="10" strokeLinecap="round" fill="none"/>
              <rect x="90" y="163" width="20" height="32" rx="4"/>
              <rect x="62" y="192" width="76" height="16" rx="8"/>
              <path d="M100 -22l3.86 11.88H117l-10.1 7.34 3.86 11.88L100 2.76l-10.76 7.34 3.86-11.88L83 -10.12h13.14L100-22z" fill="#F77B0F"/>
            </g>
          </svg>
        </div>


        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#F77B0F] mb-2 drop-shadow-sm">
                Trainer performance
              </p>
              <h1
                className="text-4xl sm:text-5xl font-black text-white leading-tight"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}
              >
                Your scorecard
              </h1>
              <p className="mt-3 text-sm font-semibold text-white max-w-lg"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                Completion, satisfaction, disputes and responsiveness — tracked
                continuously so clients and you always know where you stand.
              </p>
            </div>

            <div className="relative flex items-center gap-2" ref={periodRef}>
              <label className="text-xs font-bold text-white/80">Period</label>
              <button
                onClick={() => setPeriodOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/40 backdrop-blur-sm px-3 py-2 text-sm font-semibold text-white hover:bg-black/55 transition-colors outline-none focus:ring-2 focus:ring-[#F77B0F]/40"
              >
                {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
                <svg
                  className={`w-3.5 h-3.5 text-white/50 transition-transform ${periodOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {periodOpen && (
                <div className="absolute top-full right-0 mt-1.5 z-50 w-44 rounded-xl border border-white/15 bg-[#1a2f72] shadow-2xl overflow-hidden">
                  {PERIOD_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => { setPeriod(o.value); setPeriodOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        o.value === period
                          ? "bg-white/15 text-white font-semibold"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hero stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-black/40 border border-white/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
                Composite score
              </p>
              <p className="text-2xl font-black text-white">
                {composite}
                <span className="text-sm font-normal text-white/40 ml-1">/ 100</span>
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
                Tier
              </p>
              <p
                className="text-2xl font-black"
                style={{ color: tierColors.hex }}
              >
                {tier}
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
                Bookings
              </p>
              <p className="text-2xl font-black text-white">
                {perf?.summary?.totalBookings ?? "—"}
                <span className="text-sm font-normal text-white/40 ml-1">
                  total
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
                Avg rating
              </p>
              <p className="text-2xl font-black text-white">
                {perf ? (perf.reviews?.avgRating ?? 0).toFixed(1) : "—"}
                <span className="text-[#F77B0F] ml-1 text-lg">★</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        {error && (
          <p className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {!perf && !error && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No performance data yet. Complete some bookings to see your scorecard.
            </p>
          </div>
        )}

        {perf && (
          <>
            {/* Score breakdown */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Score breakdown
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    How your composite score of {composite}/100 is built across 4 dimensions
                  </p>
                </div>
                <span className="text-3xl font-black text-zinc-900 dark:text-white">
                  {composite}
                  <span className="text-sm font-normal text-zinc-400 ml-0.5">/ 100</span>
                </span>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700 mb-5">
                {BREAKDOWN_META.map((s) => {
                  const pct = (breakdown[s.key] / 100) * 100;
                  return (
                    <div
                      key={s.key}
                      className={s.bar}
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      title={`${s.label}: ${breakdown[s.key].toFixed(1)} / ${s.cap}`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {BREAKDOWN_META.map((s) => {
                  const val = breakdown[s.key];
                  const pctOfCap = s.cap > 0 ? (val / s.cap) * 100 : 0;
                  return (
                    <div
                      key={s.key}
                      className={`rounded-xl border border-zinc-100 dark:border-zinc-700 p-4 ring-1 ${s.ring}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2 w-2 rounded-full ${s.bar}`} />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {s.label}
                        </p>
                      </div>
                      <p className={`text-xl font-black ${s.text}`}>
                        {val.toFixed(1)}
                        <span className="text-xs text-zinc-400 font-normal ml-0.5">/ {s.cap}</span>
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.bar}`}
                          style={{ width: `${Math.round(pctOfCap)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {Math.round(pctOfCap)}% of cap
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bookings + Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Bookings
                </p>
                <p className="text-4xl font-black text-zinc-900 dark:text-white">
                  {perf.summary?.totalBookings ?? 0}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {perf.summary?.completedBookings ?? 0} completed
                  </span>
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                  {completionRatePct}% completion rate
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Revenue earned
                </p>
                <p className="text-4xl font-black text-zinc-900 dark:text-white">
                  {formatCurrency(perf.summary?.totalRevenue || 0)}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
                  avg {formatCurrency(perf.summary?.avgBookingValue || 0)} per booking
                </p>
              </div>
            </div>

            {/* Responsiveness + Disputes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">
                  Responsiveness
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Avg first reply
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                      {perf.responsiveness?.avgFirstResponseMins ?? 0}
                      <span className="text-sm font-normal text-zinc-400 ml-0.5">min</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Samples
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                      {perf.responsiveness?.samplesConsidered ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Disputes</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Dispute rate
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                      {disputeRatePct}
                      <span className="text-sm font-normal text-zinc-400 ml-0.5">%</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Open / total
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                      {perf.disputes?.openCount ?? 0}
                      <span className="text-sm font-normal text-zinc-400 ml-0.5">
                        / {perf.disputes?.count ?? 0}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating distribution */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Rating distribution
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    From {perf.reviews?.count ?? 0} reviews
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white">
                    {(perf.reviews?.avgRating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[#F77B0F] text-xl">★</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = perf.reviews?.ratingDistribution?.[star] ?? 0;
                  const total = perf.reviews?.count ?? 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-4 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                        {star}
                      </span>
                      <span className="text-[#F77B0F] text-xs leading-none">★</span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F77B0F]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pb-4">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                ← Back to dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
