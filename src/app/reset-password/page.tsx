"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/services/auth";
import { useToast } from "@/lib/toast";

export const dynamic = "force-dynamic";

function ResetPasswordPageInner() {
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { addToast("error", "Min 8 characters"); return; }
    if (password !== confirm) { addToast("error", "Passwords do not match"); return; }
    setSubmitting(true);
    try { await authService.resetPassword(token, password); addToast("success", "Password reset!"); router.push("/login"); } catch { addToast("error", "Failed to reset password"); } finally { setSubmitting(false); }
  };

  const ic = "w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none";

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1></div>
        <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={ic} placeholder="At least 8 characters" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={ic} /></div>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 disabled:opacity-50">{submitting ? "Resetting..." : "Reset Password"}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6"><Link href="/login" className="text-primary-500 font-medium">Back to Sign In</Link></p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordPageInner /></Suspense>;
}
