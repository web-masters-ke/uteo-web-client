import Link from 'next/link';

export default function ForTrainersPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-[#192C67] to-[#0d1e45] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Grow Your Training Business with Uteo</h1>
          <p className="text-lg text-[#F77B0F]/50 max-w-2xl mx-auto mb-8">
            Join Kenya&apos;s largest job matching platform. Reach more clients, manage bookings effortlessly, and get paid securely.
          </p>
          <Link href="/register?role=TRAINER" className="px-8 py-3.5 bg-secondary-500 text-white font-semibold rounded-xl hover:bg-secondary-600 transition-colors shadow-lg inline-block">
            Join as a Trainer
          </Link>
        </div>
      </section>

      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Why Trainers Choose Uteo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Reach More Clients', desc: 'Get discovered by thousands of clients actively searching for training services across Kenya.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { title: 'Secure Payments', desc: 'Escrow-protected payments ensure you always get paid for your work. Support for M-Pesa withdrawals.', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { title: 'Build Your Brand', desc: 'Create a professional profile, showcase your certifications, and collect reviews to build credibility.', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            { title: 'Flexible Schedule', desc: 'Set your own availability and rates. Accept bookings on your terms, whether virtual or in-person.', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { title: 'Analytics & Insights', desc: 'Track your earnings, bookings, and reviews with a detailed analytics dashboard.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { title: 'Messaging', desc: 'Communicate with clients directly through our built-in messaging system.', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="w-12 h-12 rounded-lg bg-[#F77B0F]/10 dark:bg-[#192C67]/30 text-[#F77B0F] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to Start?</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">It takes less than 5 minutes to create your trainer profile and start receiving bookings.</p>
          <Link href="/register?role=TRAINER" className="px-8 py-3.5 bg-[#F77B0F] text-white font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors shadow-lg inline-block">
            Create Your Profile
          </Link>
        </div>
      </section>
    </div>
  );
}
