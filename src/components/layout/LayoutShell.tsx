'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import Header from './Header';
import Footer from './Footer';

/**
 * Pages that render their own layout (landing, auth flows).
 * They get NO Header/Footer/Shell — just raw children.
 */
const STANDALONE_PAGES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Public marketing pages that always show Header + Footer,
 * even if the user happens to be logged in.
 */
const PUBLIC_PAGES = [
  '/about',
  '/how-it-works',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/for-employers',
];

/**
 * App pages that should render inside the sidebar Shell when the user is logged in.
 * Uses prefix matching so sub-routes (e.g., /jobs/abc-123) are included.
 */
const APP_PREFIXES = [
  // Uteo core app pages
  '/feed',
  '/jobs',
  '/applications',
  '/saved-jobs',
  '/post-job',
  '/recruiter',
  '/companies',
  // Shared
  '/messages',
  '/notifications',
  '/profile',
  '/settings',
  '/help',
  // Legacy SkillSasa app pages (kept for backward compat)
  '/dashboard',
  '/bookings',
  '/wallet',
  '/reviews',
  '/subscriptions',
  '/sessions',
  '/book',
  '/trainers',
  '/availability',
  '/team',
  '/departments',
  '/courses',
  '/my-courses',
  '/clients',
  '/favorites',
  '/earnings',
  '/payments',
  '/firm-financials',
  '/my-learning',
  '/recommendations',
  '/performance',
  '/invoices',
  '/disputes',
  '/sla',
  '/credentials',
  '/certificates',
  '/transcript',
];

function isStandalone(pathname: string): boolean {
  if (STANDALONE_PAGES.includes(pathname)) return true;
  // Public verify pages render their own standalone layout
  if (pathname.startsWith('/verify/')) return true;
  return false;
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.includes(pathname);
}

function isAppPage(pathname: string): boolean {
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Standalone pages (landing, login, register, etc.) — no wrapper
  if (isStandalone(pathname)) {
    return <>{children}</>;
  }

  // 2. Static public marketing pages — always Header + Footer
  if (isPublicPage(pathname)) {
    return (
      <>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </>
    );
  }

  // 3. If user is logged in and on an app page, use the Shell
  if (isAuthenticated && isAppPage(pathname)) {
    return <Shell>{children}</Shell>;
  }

  // 4. While auth is loading, avoid layout flash — show a minimal loader
  if (isLoading && isAppPage(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // 5. Fallback — Header + Footer for everything else
  //    (e.g., /trainers when not logged in, or unknown routes)
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
