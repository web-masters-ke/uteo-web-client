import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: 'Seeker',
      price: 'Free',
      period: 'forever',
      desc: 'For everyone looking for work.',
      features: [
        'AI-powered job feed',
        'One-click apply',
        'Real-time application tracking',
        'Match score on every role',
        'In-app messaging with employers',
      ],
      cta: 'Create your profile',
      href: '/register',
      recommended: false,
    },
    {
      name: 'Starter',
      price: 'KES 4,999',
      period: '/month',
      desc: 'Small teams hiring 1–3 roles at a time.',
      features: [
        'Up to 3 active job postings',
        'Pre-matched candidates',
        'Pipeline & shortlist tools',
        'Company brand page',
        'Email + chat support',
      ],
      cta: 'Start hiring',
      href: '/register?role=recruiter',
      recommended: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Large teams with multi-role hiring at scale.',
      features: [
        'Unlimited active postings',
        'Multi-recruiter workspace',
        'Custom brand & careers page',
        'Hiring funnel analytics',
        'API access + ATS integrations',
        'Dedicated success manager',
      ],
      cta: 'Talk to sales',
      href: '/contact',
      recommended: false,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[360px] flex items-end pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2400&q=100"
            alt="Office team"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">Pricing</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.05] max-w-3xl">
            Free for seekers. <span className="text-[#F77B0F]">Fair for hirers.</span>
          </h1>
          <p className="mt-5 text-lg text-white/75 max-w-2xl leading-relaxed">
            Job seekers will never pay to use Uteo. Employers fund the platform — and only when you find someone worth hiring.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-24 max-w-5xl mx-auto">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 lg:p-9 ${
                plan.recommended
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl shadow-gray-900/20 ring-1 ring-[#F77B0F]/30'
                  : 'bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/10'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F77B0F] text-white text-[10px] font-black uppercase tracking-widest">
                    Most popular
                  </span>
                </div>
              )}

              <div
                className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                  plan.recommended ? 'text-[#F77B0F]' : 'text-[#F77B0F]'
                }`}
              >
                {plan.name}
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className={`text-4xl font-black tracking-tight ${plan.recommended ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                  {plan.price}
                </span>
                <span className={`text-sm font-semibold ${plan.recommended ? 'text-white/60 dark:text-gray-500' : 'text-gray-400'}`}>
                  {plan.period}
                </span>
              </div>

              <p className={`text-sm mb-7 ${plan.recommended ? 'text-white/60 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {plan.desc}
              </p>

              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-full font-bold text-sm mb-7 transition-opacity hover:opacity-90 ${
                  plan.recommended ? 'bg-[#F77B0F] text-white' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`h-4 w-4 shrink-0 mt-0.5 ${plan.recommended ? 'text-[#F77B0F]' : 'text-[#F77B0F]'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className={plan.recommended ? 'text-white/85 dark:text-gray-700' : 'text-gray-600 dark:text-gray-300'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-[11px] font-bold uppercase tracking-widest mb-4">
            FAQ
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-10 leading-tight">
            Pricing questions.
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is Uteo really free for job seekers?',
                a: 'Yes. Always. Browse jobs, apply, message employers, track applications — all free, forever. We don&apos;t charge seekers a cent. Employers fund the platform.',
              },
              {
                q: 'Do I need a credit card to start as an employer?',
                a: 'No. Your first job posting is free. Add a card only when you upgrade to Starter or buy a one-off post.',
              },
              {
                q: 'Can I post one job without a subscription?',
                a: 'Yes. Pay-as-you-go pricing is available — talk to sales for a single-post quote.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'M-Pesa, Visa, Mastercard, and bank transfer for Enterprise. KES is the default — USD invoicing available on Enterprise.',
              },
              {
                q: 'Can I cancel any time?',
                a: 'Yes. Month-to-month with no contracts on Starter. Cancel any time and your active jobs stay live until the end of the billing period.',
              },
              {
                q: 'Do you offer discounts for NGOs or government?',
                a: 'Yes. Reach out via the contact form and we&apos;ll get you onto a sector rate.',
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-6"
              >
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
