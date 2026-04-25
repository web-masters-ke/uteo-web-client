"use client";

import Link from "next/link";
import type { Performance } from "@/lib/services/performance";
import { TIER_COLORS } from "@/lib/services/performance";

interface PerformanceCardProps {
  performance: Performance;
  /** When true, show a "View details" link to /performance */
  showDetailsLink?: boolean;
  className?: string;
}

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

export default function PerformanceCard({ performance, showDetailsLink = true, className = "" }: PerformanceCardProps) {
  const tier = performance.tier;
  const colors = TIER_COLORS[tier];

  // Breakdown caps: completion/satisfaction = 30, disputes/responsiveness = 20 => totals 100
  const caps = { completion: 30, satisfaction: 30, disputes: 20, responsiveness: 20 };
  const breakdown = performance.scoreBreakdown || { completion: 0, satisfaction: 0, disputes: 0, responsiveness: 0 };

  const segments = [
    { key: "completion" as const, label: "Completion", value: breakdown.completion, cap: caps.completion, color: "bg-emerald-500" },
    { key: "satisfaction" as const, label: "Satisfaction", value: breakdown.satisfaction, cap: caps.satisfaction, color: "bg-[#F77B0F]" },
    { key: "disputes" as const, label: "Low disputes", value: breakdown.disputes, cap: caps.disputes, color: "bg-[#192C67]" },
    { key: "responsiveness" as const, label: "Responsiveness", value: breakdown.responsiveness, cap: caps.responsiveness, color: "bg-sky-500" },
  ];

  const composite = Math.max(0, Math.min(100, Math.round(performance.compositeScore || 0)));
  const completionRatePct = Math.round((performance.summary?.completionRate || 0) * 100);
  const disputeRatePct = (performance.disputes?.disputeRate || 0) * 100;

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">Performance</p>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trainer scorecard</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on last {typeof performance.period === "object" ? performance.period.days ?? 90 : 90} days
          </p>
        </div>
        {showDetailsLink && (
          <Link
            href="/performance"
            className="text-xs font-semibold text-[#192C67] dark:text-[#5b8bc7] hover:underline whitespace-nowrap"
          >
            View details
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
        {/* Tier badge */}
        <div
          className={`inline-flex flex-col items-center justify-center rounded-2xl px-6 py-4 ${colors.bg} ${colors.text} shadow-sm`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Tier</span>
          <span className="text-lg font-black tracking-wide">{tier}</span>
        </div>

        {/* Composite score */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-gray-900 dark:text-white">{composite}</span>
            <span className="text-lg font-semibold text-gray-400">/ 100</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Composite performance score</p>
        </div>
      </div>

      {/* 4-segment breakdown bar */}
      <div className="mb-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          {segments.map((s) => {
            const pct = (s.value / 100) * 100;
            return (
              <div
                key={s.key}
                className={s.color}
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                title={`${s.label}: ${s.value.toFixed(1)} / ${s.cap}`}
              />
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {segments.map((s) => {
            const percentOfCap = s.cap > 0 ? (s.value / s.cap) * 100 : 0;
            return (
              <div key={s.key} className="flex items-start gap-2">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${s.color}`} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {s.value.toFixed(1)}
                    <span className="text-xs text-gray-400 font-normal"> / {s.cap}</span>
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{Math.round(percentOfCap)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Bookings</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{performance.summary?.totalBookings ?? 0}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {performance.summary?.completedBookings ?? 0} completed ({completionRatePct}%)
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Revenue</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(performance.summary?.totalRevenue || 0)}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            avg {formatCurrency(performance.summary?.avgBookingValue || 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Avg rating</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {(performance.reviews?.avgRating ?? 0).toFixed(1)}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            from {performance.reviews?.count ?? 0} reviews
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Dispute rate</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{disputeRatePct.toFixed(1)}%</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {performance.disputes?.count ?? 0} total, {performance.disputes?.openCount ?? 0} open
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small public card used on the trainer profile page. Shows tier + composite only. */
export function PublicPerformanceCard({ performance, className = "" }: { performance: Performance; className?: string }) {
  const tier = performance.tier;
  const colors = TIER_COLORS[tier];
  const composite = Math.max(0, Math.min(100, Math.round(performance.compositeScore || 0)));

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${className}`}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${colors.bg} ${colors.text} shadow-sm`}>
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.77l-4.78 2.51.91-5.32L2.27 8.2l5.34-.78L10 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Performance tier</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{tier}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Composite score <span className="font-bold text-gray-900 dark:text-white">{composite}</span>
          <span className="text-gray-400"> / 100</span>
        </p>
      </div>
    </div>
  );
}
