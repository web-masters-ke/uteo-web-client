export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: April 2026</p>

      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Information We Collect</h2>
          <p>We collect personal information you provide during registration (name, email, phone number), profile information (bio, skills, certifications), job applications, payment information, and usage data.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our services, process payments where applicable, facilitate job applications, send notifications, and ensure platform security. We do not sell your personal data to third parties.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Data Sharing</h2>
          <p>We share information with payment processors (M-Pesa/Safaricom) for payment processing, and with other users as necessary for job applications (e.g., recruiters see candidate profiles). We may share data with law enforcement if required by law.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Data Security</h2>
          <p>We implement industry-standard security measures including encryption, secure access controls, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. Cookies</h2>
          <p>We use cookies and local storage to maintain your session, remember your preferences (such as theme settings), and improve your experience on the platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal data. You can update your profile at any time or delete your account through the Settings page. For data requests, contact privacy@uteo.ai.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">7. Data Retention</h2>
          <p>We retain your data for as long as your account is active. After account deletion, we may retain certain data for legal compliance purposes for up to 2 years.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">8. Children</h2>
          <p>Uteo is not intended for use by persons under 18 years of age. We do not knowingly collect data from minors.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">9. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of significant changes via email or platform notification.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">10. Contact</h2>
          <p>For privacy-related questions, contact us at privacy@uteo.ai.</p>
        </section>
      </div>
    </div>
  );
}
