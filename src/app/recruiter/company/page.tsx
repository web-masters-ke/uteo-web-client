'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { companiesService } from '@/lib/services/companies';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/lib/toast';
import SmartImg from '@/components/ui/SmartImg';

interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  size?: string;
  location?: string;
  isVerified?: boolean;
  _count?: { jobs: number; recruiters: number };
  recruiters?: Array<{
    id: string;
    title?: string;
    role?: RecruiterRole;
    user: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  }>;
}

type RecruiterRole = 'OWNER' | 'ADMIN' | 'HIRING_MANAGER' | 'REVIEWER' | 'VIEWER';

const ROLE_OPTIONS: { value: RecruiterRole; label: string; desc: string }[] = [
  { value: 'ADMIN',          label: 'Admin',          desc: 'Manage team, post jobs, review applications, send offers' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager', desc: 'Post jobs, review applications, schedule interviews, send offers' },
  { value: 'REVIEWER',       label: 'Reviewer',       desc: 'Review applications and shortlist — cannot post jobs or send offers' },
  { value: 'VIEWER',         label: 'Viewer',         desc: 'Read-only access to jobs and applications' },
];

const ROLE_LABEL: Record<RecruiterRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  HIRING_MANAGER: 'Hiring Manager',
  REVIEWER: 'Reviewer',
  VIEWER: 'Viewer',
};

const ROLE_BADGE_CLASS: Record<RecruiterRole, string> = {
  OWNER:          'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  ADMIN:          'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  HIRING_MANAGER: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  REVIEWER:       'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  VIEWER:         'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] text-sm";

const COMPANY_SIZES = [
  { value: 'STARTUP', label: 'Startup (1-10 employees)' },
  { value: 'SMALL', label: 'Small (11-50 employees)' },
  { value: 'MEDIUM', label: 'Medium (51-200 employees)' },
  { value: 'LARGE', label: 'Large (201-1000 employees)' },
  { value: 'ENTERPRISE', label: 'Enterprise (1000+ employees)' },
];

function CompanyContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER';
  const { addToast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteRole, setInviteRole] = useState<RecruiterRole>('HIRING_MANAGER');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    size: '',
    location: '',
    logoUrl: '',
    linkedinHandle: '',
    linkedinPageUrl: '',
    twitterHandle: '',
    facebookPageUrl: '',
    instagramHandle: '',
  });
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/company'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) router.replace('/feed');
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  useEffect(() => {
    if (!isAuthenticated || !isRecruiter) return;
    loadCompany();
  }, [isAuthenticated, isRecruiter]);

  async function loadCompany() {
    setLoading(true);
    try {
      const data = await companiesService.list();
      const items: Company[] = (data as any)?.items ?? [];
      // Get the first company this recruiter belongs to
      const mine = items[0] ?? null;
      if (mine) {
        // Load full detail with recruiters
        const full = await companiesService.get(mine.id) as Company;
        setCompany(full);
        setForm({
          name: full.name ?? '',
          description: full.description ?? '',
          industry: full.industry ?? '',
          website: full.website ?? '',
          size: full.size ?? '',
          location: full.location ?? '',
          logoUrl: full.logoUrl ?? '',
          linkedinHandle: (full as any).linkedinHandle ?? '',
          linkedinPageUrl: (full as any).linkedinPageUrl ?? '',
          twitterHandle: (full as any).twitterHandle ?? '',
          facebookPageUrl: (full as any).facebookPageUrl ?? '',
          instagramHandle: (full as any).instagramHandle ?? '',
        });
      }
    } catch {
      // no company yet
    } finally {
      setLoading(false);
    }
  }

  async function saveCompany() {
    setSaving(true);
    try {
      const socialPayload = {
        linkedinHandle: form.linkedinHandle.trim() || undefined,
        linkedinPageUrl: form.linkedinPageUrl.trim() || undefined,
        twitterHandle: form.twitterHandle.trim() || undefined,
        facebookPageUrl: form.facebookPageUrl.trim() || undefined,
        instagramHandle: form.instagramHandle.trim() || undefined,
      };
      if (company) {
        await companiesService.update(company.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          industry: form.industry.trim() || undefined,
          website: form.website.trim() || undefined,
          size: form.size || undefined,
          location: form.location.trim() || undefined,
          logoUrl: form.logoUrl || undefined,
          ...socialPayload,
        });
        addToast('success', 'Company profile updated');
        loadCompany();
      } else {
        setCreatingCompany(true);
        const created = await companiesService.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          industry: form.industry.trim() || undefined,
          website: form.website.trim() || undefined,
          size: form.size || undefined,
          location: form.location.trim() || undefined,
          logoUrl: form.logoUrl || undefined,
          ...socialPayload,
        });
        setCompany(created as Company);
        addToast('success', 'Company created!');
        loadCompany();
        setCreatingCompany(false);
      }
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  async function inviteRecruiter() {
    if (!company || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await apiPost(`/companies/${company.id}/recruiters`, {
        email: inviteEmail.trim(),
        title: inviteTitle.trim() || undefined,
        role: inviteRole,
      });
      addToast('success', 'Team member added');
      setInviteEmail('');
      setInviteTitle('');
      setInviteRole('HIRING_MANAGER');
      setShowInviteForm(false);
      loadCompany();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to add team member');
    } finally {
      setInviting(false);
    }
  }

  async function updateMember(targetUserId: string, role: RecruiterRole, title?: string) {
    if (!company) return;
    setSavingMember(true);
    try {
      await apiPatch(`/companies/${company.id}/recruiters/${targetUserId}`, { role, title });
      addToast('success', 'Role updated');
      setEditingMemberId(null);
      loadCompany();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to update role');
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(targetUserId: string, name: string) {
    if (!company) return;
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await apiDelete(`/companies/${company.id}/recruiters/${targetUserId}`);
      addToast('success', 'Removed from team');
      loadCompany();
    } catch (e: any) {
      addToast('error', e?.message ?? 'Failed to remove team member');
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>;
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {[1,2,3].map((i) => <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 h-32" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {company ? 'Company Profile' : 'Set Up Your Company'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {company ? 'Manage your company profile, branding, and team' : 'Create your company profile to start posting jobs'}
          </p>
        </div>
        {company?.isVerified && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Verified
          </div>
        )}
      </div>

      {/* Stats — only if company exists */}
      {company && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{company._count?.jobs ?? 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Jobs Posted</div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{company._count?.recruiters ?? 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Team Members</div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {COMPANY_SIZES.find((s) => s.value === company.size)?.label.split(' ')[0] ?? '—'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Company Stage</div>
          </div>
        </div>
      )}

      {/* Profile form */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Company Information</h2>

        {/* Logo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl ? (
                <SmartImg src={form.logoUrl} alt="Company logo" className="w-full h-full object-cover" loading="eager" fallback={<span className="text-xs text-gray-400">Loading…</span>} />
              ) : logoUploading ? (
                <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                </svg>
              )}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <label className="inline-flex items-center px-4 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                {form.logoUrl ? 'Change logo' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { addToast('error', 'Logo must be 5MB or smaller'); return; }
                    setLogoUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', f);
                      const r = await apiPost<{ url: string }>('/media/upload?folder=company-logos', fd);
                      const url = (r as any)?.url ?? (r as any)?.data?.url ?? '';
                      if (!url) throw new Error('Upload returned no URL');
                      setForm((s) => ({ ...s, logoUrl: url }));
                    } catch (err: any) {
                      addToast('error', err?.message ?? 'Logo upload failed');
                    } finally {
                      setLogoUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, logoUrl: '' }))}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">PNG, JPG, SVG or WebP · max 5MB · stored in S3</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Acme Corporation, Safaricom PLC"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company Description
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Tell candidates what your company does, your mission, culture, and why it's a great place to work..."
            className={`${inputCls} resize-none`}
          />
          <p className="mt-1 text-xs text-gray-400">{form.description.length} / 2000 characters</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Industry</label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              placeholder="e.g. Technology, Finance, Healthcare"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Size</label>
            <select
              value={form.size}
              onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://your-company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location / HQ</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Nairobi, Kenya"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveCompany}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#F77B0F] hover:underline disabled:opacity-50"
          >
            {saving ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />Saving...</>
            ) : (
              company ? 'Save Changes →' : 'Create Company →'
            )}
          </button>
        </div>
      </div>

      {/* Social accounts — used to brand share links from job posts */}
      {company && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Social Accounts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              When recruiters share a job post, the share text mentions these handles so the post is branded as your company.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn handle</label>
              <input
                type="text"
                value={form.linkedinHandle}
                onChange={(e) => setForm((f) => ({ ...f, linkedinHandle: e.target.value }))}
                placeholder="webmasters (no @)"
                className={inputCls}
              />
              <p className="text-[11px] text-gray-400 mt-1">Your /company/ slug on LinkedIn</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn page URL</label>
              <input
                type="url"
                value={form.linkedinPageUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkedinPageUrl: e.target.value }))}
                placeholder="https://linkedin.com/company/webmasters"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">X / Twitter handle</label>
              <input
                type="text"
                value={form.twitterHandle}
                onChange={(e) => setForm((f) => ({ ...f, twitterHandle: e.target.value }))}
                placeholder="webmasters (no @)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook page URL</label>
              <input
                type="url"
                value={form.facebookPageUrl}
                onChange={(e) => setForm((f) => ({ ...f, facebookPageUrl: e.target.value }))}
                placeholder="https://facebook.com/webmasters"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram handle</label>
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
                placeholder="webmasters (no @)"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveCompany}
              disabled={saving}
              className="text-sm font-semibold text-[#F77B0F] hover:underline disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Social Accounts'}
            </button>
          </div>
        </div>
      )}

      {/* Team Members — only if company exists */}
      {company && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Team Members</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Roles control what each member can do — post jobs, review applications, send offers, or just view
              </p>
            </div>
            <button
              onClick={() => setShowInviteForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F77B0F] text-[#F77B0F] text-xs font-semibold hover:bg-[#F77B0F]/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Member
            </button>
          </div>

          {showInviteForm && (
            <div className="rounded-xl border border-[#F77B0F]/30 bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10 p-4 space-y-4">
              <p className="text-xs font-semibold text-[#F77B0F]">Invite Team Member</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="Job title (e.g. HR Manager)"
                  className={inputCls}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Permission level</p>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        inviteRole === opt.value
                          ? 'border-[#F77B0F] bg-white dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        value={opt.value}
                        checked={inviteRole === opt.value}
                        onChange={() => setInviteRole(opt.value)}
                        className="mt-0.5 accent-[#F77B0F]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteRecruiter}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 text-xs font-semibold text-[#F77B0F] hover:underline disabled:opacity-50"
                >
                  {inviting ? 'Adding...' : 'Add Member →'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {(company.recruiters ?? []).map((r) => {
              const role: RecruiterRole = (r.role ?? 'HIRING_MANAGER') as RecruiterRole;
              const isMe = r.user.id === (user as any)?.id;
              const isEditing = editingMemberId === r.user.id;
              const myRecord = (company.recruiters ?? []).find((x) => x.user.id === (user as any)?.id);
              const myRole: RecruiterRole = (myRecord?.role ?? 'HIRING_MANAGER') as RecruiterRole;
              const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
              const canEditThis = canManage && role !== 'OWNER' && !isMe;

              return (
                <div key={r.id} className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs overflow-hidden shrink-0">
                      {r.user.avatar ? (
                        <img src={r.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        ((r.user.firstName?.[0] ?? '') + (r.user.lastName?.[0] ?? '')).toUpperCase() || (r.user.email?.[0] ?? '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>{r.user.firstName} {r.user.lastName}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-[#F77B0F]/10 text-[#F77B0F] text-[10px] font-semibold">You</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE_CLASS[role]}`}>{ROLE_LABEL[role]}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{r.user.email}{r.title ? ` · ${r.title}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canEditThis && !isEditing && (
                        <button
                          onClick={() => setEditingMemberId(r.user.id)}
                          className="text-xs text-gray-500 hover:text-[#F77B0F] transition-colors"
                        >
                          Change role
                        </button>
                      )}
                      {canEditThis && (
                        <button
                          onClick={() => removeMember(r.user.id, `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email)}
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 pl-12 space-y-2">
                      {ROLE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            role === opt.value
                              ? 'border-[#F77B0F] bg-[#F77B0F]/5'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`role-${r.id}`}
                            value={opt.value}
                            defaultChecked={role === opt.value}
                            onChange={() => updateMember(r.user.id, opt.value, r.title)}
                            disabled={savingMember}
                            className="mt-0.5 accent-[#F77B0F]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {company && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800/50 p-6">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            These actions are permanent and cannot be undone.
          </p>
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Delete Company</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently removes this company and all associated jobs</p>
            </div>
            <button className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" /></div>}>
      <CompanyContent />
    </Suspense>
  );
}
