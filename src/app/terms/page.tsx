export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: April 2026</p>

      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using the Uteo platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. Account Registration</h2>
          <p>You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Trainer Verification</h2>
          <p>Trainers may undergo a verification process. Uteo does not guarantee the qualifications or performance of any trainer. Clients should exercise their own judgment when selecting trainers.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Bookings and Payments</h2>
          <p>All payments are processed through our secure payment system. Payments for sessions are held in escrow and released to trainers upon session completion. Cancellation policies apply as defined at the time of booking.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. Escrow and Refunds</h2>
          <p>Payment held in escrow will be released to the trainer after session completion. Clients can dispute a session within 48 hours of completion. Refunds are processed on a case-by-case basis.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Code of Conduct</h2>
          <p>All users must conduct themselves professionally. Harassment, discrimination, fraud, or any illegal activity will result in immediate account suspension.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">7. Intellectual Property</h2>
          <p>All content on the Uteo platform, including logos, text, and design, is the property of Uteo unless otherwise stated. Users retain ownership of content they upload.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">8. Limitation of Liability</h2>
          <p>Uteo acts as a marketplace connecting clients and trainers. We are not liable for the quality of training services provided. Our liability is limited to the fees paid to the platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">9. Modifications</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">10. Contact</h2>
          <p>For questions about these terms, please contact us at legal@uteo.co.ke.</p>
        </section>
      </div>
    </div>
  );
}
