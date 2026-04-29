import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] flex items-end pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2400&q=100"
            alt="People at work"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">About Uteo</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] max-w-3xl">
            Your dream job <span className="text-[#F77B0F]">finds you.</span>
          </h1>
          <p className="mt-5 text-lg text-white/75 max-w-2xl leading-relaxed">
            Uteo is an AI powered, feed based recruitment platform connecting Africa&apos;s talent with the right opportunities — instantly.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        {/* Intro */}
        <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mb-20">
          Job hunting in Africa has always been broken. Endless searching. Generic listings. Applications that disappear. Uteo flips it. We deliver a personalised feed of jobs ranked against your actual skills and let you apply in one click. Employers get pre matched candidates, not a flood of CVs.
        </p>

        {/* Mission / Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-24">
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
              Our Mission
            </span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
              Get every African into the right work.
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Build the AI infrastructure that surfaces opportunity by skill. Not network. Not pedigree. Not luck. Anyone with the right skills should be findable for the right role, full stop.
            </p>
          </div>
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-white/10 text-[#192C67] dark:text-white text-[11px] font-bold uppercase tracking-widest mb-4">
              Our Vision
            </span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
              The default place Africa hires.
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              From Nairobi to Lagos to Cape Town: a single feed based recruitment platform that learns from every interaction and matches better tomorrow than it did yesterday.
            </p>
          </div>
        </div>

        {/* What we do */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
            What we do
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-10 max-w-2xl leading-tight">
            One platform. Two sides. Both win.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                title: 'For job seekers',
                items: [
                  'Personalised AI feed updated daily',
                  'One click apply — your profile is your CV',
                  'Real time application tracking, end to end',
                  'Match score on every job before you apply',
                  'Skill-based — your profile speaks for you',
                ],
                cta: { label: 'Browse jobs', href: '/jobs' },
                accent: 'text-[#F77B0F]',
              },
              {
                title: 'For employers',
                items: [
                  'Post jobs, get pre matched candidates',
                  'No more sifting through irrelevant CVs',
                  'Pipeline tools: shortlist, schedule, hire',
                  'Company profile that builds your brand',
                  'Live notifications on every applicant',
                ],
                cta: { label: 'Post a job', href: '/post-job' },
                accent: 'text-[#192C67] dark:text-white',
              },
            ].map(side => (
              <div
                key={side.title}
                className="rounded-3xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-8 lg:p-10"
              >
                <h3 className={`text-2xl font-black mb-6 ${side.accent}`}>{side.title}</h3>
                <ul className="space-y-3 mb-7">
                  {side.items.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <svg className="h-4 w-4 text-[#F77B0F] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={side.cta.href}
                  className="inline-flex items-center text-sm font-bold text-gray-900 dark:text-white hover:text-[#F77B0F] dark:hover:text-[#F77B0F] transition-colors"
                >
                  {side.cta.label} →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24 py-10 border-y border-gray-100 dark:border-white/10">
          {[
            { n: '10,000+', l: 'Live jobs' },
            { n: '5,000+', l: 'Employers' },
            { n: '50,000+', l: 'Job seekers' },
            { n: '< 60s', l: 'Average apply time' },
          ].map(s => (
            <div key={s.l}>
              <div className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">{s.n}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mb-24">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#192C67]/10 dark:bg-white/10 text-[#192C67] dark:text-white text-[11px] font-bold uppercase tracking-widest mb-4">
            Our Values
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-10 max-w-2xl leading-tight">
            Why we build the way we build.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Skills over signals', desc: 'A degree from the right school is not a proxy for capability. We rank by what you can do.' },
              { title: 'Mobile first, always', desc: 'Most of Africa works from a phone. So we build for a phone before anything else.' },
              { title: 'Transparent matching', desc: 'You see your match score. You see why a job appeared in your feed. No black boxes.' },
              { title: 'Free for seekers, forever', desc: 'Job seekers will never pay to use Uteo. Period. Employers fund the platform.' },
              { title: 'Data is yours', desc: 'Your profile, your applications, your messages — exportable any time. No lock-in.' },
              { title: 'Built in Africa, for Africa', desc: 'Designed for our markets, our currencies, our hiring norms. Then scaled globally.' },
            ].map(v => (
              <div
                key={v.title}
                className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.02] p-7 hover:border-[#F77B0F]/30 transition-colors"
              >
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2.5">{v.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-[#192C67] via-[#1a3270] to-[#0f1d4a] p-10 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#F77B0F]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#F77B0F]/15 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-5 leading-tight">
              Find work you actually want.
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-8 text-lg">
              Free for job seekers. Always. Build your profile in two minutes and let opportunities come to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-[#F77B0F] text-white font-bold px-7 py-4 rounded-full hover:bg-[#e06a0d] transition-colors text-sm shadow-2xl shadow-[#F77B0F]/30"
              >
                Get started free
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold px-7 py-4 rounded-full hover:bg-white/20 transition-colors text-sm"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
