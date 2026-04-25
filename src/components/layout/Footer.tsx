import Link from 'next/link';
const links = { Platform: [{ href: '/trainers', label: 'Find Trainers' }, { href: '/how-it-works', label: 'How It Works' }, { href: '/pricing', label: 'Pricing' }, { href: '/for-trainers', label: 'For Trainers' }], Company: [{ href: '/about', label: 'About SkillSasa' }, { href: '/contact', label: 'Contact Us' }, { href: '/terms', label: 'Terms of Service' }, { href: '/privacy', label: 'Privacy Policy' }] };
export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#1E293B] border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><div className="mb-4"><img src="/skillsasa-logo.png" alt="SkillSasa" className="h-9 w-auto object-contain dark:hidden" /><img src="/logo-white.png" alt="SkillSasa" className="hidden h-9 w-auto object-contain dark:block" /></div><p className="text-sm text-gray-500 dark:text-gray-400">Kenya's AI-powered trainer marketplace — connecting you with certified professional and vocational trainers for booking, courses, and skills growth.</p></div>
          {Object.entries(links).map(([title, items]) => <div key={title}><h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h4><ul className="space-y-3">{items.map((item) => <li key={item.label}><Link href={item.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500">{item.label}</Link></li>)}</ul></div>)}
        </div>
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700 text-center"><p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} SkillSasa &mdash; In partnership with PTAK (Professional Trainers Association of Kenya). All rights reserved.</p></div>
      </div>
    </footer>
  );
}
