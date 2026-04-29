'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';

/* ─────────────────────────────────────────────────────────────────────
   Uteo — AI powered, feed based recruitment platform.
   Brand: navy #192C67 · orange #F77B0F · dark #060d1f
   ───────────────────────────────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 dark:bg-[#060d1f]/95 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-white/5'
          : ''
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className={`text-2xl font-black tracking-tight ${scrolled ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
              Uteo
            </span>
            <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {[
              ['How It Works', '/how-it-works'],
              ['Browse Jobs', '/jobs'],
              ['For Employers', '/for-trainers'],
              ['About', '/about'],
            ].map(([l, h]) => (
              <Link
                key={l}
                href={h}
                className={`text-[13px] font-semibold transition-colors ${
                  scrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {l}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggle}
              className={`p-2 rounded-full transition-colors ${
                scrolled ? 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300' : 'hover:bg-white/10 text-white/70'
              }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link
              href="/login"
              className={`text-[13px] font-semibold transition-colors ${
                scrolled ? 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-[#F77B0F] text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-[#e06a0d] transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} className={`lg:hidden p-2 ${scrolled ? 'text-gray-800 dark:text-white' : 'text-white'}`}>
            {open ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
        {open && (
          <div className="lg:hidden bg-white dark:bg-[#060d1f] border-t border-gray-100 dark:border-white/5 py-6 space-y-1">
            {[
              ['How It Works', '/how-it-works'],
              ['Browse Jobs', '/jobs'],
              ['For Employers', '/for-trainers'],
              ['About', '/about'],
            ].map(([l, h]) => (
              <Link key={l} href={h} onClick={() => setOpen(false)} className="block px-2 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {l}
              </Link>
            ))}
            <div className="pt-4 space-y-3 px-2">
              <Link href="/login" className="block text-center py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl">Log In</Link>
              <Link href="/register" className="block text-center bg-[#F77B0F] text-white py-3 text-sm font-bold rounded-xl">Get Started Free</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ── Animated AI feed mockup that lives in the hero ──────────────────── */
function FeedMockup() {
  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      <div className="absolute -inset-10 bg-[#F77B0F]/30 blur-3xl rounded-full" />

      <div className="relative rounded-3xl bg-[#0a1628] shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#060d1f] border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Your Feed</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Feed cards */}
        <div className="p-4 space-y-3">
          {[
            { co: 'Safaricom', role: 'Senior React Engineer', salary: 'KES 280–450k', match: 94, accent: 'emerald', tag: 'New' },
            { co: 'Equity Bank', role: 'Mobile Banking Developer', salary: 'KES 150–240k', match: 87, accent: 'amber', tag: '2h ago' },
            { co: 'Andela', role: 'Full Stack Engineer', salary: 'KES 280–450k', match: 91, accent: 'emerald', tag: 'Remote' },
          ].map((j, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/[0.04] border border-white/5 p-4 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{j.co}</div>
                  <div className="text-sm font-bold text-white truncate">{j.role}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{j.salary}</div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/60 shrink-0">
                  {j.tag}
                </span>
              </div>

              {/* Match score bar */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full ${j.accent === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${j.match}%` }}
                  />
                </div>
                <span className={`text-xs font-black ${j.accent === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {j.match}%
                </span>
                <button className="text-[10px] font-bold uppercase tracking-widest text-[#F77B0F] hover:text-orange-300 px-2 py-1 rounded-md bg-[#F77B0F]/10 border border-[#F77B0F]/20">
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification card */}
      <div className="hidden md:flex absolute -right-6 -bottom-4 w-64 bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-4 rotate-3 items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-900 dark:text-white">Application moved to Interview</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Equity Bank · 2 min ago</div>
        </div>
      </div>

      {/* Floating skill chip */}
      <div className="hidden md:block absolute -left-6 top-12 bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 px-4 py-3 -rotate-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Top match</div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F77B0F]" />
          <span className="text-sm font-black text-gray-900 dark:text-white">94% fit</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeQ, setActiveQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-[#060d1f] text-gray-900 dark:text-gray-100">
      <Navbar />

      {/* ── HERO ─ split layout: copy + animated feed mockup ───────────── */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 min-h-screen flex items-center overflow-hidden bg-[#060d1f]">
        {/* Background image, dark, with gradient mesh */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2400&q=100"
            alt="Diverse young professionals in Africa"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#060d1f] via-[#060d1f]/90 to-[#192C67]/40" />
        </div>
        {/* Soft animated orbs for life */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#F77B0F]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#192C67]/40 rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-7">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F77B0F] animate-pulse" />
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                  Africa&apos;s AI recruitment platform
                </span>
              </div>

              <h1 className="text-[clamp(2.75rem,6.5vw,5.5rem)] font-black leading-[0.92] text-white tracking-tight">
                Your dream job<br />
                <span className="text-[#F77B0F]">finds you.</span>
              </h1>

              <p className="mt-7 text-lg lg:text-xl text-white/55 max-w-xl leading-relaxed">
                Uteo&apos;s AI ranks every live role against your skills and surfaces only the ones that fit. One personalised feed. One click apply. Live status from submitted to hired.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-[#F77B0F] text-white font-bold px-7 py-4 rounded-full hover:bg-[#e06a0d] transition-colors shadow-2xl shadow-[#F77B0F]/30 text-sm"
                >
                  Get started — it&apos;s free
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/15 text-white font-bold px-7 py-4 rounded-full hover:bg-white/20 transition-colors text-sm"
                >
                  Browse jobs
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
                {[
                  { n: '10K+', l: 'Live jobs' },
                  { n: '5K+', l: 'Employers' },
                  { n: '50K+', l: 'Job seekers' },
                ].map(s => (
                  <div key={s.l} className="border-l-2 border-[#F77B0F] pl-4">
                    <div className="text-2xl lg:text-3xl font-black text-white">{s.n}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <FeedMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─ company logos ───────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#0a1628]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-6">
            Hiring on Uteo
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {['Safaricom', 'Equity Bank', 'Andela', 'KCB Group', 'Twiga Foods', 'M-KOPA', 'Jumia', 'Cellulant'].map(c => (
              <span key={c} className="text-base font-black text-white/35 tracking-tight">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — split: seekers + employers ────────────────── */}
      <section className="py-24 lg:py-32 bg-white dark:bg-[#060d1f]" id="how-it-works">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-5">
              How It Works
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] tracking-tight">
              One platform. Both sides win.
            </h2>
            <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              Skill matched, instantly — by design.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {/* Seekers card */}
            <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex flex-col">
              <div className="relative h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=1600&q=100"
                  alt="Job seeker on phone"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 left-4 inline-flex items-center px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F77B0F]">For job seekers</span>
                </div>
              </div>
              <div className="p-8 lg:p-10 flex-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                  From profile to offer in 4 steps.
                </h3>
                <ol className="space-y-3.5">
                  {[
                    'Build your profile — skills, experience, salary expectations',
                    'AI scores every live job against your profile',
                    'One click apply — your profile is your CV',
                    'Live tracking from Submitted to Hired',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#F77B0F] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/register"
                  className="inline-flex items-center mt-7 text-sm font-bold text-[#F77B0F] hover:opacity-80 transition-opacity"
                >
                  Create your profile →
                </Link>
              </div>
            </div>

            {/* Employers card */}
            <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex flex-col">
              <div className="relative h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=100"
                  alt="Hiring team meeting"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 left-4 inline-flex items-center px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#192C67]">For employers</span>
                </div>
              </div>
              <div className="p-8 lg:p-10 flex-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                  Pre matched candidates, faster hires.
                </h3>
                <ol className="space-y-3.5">
                  {[
                    'Create your company page and team workspace',
                    'Post a role — Uteo tags it with the skill graph',
                    'Get pre matched candidates ranked by match score',
                    'Pipeline tools — shortlist, interview, hire',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#192C67] dark:bg-white text-white dark:text-[#192C67] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/for-trainers"
                  className="inline-flex items-center mt-7 text-sm font-bold text-[#192C67] dark:text-white hover:opacity-80 transition-opacity"
                >
                  Hire smarter →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE UTEO ENGINE — bento with images ─────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50 dark:bg-[#0a1628]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="max-w-2xl mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-5">
              The Uteo engine
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] tracking-tight">
              Built for how Africa works.
            </h2>
            <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              Mobile first. Skill graph-powered. Real time. Free for seekers, fair for employers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Big — AI Feed */}
            <div className="lg:col-span-7 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[440px]">
              <div className="relative h-60 lg:h-72 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1600&q=100"
                  alt="AI matching technology"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-6 right-6 flex items-center gap-2.5">
                  <div className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold">
                    94% match
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold">
                    87% match
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold">
                    91% match
                  </div>
                </div>
              </div>
              <div className="p-8 lg:p-10 flex-1">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F77B0F] mb-3 block">01 · AI Feed Engine</span>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3">
                  Personalised job feed, ranked by match score.
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-base">
                  Every live role scored against your profile — your skills, your experience, your salary band, your location. The feed updates daily. The more you use it, the sharper it gets.
                </p>
              </div>
            </div>

            {/* Skill graph */}
            <div className="lg:col-span-5 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[440px]">
              <div className="relative h-60 lg:h-72 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=100"
                  alt="Engineering team coding"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8 flex-1">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#192C67] dark:text-white/80 mb-3 block">02 · Skill graph</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 leading-tight">Skills, not signals.</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  We map every job and every profile onto a structured skill graph. No more keyword roulette — match by what you can actually do.
                </p>
              </div>
            </div>

            {/* One click apply */}
            <div className="lg:col-span-4 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[400px]">
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=100"
                  alt="Apply with one click"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-7 flex-1">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-3 block">03 · One click apply</span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">Profile is your CV.</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Tap apply. Your profile, skills and CV reach the recruiter instantly. No forms, no retyping.
                </p>
              </div>
            </div>

            {/* Live status */}
            <div className="lg:col-span-4 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[400px]">
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=100"
                  alt="Application tracking"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-7 flex-1">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 mb-3 block">04 · Live status</span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">End to end tracking.</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Submitted, Reviewed, Shortlisted, Interview, Hired. Real time updates. No more black holes.
                </p>
              </div>
            </div>

            {/* Mobile first */}
            <div className="lg:col-span-4 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[400px]">
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=100"
                  alt="Phone-first"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-7 flex-1">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600 mb-3 block">05 · Mobile first</span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">Built for the phone.</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Most of Africa works from a phone. Native Android &amp; iOS apps. Fast, offline-tolerant, beautiful.
                </p>
              </div>
            </div>

            {/* Pipeline */}
            <div className="lg:col-span-7 group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col min-h-[400px]">
              <div className="relative h-52 lg:h-60 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=100"
                  alt="Recruiter pipeline"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 mb-3">06 · Pipeline tools for recruiters</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 leading-tight">
                  Manage the whole hiring funnel in one place.
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                  Pre matched candidates, shortlist, schedule, interview, hire. Plus auto-generated tasks for the team — so nothing falls through the cracks.
                </p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {['Submitted', 'Reviewed', 'Shortlisted', 'Interview', 'Hired'].map(s => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Built in Africa */}
            <div className="lg:col-span-5 group rounded-3xl overflow-hidden bg-gradient-to-br from-[#192C67] via-[#1a3270] to-[#0f1d4a] flex flex-col min-h-[400px] relative">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#F77B0F]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#F77B0F]/15 rounded-full blur-3xl" />
              <div className="relative p-8 lg:p-10 flex-1 flex flex-col text-white">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F77B0F] mb-3 block">07 · Built in Africa</span>
                <h3 className="text-2xl font-black mb-3 leading-tight">For our markets, our currencies, our hiring norms.</h3>
                <p className="text-sm text-white/65 leading-relaxed mb-7">
                  Designed in Nairobi for the continent — KES, NGN, GHS, ZAR salaries; M-PESA-friendly; built by people who hire here.
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {['🇰🇪 Kenya', '🇳🇬 Nigeria', '🇬🇭 Ghana', '🇿🇦 South Africa', '🇺🇬 Uganda', '🇹🇿 Tanzania'].map(c => (
                    <span key={c} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold text-white">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR EMPLOYERS — full bleed pitch ──────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden" id="for-employers">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=2400&q=100"
            alt="Recruitment team reviewing candidates"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full py-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[11px] font-bold uppercase tracking-widest mb-6">
              For Employers
            </span>
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] mb-6 drop-shadow-2xl">
              Hire smarter. Not harder.
            </h2>
            <p className="text-lg text-white/85 leading-relaxed mb-8 drop-shadow-lg">
              Stop drowning in irrelevant CVs. Uteo delivers pre matched candidates ranked by skill fit — straight into your pipeline. Cut time to hire in half.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {['Pre matched candidates', 'Pipeline workspace', 'Match score ranking', 'Live applicant feed', 'Built in messaging', 'Hiring analytics'].map(item => (
                <div key={item} className="flex items-center gap-2 text-white text-sm drop-shadow">
                  <svg className="h-4 w-4 text-[#F77B0F] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/register?role=recruiter"
              className="inline-flex items-center gap-2 bg-[#F77B0F] text-white font-bold px-8 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm"
            >
              Post your first job free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white dark:bg-[#060d1f]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-5">
              Real hires
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] tracking-tight">
              Africa is hiring on Uteo.
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            {[
              {
                quote: "Uteo surfaced a senior backend role at a fintech I'd never heard of. The match score said 92%. I applied in 30 seconds, got an interview within 48 hours, and signed an offer two weeks later.",
                name: 'Amara Osei',
                role: 'Senior Engineer · hired at a Nairobi fintech',
                metric: '92%',
                metricLabel: 'match score',
                img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=100',
              },
              {
                quote: 'We were getting 200 CVs per role and reading maybe 20 before getting tired. With Uteo we read 5, every single one a strong fit. We cut time to hire by 60%.',
                name: 'James Mutua',
                role: 'Head of Talent · pan African tech firm',
                metric: '-60%',
                metricLabel: 'time to hire',
                img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=100',
              },
              {
                quote: "I'd been job hunting for months on every site you can name. Uteo rebuilt my profile, matched me to 12 relevant roles in one day, and I had a job offer in two weeks.",
                name: 'Fatima Diallo',
                role: 'Marketing Manager · placed at NGO',
                metric: '12 → 1',
                metricLabel: 'matches → hire',
                img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=100',
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] p-8 hover:shadow-xl transition-shadow flex flex-col"
              >
                <svg className="h-7 w-7 text-[#F77B0F]/40 mb-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.57-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                </svg>
                <blockquote className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-7 flex-1">
                  {t.quote}
                </blockquote>
                <div className="flex items-end justify-between gap-4 pt-5 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#F77B0F]/20 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.name}</div>
                      <div className="text-xs text-gray-400 truncate">{t.role}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-[#F77B0F] leading-none">{t.metric}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{t.metricLabel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50 dark:bg-[#0a1628]">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <div className="text-center mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-5">
              FAQ
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] tracking-tight">
              Common questions.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { q: 'How does the AI feed actually work?', a: 'Every job and every profile gets mapped onto a structured skill graph. The matching engine computes a 0–100 fit score per role using skill overlap, experience level, location preferences and salary band. Your feed is just the top ranked roles, refreshed daily.' },
              { q: 'Is Uteo really free for job seekers?', a: "Yes. Always. Browse jobs, apply, message employers, track applications — completely free, forever. We don't charge seekers a cent. Employers fund the platform." },
              { q: 'How does one click apply work?', a: 'Your Uteo profile IS your application. When you tap Apply, your full profile (skills, experience, education, CV) goes to the employer instantly. No forms, no retyping.' },
              { q: 'Can recruiters find me directly?', a: 'Yes — if you opt in. Open Profile > Visibility and turn on Open to Work. Recruiters can search the talent pool by skills and reach out to you directly.' },
              { q: 'Which countries does Uteo cover?', a: 'Live in Kenya, Nigeria, Ghana, Tanzania, Uganda and South Africa today. Rolling out across the continent through 2026 — and globally after that.' },
              { q: 'How do I post a job as an employer?', a: 'Register as a recruiter, add your company profile, post your role. Uteo immediately tags it with the right skill graph and starts surfacing matched candidates within hours.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden bg-white dark:bg-white/[0.02]">
                <button onClick={() => setActiveQ(activeQ === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left group">
                  <span className="font-bold text-gray-900 dark:text-white pr-6 text-sm group-hover:text-[#F77B0F] transition-colors">{faq.q}</span>
                  <span className={`shrink-0 w-6 h-6 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 ${activeQ === i ? 'rotate-45 bg-[#F77B0F] border-[#F77B0F] text-white' : ''}`}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${activeQ === i ? 'max-h-64 pb-6' : 'max-h-0'}`}>
                  <p className="px-6 text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-28 lg:py-40 relative overflow-hidden bg-[#060d1f]">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=2400&q=100"
            alt="Handshake"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1f]/85 via-[#060d1f]/65 to-[#060d1f]/95" />
        </div>
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-[#F77B0F]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-[#192C67]/40 rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F77B0F] animate-pulse" />
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">50,000+ Africans on Uteo</span>
          </div>
          <h2 className="text-[clamp(2.75rem,8vw,7rem)] font-black text-white leading-[0.92] mb-7 tracking-tight">
            Your next job<br />
            <span className="text-[#F77B0F]">starts here.</span>
          </h2>
          <p className="text-lg text-white/55 max-w-md mx-auto mb-10">
            Free for job seekers. Always. Build your profile in two minutes and let opportunities come to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#F77B0F] text-white font-bold px-9 py-4 rounded-full hover:bg-[#e06a0d] transition-colors shadow-2xl shadow-[#F77B0F]/30 text-sm"
            >
              Get started free
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/15 text-white font-bold px-9 py-4 rounded-full hover:bg-white/20 transition-colors text-sm"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-[#020611] py-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16 mb-14">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-5">
                <span className="text-2xl font-black text-white">Uteo</span>
                <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
              </Link>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Your dream job finds you.</p>
              <p className="text-xs text-gray-600">AI powered recruitment for Africa.</p>
            </div>
            {[
              { title: 'For Job Seekers', links: [['Browse Jobs', '/jobs'], ['My Feed', '/feed'], ['My Applications', '/applications'], ['Saved Jobs', '/saved-jobs']] },
              { title: 'For Employers', links: [['Post a Job', '/post-job'], ['Recruiter Dashboard', '/recruiter'], ['Pricing', '/pricing'], ['For Employers', '/for-trainers']] },
              { title: 'Support', links: [['Help Centre', '/help'], ['Contact Us', '/contact'], ['About', '/about'], ['How It Works', '/how-it-works']] },
              { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Cookies', '/privacy'], ['Security', '/privacy']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">{title}</div>
                {links.map(([label, href]) => (
                  <Link key={label} href={href} className="block text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3">
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Uteo. All rights reserved.</p>
            <p className="text-xs text-gray-600">Built in Nairobi for the continent.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
