'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import ThemeToggle from '../ui/ThemeToggle';
import Avatar from '../ui/Avatar';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unread } = useNotifications();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isRecruiter = (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';

  const publicLinks = [
    { href: '/', label: 'Home' },
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/#for-employers', label: 'For Employers' },
  ];

  const seekerLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/applications', label: 'My Applications' },
    { href: '/messages', label: 'Messages' },
    { href: '/notifications', label: 'Notifications' },
  ];

  const recruiterLinks = [
    { href: '/recruiter', label: 'Dashboard' },
    { href: '/post-job', label: 'Post Job' },
    { href: '/recruiter/applications', label: 'Applications' },
    { href: '/messages', label: 'Messages' },
  ];

  const links = isAuthenticated
    ? isRecruiter
      ? recruiterLinks
      : seekerLinks
    : publicLinks;

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Uteo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F77B0F] text-[9px] font-bold text-white leading-none">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Avatar src={user.avatarUrl} firstName={user.firstName} lastName={user.lastName} size="sm" />
                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user.firstName}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {isRecruiter ? (
                        <>
                          {[
                            { href: '/recruiter', label: 'Dashboard' },
                            { href: '/post-job', label: 'Post Job' },
                            { href: '/profile', label: 'Company Profile' },
                            { href: '/settings', label: 'Settings' },
                          ].map((l) => (
                            <Link key={l.href} href={l.href} onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{l.label}</Link>
                          ))}
                        </>
                      ) : (
                        <>
                          {[
                            { href: '/feed', label: 'My Feed' },
                            { href: '/profile', label: 'Profile' },
                            { href: '/applications', label: 'Applications' },
                            { href: '/saved-jobs', label: 'Saved Jobs' },
                            { href: '/settings', label: 'Settings' },
                          ].map((l) => (
                            <Link key={l.href} href={l.href} onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{l.label}</Link>
                          ))}
                        </>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                        <button onClick={logout} className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Login</Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-[#F77B0F] rounded-lg hover:bg-[#e06a0d]">Get Started</Link>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                  pathname === l.href
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex gap-2 mt-4 px-4">
                <Link href="/login" className="flex-1 text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">Login</Link>
                <Link href="/register" className="flex-1 text-center py-2.5 text-sm font-medium text-white bg-[#F77B0F] rounded-lg">Get Started</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
