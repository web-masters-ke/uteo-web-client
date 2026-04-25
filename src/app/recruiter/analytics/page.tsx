'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { applicationsService } from '@/lib/services/applications';
import type { Job, Application } from '@/lib/uteo-types';

const STATUS_ORDER = ['SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED'];
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:   'bg-blue-500',
  REVIEWED:    'bg-yellow-500',
  SHORTLISTED: 'bg-purple-500',
  INTERVIEW:   'bg-indigo-500',
  HIRED:       'bg-green-500',
  REJECTED:    'bg-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED:   'Applied',
  REVIEWED:    'Reviewed',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW:   'Interview',
  HIRED:       'Hired',
  REJECTED:    'Rejected',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    orange: 'bg-[#F77B0F]/10 text-[#F77B0F]',
    navy:   'bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-blue-400',
    green:  'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 text-lg font-bold ${colorMap[color]}`}>
        {typeof value === 'number' && value < 100 ? value : ''}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{count} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/analytics'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    Promise.all([
      jobsService.list({ limit: 100 }),
      applicationsService.list({ limit: 100 } as any),
    ]).then(([jobsData, appsData]) => {
      setJobs((jobsData as any)?.items ?? []);
      setApplications((appsData as any)?.items ?? []);
    }).finally(() => setLoading(false));
  }, [isAuthenticated, isRecruiter]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>;
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="animate-pulse h-32 rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      </div>
    );
  }

  // Compute stats
  const totalApps = applications.length;
  const byStatus: Record<string, number> = {};
  STATUS_ORDER.forEach((s) => { byStatus[s] = 0; });
  applications.forEach((a) => { if (byStatus[a.status] !== undefined) byStatus[a.status]++; });

  const activeJobs = jobs.filter((j) => j.status === 'ACTIVE').length;
  const hiredCount = byStatus['HIRED'] ?? 0;
  const conversionRate = totalApps > 0 ? ((hiredCount / totalApps) * 100).toFixed(1) : '0';

  // Average applications per job
  const avgApps = jobs.length > 0 ? (totalApps / jobs.length).toFixed(1) : '0';

  // Top performing jobs
  const topJobs = [...jobs]
    .filter((j) => (j._count?.applications ?? 0) > 0)
    .sort((a, b) => (b._count?.applications ?? 0) - (a._count?.applications ?? 0))
    .slice(0, 5);

  // Applications over time (last 30 days)
  const now = new Date();
  const daysAgo30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentApps = applications.filter((a) => new Date(a.appliedAt) >= daysAgo30);

  // Weekly buckets
  const weeks = [0, 1, 2, 3].map((w) => {
    const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const count = applications.filter((a) => {
      const d = new Date(a.appliedAt);
      return d >= start && d < end;
    }).length;
    return { label: w === 0 ? 'This week' : `${w}w ago`, count };
  }).reverse();

  const maxWeekCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your hiring pipeline at a glance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeJobs}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Active Jobs</div>
          <div className="text-xs text-gray-400 mt-1">{jobs.length} total posted</div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalApps}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Applications</div>
          <div className="text-xs text-gray-400 mt-1">avg {avgApps} per job</div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{hiredCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Hired</div>
          <div className="text-xs text-gray-400 mt-1">{conversionRate}% conversion</div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{byStatus['INTERVIEW'] ?? 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">In Interview</div>
          <div className="text-xs text-gray-400 mt-1">{byStatus['SHORTLISTED'] ?? 0} shortlisted</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Hiring Funnel</h2>
          <div className="space-y-4">
            {STATUS_ORDER.filter((s) => s !== 'REJECTED').map((status) => (
              <FunnelBar
                key={status}
                label={STATUS_LABELS[status]}
                count={byStatus[status] ?? 0}
                total={totalApps}
                color={STATUS_COLORS[status]}
              />
            ))}
          </div>
          {totalApps > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <span>Rejected: {byStatus['REJECTED'] ?? 0}</span>
              <span>Hire rate: {conversionRate}%</span>
            </div>
          )}
        </div>

        {/* Applications trend */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Applications (Last 4 Weeks)</h2>
          <div className="flex items-end gap-4 h-36">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{w.count}</span>
                <div className="w-full rounded-t-lg bg-[#F77B0F]/20 dark:bg-[#F77B0F]/30 transition-all" style={{ height: `${(w.count / maxWeekCount) * 100}px`, minHeight: w.count > 0 ? '8px' : '2px' }}>
                  <div className="w-full h-full rounded-t-lg bg-[#F77B0F]" />
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">{w.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
            {recentApps.length} applications in the last 30 days
          </div>
        </div>
      </div>

      {/* Top jobs */}
      {topJobs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top Jobs by Applications</h2>
          <div className="space-y-3">
            {topJobs.map((job, i) => {
              const count = job._count?.applications ?? 0;
              const maxCount = topJobs[0]._count?.applications ?? 1;
              return (
                <div key={job.id} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.title}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white ml-2 shrink-0">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F77B0F] transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <a href={`/recruiter/applications?jobId=${job.id}`} className="text-xs text-[#F77B0F] hover:underline shrink-0">View →</a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status breakdown table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Pipeline Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pb-3">Stage</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pb-3">Count</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pb-3">% of total</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pb-3">Drop-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {STATUS_ORDER.map((status, i) => {
                const count = byStatus[status] ?? 0;
                const pct = totalApps > 0 ? ((count / totalApps) * 100).toFixed(1) : '0';
                const prevCount = i > 0 ? (byStatus[STATUS_ORDER[i - 1]] ?? 0) : null;
                const dropOff = prevCount !== null && prevCount > 0
                  ? `${(((prevCount - count) / prevCount) * 100).toFixed(0)}%`
                  : '—';
                return (
                  <tr key={status}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                        <span className="text-gray-700 dark:text-gray-300">{STATUS_LABELS[status]}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">{count}</td>
                    <td className="py-3 text-right text-gray-500 dark:text-gray-400">{pct}%</td>
                    <td className="py-3 text-right text-gray-400 dark:text-gray-500">{dropOff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
