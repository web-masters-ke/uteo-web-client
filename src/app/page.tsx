'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';

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
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 dark:bg-[#060d1f]/95 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-white/5' : ''}`}>
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className={`text-2xl font-black tracking-tight ${scrolled ? 'text-gray-900 dark:text-white' : 'text-white'}`}>Uteo</span>
            <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {[['How It Works', '#how-it-works'], ['Browse Jobs', '/jobs'], ['For Employers', '#for-employers']].map(([l, h]) => (
              <Link key={l as string} href={h as string} className={`text-[13px] font-semibold transition-colors ${scrolled ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white' : 'text-white/70 hover:text-white'}`}>{l}</Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button onClick={toggle} className={`p-2 rounded-full transition-colors ${scrolled ? 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300' : 'hover:bg-white/10 text-white/70'}`}>
              {theme === 'dark'
                ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              }
            </button>
            <Link href="/login" className={`text-[13px] font-semibold transition-colors ${scrolled ? 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white' : 'text-white/80 hover:text-white'}`}>Log In</Link>
            <Link href="/register" className="bg-[#F77B0F] text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-[#e06a0d] transition-colors shadow-sm">Get Started Free</Link>
          </div>

          <button onClick={() => setOpen(!open)} className={`lg:hidden p-2 ${scrolled ? 'text-gray-800 dark:text-white' : 'text-white'}`}>
            {open
              ? <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>
        {open && (
          <div className="lg:hidden bg-white dark:bg-[#060d1f] border-t border-gray-100 dark:border-white/5 py-6 space-y-1">
            {[['How It Works', '#how-it-works'], ['Browse Jobs', '/jobs'], ['For Employers', '#for-employers']].map(([l, h]) => (
              <Link key={l as string} href={h as string} onClick={() => setOpen(false)} className="block px-2 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{l}</Link>
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

export default function LandingPage() {
  const [activeQ, setActiveQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-[#060d1f] text-gray-900 dark:text-gray-100">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex overflow-hidden bg-[#060d1f]">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2400&q=100"
            alt="Professionals collaborating"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060d1f]/90 via-[#060d1f]/50 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full flex items-center pt-32 pb-20 lg:py-0 min-h-screen">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
              <span className="h-2 w-2 rounded-full bg-[#F77B0F] animate-pulse" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">AI-Powered Job Matching</span>
            </div>
            <h1 className="text-[clamp(3rem,6.5vw,5.5rem)] font-black leading-[0.9] text-white">
              Your Dream Job<br />
              <span className="text-[#F77B0F]">Finds You.</span>
            </h1>
            <p className="mt-8 text-lg lg:text-xl text-white/55 max-w-lg leading-relaxed">
              AI-powered personalized job feed — opportunities that match your skills, not the other way around.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-8 py-4 rounded-full hover:bg-[#e06a0d] transition-colors shadow-2xl shadow-[#F77B0F]/20 text-sm">
                Get Started Free
                <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </Link>
              <Link href="/jobs" className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10 text-white font-bold px-8 py-4 rounded-full hover:bg-white/20 transition-colors text-sm">
                Browse Jobs
              </Link>
            </div>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-xl">
              {[
                { n: '10,000+', l: 'Jobs' },
                { n: '5,000+', l: 'Companies' },
                { n: '50,000+', l: 'Job Seekers' },
              ].map(s => (
                <div key={s.l} className="border-l-2 border-[#F77B0F] pl-4">
                  <div className="text-2xl font-black text-white">{s.n}</div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="bg-[#0a1120] border-y border-white/5">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-5">
          <div className="flex flex-wrap items-center justify-center lg:justify-between gap-6">
            <span className="text-xs font-medium text-white/30 uppercase tracking-wider">Trusted by thousands</span>
            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
              {['AI Feed Matching', 'One-Click Apply', 'Real-Time Tracking', 'Employer Tools', 'Skill-Based Discovery', 'Mobile Friendly'].map(f => (
                <span key={f} className="flex items-center gap-2 text-white/40 text-xs font-medium">
                  <span className="h-1 w-1 rounded-full bg-[#F77B0F]" />{f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 lg:py-32 bg-white dark:bg-[#060d1f]" id="how-it-works">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-center mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-xs font-bold uppercase tracking-wider mb-4">How It Works</span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">Three steps to your next role.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                t: 'Build Your Profile',
                d: 'Tell us your skills, experience, preferred job types, and salary expectations. Our AI learns what makes you unique.',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                color: 'bg-[#192C67]',
              },
              {
                n: '02',
                t: 'AI Matches You',
                d: 'Our engine scans thousands of live jobs and surfaces the ones that truly fit your profile — ranked by match score.',
                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                color: 'bg-[#F77B0F]',
              },
              {
                n: '03',
                t: 'Apply in One Click',
                d: 'Your profile is your resume. Apply to matched jobs in seconds, track every application in real time.',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                color: 'bg-emerald-500',
              },
            ].map(s => (
              <div key={s.n} className="rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="p-8 bg-gray-50 dark:bg-white/[0.02]">
                  <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-6`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                  <div className="text-5xl font-black text-gray-100 dark:text-white/5 mb-2">{s.n}</div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">{s.t}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 lg:py-32 bg-gray-50 dark:bg-[#0a1120]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="max-w-2xl mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-[#5b8bc7] text-xs font-bold uppercase tracking-wider mb-4">Features</span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.1]">Everything you need.<br />Nothing you don&apos;t.</h2>
          </div>

          <div className="space-y-0">

            {/* Row 1 — image left, text right */}
            <div className="group flex flex-col lg:flex-row items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=100"
                  alt="Feed-based job discovery"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F77B0F] mb-4">01</span>
                <div className="w-11 h-11 rounded-2xl bg-[#F77B0F] flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">Feed-Based<br />Discovery</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Your personalized job feed updates daily. The more you interact, the smarter it gets — surfacing roles before you even know to search for them.</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Row 2 — text left, image right */}
            <div className="group flex flex-col lg:flex-row-reverse items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=100"
                  alt="One-click apply"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#192C67] dark:text-[#5b8bc7] mb-4">02</span>
                <div className="w-11 h-11 rounded-2xl bg-[#192C67] flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">One-Click<br />Apply</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Your Uteo profile is your application. Apply to any job in seconds — no repetitive form filling.</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Row 3 — image left, text right */}
            <div className="group flex flex-col lg:flex-row items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=100"
                  alt="Real-time application tracking"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4">03</span>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">Real-Time<br />Tracking</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Know exactly where you stand. Track every application from Submitted through to Hired.</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Row 4 — text left, image right */}
            <div className="group flex flex-col lg:flex-row-reverse items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=100"
                  alt="Employer hiring tools"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#192C67] dark:text-[#5b8bc7] mb-4">04</span>
                <div className="w-11 h-11 rounded-2xl bg-[#192C67] flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">Employer<br />Tools</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Post jobs, review applications, shortlist candidates, and manage your entire hiring pipeline in one place.</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Row 5 — image left, text right */}
            <div className="group flex flex-col lg:flex-row items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=100"
                  alt="Smart skill matching"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-500 mb-4">05</span>
                <div className="w-11 h-11 rounded-2xl bg-purple-500 flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">Smart Skill<br />Match</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Every job is scored against your skills profile. See your match percentage before you apply.</p>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Row 6 — text left, image right */}
            <div className="group flex flex-col lg:flex-row-reverse items-stretch gap-8 lg:gap-16 py-16 lg:py-24">
              <div className="lg:w-[55%] rounded-3xl overflow-hidden min-h-[300px] lg:min-h-[420px] shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=1600&q=100"
                  alt="Instant job alerts"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="lg:w-[45%] flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 mb-4">06</span>
                <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center mb-5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-[1.05] mb-5">Instant<br />Alerts</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg max-w-md">Get notified the moment a role matches your profile or your application status changes.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOR EMPLOYERS ── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden" id="for-employers">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2400&q=100"
            alt="Hiring team reviewing candidates"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#192C67]/85 via-[#192C67]/50 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full py-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-6">For Employers</span>
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] mb-6">Hire smarter, not harder.</h2>
            <p className="text-lg text-white/55 leading-relaxed mb-8">Post jobs, get matched with qualified candidates from our talent pool, and manage your entire hiring pipeline — all in one place.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {['Skill-matched candidates', 'Post unlimited jobs', 'Manage all applications', 'Shortlist & interview', 'Company profile page', 'Real-time notifications'].map(item => (
                <div key={item} className="flex items-center gap-2 text-white/65 text-sm">
                  <svg className="h-4 w-4 text-[#F77B0F] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {item}
                </div>
              ))}
            </div>
            <Link href="/register?role=recruiter" className="inline-flex items-center bg-[#F77B0F] text-white font-bold px-8 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm">
              Start Hiring Today →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-32 bg-white dark:bg-[#060d1f]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="text-center mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-[#5b8bc7] text-xs font-bold uppercase tracking-wider mb-4">Success Stories</span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">Real people. Real hires.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              { quote: 'Uteo surfaced a role I never would have found on my own. The AI match was spot-on — I applied in 30 seconds and got an interview within 48 hours.', name: 'Amara Osei', role: 'Software Engineer, hired at Fintech startup', rating: 5 },
              { quote: 'As a recruiter, the candidate quality from Uteo is exceptional. The skill matching means we only see candidates who are genuinely relevant. Cut our time-to-hire by half.', name: 'James Mutua', role: 'Head of Talent, Nairobi', rating: 5 },
              { quote: 'I had been job hunting for months with no luck. Uteo rebuilt my profile, matched me with 12 relevant jobs in one day, and I landed my dream role in two weeks.', name: 'Fatima Diallo', role: 'Marketing Manager, placed at NGO', rating: 5 },
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] hover:shadow-xl transition-all">
                <div className="flex items-center gap-1 mb-6">
                  {[1,2,3,4,5].map(s => <svg key={s} className="h-4 w-4 text-[#F77B0F]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                </div>
                <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</blockquote>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 lg:py-32 bg-gray-50 dark:bg-[#0a1120]">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <div className="text-center mb-14">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/30 text-[#192C67] dark:text-[#5b8bc7] text-xs font-bold uppercase tracking-wider mb-4">FAQ</span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">Common questions.</h2>
          </div>
          <div className="space-y-2">
            {[
              { q: 'How does the AI job feed work?', a: 'When you create a profile and add your skills, experience, and preferences, our AI analyzes thousands of live job postings to surface the ones with the highest match score for you. Your feed refreshes daily and improves as you interact with it.' },
              { q: 'Is Uteo free to use?', a: 'Yes, completely free for job seekers. Create a profile, get matched with jobs, and apply — no fees ever. Employers pay for job postings.' },
              { q: 'How does one-click apply work?', a: 'Your Uteo profile serves as your application. When you click Apply on a job, your full profile (including skills, experience, and resume) is sent to the employer instantly. No forms to fill.' },
              { q: 'How do I track my applications?', a: 'All your applications are in the My Applications section. You can see real-time status updates: Submitted, Reviewed, Shortlisted, Interview Scheduled, Hired, or Rejected.' },
              { q: 'Can employers find me directly?', a: "Yes. Recruiters can search our talent pool and reach out to you directly based on your skills and profile. You control what's visible on your profile." },
              { q: 'How do I post a job as an employer?', a: 'Register as a recruiter, create a company profile, and use Post Job to create your listing. Our AI will immediately start surfacing your job to matched candidates.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden bg-white dark:bg-white/[0.02]">
                <button onClick={() => setActiveQ(activeQ === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left group">
                  <span className="font-bold text-gray-900 dark:text-white pr-6 text-sm group-hover:text-[#192C67] dark:group-hover:text-[#5b8bc7] transition-colors">{faq.q}</span>
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

      {/* ── FINAL CTA ── */}
      <section className="py-24 lg:py-40 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2400&q=100"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#060d1f]/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
            <span className="h-2 w-2 rounded-full bg-[#F77B0F] animate-pulse" />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Join thousands finding their dream job</span>
          </div>
          <h2 className="text-[clamp(3rem,8vw,7rem)] font-black text-white leading-[0.88] mb-8">
            Your next job<br />
            <span className="text-[#F77B0F]">starts here.</span>
          </h2>
          <p className="text-xl text-white/40 max-w-md mx-auto mb-10">
            Free for job seekers. Always. Build your profile in minutes and let the jobs come to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-10 py-4 rounded-full hover:bg-[#e06a0d] transition-colors shadow-2xl shadow-[#F77B0F]/20 text-sm">
              Get Started Free
            </Link>
            <Link href="/jobs" className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10 text-white font-bold px-10 py-4 rounded-full hover:bg-white/20 transition-colors text-sm">
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#030810] py-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16 mb-16">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-5 inline-block">
                <span className="text-2xl font-black text-white">Uteo</span>
                <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
              </Link>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">Your Dream Job Finds You.</p>
              <p className="text-xs text-gray-700">AI-powered job matching platform</p>
            </div>
            {[
              { title: 'For Job Seekers', links: [['Browse Jobs', '/jobs'], ['My Feed', '/feed'], ['My Applications', '/applications'], ['Saved Jobs', '/saved-jobs']] },
              { title: 'For Employers', links: [['Post a Job', '/post-job'], ['Recruiter Dashboard', '/recruiter'], ['Pricing', '#pricing'], ['Company Profile', '/companies']] },
              { title: 'Support', links: [['Help Centre', '/settings'], ['Contact Us', '/contact'], ['FAQ', '#faq'], ['Privacy Policy', '/privacy']] },
              { title: 'Company', links: [['About', '/about'], ['Terms', '/terms'], ['Careers', '/careers'], ['Blog', '/blog']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-4">{title}</div>
                {links.map(([label, href]) => (
                  <Link key={label} href={href} className="block text-xs text-gray-600 hover:text-gray-400 transition-colors mb-3">{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-700">&copy; {new Date().getFullYear()} Uteo. All rights reserved.</p>
            <p className="text-xs text-gray-700">Your Dream Job Finds You.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
