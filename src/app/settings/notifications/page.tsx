'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { userService } from '@/lib/services/users';
import { apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationChannel {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
}

interface NotificationTypes {
  jobMatches: boolean;
  applicationUpdates: boolean;
  newMessages: boolean;
  profileViews: boolean;
  interviewInvitations: boolean;
  jobAlerts: boolean;
  newApplications: boolean;
  marketingPromotions: boolean;
}

interface FullNotificationPrefs {
  channels: NotificationChannel;
  types: NotificationTypes;
}

const DEFAULT_PREFS: FullNotificationPrefs = {
  channels: { email: true, sms: true, push: true, inApp: true },
  types: {
    jobMatches: true,
    applicationUpdates: true,
    newMessages: true,
    profileViews: true,
    interviewInvitations: true,
    jobAlerts: true,
    newApplications: true,
    marketingPromotions: false,
  },
};

// ─── Components ──────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F77B0F]/30 flex-shrink-0',
        checked ? 'bg-[#F77B0F]' : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-checked={checked}
      role="switch"
    >
      <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>}
      {children}
    </div>
  );
}

function PrefRow({ icon, label, desc, checked, onChange }: { icon: string; label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <svg className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [prefs, setPrefs] = useState<FullNotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await userService.getNotificationPreferences() as any;
        if (raw) {
          setPrefs((prev) => ({
            channels: {
              email:  raw.emailNotifications  ?? raw.channels?.email  ?? prev.channels.email,
              sms:    raw.smsNotifications    ?? raw.channels?.sms    ?? prev.channels.sms,
              push:   raw.pushNotifications   ?? raw.channels?.push   ?? prev.channels.push,
              inApp:  raw.inAppNotifications  ?? raw.channels?.inApp  ?? prev.channels.inApp,
            },
            types: {
              jobMatches:           raw.jobMatches           ?? raw.types?.jobMatches           ?? prev.types.jobMatches,
              applicationUpdates:   raw.applicationUpdates   ?? raw.types?.applicationUpdates   ?? prev.types.applicationUpdates,
              newMessages:          raw.newMessages          ?? raw.types?.newMessages          ?? prev.types.newMessages,
              profileViews:         raw.profileViews         ?? raw.types?.profileViews         ?? prev.types.profileViews,
              interviewInvitations: raw.interviewInvitations ?? raw.types?.interviewInvitations ?? prev.types.interviewInvitations,
              jobAlerts:            raw.jobAlerts            ?? raw.types?.jobAlerts            ?? prev.types.jobAlerts,
              newApplications:      raw.newApplications      ?? raw.types?.newApplications      ?? prev.types.newApplications,
              marketingPromotions:  raw.marketingPromotions  ?? raw.types?.marketingPromotions  ?? prev.types.marketingPromotions,
            },
          }));
        }
      } catch { /* silently use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleChannel = (key: keyof NotificationChannel) => {
    setPrefs((p) => ({ ...p, channels: { ...p.channels, [key]: !p.channels[key] } }));
    setDirty(true);
  };

  const toggleType = (key: keyof NotificationTypes) => {
    setPrefs((p) => ({ ...p, types: { ...p.types, [key]: !p.types[key] } }));
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiPatch('/users/notification-preferences', {
        // flat format for legacy compatibility
        emailNotifications:  prefs.channels.email,
        smsNotifications:    prefs.channels.sms,
        pushNotifications:   prefs.channels.push,
        inAppNotifications:  prefs.channels.inApp,
        // structured
        channels: prefs.channels,
        types:    prefs.types,
        // individual type keys
        ...prefs.types,
      });
      addToast('success', 'Notification preferences saved');
      setDirty(false);
    } catch {
      addToast('error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [prefs, addToast]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  const CHANNELS: { key: keyof NotificationChannel; label: string; desc: string; icon: string }[] = [
    { key: 'email', label: 'Email',  desc: 'Job alerts and updates delivered to your inbox',    icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
    { key: 'sms',   label: 'SMS',    desc: 'Text messages for urgent updates on your phone',   icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
    { key: 'push',  label: 'Push',   desc: 'Real-time browser notifications when you\'re online', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { key: 'inApp', label: 'In-App', desc: 'Notifications in the bell icon while you browse',   icon: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3' },
  ];

  const isRecruiter = (user as any)?.role === 'TRAINER';

  const TYPES: { key: keyof NotificationTypes; label: string; desc: string; icon: string; recruiterOnly?: boolean; seekerOnly?: boolean }[] = [
    {
      key: 'jobMatches',
      label: 'Job Matches',
      desc: 'New jobs that match your skills, experience, and preferences',
      icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
      seekerOnly: true,
    },
    {
      key: 'applicationUpdates',
      label: 'Application Updates',
      desc: 'When your application is viewed, shortlisted, or progressed',
      icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
      seekerOnly: true,
    },
    {
      key: 'newApplications',
      label: 'New Applications',
      desc: 'When a candidate applies to one of your job postings',
      icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
      recruiterOnly: true,
    },
    {
      key: 'interviewInvitations',
      label: 'Interview Invitations',
      desc: 'When a recruiter invites you for an interview or assessment',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
      seekerOnly: true,
    },
    {
      key: 'newMessages',
      label: 'New Messages',
      desc: 'When a recruiter, employer, or candidate messages you',
      icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
    },
    {
      key: 'profileViews',
      label: 'Profile Views',
      desc: 'When an employer or recruiter views your profile',
      icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      seekerOnly: true,
    },
    {
      key: 'jobAlerts',
      label: 'Job Alerts',
      desc: 'Digest of new jobs matching your saved searches and filters',
      icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
      seekerOnly: true,
    },
    {
      key: 'marketingPromotions',
      label: 'Marketing & Promotions',
      desc: 'Platform updates, new features, and special offers',
      icon: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46',
    },
  ];

  const visibleTypes = TYPES.filter((t) => {
    if (t.seekerOnly && isRecruiter) return false;
    if (t.recruiterOnly && !isRecruiter) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Choose exactly what you want to hear about and how.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Delivery Channels */}
        <Section title="Delivery Channels" description="Choose which channels you want to receive notifications on.">
          {CHANNELS.map((ch) => (
            <PrefRow key={ch.key} icon={ch.icon} label={ch.label} desc={ch.desc}
              checked={prefs.channels[ch.key]} onChange={() => toggleChannel(ch.key)} />
          ))}
        </Section>

        {/* Notification Types */}
        <Section title="Notification Types" description="Choose which events you want to be notified about.">
          {visibleTypes.map((nt) => (
            <PrefRow key={nt.key} icon={nt.icon} label={nt.label} desc={nt.desc}
              checked={prefs.types[nt.key]} onChange={() => toggleType(nt.key)} />
          ))}
        </Section>

        {/* Save */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-6 py-2.5 bg-[#F77B0F] text-white font-semibold rounded-xl hover:bg-[#e06a0d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
