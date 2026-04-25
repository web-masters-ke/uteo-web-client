import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    { name: 'Free', price: 'KES 0', period: 'forever', desc: 'For clients and new trainers', features: ['Browse trainer profiles', 'Book sessions', 'Secure wallet payments', 'Reviews & ratings', 'In-app messaging'], cta: 'Get Started Free', href: '/register' },
    { name: 'Professional', price: 'KES 2,499', period: '/month', desc: 'For active trainers', features: ['Everything in Free', 'Featured listing in directory', 'Unlimited bookings', 'Priority support', 'Analytics dashboard', 'Verified badge', 'Custom profile URL'], cta: 'Start Professional', href: '/register?role=TRAINER', recommended: true },
    { name: 'Enterprise', price: 'KES 4,999', period: '/month', desc: 'For training organizations', features: ['Everything in Professional', 'Team management', 'Custom branding', 'API access', 'Dedicated account manager', 'Bulk booking discounts', 'Priority placement'], cta: 'Contact Sales', href: '/contact' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=4096&q=100" alt="Business meeting" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#192C67]/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">Uteo</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">Clients use Uteo for free. Trainers choose a plan that fits.</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 p-8 ${plan.recommended ? 'border-secondary-500 shadow-xl' : 'border-gray-200 dark:border-gray-700'}`}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-secondary-500 text-white text-xs font-bold rounded-full">MOST POPULAR</div>
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.desc}</p>
              <div className="mt-6 mb-8">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-accent-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block w-full text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
                  plan.recommended
                    ? 'bg-secondary-500 text-white hover:bg-secondary-600'
                    : 'bg-[#F77B0F] text-white hover:bg-[#e06a0d]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Is Uteo free for clients?', a: 'Yes! Clients can browse trainers, book sessions, and use the wallet for free. You only pay for the training sessions you book.' },
              { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime. Your premium features will remain active until the end of your billing period.' },
              { q: 'What payment methods are accepted?', a: 'We accept M-Pesa for all payments. Wallet deposits, session payments, and subscription fees can all be paid via M-Pesa.' },
              { q: 'How does escrow work?', a: 'When you book a session, your payment is held in escrow. After the session is completed, the funds are released to the trainer. If there is a dispute, our team will review and resolve it.' },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
