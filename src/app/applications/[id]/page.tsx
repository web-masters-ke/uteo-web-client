'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { applicationsService } from '@/lib/services/applications';
import type { Application, ApplicationStatus } from '@/lib/uteo-types';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ORDER: ApplicationStatus[] = [
  'SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'HIRED',
];

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; description: string; color: string; bg: string }> = {
  SUBMITTED:   {
    label: 'Submitted',
    description: 'Your application has been received by the employer.',
    color: 'text-gray-600 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-600',
  },
  REVIEWED:    {
    label: 'Reviewed',
    description: 'The employer has viewed your application.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    description: "You've been shortlisted for further consideration.",
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500',
  },
  INTERVIEW:   {
    label: 'Interview',
    description: "You've been invited to interview. Check your email for details.",
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500',
  },
  HIRED:       {
    label: 'Hired',
    description: "Congratulations! You've been offered the position.",
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500',
  },
  REJECTED:    {
    label: 'Not Selected',
    description: 'The employer has decided not to proceed with your application at this time.',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500',
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function jobTypeLabel(type: string) {
  const map: Record<string, string> = {
    FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract',
    INTERNSHIP: 'Internship', REMOTE: 'Remote', HYBRID: 'Hybrid',
  };
  return map[type] ?? type;
}

// ─── Application Status Timeline ──────────────────────────────────────────────

function StatusTimeline({ status }: { status: ApplicationStatus }) {
  const isRejected = status === 'REJECTED';
  const currentIdx = isRejected
    ? STATUS_ORDER.length // Past "Interview" in rejected state
    : STATUS_ORDER.indexOf(status);

  const steps = isRejected
    ? [...STATUS_ORDER, 'REJECTED' as ApplicationStatus]
    : STATUS_ORDER;

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const cfg = STATUS_CONFIG[step];
          const isCompleted = isRejected
            ? (step === 'REJECTED' ? true : idx <= STATUS_ORDER.indexOf(status))
            : idx <= currentIdx;
          const isCurrent = isRejected ? step === 'REJECTED' : step === status;
          const isActive = isCompleted || isCurrent;

          return (
            <div key={step} className="relative flex items-start gap-3">
              {/* Dot */}
              <div
                className={`absolute -left-5 w-3 h-3 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
                  isCurrent
                    ? `${cfg.bg} border-transparent shadow-md`
                    : isCompleted
                    ? 'bg-[#192C67] dark:bg-[#5b8bc7] border-transparent'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
              />

              <div className={isActive ? '' : 'opacity-40'}>
                <p className={`text-sm font-semibold ${isCurrent ? cfg.color : 'text-gray-700 dark:text-gray-300'}`}>
                  {cfg.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cfg.description}</p>
                )}
              </div>

              {/* Pulse for current */}
              {isCurrent && (
                <span className={`absolute -left-5 w-3 h-3 rounded-full ${cfg.bg} opacity-50 animate-ping mt-0.5`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Application Detail Page ───────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    applicationsService.get(id)
      .then(setApplication)
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw this application? This cannot be undone.')) return;
    setWithdrawing(true);
    try {
      await applicationsService.withdraw(id);
      showToast('success', 'Application withdrawn.');
      setTimeout(() => router.push('/applications'), 1500);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Could not withdraw application.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) return <PageSkeleton />;
  if (error || !application) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{error || 'Application not found'}</h1>
      <Link href="/applications" className="text-[#192C67] dark:text-white/70 font-medium hover:underline">
        Back to Applications
      </Link>
    </div>
  );

  const job = application.job;
  const cfg = STATUS_CONFIG[application.status] ?? STATUS_CONFIG.SUBMITTED;
  const canWithdraw = !['HIRED', 'REJECTED'].includes(application.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Applications
      </Link>

      <div className="lg:flex gap-8">
        {/* Main */}
        <div className="flex-1 space-y-6">
          {/* Job card summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              {job?.company?.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#192C67] text-white text-base font-black flex items-center justify-center flex-shrink-0">
                  {(job?.company?.name ?? 'CO').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/companies/${job?.company?.id}`}
                  className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#192C67] dark:hover:text-[#5b8bc7] transition-colors"
                >
                  {job?.company?.name ?? 'Company'}
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{job?.title ?? 'Position'}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {job?.location && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {job.location}
                    </span>
                  )}
                  {job?.jobType && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{jobTypeLabel(job.jobType)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Applied on</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDateShort(application.appliedAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDateShort(application.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Current status banner */}
          <div className={`rounded-2xl border p-5 ${
            application.status === 'HIRED'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : application.status === 'REJECTED'
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              : 'border-[#192C67]/20 dark:border-[#F77B0F]/50/20 bg-[#192C67]/5 dark:bg-[#192C67]/10'
          }`}>
            <div className="flex items-center gap-3">
              {application.status === 'HIRED' && (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div>
                <p className={`text-sm font-bold ${cfg.color}`}>
                  Status: {cfg.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cfg.description}</p>
              </div>
            </div>
          </div>

          {/* Cover letter */}
          {application.coverLetter && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Your Cover Letter</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {application.coverLetter}
              </p>
            </div>
          )}

          {/* Resume link */}
          {application.resumeUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Resume</h2>
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#192C67] dark:text-white/70 font-medium hover:underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Resume
              </a>
            </div>
          )}

          {/* Withdraw */}
          {canWithdraw && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Withdraw Application</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Changed your mind? You can withdraw this application. This action cannot be undone.
              </p>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Timeline */}
        <aside className="w-full lg:w-64 flex-shrink-0 mt-6 lg:mt-0">
          <div className="sticky top-24">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">Application Timeline</h3>
              <StatusTimeline status={application.status} />
            </div>

            {/* View job button */}
            {job?.id && (
              <Link
                href={`/jobs/${job.id}`}
                className="mt-4 block w-full py-2.5 text-center text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                View Job Posting
              </Link>
            )}
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
