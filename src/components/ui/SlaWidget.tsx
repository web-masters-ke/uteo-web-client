"use client";

import { useEffect, useState } from "react";
import { slaClientService, SlaAssignmentDetail } from "@/lib/services/sla";
import { cn } from "@/lib/utils";

function formatDue(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const absMins = Math.abs(Math.round(diffMs / 60_000));

  if (absMins < 60) return diffMs > 0 ? `${absMins}m remaining` : `${absMins}m overdue`;
  const absHrs = Math.round(absMins / 60);
  if (absHrs < 24) return diffMs > 0 ? `${absHrs}h remaining` : `${absHrs}h overdue`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_META: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  ACTIVE: { label: "On Track", dot: "bg-blue-500", bg: "bg-blue-500/5", border: "border-blue-200 dark:border-blue-800" },
  WARNING: { label: "At Risk", dot: "bg-[#F77B0F]", bg: "bg-[#F77B0F]/5", border: "border-[#F77B0F]/30" },
  BREACHED: { label: "SLA Breached", dot: "bg-red-500", bg: "bg-red-500/5", border: "border-red-300 dark:border-red-800" },
  MET: { label: "SLA Met", dot: "bg-green-500", bg: "bg-green-500/5", border: "border-green-200 dark:border-green-800" },
  PAUSED: { label: "Paused", dot: "bg-gray-400", bg: "bg-gray-100 dark:bg-gray-800/50", border: "border-gray-200 dark:border-gray-700" },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HIGH: "bg-[#F77B0F]/10 text-[#F77B0F]",
  CRITICAL: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function ProgressBar({ percent, breached }: { percent: number; breached?: boolean }) {
  const color = breached
    ? "bg-red-500"
    : percent >= 80
    ? "bg-[#F77B0F]"
    : percent >= 60
    ? "bg-amber-400"
    : "bg-green-500";
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

interface SlaWidgetProps {
  disputeId: string;
}

export default function SlaWidget({ disputeId }: SlaWidgetProps) {
  const [sla, setSla] = useState<SlaAssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    slaClientService
      .getForDispute(disputeId)
      .then((data) => { if (alive) setSla(data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [disputeId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    );
  }

  if (!sla) return null;

  const snap = sla.statusSnapshot;
  const meta = STATUS_META[sla.status] || STATUS_META.ACTIVE;
  const isFinal = sla.status === "MET" || sla.status === "BREACHED";

  return (
    <div className={cn("rounded-2xl border p-5 space-y-3 transition-all", meta.bg, meta.border)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SLA Status</h3>
        </div>
        <div className="flex items-center gap-2">
          {sla.policy && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", PRIORITY_COLORS[sla.policy.priority] || "bg-gray-100 text-gray-600")}>
              {sla.policy.priority}
            </span>
          )}
          <span
            className={cn(
              "text-[11px] font-bold px-2.5 py-1 rounded-full",
              sla.status === "BREACHED"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : sla.status === "WARNING"
                ? "bg-[#F77B0F]/15 text-[#F77B0F]"
                : sla.status === "MET"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : sla.status === "PAUSED"
                ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            )}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* Policy name */}
      {sla.policy && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Policy: <span className="font-medium text-gray-700 dark:text-gray-300">{sla.policy.name}</span>
        </p>
      )}

      {/* Breach / Met messages */}
      {sla.status === "BREACHED" && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">
            ⚠ This dispute has breached its SLA deadline. It has been escalated for urgent review.
          </p>
        </div>
      )}
      {sla.status === "WARNING" && snap?.minutesRemaining != null && (
        <div className="rounded-lg bg-[#F77B0F]/10 border border-[#F77B0F]/30 p-3">
          <p className="text-xs font-semibold text-[#F77B0F]">
            ⏰ Resolution deadline approaching — {snap.minutesRemaining} minutes remaining.
          </p>
        </div>
      )}
      {sla.status === "MET" && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300">
            ✓ This dispute was resolved within the SLA deadline.
          </p>
        </div>
      )}
      {sla.status === "PAUSED" && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            SLA clock is paused. Time spent paused: <strong>{sla.pausedDurationMins} minutes</strong>.
          </p>
        </div>
      )}

      {/* Progress bars */}
      {snap && !isFinal && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              <span>FIRST RESPONSE</span>
              <span>
                {sla.firstResponseAt
                  ? "✓ Responded"
                  : snap.firstResponseBreached
                  ? `Overdue ${snap.firstResponseOverdueByMins ?? 0}m`
                  : `${snap.firstResponsePercent}% elapsed`}
              </span>
            </div>
            <ProgressBar
              percent={snap.firstResponsePercent}
              breached={snap.firstResponseBreached}
            />
            {!sla.firstResponseAt && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Due: {formatDue(sla.firstResponseDue)}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              <span>RESOLUTION</span>
              <span>
                {snap.resolutionBreached
                  ? `Overdue ${snap.resolutionOverdueByMins ?? 0}m`
                  : snap.minutesRemaining != null
                  ? `${snap.minutesRemaining}m remaining`
                  : `${snap.resolutionPercent}% elapsed`}
              </span>
            </div>
            <ProgressBar
              percent={snap.resolutionPercent}
              breached={snap.resolutionBreached}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Deadline: {formatDue(sla.resolutionDue)}
            </p>
          </div>
        </div>
      )}

      {/* Final state summary */}
      {isFinal && sla.resolvedAt && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
            <p className="text-[10px] text-gray-400 uppercase mb-0.5">Resolved</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {new Date(sla.resolvedAt).toLocaleDateString(undefined, {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
          {sla.policy && (
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400 uppercase mb-0.5">SLA Target</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{sla.policy.resolutionHours}h</p>
            </div>
          )}
        </div>
      )}

      {/* Expandable escalations */}
      {sla.escalations && sla.escalations.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pt-2 border-t border-white/50 dark:border-gray-700"
          >
            <span>Escalations ({sla.escalations.length})</span>
            <svg
              className={cn("w-3 h-3 transition-transform", expanded ? "rotate-180" : "")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {sla.escalations.map(esc => (
                <div key={esc.id} className="flex items-center gap-2 text-[11px] bg-white/50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                    esc.reason === "RESOLUTION_BREACH"
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                      : "bg-[#F77B0F]/10 text-[#F77B0F]"
                  )}>
                    {esc.reason.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-500">→ {esc.escalatedTo.replace(/_/g, " ")}</span>
                  <span className="ml-auto text-gray-400">
                    {new Date(esc.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
