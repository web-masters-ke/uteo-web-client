'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { apiGet } from '@/lib/api';

interface FullProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone?: string | null;
  avatar?: string | null;
  jobSeekerProfile?: {
    headline?: string | null;
    location?: string | null;
    bio?: string | null;
    yearsExperience?: number | null;
    expectedSalary?: number | null;
    salaryCurrency?: string | null;
    openToWork?: boolean | null;
    portfolioUrl?: string | null;
    linkedinUrl?: string | null;
  } | null;
  workExperience?: Array<{
    id: string;
    company?: string | null;
    role?: string | null;
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  }>;
  education?: Array<{
    id: string;
    institution?: string | null;
    school?: string | null;
    degree?: string | null;
    fieldOfStudy?: string | null;
    field?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  userSkills?: Array<{ skill: { id: string; name: string }; proficiency?: string }>;
  applications?: Array<{
    id: string;
    status: string;
    appliedAt: string;
    job: { id: string; title: string; company: { name: string; logoUrl?: string | null } };
  }>;
}

function fmtRange(start?: string | null, end?: string | null) {
  const f = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }) : null;
  const a = f(start); const b = f(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return `${a} – Present`;
  return '';
}

export default function RecruiterCandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const isRecruiter = (user as any)?.role === 'TRAINER';

  const [candidate, setCandidate] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await apiGet<FullProfile>(`/users/${id}`);
      setCandidate(u);
    } catch {
      addToast('error', 'Could not load candidate');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [authLoading, isAuthenticated, isRecruiter, router]);

  useEffect(() => { if (isAuthenticated && isRecruiter) load(); }, [isAuthenticated, isRecruiter, load]);

  if (loading || !candidate) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse mb-4" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const name = `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim() || candidate.email || 'Candidate';
  const initials = name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  const profile = candidate.jobSeekerProfile;
  const skills = candidate.userSkills ?? [];
  const experience = candidate.workExperience ?? [];
  const education = candidate.education ?? [];
  const apps = candidate.applications ?? [];

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/recruiter/candidates" className="hover:text-gray-900 dark:hover:text-white">Candidates</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{name}</span>
      </div>

      {/* Header */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
        <div className="flex items-start gap-5">
          {candidate.avatar ? (
            <img src={candidate.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#192C67] text-white text-xl font-black flex items-center justify-center">{initials}</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{name}</h1>
            {profile?.headline && <p className="text-base text-gray-700 dark:text-gray-300 mt-1">{profile.headline}</p>}
            {profile?.location && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.location}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {profile?.openToWork && <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">Open to work</span>}
              {profile?.yearsExperience != null && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">{profile.yearsExperience} yrs experience</span>}
              {profile?.expectedSalary != null && <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">{profile.salaryCurrency ?? 'KES'} {Number(profile.expectedSalary).toLocaleString()} expected</span>}
              {candidate.email && <a href={`mailto:${candidate.email}`} className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">✉ {candidate.email}</a>}
              {candidate.phone && <a href={`tel:${candidate.phone}`} className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">📞 {candidate.phone}</a>}
              {profile?.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-full text-xs font-medium text-[#0A66C2] border border-[#0A66C2]/30 hover:bg-[#0A66C2]/5">LinkedIn</a>}
              {profile?.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-full text-xs font-medium text-[#F77B0F] border border-[#F77B0F]/30 hover:bg-[#F77B0F]/5">Portfolio</a>}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/messages?userId=${candidate.id}`} className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#F77B0F] text-white hover:bg-[#e06a0d] transition-colors">
              Message
            </Link>
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">About</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s.skill.id} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                {s.skill.name}{s.proficiency ? <span className="ml-1 text-xs text-gray-400">· {s.proficiency.toLowerCase()}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Experience</h2>
          <ol className="space-y-5">
            {experience.map((e) => (
              <li key={e.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-5">
                <p className="font-semibold text-gray-900 dark:text-white">{e.role ?? e.title ?? 'Role'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{e.company}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtRange(e.startDate, e.endDate)}</p>
                {e.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{e.description}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Education</h2>
          <ol className="space-y-5">
            {education.map((e) => (
              <li key={e.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-5">
                <p className="font-semibold text-gray-900 dark:text-white">{e.degree ?? 'Degree'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{e.institution ?? e.school}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(e.fieldOfStudy ?? e.field) ?? ''} · {fmtRange(e.startDate, e.endDate)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Applications */}
      {apps.length > 0 && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 lg:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Applications</h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {apps.map(a => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.job.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.job.company.name} · {new Date(a.appliedAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                <Link href={`/recruiter/applications/${a.id}`} className="text-xs font-semibold text-[#F77B0F] hover:underline shrink-0">
                  View application →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/recruiter/candidates" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
        ← Back to candidates
      </Link>
    </div>
  );
}
