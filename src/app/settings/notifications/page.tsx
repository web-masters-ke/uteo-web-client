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
  bookingConfirmations: boolean;
  reminders: boolean;
  paymentUpdates: boolean;
  disputeAlerts: boolean;
  subscriptionRenewals: boolean;
  newMessages: boolean;
  reviewsAndRatings: boolean;
  marketingPromotions: boolean;
}

interface FullNotificationPrefs {
  channels: NotificationChannel;
  types: NotificationTypes;
}

const DEFAULT_PREFS: FullNotificationPrefs = {
  channels: { email: true, sms: true, push: true, inApp: true },
  types: {
    bookingConfirmations: true,
    reminders: true,
    paymentUpdates: true,
    disputeAlerts: true,
    subscriptionRenewals: true,
    newMessages: true,
    reviewsAndRatings: true,
    marketingPromotions: false,
  },
};

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#192C67]/30',
        checked ? 'bg-[#192C67]' : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-checked={checked}
      role="switch"
    >
      <div className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
        checked ? 'left-[22px]' : 'left-0.5',
      )} />
    </button>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>}
      {children}
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
        const raw = await userService.getNotificationPreferences();
        // Merge with defaults to handle partial API responses
        if (raw) {
          setPrefs((prev) => ({
            channels: {
              email: (raw as any).emailNotifications ?? (raw as any).channels?.email ?? prev.channels.email,
              sms: (raw as any).smsNotifications ?? (raw as any).channels?.sms ?? prev.channels.sms,
              push: (raw as any).pushNotifications ?? (raw as any).channels?.push ?? prev.channels.push,
              inApp: (raw as any).inAppNotifications ?? (raw as any).channels?.inApp ?? prev.channels.inApp,
            },
            types: {
              bookingConfirmations: (raw as any).bookingConfirmations ?? (raw as any).types?.bookingConfirmations ?? prev.types.bookingConfirmations,
              reminders: (raw as any).reminders ?? (raw as any).types?.reminders ?? prev.types.reminders,
              paymentUpdates: (raw as any).paymentUpdates ?? (raw as any).types?.paymentUpdates ?? prev.types.paymentUpdates,
              disputeAlerts: (raw as any).disputeAlerts ?? (raw as any).types?.disputeAlerts ?? prev.types.disputeAlerts,
              subscriptionRenewals: (raw as any).subscriptionRenewals ?? (raw as any).types?.subscriptionRenewals ?? prev.types.subscriptionRenewals,
              newMessages: (raw as any).newMessages ?? (raw as any).types?.newMessages ?? prev.types.newMessages,
              reviewsAndRatings: (raw as any).reviewsAndRatings ?? (raw as any).types?.reviewsAndRatings ?? prev.types.reviewsAndRatings,
              marketingPromotions: (raw as any).marketingPromotions ?? (raw as any).types?.marketingPromotions ?? prev.types.marketingPromotions,
            },
          }));
        }
      } catch {
        // silently use defaults
      } finally {
        setLoading(false);
      }
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
      // Send in both the flat format (legacy) and structured format
      await apiPatch('/users/notification-preferences', {
        emailNotifications: prefs.channels.email,
        smsNotifications: prefs.channels.sms,
        pushNotifications: prefs.channels.push,
        inAppNotifications: prefs.channels.inApp,
        channels: prefs.channels,
        types: prefs.types,
        bookingConfirmations: prefs.types.bookingConfirmations,
        reminders: prefs.types.reminders,
        paymentUpdates: prefs.types.paymentUpdates,
        disputeAlerts: prefs.types.disputeAlerts,
        subscriptionRenewals: prefs.types.subscriptionRenewals,
        newMessages: prefs.types.newMessages,
        reviewsAndRatings: prefs.types.reviewsAndRatings,
        marketingPromotions: prefs.types.marketingPromotions,
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

  const CHANNELS: { key: keyof NotificationChannel; label: string; desc: string; iconPath: string }[] = [
    { key: 'email', label: 'Email', desc: 'Receive notifications via email', iconPath: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
    { key: 'sms', label: 'SMS', desc: 'Get text messages on your phone', iconPath: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
    { key: 'push', label: 'Push', desc: 'Browser push notifications', iconPath: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { key: 'inApp', label: 'In-App', desc: 'Notifications within the platform', iconPath: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3' },
  ];

  const TYPES: { key: keyof NotificationTypes; label: string; desc: string; iconPath: string }[] = [
    { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'When a session is booked, confirmed, or cancelled', iconPath: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z' },
    { key: 'reminders', label: 'Session Reminders', desc: '24h and 1h before an upcoming session', iconPath: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'paymentUpdates', label: 'Payment Updates', desc: 'Payments received, refunds, and escrow releases', iconPath: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
    { key: 'disputeAlerts', label: 'Dispute Alerts', desc: 'When a dispute is opened or resolved', iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
    { key: 'subscriptionRenewals', label: 'Subscription Renewals', desc: 'Upcoming renewals and billing reminders', iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { key: 'newMessages', label: 'New Messages', desc: 'When you receive a new chat message', iconPath: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
    { key: 'reviewsAndRatings', label: 'Reviews & Ratings', desc: 'When a client leaves you a review', iconPath: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
    { key: 'marketingPromotions', label: 'Marketing & Promotions', desc: 'Platform updates, feature announcements, and offers', iconPath: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage how and when {user?.firstName ? `${user.firstName} receives` : 'you receive'} notifications
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Channels */}
        <Section
          title="Delivery Channels"
          description="Choose which channels you want to receive notifications on."
        >
          <div className="space-y-4">
            {CHANNELS.map((ch) => (
              <div key={ch.key} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={ch.iconPath} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{ch.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ch.desc}</p>
                    </div>
                    <ToggleSwitch checked={prefs.channels[ch.key]} onChange={() => toggleChannel(ch.key)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Notification types */}
        <Section
          title="Notification Types"
          description="Choose which events you want to be notified about."
        >
          <div className="space-y-4">
            {TYPES.map((nt) => (
              <div key={nt.key} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={nt.iconPath} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{nt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{nt.desc}</p>
                    </div>
                    <ToggleSwitch checked={prefs.types[nt.key]} onChange={() => toggleType(nt.key)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-6 py-2.5 bg-[#192C67] text-white font-semibold rounded-xl hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
