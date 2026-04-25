"use client";
import { useState } from "react";
import Link from "next/link";
import { authService } from "@/lib/services/auth";
import { useToast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try { await authService.forgotPassword(email); setSent(true); addToast("success", "Reset email sent!"); } catch { addToast("error", "Failed to send reset email."); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1><p className="text-gray-500 dark:text-gray-400 mt-1">We will send you reset instructions</p></div>
        {sent ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-6">We sent a password reset link to your email address.</p>
            <Link href="/login" className="text-primary-500 font-medium text-sm">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" placeholder="you@example.com" /></div>
            <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50">{submitting ? "Sending..." : "Send Reset Link"}</button>
          </form>
        )}
        {!sent && <p className="text-center text-sm text-gray-500 mt-6"><Link href="/login" className="text-primary-500 font-medium">Back to Sign In</Link></p>}
      </div>
    </div>
  );
}
