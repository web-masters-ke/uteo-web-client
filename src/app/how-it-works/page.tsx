import Link from 'next/link';

export default function HowItWorksPage() {
  const steps = [
    { step: 1, title: 'Create Your Account', desc: 'Sign up as a client or trainer in minutes. Complete your profile to get the most out of the platform.', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
    { step: 2, title: 'Search & Discover', desc: 'Browse our directory of verified trainers. Filter by category, location, price, rating, and session type to find the perfect match.', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { step: 3, title: 'Book a Session', desc: 'Choose an available time slot, select your session type (virtual, in-person, or hybrid), and confirm your booking.', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { step: 4, title: 'Secure Payment', desc: 'Pay via your SkillSasa wallet or M-Pesa. Your payment is held in escrow until the session is complete, protecting both parties.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { step: 5, title: 'Train & Learn', desc: 'Meet your trainer online or in-person. Get personalized training tailored to your goals.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { step: 6, title: 'Review & Rate', desc: 'After your session, leave a review to help other clients and give feedback to your trainer.', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=4096&q=100" alt="Workshop session" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#192C67]/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">SkillSasa</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">How SkillSasa Works</h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">A simple, secure process to connect you with professional trainers</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {steps.map((item) => (
            <div key={item.step} className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <span className="text-sm font-bold text-secondary-500 uppercase tracking-wide">Step {item.step}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/register" className="px-8 py-3.5 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-lg inline-block">
            Get Started Now
          </Link>
        </div>
      </div>
    </>
  );
}
