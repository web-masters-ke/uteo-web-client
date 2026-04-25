'use client';

import { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function ContactPage() {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      addToast('error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1000));
    addToast('success', 'Message sent! We will get back to you soon.');
    setName(''); setEmail(''); setSubject(''); setMessage('');
    setSubmitting(false);
  };

  const inputClasses = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors';

  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=4096&q=100" alt="Handshake" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#192C67]/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">SkillSasa</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">Get In Touch</h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">We&apos;d love to hear from you</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Contact Information</h2>
              <div className="space-y-6">
                {[
                  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', title: 'Email', content: 'hello@skillsasa.co.ke' },
                  { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', title: 'Phone', content: '+254 700 000 000' },
                  { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', title: 'Address', content: 'Nairobi, Kenya' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Business Hours</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                <p>Saturday: 9:00 AM - 1:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClasses} placeholder="How can we help?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className={inputClasses} placeholder="Tell us more..." />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
