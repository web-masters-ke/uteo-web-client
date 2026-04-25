import Link from 'next/link';

const links = {
  'For Job Seekers': [
    { href: '/feed', label: 'My Feed' },
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/applications', label: 'My Applications' },
    { href: '/saved-jobs', label: 'Saved Jobs' },
  ],
  'For Employers': [
    { href: '/post-job', label: 'Post a Job' },
    { href: '/recruiter', label: 'Recruiter Dashboard' },
    { href: '/companies', label: 'Company Profile' },
  ],
  Company: [
    { href: '/about', label: 'About Uteo' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#1E293B] border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Uteo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              AI-powered job discovery — personalized feeds that surface the right opportunities for every job seeker.
            </p>
            <p className="text-xs text-gray-400 mt-3 italic">Your Dream Job Finds You.</p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#F77B0F] transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Uteo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
