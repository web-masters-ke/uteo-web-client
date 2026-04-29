import Link from 'next/link';

export default function HowItWorksPage() {
  const seekerSteps = [
    {
      step: 1,
      title: 'Build your profile',
      desc: 'Sign up in under a minute. Add your skills, experience, education and the kind of work you want. The richer your profile, the better the AI knows you.',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      step: 2,
      title: 'AI matches you',
      desc: 'Our engine scans every live job and ranks them by how well they fit your profile. Your feed refreshes daily and gets sharper the more you use it.',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    },
    {
      step: 3,
      title: 'Apply in one click',
      desc: 'Your profile is your application. Tap apply and your full profile, skills and CV go to the employer instantly. No forms. No retyping.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    },
    {
      step: 4,
      title: 'Track every application',
      desc: 'See live status — Submitted, Reviewed, Shortlisted, Interview, Hired. Get notified the moment an employer moves you forward.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
  ];

  const employerSteps = [
    {
      step: 1,
      title: 'Create a company page',
      desc: 'Set up your company profile and add your team. Recruiters get role-based access to manage hiring.',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      step: 2,
      title: 'Post your role',
      desc: 'Define the job, the must-have skills and the salary band. Uteo immediately tags it with the right skill graph.',
      icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    },
    {
      step: 3,
      title: 'Get pre matched candidates',
      desc: 'No more flood of irrelevant CVs. Uteo surfaces the candidates whose skills actually match the role, ranked by match score.',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      step: 4,
      title: 'Manage the pipeline',
      desc: 'Shortlist, schedule interviews, message candidates, hire. All in one workspace. Make a great hire faster.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] flex items-end pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=2400&q=100"
            alt="People working"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">How It Works</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] max-w-3xl">
            Skill matched, instantly. <span className="text-[#F77B0F]">By design.</span>
          </h1>
          <p className="mt-5 text-lg text-white/75 max-w-2xl leading-relaxed">
            Uteo&apos;s AI does the heavy lifting on both sides — so seekers find roles that fit, and employers find candidates who can actually do the job.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        {/* For job seekers */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
            For job seekers
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-12 max-w-2xl leading-tight">
            From profile to offer in 4 steps.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {seekerSteps.map(item => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-7 hover:border-[#F77B0F]/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#F77B0F] text-white flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F77B0F] mb-2 block">
                  Step 0{item.step}
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2.5 leading-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* For employers */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-white/10 text-[#192C67] dark:text-white text-[11px] font-bold uppercase tracking-widest mb-4">
            For employers
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-12 max-w-2xl leading-tight">
            Hire smarter, not harder.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {employerSteps.map(item => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-7 hover:border-[#192C67]/30 dark:hover:border-white/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#192C67] dark:bg-white text-white dark:text-[#192C67] flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#192C67] dark:text-white/80 mb-2 block">
                  Step 0{item.step}
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2.5 leading-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Behind the scenes */}
        <div className="rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/10 p-10 lg:p-14 mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
            Under the hood
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-10 max-w-2xl leading-tight">
            How the AI feed works.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: '1. Skill graph',
                desc: 'Every job and every profile gets mapped onto a structured skill graph. Roles are tagged with required and nice-to-have skills automatically.',
              },
              {
                title: '2. Matching engine',
                desc: 'For each user, the engine computes a match score per job using skill overlap, experience fit, location preferences and salary band.',
              },
              {
                title: '3. Feedback loop',
                desc: 'Every click, save, apply and skip teaches the model what you want. Tomorrow&apos;s feed is sharper than today&apos;s.',
              },
            ].map(b => (
              <div key={b.title}>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">{b.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-5 max-w-xl mx-auto leading-tight">
            Ready to let the right job find you?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Free for job seekers. Always. Build a profile in two minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-7 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm shadow-xl shadow-[#F77B0F]/20"
            >
              Create your profile
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold px-7 py-4 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
