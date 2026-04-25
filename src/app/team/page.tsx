'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import api, { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'CONSULTANT' | 'ASSOCIATE';
  title?: string;
  specialization?: string;
  isActive: boolean;
  joinedAt: string;
  department?: { id: string; name: string } | null;
}

interface TeamInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'ASSOCIATE';
  title?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  sentAt: string;
  expiresAt: string;
}

interface UnassignedBooking {
  id: string;
  clientName: string;
  sessionType: string;
  scheduledAt: string;
  duration: number;
  amount: number;
}

type Tab = 'members' | 'invites';

// ─── Role config ─────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  OWNER:      { label: 'Owner',      bg: 'bg-[#192C67]/10 dark:bg-[#192C67]/30', text: 'text-[#192C67] dark:text-[#5b8bc7]' },
  ADMIN:      { label: 'Admin',      bg: 'bg-purple-50 dark:bg-purple-900/20',    text: 'text-purple-700 dark:text-purple-300' },
  CONSULTANT: { label: 'Consultant', bg: 'bg-[#F77B0F]/10 dark:bg-[#F77B0F]/30', text: 'text-[#B08930] dark:text-[#E8C96E]' },
  ASSOCIATE:  { label: 'Associate',  bg: 'bg-zinc-100 dark:bg-zinc-800',          text: 'text-zinc-600 dark:text-zinc-300' },
};

const INVITE_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pending',   color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  ACCEPTED:  { label: 'Accepted',  color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
  EXPIRED:   { label: 'Expired',   color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function MemberSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: TeamMember }) {
  const initials = (
    (member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')
  ).toUpperCase() || 'U';

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={`${member.firstName} ${member.lastName}`}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#192C67] text-sm font-bold text-white ring-2 ring-zinc-100 dark:ring-zinc-800">
      {initials}
    </div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────────────────────

function StatsRow({ members, invites }: { members: TeamMember[]; invites: TeamInvite[] }) {
  const total = members.length;
  const active = members.filter((m) => m.isActive).length;
  const pending = invites.filter((i) => i.status === 'PENDING').length;
  const consultants = members.filter((m) => m.role === 'CONSULTANT').length;

  const stats = [
    { label: 'Total Members',  value: total,       icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'text-[#192C67] dark:text-[#5b8bc7]' },
    { label: 'Active',         value: active,       icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending Invites', value: pending,     icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Consultants',    value: consultants,  icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-[#F77B0F] dark:text-[#E8C96E]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={s.color}
            >
              <path d={s.icon} />
            </svg>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {s.label}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Invite Modal ────────────────────────────────────────────────────────────

function InviteModal({
  open,
  onClose,
  onInvite,
  departments,
  onDepartmentCreated,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; role: string; title: string; departmentId?: string; skills?: string[]; credentials?: any[] }) => Promise<void>;
  departments?: { id: string; name: string }[];
  onDepartmentCreated?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('CONSULTANT');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [credentials, setCredentials] = useState<{ type: string; name: string; issuer: string; year: string; documentUrl: string; uploading: boolean }[]>([]);
  const [showNewDept, setShowNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);

  if (!open) return null;

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;
    setCreatingDept(true);
    try {
      const created = await apiPost<{ id: string; name: string }>('/departments', { name: newDeptName.trim() });
      setDepartmentId(created.id);
      setNewDeptName('');
      setShowNewDept(false);
      if (onDepartmentCreated) onDepartmentCreated();
    } catch {
      // silently fail — user can try again
    } finally {
      setCreatingDept(false);
    }
  };

  const handleFileUpload = async (idx: number, file: File) => {
    const c = [...credentials]; c[idx].uploading = true; setCredentials(c);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = (res.data as any)?.data?.url || (res.data as any)?.url || '';
      const c2 = [...credentials]; c2[idx].documentUrl = url; c2[idx].uploading = false; setCredentials(c2);
    } catch {
      const c2 = [...credentials]; c2[idx].uploading = false; setCredentials(c2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await onInvite({
        email: email.trim(), role, title: title.trim(),
        departmentId: departmentId || undefined,
        skills: skills.length > 0 ? skills : undefined,
        credentials: credentials.filter(c => c.name.trim()).length > 0 ? credentials.filter(c => c.name.trim()) : undefined,
      });
      setEmail(''); setRole('CONSULTANT'); setTitle(''); setDepartmentId('');
      setSkills([]); setCredentials([]);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
        <div className="flex items-center justify-between p-6 pb-0 mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Invite Consultant
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-6 pb-6">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="consultant@example.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
            >
              <option value="ADMIN">Admin</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="ASSOCIATE">Associate</option>
            </select>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {role === 'ADMIN' && 'Can manage team members and view all bookings.'}
              {role === 'CONSULTANT' && 'Can receive assigned bookings and manage their sessions.'}
              {role === 'ASSOCIATE' && 'Limited access to view assigned bookings only.'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Consultant"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
            />
          </div>

          {/* Department */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Department
            </label>
            {!showNewDept ? (
              <>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    if (e.target.value === '__create_new__') {
                      setShowNewDept(true);
                      setDepartmentId('');
                    } else {
                      setDepartmentId(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
                >
                  <option value="">No department (assign later)</option>
                  {departments && departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  <option value="__create_new__">+ Create new department</option>
                </select>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Assign this consultant to a department, or leave blank to assign later.
                </p>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDepartment(); } }}
                  placeholder="Department name"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b8bc7] dark:focus:ring-[#5b8bc7]/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateDepartment}
                  disabled={creatingDept || !newDeptName.trim()}
                  className="rounded-lg bg-[#192C67] px-3 py-2.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {creatingDept ? '...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewDept(false); setNewDeptName(''); }}
                  className="rounded-lg border border-zinc-300 px-3 py-2.5 text-xs font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Skills */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Skills</label>
            <div className="flex gap-2 mb-2">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (skillInput.trim() && !skills.includes(skillInput.trim())) { setSkills([...skills, skillInput.trim()]); setSkillInput(''); } } }} placeholder="Type skill, press Enter" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20" />
              <button type="button" onClick={() => { if (skillInput.trim() && !skills.includes(skillInput.trim())) { setSkills([...skills, skillInput.trim()]); setSkillInput(''); } }} className="px-3 py-2 rounded-lg bg-[#192C67] text-white text-xs font-medium">Add</button>
            </div>
            {skills.length > 0 && <div className="flex flex-wrap gap-1.5">{skills.map((s, i) => (<span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#192C67]/10 text-xs font-medium text-[#192C67] dark:text-[#5b8bc7]">{s}<button type="button" onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="hover:text-red-500">×</button></span>))}</div>}
          </div>

          {/* Credentials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Credentials</label>
              <button type="button" onClick={() => setCredentials([...credentials, { type: 'CERTIFICATE', name: '', issuer: '', year: '', documentUrl: '', uploading: false }])} className="text-xs font-medium text-[#192C67] dark:text-[#5b8bc7]">+ Add</button>
            </div>
            {credentials.map((cred, idx) => (
              <div key={idx} className="mb-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">#{idx + 1}</span>
                  <button type="button" onClick={() => setCredentials(credentials.filter((_, i) => i !== idx))} className="text-xs text-red-500">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={cred.type} onChange={e => { const c = [...credentials]; c[idx].type = e.target.value; setCredentials(c); }} className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                    <option value="DEGREE">Degree</option><option value="DIPLOMA">Diploma</option><option value="CERTIFICATE">Certificate</option><option value="LICENSE">License</option><option value="PROFESSIONAL_MEMBERSHIP">Prof. Membership</option><option value="TRADE_CERTIFICATE">Trade Certificate</option><option value="APPRENTICESHIP">Apprenticeship</option><option value="PORTFOLIO">Portfolio</option>
                  </select>
                  <input value={cred.name} onChange={e => { const c = [...credentials]; c[idx].name = e.target.value; setCredentials(c); }} placeholder="Name" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={cred.issuer} onChange={e => { const c = [...credentials]; c[idx].issuer = e.target.value; setCredentials(c); }} placeholder="Institution" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                  <input value={cred.year} onChange={e => { const c = [...credentials]; c[idx].year = e.target.value; setCredentials(c); }} placeholder="Year" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                </div>
                {cred.documentUrl ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-300">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Uploaded <button type="button" onClick={() => { const c = [...credentials]; c[idx].documentUrl = ''; setCredentials(c); }} className="ml-auto text-red-500">×</button>
                  </div>
                ) : (
                  <label className={`flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs text-zinc-500 ${cred.uploading ? 'opacity-50' : ''}`}>
                    {cred.uploading ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                    {cred.uploading ? 'Uploading...' : 'Upload document'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, f); }} />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="flex gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-blue-500">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>An invite email will be sent via Brevo. The invite expires in 7 days.</p>
                {(skills.length > 0 || credentials.length > 0) && (
                  <p className="text-blue-600 dark:text-blue-400">
                    Skills and credentials entered here are saved as context. The invitee will confirm and finalize them when they accept and set up their profile.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="flex-1 rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D5A8E] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2D5A8E] dark:hover:bg-[#192C67]"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Role Modal ─────────────────────────────────────────────────────────

function EditRoleModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSave: (id: string, data: { role?: string; title?: string; isActive?: boolean }) => Promise<void>;
}) {
  const [role, setRole] = useState(member?.role ?? 'CONSULTANT');
  const [title, setTitle] = useState(member?.title ?? '');
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setTitle(member.title ?? '');
      setIsActive(member.isActive);
    }
  }, [member]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(member.id, { role, title: title.trim(), isActive });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Edit Member
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <MemberAvatar member={member} />
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-50">
              {member.firstName} {member.lastName}
            </div>
            <div className="text-sm text-zinc-500">{member.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember['role'])}
              disabled={member.role === 'OWNER'}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="OWNER" disabled>Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="ASSOCIATE">Associate</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Consultant"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#192C67] focus:outline-none focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Active Status</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {isActive ? 'Member can access the platform' : 'Member access is disabled'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isActive ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || member.role === 'OWNER'}
              className="flex-1 rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D5A8E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Booking Modal ────────────────────────────────────────────────────

function AssignBookingModal({
  member,
  onClose,
  onAssign,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onAssign: (memberId: string, bookingId: string) => Promise<void>;
}) {
  const [bookings, setBookings] = useState<UnassignedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setLoading(true);
      apiGet<UnassignedBooking[]>('/bookings?status=PENDING&unassigned=true')
        .then((data) => {
          const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
          setBookings(items);
        })
        .catch(() => setBookings([]))
        .finally(() => setLoading(false));
    }
  }, [member]);

  if (!member) return null;

  const handleAssign = async (bookingId: string) => {
    setAssigning(bookingId);
    try {
      await onAssign(member.id, bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } finally {
      setAssigning(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Assign Booking
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Assign a booking to {member.firstName} {member.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#192C67] border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-zinc-300 dark:text-zinc-600">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No unassigned bookings</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">All bookings have already been assigned.</p>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {b.clientName || 'Client'}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(b.scheduledAt)} &middot; {b.duration}min &middot; {b.sessionType}
                  </div>
                </div>
                <button
                  onClick={() => handleAssign(b.id)}
                  disabled={assigning === b.id}
                  className="ml-3 shrink-0 rounded-lg bg-[#F77B0F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#B08930] disabled:opacity-50"
                >
                  {assigning === b.id ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Remove Confirm Dialog ───────────────────────────────────────────────────

function RemoveConfirm({
  member,
  onClose,
  onConfirm,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);

  if (!member) return null;

  const handleConfirm = async () => {
    setRemoving(true);
    try {
      await onConfirm(member.id);
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Remove Team Member</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to remove <strong>{member.firstName} {member.lastName}</strong> from your team? This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={removing}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Member Card ─────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onEdit,
  onAssign,
  onRemove,
}: {
  member: TeamMember;
  onEdit: (m: TeamMember) => void;
  onAssign: (m: TeamMember) => void;
  onRemove: (m: TeamMember) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.ASSOCIATE;
  const isOwner = member.role === 'OWNER';

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <MemberAvatar member={member} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {member.firstName} {member.lastName}
            </h4>
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', badge.bg, badge.text)}>
              {badge.label}
            </span>
            {!member.isActive && (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {member.email}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
            {member.department && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#192C67]/10 px-2 py-0.5 text-[10px] font-medium text-[#192C67] dark:bg-[#192C67]/30 dark:text-[#5b8bc7]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-4h6v4" />
                </svg>
                {member.department.name}
              </span>
            )}
            {member.title && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {member.title}
              </span>
            )}
            {member.specialization && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {member.specialization}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Joined {formatDate(member.joinedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(member); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Role
                </button>
                {(member.role === 'CONSULTANT' || member.role === 'ASSOCIATE') && (
                  <button
                    onClick={() => { setMenuOpen(false); onAssign(member); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Assign Booking
                  </button>
                )}
                {!isOwner && (
                  <>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button
                      onClick={() => { setMenuOpen(false); onRemove(member); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Invite Row ──────────────────────────────────────────────────────────────

function InviteRow({
  invite,
  onCancel,
}: {
  invite: TeamInvite;
  onCancel: (id: string) => void;
}) {
  const status = INVITE_STATUS[invite.status] ?? INVITE_STATUS.PENDING;
  const badge = ROLE_BADGE[invite.role] ?? ROLE_BADGE.ASSOCIATE;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
            {invite.email}
          </span>
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', badge.bg, badge.text)}>
            {badge.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <span>Sent {formatDate(invite.sentAt)}</span>
          <span>Expires {formatDate(invite.expiresAt)}</span>
        </div>
      </div>

      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', status.color)}>
        {status.label}
      </span>

      {invite.status === 'PENDING' && (
        <button
          onClick={() => onCancel(invite.id)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ─── Add Trainer Modal ───────────────────────────────────────────────────────

const KENYAN_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
  'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
  'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit',
  'Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi','Narok','Nyamira',
  'Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi',
  'Trans-Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

const ic2 = "w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-[#192C67] outline-none";

// ── Add Trainer Modal (brand-new account, lean form) ─────────────────────────
function AddTrainerModal({ open, onClose, onCreated, orgUserId, departments }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgUserId: string;
  departments: { id: string; name: string }[];
}) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    trainerType: 'PROFESSIONAL', specialization: '', hourlyRate: '',
    experience: '', location: '', county: '', teamRole: 'CONSULTANT', departmentId: '',
  });

  const reset = () => setForm({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    trainerType: 'PROFESSIONAL', specialization: '', hourlyRate: '',
    experience: '', location: '', county: '', teamRole: 'CONSULTANT', departmentId: '',
  });

  const handleCreate = async () => {
    if (!form.firstName || !form.email || !form.password) {
      addToast('error', 'First name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/register', {
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: 'TRAINER',
        trainerType: form.trainerType,
        specialization: form.specialization || undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        experience: form.experience ? Number(form.experience) : undefined,
        location: form.location || undefined,
        county: form.county || undefined,
        firmId: orgUserId,
        teamRole: form.teamRole,
        departmentId: form.departmentId || undefined,
      });
      addToast('success', `${form.firstName} added to your team`);
      reset(); onClose(); onCreated();
    } catch (err: any) {
      const raw = err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to add trainer';
      const msg = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : 'Failed to add trainer';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Add New Trainer</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Creates a brand-new SkillSasa account and auto-attaches them to your org</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Trainer Type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Trainer Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'PROFESSIONAL', label: 'Professional', desc: 'Corporate, consulting, coaching' },
                { value: 'VOCATIONAL', label: 'Vocational', desc: 'Trades, crafts, practical skills' }].map(t => (
                <button key={t.value} type="button" onClick={() => setForm({ ...form, trainerType: t.value })}
                  className={cn('p-3 rounded-xl border-2 text-left transition-all', form.trainerType === t.value
                    ? t.value === 'PROFESSIONAL' ? 'border-[#192C67] bg-[#192C67]/5' : 'border-[#F77B0F] bg-[#F77B0F]/5'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.label}</span>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Details */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Personal Details</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">First Name *</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="John" className={ic2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Last Name</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Doe" className={ic2} />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="trainer@example.com" className={ic2} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" className={ic2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars" className={ic2 + ' pr-10'} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={showPw ? "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"} /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Professional Details</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Specialization</label>
                <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Leadership, Welding" className={ic2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Hourly Rate (KES)</label>
                <input type="number" min="0" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder="0" className={ic2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Experience (years)</label>
                <input type="number" min="0" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="0" className={ic2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Nairobi CBD" className={ic2} />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">County</label>
              <select value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} className={ic2}>
                <option value="">Select County</option>
                {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Org Role */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Org Role</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Team Role</label>
                <select value={form.teamRole} onChange={e => setForm({ ...form, teamRole: e.target.value })} className={ic2}>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="ASSOCIATE">Associate</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Department</label>
                <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className={ic2}>
                  <option value="">No department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 shrink-0">
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !form.firstName || !form.email || !form.password}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F77B0F] text-white text-sm font-bold hover:bg-[#c49a3a] disabled:opacity-50 transition-colors">
            {saving ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Creating...</>) : 'Create & Add to Team'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Existing Trainer Modal (search SkillSasa trainers, direct-add) ─────────────
function AddExistingTrainerModal({ open, onClose, onAdded, departments }: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  departments: { id: string; name: string }[];
}) {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [role, setRole] = useState('CONSULTANT');
  const [departmentId, setDepartmentId] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setQuery(''); setResults([]); setSelected(null); setRole('CONSULTANT'); setDepartmentId(''); setTitle(''); };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiGet<any>(`/trainers?search=${encodeURIComponent(query)}&limit=10`);
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setResults(items);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiPost('/team/add-trainer', {
        trainerUserId: selected.userId || selected.user?.id,
        role,
        title: title || undefined,
        departmentId: departmentId || undefined,
      });
      const name = selected.user?.firstName || selected.firstName || 'Trainer';
      addToast('success', `${name} added to your org`);
      reset(); onClose(); onAdded();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to add trainer');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Add Existing Trainer</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Search for a trainer already on SkillSasa and bring them into your org</p>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Search */}
          {!selected ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Search Trainer</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or email..." className={ic2 + ' pl-10'} autoFocus />
                {searching && <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>}
              </div>
              {results.length > 0 && (
                <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  {results.map((t: any) => {
                    const firstName = t.user?.firstName || t.firstName || '';
                    const lastName = t.user?.lastName || t.lastName || '';
                    const email = t.user?.email || t.email || '';
                    const spec = t.specialization || '';
                    return (
                      <button key={t.id} type="button" onClick={() => setSelected(t)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-[#192C67]/10 flex items-center justify-center text-xs font-bold text-[#192C67] dark:text-[#5b8bc7] shrink-0">
                          {firstName[0]}{lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{firstName} {lastName}</p>
                          <p className="text-xs text-zinc-500 truncate">{email}{spec ? ` · ${spec}` : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {query.trim() && !searching && results.length === 0 && (
                <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500 text-center">No trainers found for "{query}"</p>
              )}
            </div>
          ) : (
            <>
              {/* Selected trainer card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#192C67]/5 dark:bg-[#192C67]/10 border border-[#192C67]/20">
                <div className="w-10 h-10 rounded-full bg-[#192C67] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(selected.user?.firstName || selected.firstName || '?')[0]}{(selected.user?.lastName || selected.lastName || '')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selected.user?.firstName || selected.firstName} {selected.user?.lastName || selected.lastName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{selected.user?.email || selected.email}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-red-500 shrink-0">Change</button>
              </div>

              {/* Role + Department + Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Assign Role</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[{ v: 'CONSULTANT', desc: 'Receives assigned bookings' },
                    { v: 'ASSOCIATE', desc: 'View-only access' },
                    { v: 'ADMIN', desc: 'Can manage team' }].map(r => (
                    <button key={r.v} type="button" onClick={() => setRole(r.v)}
                      className={cn('p-2.5 rounded-xl border-2 text-left transition-all', role === r.v ? 'border-[#192C67] bg-[#192C67]/5' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">{r.v[0] + r.v.slice(1).toLowerCase()}</span>
                      <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Title <span className="text-zinc-400">(optional)</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Consultant" className={ic2} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Department <span className="text-zinc-400">(optional)</span></label>
                    <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={ic2}>
                      <option value="">No department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
          <button onClick={handleAdd} disabled={!selected || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#192C67] text-white text-sm font-bold hover:bg-[#2D5A8E] disabled:opacity-40 transition-colors">
            {saving ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Adding...</>) : 'Add to Org'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [assignMember, setAssignMember] = useState<TeamMember | null>(null);
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);

  const firmName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}'s Team`
    : 'Your Team';

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiGet<TeamMember[] | { items: TeamMember[] }>('/team/members');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setMembers(items);
    } catch {
      addToast('error', 'Failed to load team members');
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await apiGet<TeamInvite[] | { items: TeamInvite[] }>('/team/invites');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setInvites(items);
    } catch {
      // invites endpoint may not exist yet — fail silently
      setInvites([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await apiGet<any>('/departments');
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
    } catch { setDepartments([]); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMembers(), fetchInvites(), fetchDepartments()]).finally(() => setLoading(false));
  }, [fetchMembers, fetchInvites]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleEditMember = async (id: string, data: { role?: string; title?: string; isActive?: boolean }) => {
    try {
      await apiPatch(`/team/members/${id}`, data);
      addToast('success', 'Member updated');
      fetchMembers();
    } catch {
      addToast('error', 'Failed to update member');
      throw new Error('Failed');
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await apiDelete(`/team/members/${id}`);
      addToast('success', 'Member removed');
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      addToast('error', 'Failed to remove member');
      throw new Error('Failed');
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await apiDelete(`/team/invite/${id}`);
      addToast('success', 'Invite cancelled');
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch {
      addToast('error', 'Failed to cancel invite');
    }
  };

  const handleAssignBooking = async (memberId: string, bookingId: string) => {
    try {
      await apiPost(`/team/members/${memberId}/assign-booking`, { bookingId });
      addToast('success', 'Booking assigned');
    } catch {
      addToast('error', 'Failed to assign booking');
      throw new Error('Failed');
    }
  };

  // ── Guard ────────────────────────────────────────────────────────────────

  if (user?.role !== 'TRAINER') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600">
          <path d="M12 15v2m0 0a2 2 0 100 4 2 2 0 000-4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Access Restricted</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Team management is only available for Trainer accounts.
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const pendingInvites = invites.filter((i) => i.status === 'PENDING');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your Team
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {firmName} &middot; Manage your consultants and team members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/departments')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#192C67] px-4 py-2.5 text-sm font-medium text-[#192C67] transition-colors hover:bg-[#192C67]/5 dark:border-[#5b8bc7] dark:text-[#5b8bc7] dark:hover:bg-[#5b8bc7]/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Departments
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#F77B0F] px-4 py-2.5 text-sm font-medium text-[#F77B0F] transition-colors hover:bg-[#F77B0F]/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Add Trainer
          </button>
          <button
            onClick={() => setShowExistingModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#192C67] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2D5A8E] dark:bg-[#2D5A8E] dark:hover:bg-[#192C67]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3C6.5 3 5 4.5 5 6.5S6.5 10 8.5 10 12 8.5 12 6.5 10.5 3 8.5 3zM20 8v6m3-3h-6" />
            </svg>
            Add Existing Trainer
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow members={members} invites={invites} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setTab('members')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'members'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
          )}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setTab('invites')}
          className={cn(
            'relative flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'invites'
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
          )}
        >
          Pending Invites
          {pendingInvites.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
              {pendingInvites.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <MemberSkeleton />
          <MemberSkeleton />
          <MemberSkeleton />
        </div>
      ) : tab === 'members' ? (
        members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10">
            <div className="max-w-lg mx-auto text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-[#192C67]/10 dark:bg-[#192C67]/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#192C67] dark:text-[#5b8bc7]">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Set Up Your Team</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Build your consulting team by inviting consultants and associates. Create departments to organize your firm and assign bookings to the right people.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-left">
                  <div className="h-8 w-8 rounded-lg bg-[#F77B0F]/15 flex items-center justify-center mb-3">
                    <span className="text-[#F77B0F] font-bold text-sm">1</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invite Consultants</p>
                  <p className="text-xs text-zinc-500 mt-1">Send email invites to your team members</p>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-left">
                  <div className="h-8 w-8 rounded-lg bg-[#0D9488]/15 flex items-center justify-center mb-3">
                    <span className="text-[#0D9488] font-bold text-sm">2</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Create Departments</p>
                  <p className="text-xs text-zinc-500 mt-1">Organize into HR, Finance, ICT etc.</p>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-left">
                  <div className="h-8 w-8 rounded-lg bg-[#192C67]/15 flex items-center justify-center mb-3">
                    <span className="text-[#192C67] dark:text-[#5b8bc7] font-bold text-sm">3</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Assign & Schedule</p>
                  <p className="text-xs text-zinc-500 mt-1">Set availability and assign bookings</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F77B0F] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#c49a3a]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                  Add Trainer Directly
                </button>
                <button
                  onClick={() => setShowExistingModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#192C67] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D5A8E]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3C6.5 3 5 4.5 5 6.5S6.5 10 8.5 10 12 8.5 12 6.5 10.5 3 8.5 3zM20 8v6m3-3h-6" /></svg>
                  Add Existing Trainer
                </button>
                <button
                  onClick={() => router.push('/departments')}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#192C67] px-6 py-3 text-sm font-medium text-[#192C67] transition-colors hover:bg-[#192C67]/5 dark:border-[#5b8bc7] dark:text-[#5b8bc7]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Create Departments
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={setEditMember}
                onAssign={setAssignMember}
                onRemove={setRemoveMember}
              />
            ))}
          </div>
        )
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            No invites sent
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Send an invite to add consultants to your team.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} onCancel={handleCancelInvite} />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddTrainerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchMembers}
        orgUserId={user?.id || ''}
        departments={departments}
      />
      <AddExistingTrainerModal
        open={showExistingModal}
        onClose={() => setShowExistingModal(false)}
        onAdded={fetchMembers}
        departments={departments}
      />
      <EditRoleModal
        member={editMember}
        onClose={() => setEditMember(null)}
        onSave={handleEditMember}
      />
      <AssignBookingModal
        member={assignMember}
        onClose={() => setAssignMember(null)}
        onAssign={handleAssignBooking}
      />
      <RemoveConfirm
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}
