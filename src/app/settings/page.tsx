'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/auth';
import { userService } from '@/lib/services/users';
import type { NotificationPreferences } from '@/lib/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;
type SettingsTab = 'account' | 'notifications' | 'appearance' | 'privacy' | 'danger';

const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'account',       label: 'Account',       icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { key: 'notifications', label: 'Notifications', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
  { key: 'appearance',    label: 'Appearance',    icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' },
  { key: 'privacy',       label: 'Privacy',       icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
  { key: 'danger',        label: 'Danger Zone',   icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
];

const TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
];

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#192C67] dark:focus:border-[#F77B0F] focus:ring-2 focus:ring-[#192C67]/10 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-600';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">{children}</p>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6', className)}>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled}
      className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50', checked ? 'bg-[#192C67]' : 'bg-zinc-200 dark:bg-zinc-700')}>
      <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
        {desc && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>('account');

  const [passwordSaving, setPasswordSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const [prefs, setPrefs] = useState<NotificationPreferences>({ emailNotifications: true, smsNotifications: true, pushNotifications: true });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'CONNECTIONS'>('PUBLIC');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [language, setLanguage] = useState('en');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Job preferences (CLIENT only)
  const [openToWork, setOpenToWork] = useState(true);
  const [openToWorkSaving, setOpenToWorkSaving] = useState(false);

  useEffect(() => {
    userService.getNotificationPreferences().then(setPrefs).catch(() => {});
    try {
      const s = JSON.parse(localStorage.getItem('uteo-settings') ?? '{}');
      if (s.timezone) setTimezone(s.timezone);
      if (s.language) setLanguage(s.language);
      if (s.profileVisibility) setProfileVisibility(s.profileVisibility);
      if (s.showOnlineStatus !== undefined) setShowOnlineStatus(s.showOnlineStatus);
      if (s.allowMessages !== undefined) setAllowMessages(s.allowMessages);
    } catch { /* ignore */ }

    if ((user as any)?.role === 'CLIENT') {
      apiGet<any>('/profile/me').then((data) => {
        const jsp = data?.jobSeekerProfile ?? data;
        if (jsp?.openToWork !== undefined) setOpenToWork(jsp.openToWork);
      }).catch(() => {});
    }
  }, [user]);

  const saveLocal = (updates: Record<string, any>) => {
    try {
      const stored = JSON.parse(localStorage.getItem('uteo-settings') ?? '{}');
      localStorage.setItem('uteo-settings', JSON.stringify({ ...stored, ...updates }));
    } catch { /* ignore */ }
  };

  const handlePasswordChange = async (data: PasswordForm) => {
    setPasswordSaving(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      addToast('success', 'Password changed successfully');
      reset();
    } catch {
      addToast('error', 'Failed to change password. Check your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePrefChange = async (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      await userService.updateNotificationPreferences(updated);
      addToast('success', 'Preferences updated');
    } catch {
      setPrefs(prefs);
      addToast('error', 'Failed to update preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  const toggleOpenToWork = async () => {
    const next = !openToWork;
    setOpenToWork(next);
    setOpenToWorkSaving(true);
    try {
      await apiPatch('/profile/me', { openToWork: next });
      addToast('success', next ? 'You\'re now open to work' : 'Open to work turned off');
      router.refresh(); // bust Next.js router cache so profile page re-fetches on next visit
    } catch {
      setOpenToWork(!next);
      addToast('error', 'Failed to update preference');
    } finally {
      setOpenToWorkSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await userService.deleteAccount();
      addToast('success', 'Account deleted');
      logout();
    } catch {
      addToast('error', 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiPatch('/users/me/deactivate', {});
      addToast('success', 'Account deactivated. Log back in to reactivate.');
      logout();
    } catch {
      addToast('error', 'Failed to deactivate account');
    } finally {
      setDeactivating(false);
    }
  };

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* ─── Hero ─── */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#192C67] flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Settings</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{displayName}</p>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6">

          {/* ─── Sidebar ─── */}
          <aside className="md:w-52 flex-shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {TABS.map((t) => {
                const isActive = tab === t.key;
                const isDanger = t.key === 'danger';
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                      isDanger
                        ? isActive
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                        : isActive
                          ? 'bg-[#192C67] text-white'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100',
                    )}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                    </svg>
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ─── Content ─── */}
          <div className="flex-1 space-y-5 min-w-0">

            {/* ── Account ── */}
            {tab === 'account' && (
              <>
                <Card>
                  <SectionTitle>Account Information</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: 'Name', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—' },
                      { label: 'Email', value: user?.email || '—' },
                      { label: 'Role', value: user?.role || '—', badge: true },
                      { label: 'Phone', value: (user as any)?.phone || 'Not set' },
                    ].map(({ label, value, badge }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
                        {badge ? (
                          <span className="inline-flex items-center rounded-full bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/30 dark:text-[#F77B0F]/80 px-2.5 py-0.5 text-xs font-semibold capitalize">
                            {value.toLowerCase()}
                          </span>
                        ) : (
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                    <Link href="/profile"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#192C67] dark:text-[#F77B0F] hover:underline">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit full profile
                    </Link>
                  </div>
                </Card>

                {(user as any)?.role === 'CLIENT' && (
                  <Card>
                    <SectionTitle>Job Preferences</SectionTitle>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Control how you appear to employers and recruiters.</p>
                    <SettingRow
                      label="Open to Work"
                      desc="Show recruiters and employers that you're actively looking for opportunities"
                    >
                      <div className="flex items-center gap-2">
                        {openToWork && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Active</span>
                        )}
                        <ToggleSwitch checked={openToWork} onChange={toggleOpenToWork} disabled={openToWorkSaving} />
                      </div>
                    </SettingRow>
                    <div className="pt-3">
                      <Link href="/profile?tab=about"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#192C67] dark:text-[#F77B0F] hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        Edit headline, location &amp; bio on your profile
                      </Link>
                    </div>
                  </Card>
                )}

                <Card>
                  <SectionTitle>Change Password</SectionTitle>
                  <form onSubmit={handleSubmit(handlePasswordChange)} className="space-y-4 max-w-md">
                    {[
                      { name: 'currentPassword' as const, label: 'Current Password' },
                      { name: 'newPassword' as const, label: 'New Password' },
                      { name: 'confirmPassword' as const, label: 'Confirm New Password' },
                    ].map(({ name, label }) => (
                      <div key={name}>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">{label}</label>
                        <input {...register(name)} type="password" className={INPUT} />
                        {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>}
                      </div>
                    ))}
                    <button type="submit" disabled={passwordSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#192C67] text-white text-sm font-semibold rounded-xl hover:bg-[#162354] transition-colors disabled:opacity-50">
                      {passwordSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : 'Change Password'}
                    </button>
                  </form>
                </Card>

                <Card>
                  <SectionTitle>Locale</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Language</label>
                      <select value={language} onChange={(e) => { setLanguage(e.target.value); saveLocal({ language: e.target.value }); addToast('success', 'Language updated'); }} className={INPUT}>
                        {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Timezone</label>
                      <select value={timezone} onChange={(e) => { setTimezone(e.target.value); saveLocal({ timezone: e.target.value }); addToast('success', 'Timezone updated'); }} className={INPUT}>
                        {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                      </select>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ── Notifications ── */}
            {tab === 'notifications' && (
              <Card>
                <div className="flex items-start justify-between mb-1">
                  <SectionTitle>Notification Preferences</SectionTitle>
                  <Link href="/settings/notifications" className="text-[10px] font-bold uppercase tracking-widest text-[#192C67] dark:text-[#F77B0F]/80 hover:underline flex items-center gap-1">
                    Advanced
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">Choose how you want to be notified about updates and activity.</p>
                {[
                  { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Job alerts, application updates, and messages via email' },
                  { key: 'smsNotifications' as const,   label: 'SMS Notifications',   desc: 'Text messages for important updates and reminders' },
                  { key: 'pushNotifications' as const,  label: 'Push Notifications',  desc: 'Real time job match and message alerts in the browser' },
                ].map((item) => (
                  <SettingRow key={item.key} label={item.label} desc={item.desc}>
                    <ToggleSwitch checked={prefs[item.key]} onChange={() => handlePrefChange(item.key)} disabled={prefsSaving} />
                  </SettingRow>
                ))}
              </Card>
            )}

            {/* ── Appearance ── */}
            {tab === 'appearance' && (
              <Card>
                <SectionTitle>Theme</SectionTitle>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">Choose your preferred color scheme.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-sm">
                  {[
                    { value: 'light', label: 'Light', sub: 'Bright & clean', iconColor: 'text-yellow-500', iconPath: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                    { value: 'dark',  label: 'Dark',  sub: 'Easy on the eyes', iconColor: 'text-indigo-500', iconPath: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
                  ].map((t) => (
                    <button key={t.value} onClick={() => setTheme(t.value as 'light' | 'dark')}
                      className={cn(
                        'p-4 rounded-2xl border-2 text-center transition-all',
                        theme === t.value
                          ? 'border-[#192C67] bg-[#192C67]/5 dark:bg-[#192C67]/20 ring-2 ring-[#192C67]/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600',
                      )}>
                      <svg className={cn('w-8 h-8 mx-auto mb-2', t.iconColor)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={t.iconPath} />
                      </svg>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t.label}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{t.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Privacy ── */}
            {tab === 'privacy' && (
              <Card>
                <SectionTitle>Privacy Settings</SectionTitle>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">Control who can see your information and how others interact with you.</p>

                <div className="mb-5">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Profile Visibility</p>
                  <div className="flex flex-wrap gap-2">
                    {(['PUBLIC', 'CONNECTIONS', 'PRIVATE'] as const).map((v) => (
                      <button key={v}
                        onClick={() => { setProfileVisibility(v); saveLocal({ profileVisibility: v }); }}
                        className={cn(
                          'py-2 px-4 rounded-xl text-sm font-semibold border transition-all',
                          profileVisibility === v
                            ? 'border-[#192C67] bg-[#192C67] text-white'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300',
                        )}>
                        {v === 'PUBLIC' ? 'Public' : v === 'CONNECTIONS' ? 'Connections' : 'Private'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    {profileVisibility === 'PUBLIC' && 'Anyone can view your profile.'}
                    {profileVisibility === 'CONNECTIONS' && 'Only people you have chatted with can see your full profile.'}
                    {profileVisibility === 'PRIVATE' && 'Your profile is hidden from search results.'}
                  </p>
                </div>

                <SettingRow label="Show Online Status" desc="Let others see when you are active">
                  <ToggleSwitch checked={showOnlineStatus} onChange={() => { setShowOnlineStatus(!showOnlineStatus); saveLocal({ showOnlineStatus: !showOnlineStatus }); }} />
                </SettingRow>
                <SettingRow label="Allow Messages from Anyone" desc="When off, only users with active applications can message you">
                  <ToggleSwitch checked={allowMessages} onChange={() => { setAllowMessages(!allowMessages); saveLocal({ allowMessages: !allowMessages }); }} />
                </SettingRow>
              </Card>
            )}

            {/* ── Danger Zone ── */}
            {tab === 'danger' && (
              <Card className="border-red-200 dark:border-red-900/50">
                <SectionTitle>Danger Zone</SectionTitle>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">These actions are permanent and cannot be undone.</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Export Your Data</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Download all your applications, messages, and activity.</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                      Export
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Deactivate Account</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Temporarily hide your profile. Reactivate by logging back in.</p>
                    </div>
                    <button onClick={() => setShowDeactivateDialog(true)}
                      className="px-4 py-2 text-sm font-semibold text-amber-600 border border-amber-300 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                      Deactivate
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                    <div>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account Permanently</p>
                      <p className="text-xs text-zinc-400 mt-0.5">All data, applications, messages, and history will be lost forever.</p>
                    </div>
                    <button onClick={() => setShowDeleteDialog(true)}
                      className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Account"
        message="Your profile will be hidden and you'll be logged out. Log back in at any time to reactivate your account — all your data will still be here."
        confirmText="Yes, Deactivate"
        variant="warning"
        isLoading={deactivating}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Account Permanently"
        message="Are you absolutely sure? All your data — applications, messages, profile, and history — will be permanently and irreversibly lost."
        confirmText="Delete My Account Forever"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
