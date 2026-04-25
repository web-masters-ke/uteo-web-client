import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=4096&q=100" alt="Nairobi skyline" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#192C67]/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">SkillSasa</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">About SkillSasa</h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">Professional Trainers Association of Kenya</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl">
          The Professional Trainers Association of Kenya (SkillSasa) is Kenya&apos;s premier marketplace connecting clients with verified, professional trainers across every discipline.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-300">
              To democratize access to professional training services in Kenya by creating a trusted, transparent platform where anyone can find and book skilled trainers, and where trainers can grow their businesses.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h2>
            <p className="text-gray-600 dark:text-gray-300">
              A Kenya where every individual has access to high-quality professional development and training, empowering personal and economic growth across all 47 counties.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">What We Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {[
            { title: 'Verified Trainers', desc: 'Every trainer goes through a verification process to ensure quality and professionalism.' },
            { title: 'Secure Payments', desc: 'Escrow-protected payments ensure both clients and trainers are protected.' },
            { title: 'Flexible Sessions', desc: 'Book virtual, in-person, or hybrid sessions that fit your schedule.' },
            { title: 'Reviews & Ratings', desc: 'Transparent review system helps you make informed decisions.' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Values</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300 mb-20">
          <li><strong>Trust</strong> - We build trust through transparency, verification, and escrow protection.</li>
          <li><strong>Quality</strong> - We maintain high standards for all trainers on our platform.</li>
          <li><strong>Accessibility</strong> - Professional development should be available to everyone.</li>
          <li><strong>Innovation</strong> - We continuously improve our platform to serve you better.</li>
          <li><strong>Community</strong> - We foster a vibrant community of learners and educators.</li>
        </ul>

        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-200 mb-4">Join Our Community</h2>
          <p className="text-primary-700 dark:text-primary-300 mb-6">Whether you are looking to learn or teach, SkillSasa has a place for you.</p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors">Get Started</Link>
            <Link href="/contact" className="px-6 py-3 border border-primary-500 text-primary-600 dark:text-primary-400 font-semibold rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>
    </>
  );
}
