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

  const logoUploadNode = (
    <label className="group/logo relative cursor-pointer block w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
      {form.logoUrl ? (
        <SmartImg src={form.logoUrl} alt="Company logo" className="w-full h-full object-cover" loading="eager"
          fallback={<div className="w-full h-full bg-[#192C67] flex items-center justify-center text-white text-2xl font-black">{form.name.slice(0,2).toUpperCase()||'CO'}</div>}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#192C67] to-[#2d4a9e] flex items-center justify-center text-white text-2xl font-black">
          {form.name.slice(0,2).toUpperCase()||'CO'}
        </div>
      )}
      {/* hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        {logoUploading
          ? <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
          : <><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg><span className="text-white text-[10px] font-semibold">Change</span></>
        }
      </div>
      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" disabled={logoUploading}
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
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(25,44,103,0.12),0_1px_4px_rgba(0,0,0,0.06)]"
        style={{ boxShadow: '0 4px 24px rgba(25,44,103,0.12),0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Banner */}
        <div className="h-32 relative" style={{ background: 'linear-gradient(135deg,#192C67 0%,#2d4a9e 50%,#1e3a8a 100%)' }}>
          {/* subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {company?.isVerified && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Verified
            </div>
          )}
        </div>

        {/* Identity row */}
        <div className="bg-white dark:bg-gray-800 px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            {logoUploadNode}
            <div className="flex-1 min-w-0 pt-14">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {form.name || (company ? company.name : 'Your Company')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {form.industry || 'Add your industry'}{form.location ? ` · ${form.location}` : ''}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          {company && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#192C67]/6 dark:bg-[#192C67]/20" style={{ backgroundColor: 'rgba(25,44,103,0.06)' }}>
                <svg className="w-4 h-4 text-[#192C67] dark:text-[#7fa8e0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <span className="text-sm font-bold text-[#192C67] dark:text-[#7fa8e0]">{company._count?.jobs ?? 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">jobs</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F77B0F]/8 dark:bg-[#F77B0F]/20" style={{ backgroundColor: 'rgba(247,123,15,0.08)' }}>
                <svg className="w-4 h-4 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm font-bold text-[#F77B0F]">{company._count?.recruiters ?? 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">team members</span>
              </div>
              {company.size && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {COMPANY_SIZES.find((s) => s.value === company.size)?.label ?? company.size}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Company Information ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700" style={{ background: 'linear-gradient(90deg,rgba(25,44,103,0.03) 0%,transparent 100%)' }}>
          <div className="w-8 h-8 rounded-lg bg-[#192C67] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Company Information</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Basic details shown to job seekers</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Company Name <span className="text-red-500 normal-case font-normal tracking-normal">*</span>
            </label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. WasaaChat Ltd" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">About the Company</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Tell candidates about your mission, culture, and why it's a great place to work..."
              className={`${inputCls} resize-none`} />
            <div className="flex justify-end mt-1">
              <span className={`text-[11px] ${form.description.length > 1800 ? 'text-amber-500' : 'text-gray-400'}`}>{form.description.length} / 2000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Industry</label>
              <input type="text" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Technology, Finance" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Company Size</label>
              <select value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} className={inputCls}>
                <option value="">Select size</option>
                {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Website</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://company.com" className={`${inputCls} pl-9`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">HQ Location</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Nairobi, Kenya" className={`${inputCls} pl-9`} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">Logo: hover the photo above to change · PNG, JPG, SVG or WebP · max 5MB</p>
            <button onClick={saveCompany} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: saving ? '#6b7280' : 'linear-gradient(135deg,#F77B0F 0%,#e06300 100%)', boxShadow: saving ? 'none' : '0 2px 8px rgba(247,123,15,0.35)' }}
            >
              {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</> : company ? 'Save Changes' : 'Create Company'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Social Accounts ───────────────────────────────────────────────── */}
      {company && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700" style={{ background: 'linear-gradient(90deg,rgba(247,123,15,0.04) 0%,transparent 100%)' }}>
            <div className="w-8 h-8 rounded-lg bg-[#F77B0F] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Social Accounts</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Shared with job post links so applicants can find your brand</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'linkedinHandle', label: 'LinkedIn Handle', placeholder: 'company-slug (no @)', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, color: 'text-[#0077b5]' },
                { key: 'twitterHandle', label: 'X / Twitter Handle', placeholder: 'handle (no @)', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, color: 'text-gray-800 dark:text-white' },
                { key: 'linkedinPageUrl', label: 'LinkedIn Page URL', placeholder: 'https://linkedin.com/company/...', icon: null, color: '' },
                { key: 'facebookPageUrl', label: 'Facebook Page URL', placeholder: 'https://facebook.com/...', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: 'text-[#1877f2]' },
                { key: 'instagramHandle', label: 'Instagram Handle', placeholder: 'handle (no @)', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, color: 'text-[#e1306c]' },
              ].map(({ key, label, placeholder, icon, color }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    {icon && <span className={color}>{icon}</span>}
                    {label}
                  </label>
                  <input type="text" value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} className={inputCls} />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <button onClick={saveCompany} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#F77B0F 0%,#e06300 100%)', boxShadow: '0 2px 8px rgba(247,123,15,0.35)' }}
              >
                {saving ? 'Saving…' : 'Save Social Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team Members ──────────────────────────────────────────────────── */}
      {company && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700" style={{ background: 'linear-gradient(90deg,rgba(25,44,103,0.03) 0%,transparent 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Team Members</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Manage roles and permissions</p>
              </div>
            </div>
            <button onClick={() => setShowInviteForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg,#F77B0F 0%,#e06300 100%)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Member
            </button>
          </div>

          {showInviteForm && (
            <div className="mx-6 mt-5 rounded-xl border border-[#F77B0F]/30 bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10 p-4 space-y-4">
              <p className="text-xs font-semibold text-[#F77B0F] uppercase tracking-wide">Invite Team Member</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address" className={inputCls} />
                <input type="text" value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="Job title (e.g. HR Manager)" className={inputCls} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">Permission level</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${inviteRole === opt.value ? 'border-[#F77B0F] bg-white dark:bg-gray-800 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                    >
                      <input type="radio" name="invite-role" value={opt.value} checked={inviteRole === opt.value}
                        onChange={() => setInviteRole(opt.value)} className="mt-0.5 accent-[#F77B0F]" />
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{opt.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={inviteRecruiter} disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#F77B0F 0%,#e06300 100%)' }}
                >
                  {inviting ? 'Adding…' : 'Add Member'}
                </button>
              </div>
            </div>
          )}

          <div className="p-6 space-y-2">
            {(company.recruiters ?? []).map((r) => {
              const role: RecruiterRole = (r.role ?? 'HIRING_MANAGER') as RecruiterRole;
              const isMe = r.user.id === (user as any)?.id;
              const isEditing = editingMemberId === r.user.id;
              const myRecord = (company.recruiters ?? []).find((x) => x.user.id === (user as any)?.id);
              const myRole: RecruiterRole = (myRecord?.role ?? 'HIRING_MANAGER') as RecruiterRole;
              const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
              const canEditThis = canManage && role !== 'OWNER' && !isMe;
              const initials = ((r.user.firstName?.[0] ?? '') + (r.user.lastName?.[0] ?? '')).toUpperCase() || (r.user.email?.[0] ?? '?').toUpperCase();

              return (
                <div key={r.id} className={`rounded-xl p-4 transition-colors ${isEditing ? 'bg-[#192C67]/4 dark:bg-[#192C67]/10 border border-[#192C67]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`} style={{ backgroundColor: isEditing ? 'rgba(25,44,103,0.04)' : undefined }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#192C67] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      {r.user.avatar ? <img src={r.user.avatar} alt="" className="w-10 h-10 object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.user.firstName} {r.user.lastName}</span>
                        {isMe && <span className="px-1.5 py-0.5 rounded bg-[#F77B0F]/10 text-[#F77B0F] text-[10px] font-bold">You</span>}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE_CLASS[role]}`}>{ROLE_LABEL[role]}</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.user.email}{r.title ? ` · ${r.title}` : ''}</p>
                    </div>
                    {canEditThis && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && (
                          <button onClick={() => setEditingMemberId(r.user.id)} className="text-xs text-gray-500 hover:text-[#192C67] dark:hover:text-white font-medium px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            Edit
                          </button>
                        )}
                        <button onClick={() => removeMember(r.user.id, `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email)}
                          className="text-xs text-gray-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className="mt-3 pl-13 space-y-2" style={{ paddingLeft: '3.25rem' }}>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLE_OPTIONS.map((opt) => (
                          <label key={opt.value}
                            className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${role === opt.value ? 'border-[#F77B0F] bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                          >
                            <input type="radio" name={`role-${r.id}`} value={opt.value} defaultChecked={role === opt.value}
                              onChange={() => updateMember(r.user.id, opt.value, r.title)} disabled={savingMember}
                              className="mt-0.5 accent-[#F77B0F]" />
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{opt.label}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <button onClick={() => setEditingMemberId(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      {company && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actions here are permanent and cannot be undone</p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Delete Company</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently removes this company and all associated jobs and data</p>
            </div>
            <button className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Delete Company
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
