"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import ThemeToggle from "@/components/ui/ThemeToggle";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setSubmitting(true);
    try {
      await login({ email: data.email, password: data.password });
      addToast("success", "Welcome back!");
      router.push("/feed");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      addToast("error", axiosErr.response?.data?.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const ic = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1724] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#192C67] focus:border-[#192C67] outline-none text-sm transition-colors";

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Theme toggle pinned top-right */}
      <div className="absolute top-4 right-5 z-30">
        <ThemeToggle className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm" />
      </div>

      {/* Left — Image */}
      <div className="hidden lg:flex lg:w-1/2 flex-col relative">
        <img
          src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=2400&q=100"
          alt="Professional at work"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[#0a1628]/50" />
        <div className="relative flex-1" />
        <div className="relative px-12 pb-12">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl font-black text-white">Uteo</span>
            <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
          </div>
          <h2 className="text-3xl font-black text-white leading-tight max-w-lg">
            Your Dream Job<br />Finds You.
          </h2>
          <p className="mt-3 text-white/55 max-w-md leading-relaxed text-sm">
            AI-powered job discovery — personalized feeds, one-click apply, and real-time application tracking.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['AI Job Feed', 'One-Click Apply', 'Match Score', 'Track Applications', 'Recruiter Tools', 'Skill Matching'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white/80 backdrop-blur-sm">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gray-50 dark:bg-[#0d0d0d] overflow-y-auto">
        {/* Form centred in remaining space */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-7 text-sm">Sign in to your Uteo account</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input {...register("email")} type="email" className={ic} placeholder="you@example.com" />
                {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input {...register("password")} type={showPw ? "text" : "password"} className={ic + " pr-12"} placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    {showPw ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>}
              </div>
              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm font-semibold text-[#192C67] dark:text-white/70 hover:underline">Forgot password?</Link>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 border-2 border-[#192C67] dark:border-[#F77B0F]/50 text-[#192C67] dark:text-white/70 font-bold rounded-xl hover:bg-[#192C67]/5 dark:hover:bg-[#5b8bc7]/10 disabled:opacity-40 transition-colors text-sm uppercase tracking-wider"
              >
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-[#192C67] dark:text-white/70 hover:underline">Create Account</Link>
            </p>
          </div>
        </div>

        <div className="shrink-0 px-8 pb-8 flex justify-end items-center gap-1.5">
          <span className="text-sm font-black text-gray-400 dark:text-gray-600 tracking-tight">Uteo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
        </div>
      </div>
    </div>
  );
}
