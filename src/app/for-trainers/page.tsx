import Link from 'next/link';

export default function ForEmployersPage() {
  const features = [
    {
      title: 'Pre matched candidates',
      desc: "Stop drowning in irrelevant CVs. Uteo's AI surfaces only candidates whose skills match your role, ranked by match score.",
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    },
    {
      title: 'One pipeline, every role',
      desc: 'Shortlist, schedule interviews, message candidates and make offers. All in one workspace shared with your team.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      title: 'Company brand page',
      desc: 'Your verified company profile shows on every job. Build employer brand while you hire.',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      title: 'Live applicant feed',
      desc: 'Get notified the moment a strong candidate applies. No more checking inboxes — Uteo pushes the right person to you.',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      title: 'Hiring analytics',
      desc: 'See time to hire, source-of-hire, drop-off points. Run a hiring funnel like you run product.',
      icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
    },
    {
      title: 'Built in messaging',
      desc: 'Talk to candidates directly inside Uteo. No more lost email threads. Audit-ready, GDPR-friendly logs.',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] flex items-end pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=2400&q=100"
            alt="Hiring team meeting"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">For Employers</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] max-w-3xl">
            Hire smarter, <span className="text-[#F77B0F]">not harder.</span>
          </h1>
          <p className="mt-5 text-lg text-white/75 max-w-2xl leading-relaxed">
            Stop posting and praying. Uteo delivers pre matched candidates straight into your pipeline. Cut time to hire in half.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register?role=recruiter"
              className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-7 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm shadow-2xl shadow-[#F77B0F]/30"
            >
              Post your first job free
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold px-7 py-4 rounded-full hover:bg-white/20 transition-colors text-sm"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        {/* Features grid */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
            What you get
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-12 max-w-2xl leading-tight">
            Everything you need to hire well — in one place.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-7 hover:border-[#F77B0F]/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#F77B0F]/10 dark:bg-[#F77B0F]/15 text-[#F77B0F] flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2.5 leading-tight">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats band */}
        <div className="rounded-3xl bg-gradient-to-br from-[#192C67] via-[#1a3270] to-[#0f1d4a] p-10 lg:p-16 mb-24 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#F77B0F]/20 rounded-full blur-3xl" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: '50%', l: 'Faster time to hire' },
              { n: '3x', l: 'Higher response rates' },
              { n: '10,000+', l: 'Active job seekers' },
              { n: '< 24hrs', l: 'First match delivered' },
            ].map(s => (
              <div key={s.l}>
                <div className="text-3xl lg:text-5xl font-black text-white">{s.n}</div>
                <div className="text-xs text-white/60 uppercase tracking-wider mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-white/10 text-[#192C67] dark:text-white text-[11px] font-bold uppercase tracking-widest mb-4">
            Old way vs Uteo way
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-12 max-w-2xl leading-tight">
            Why hiring teams switch.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-8 lg:p-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest mb-5">
                The old way
              </span>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                {[
                  'Post a job and pray it reaches the right people',
                  'Drown in 200 CVs, 90% irrelevant',
                  'Spend hours filtering by keyword',
                  'Lose great candidates to slow follow-ups',
                  'No insight into where good hires actually came from',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-8 lg:p-10 shadow-2xl shadow-gray-900/20">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F77B0F]/20 text-[#F77B0F] text-[10px] font-bold uppercase tracking-widest mb-5">
                The Uteo way
              </span>
              <ul className="space-y-3 text-sm">
                {[
                  'AI matches your role to the right candidates immediately',
                  'See only the candidates whose skills actually fit',
                  'Pre-ranked by match score — review the best first',
                  'Live applicant feed pushes great candidates to you',
                  'Funnel analytics so you know what is working',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-[#F77B0F] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-5 max-w-xl mx-auto leading-tight">
            Post a job. Get matched candidates today.
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Your first job posting is free. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=recruiter"
              className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-7 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm shadow-xl shadow-[#F77B0F]/20"
            >
              Post your first job
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold px-7 py-4 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
