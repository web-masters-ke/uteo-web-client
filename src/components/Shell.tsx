"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { NotificationsProvider, useNotifications } from "@/lib/notifications";
import { fmtRelative } from "@/lib/format";
import type { UserRole } from "@/lib/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const icons: Record<string, string> = {
  // Uteo icons
  feed:
    "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-7-4h.01M9 3h6",
  jobs:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  applications:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  savedJobs:
    "M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z",
  postJob:
    "M12 4v16m8-8H4",
  recruiter:
    "M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9",
  companies:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  companyProfile:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  // Shared
  dashboard:
    "M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9",
  trainers:
    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  bookings:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  sessions:
    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  messages:
    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  notifications:
    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  wallet:
    "M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm16 5h-3a2 2 0 000 4h3v-4z",
  subscriptions:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  reviews:
    "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  profile:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  help:
    "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  availability:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  team:
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  departments:
    "M2 20h20M5 20V8l7-5 7 5v12M9 20v-4h6v4",
  courses:
    "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  myCourses:
    "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
  myClients:
    "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  favorites:
    "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  myLearning:
    "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
  earnings:
    "M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zm4 3h2m4 0h6M6 14h2m4 0h2",
  invoices:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  payments:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  firmFinancials:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  disputes:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
  sla:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  credentials:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  certificates:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  transcript:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  performance:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  recommendations:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
};

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: string;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  // ── JOB SEEKER (CLIENT) ──────────────────────────────────────────────────────
  { href: "/feed",          label: "My Feed",         icon: "feed",         group: "Discover",  roles: ["CLIENT"] },
  { href: "/jobs",          label: "Browse Jobs",     icon: "jobs",         group: "Discover",  roles: ["CLIENT"] },
  { href: "/applications",  label: "My Applications", icon: "applications", group: "Activity",  roles: ["CLIENT"] },
  { href: "/saved-jobs",    label: "Saved Jobs",      icon: "savedJobs",    group: "Activity",  roles: ["CLIENT"] },
  { href: "/messages",      label: "Messages",        icon: "messages",     group: "Activity",  roles: ["CLIENT"] },
  { href: "/notifications", label: "Notifications",   icon: "notifications",group: "Activity",  roles: ["CLIENT"] },

  // ── RECRUITER / EMPLOYER ────────────────────────────────────────────────────
  { href: "/recruiter",              label: "Dashboard",       icon: "recruiter",      group: "Hiring",  roles: ["TRAINER"] },
  { href: "/post-job",               label: "Post Job",        icon: "postJob",        group: "Hiring",  roles: ["TRAINER"] },
  { href: "/jobs",                   label: "My Jobs",         icon: "jobs",           group: "Hiring",  roles: ["TRAINER"] },
  { href: "/recruiter/applications", label: "Applications",    icon: "applications",   group: "Hiring",  roles: ["TRAINER"] },
  { href: "/messages",               label: "Messages",        icon: "messages",       group: "Hiring",  roles: ["TRAINER"] },
  { href: "/notifications",          label: "Notifications",   icon: "notifications",  group: "Hiring",  roles: ["TRAINER"] },
  { href: "/profile",                label: "Company Profile", icon: "companyProfile", group: "Hiring",  roles: ["TRAINER"] },

  // ── Account — visible to everyone ───────────────────────────────────────────
  { href: "/profile",   label: "Profile",  icon: "profile",  group: "Account", roles: ["CLIENT"] },
  { href: "/settings",  label: "Settings", icon: "settings", group: "Account" },
  { href: "/help",      label: "Help",     icon: "help",     group: "Account" },
];

function getNavForRole(role: UserRole, isOrgOwner = false, teamRole?: string | null): NavItem[] {
  return NAV.filter((n) => {
    // Basic role gate: if item specifies roles, user must have one of them
    if (n.roles && !n.roles.includes(role)) return false;
    return true;
  });
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Notification bell ────────────────────────────────────────────────────────

function NotificationBell() {
  const { items, unread, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-white/8 dark:bg-[#222222]">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notifications</span>
            <button onClick={markAllRead} className="text-[11px] text-[#F77B0F] hover:underline">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-400">All caught up</div>
            ) : (
              items.slice(0, 20).map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/notifications"}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className={clsx(
                    "block border-b border-zinc-50 px-3 py-2.5 text-xs last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60",
                    !n.read && "bg-[#192C67]/5 dark:bg-[#192C67]/10",
                  )}
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{n.title}</div>
                  {n.body && <div className="mt-0.5 line-clamp-1 text-zinc-400">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-zinc-400">{fmtRelative(n.createdAt)}</div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t border-zinc-100 px-3 py-2 text-center dark:border-zinc-800">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#F77B0F] hover:underline">View all</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User avatar dropdown ─────────────────────────────────────────────────────

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user
    ? (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase()
    : "S";

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#192C67] dark:bg-white/10 text-xs font-bold text-white hover:opacity-90 transition-opacity"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl dark:border-white/8 dark:bg-[#222222]">
          {user && (
            <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-zinc-400">{user.email}</div>
              <div className="mt-1 inline-block rounded bg-[#192C67]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#192C67] dark:bg-white/10 dark:text-white/60">
                {user.role}
              </div>
            </div>
          )}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Settings
          </Link>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
          <button
            onClick={onLogout}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  // Find the matching nav item for the current path
  const current = navItems.find((n) =>
    n.href === "/feed" ? pathname === "/feed" : pathname.startsWith(n.href),
  );

  // Build breadcrumb segments from the pathname
  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Link href="/feed" className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
        </svg>
      </Link>
      {segments.length > 0 && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-600">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            {current?.label ?? segments[segments.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </>
      )}
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const role: UserRole = user?.role ?? "CLIENT";
  const teamRole: string | null = (user as any)?.teamRole ?? null;
  const isOrgOwner = role === 'TRAINER' && !!(user as any)?.isOrgOwner;
  const navItems = getNavForRole(role, isOrgOwner, teamRole);
  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-1.5 px-4 py-4 border-b border-zinc-100 dark:border-white/5">
        <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Uteo</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => {
          const groupItems = navItems.filter((n) => n.group === g);
          return (
            <div key={g} className="mb-4">
              <div className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {g}
              </div>
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  // Exact-match pages (to avoid /feed matching /feed/... sub-paths that don't exist,
                  // and /recruiter matching /recruiter/applications accidentally)
                  const exactMatchHrefs = ["/feed", "/recruiter", "/dashboard", "/post-job", "/saved-jobs"];
                  const active = exactMatchHrefs.includes(item.href)
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  const d = icons[item.icon] ?? icons.dashboard;
                  return (
                    <Link
                      key={`${item.group}-${item.href}`}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-all",
                        active
                          ? "bg-[#F77B0F]/10 text-gray-900 dark:text-white font-semibold"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                      )}
                    >
                      <div className={clsx(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
                        active ? "bg-[#F77B0F] shadow-sm" : "bg-[#F77B0F]/10",
                      )}>
                        <span className={clsx(active ? "text-white" : "text-[#F77B0F]")}>
                          <Icon d={d} size={15} />
                        </span>
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom user pill */}
      {user && (
        <div className="border-t border-zinc-100 dark:border-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#192C67] dark:bg-white/10 text-xs font-bold text-white overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                {user.firstName} {user.lastName}
              </div>
              <div className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                {user.role === "TRAINER" ? "Recruiter" : "Job Seeker"}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-5 py-2.5 border-t border-zinc-100 dark:border-white/5 text-[10px] text-zinc-300 dark:text-white/20 tracking-widest uppercase">Uteo · Jobs Platform</div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#111111]">
      {/* Desktop sidebar — scrolls independently via inner nav's overflow-y-auto */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white dark:border-white/6 dark:bg-[#1a1a1a] md:flex md:flex-col">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 overflow-y-auto bg-white shadow-2xl dark:bg-[#1a1a1a]">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content area — flex col so header is fixed, main scrolls */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — shrink-0 keeps it pinned at top without sticky */}
        <header className="relative shrink-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md dark:border-white/6 dark:bg-[#1a1a1a]/95">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
              aria-label="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Breadcrumb */}
            <Breadcrumb navItems={navItems} />
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <ThemeToggle />
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <UserMenu onLogout={handleLogout} />
          </div>
        </header>

        {/* Page content — this is the only thing that scrolls */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <ShellInner>{children}</ShellInner>
    </NotificationsProvider>
  );
}
