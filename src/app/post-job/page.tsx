'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { jobsService } from '@/lib/services/jobs';
import { companiesService } from '@/lib/services/companies';
import { apiGet } from '@/lib/api';
import type { Company } from '@/lib/uteo-types';

interface Skill {
  id: string;
  name: string;
}

function PostJobContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    companyId: '',
    description: '',
    requirements: '',
    jobType: 'FULL_TIME',
    location: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'KES',
    expiresAt: '',
  });
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/post-job');
      return;
    }
    if (!authLoading && isAuthenticated && !isRecruiter) {
      router.replace('/feed');
    }
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    loadCompanies();
    loadSkills();
  }, [isAuthenticated, isRecruiter]);

  async function loadCompanies() {
    try {
      const data = await companiesService.list();
      setCompanies((data as any)?.items ?? []);
    } catch {
      // silent
    }
  }

  async function loadSkills() {
    try {
      const data = await apiGet<{ items: Skill[] }>('/skills');
      setAllSkills((data as any)?.items ?? []);
    } catch {
      // silent
    }
  }

  function toggleSkill(skill: Skill) {
    setSelectedSkills((prev) => {
      if (prev.find((s) => s.id === skill.id)) {
        return prev.filter((s) => s.id !== skill.id);
      }
      return [...prev, skill];
    });
  }

  const filteredSkills = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.find((sel) => sel.id === s.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError('Job title is required'); return; }
    if (!form.companyId) { setError('Please select a company'); return; }
    if (!form.description.trim()) { setError('Job description is required'); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        companyId: form.companyId,
        description: form.description.trim(),
        jobType: form.jobType,
      };
      if (form.requirements.trim()) payload.requirements = form.requirements.trim();
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.salaryMin) payload.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) payload.salaryMax = Number(form.salaryMax);
      if (form.currency) payload.currency = form.currency;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      if (selectedSkills.length > 0) payload.skillIds = selectedSkills.map((s) => s.id);

      const job = await jobsService.create(payload);
      const jobId = (job as any)?.id ?? (job as any)?.data?.id;
      if (jobId) {
        router.push(`/jobs/${jobId}`);
      } else {
        router.push('/recruiter');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post a Job</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Find the best candidates for your open role</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Basic Information</h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Company <span className="text-red-500">*</span>
            </label>
            {companies.length > 0 ? (
              <select
                value={form.companyId}
                onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No companies found. Set one up first.</p>
                <a href="/onboarding" className="text-sm font-medium text-[#F77B0F] hover:underline">
                  Set up company profile
                </a>
              </div>
            )}
          </div>

          {/* Job type + location row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Job Type
              </label>
              <select
                value={form.jobType}
                onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Nairobi, Kenya or Remote"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              />
            </div>
          </div>
        </div>

        {/* Description & Requirements */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Job Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, responsibilities, and what a typical day looks like..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Requirements
            </label>
            <textarea
              rows={5}
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              placeholder="List qualifications, skills, years of experience, education, etc..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] resize-none"
            />
          </div>
        </div>

        {/* Salary */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Compensation</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Min Salary
              </label>
              <input
                type="number"
                value={form.salaryMin}
                onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                placeholder="e.g. 80000"
                min="0"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Max Salary
              </label>
              <input
                type="number"
                value={form.salaryMax}
                onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                placeholder="e.g. 120000"
                min="0"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Displaying salary range increases application rates by up to 30%.
          </p>
        </div>

        {/* Skills */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Required Skills</h2>

          {/* Selected skills */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-sm font-medium"
                >
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="Search skills (e.g. React, Python, Project Management)"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
          />

          {skillSearch && filteredSkills.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
              {filteredSkills.slice(0, 15).map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => { toggleSkill(skill); setSkillSearch(''); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
                >
                  {skill.name}
                </button>
              ))}
            </div>
          )}
          {skillSearch && filteredSkills.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No matching skills found</p>
          )}
        </div>

        {/* Expiry date */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Listing Expiry</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Expires On
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Leave blank to keep the listing active indefinitely.</p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F77B0F] text-white rounded-xl font-medium hover:bg-[#e06a0d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Posting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Post Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
        </div>
      }
    >
      <PostJobContent />
    </Suspense>
  );
}
