"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { apiPost } from "@/lib/api";

/**
 * Password strength: 0-4 score based on length + character classes.
 */
function passwordScore(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Good", color: "bg-emerald-500" },
    4: { label: "Strong", color: "bg-emerald-600" },
  };
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, ...map[clamped] };
}

/**
 * Pan-African phone validation — accepts +CC (7-15 digits) or 0XX (10 digits).
 * Returns null if the format is acceptable, error string otherwise.
 */
function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "Phone number is required";
  const cleaned = phone.replace(/[\s\-()\.]/g, "");
  if (!/^(\+|00)?\d{7,15}$/.test(cleaned)) {
    return "Use international format, e.g. +254712345678";
  }
  return null;
}

type RoleChoice = "seeker" | "recruiter";
type RecruiterType = "individual" | "organization";
type Step = 1 | 2;

interface AccountData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface CompanyData {
  name: string;
  industry: string;
  size: string;
  website: string;
  location: string;
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#192C67] focus:bg-white focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#5b8bc7] dark:focus:bg-zinc-900";

const selectCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#192C67] focus:bg-white focus:ring-2 focus:ring-[#192C67]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#5b8bc7]";

function Field({
  label,
  error,
  children,
  action,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {action}
      </div>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function RegisterPageInner() {
  const { register: registerUser } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "recruiter" ? "recruiter" : "seeker";

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<RoleChoice>(defaultRole as RoleChoice);
  const [recruiterType, setRecruiterType] = useState<RecruiterType>("individual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [account, setAccount] = useState<AccountData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Live availability checks against /auth/check-availability (debounced)
  const [emailAvail, setEmailAvail] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [phoneAvail, setPhoneAvail] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (emailDebounce.current) clearTimeout(emailDebounce.current);
    if (!account.email) { setEmailAvail("idle"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) { setEmailAvail("invalid"); return; }
    setEmailAvail("checking");
    emailDebounce.current = setTimeout(async () => {
      try {
        const r = await apiPost<{ email?: { available: boolean } }>("/auth/check-availability", { email: account.email });
        setEmailAvail(r?.email?.available ? "available" : "taken");
      } catch { setEmailAvail("idle"); }
    }, 450);
    return () => { if (emailDebounce.current) clearTimeout(emailDebounce.current); };
  }, [account.email]);

  useEffect(() => {
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
    if (!account.phone.trim()) { setPhoneAvail("idle"); return; }
    if (validatePhone(account.phone)) { setPhoneAvail("invalid"); return; }
    setPhoneAvail("checking");
    phoneDebounce.current = setTimeout(async () => {
      try {
        const r = await apiPost<{ phone?: { available: boolean } }>("/auth/check-availability", { phone: account.phone });
        setPhoneAvail(r?.phone?.available ? "available" : "taken");
      } catch { setPhoneAvail("idle"); }
    }, 450);
    return () => { if (phoneDebounce.current) clearTimeout(phoneDebounce.current); };
  }, [account.phone]);

  const pwdStrength = passwordScore(account.password);

  const [company, setCompany] = useState<CompanyData>({
    name: "",
    industry: "",
    size: "",
    website: "",
    location: "",
  });

  function setA(field: keyof AccountData, val: string) {
    setAccount((p) => ({ ...p, [field]: val }));
    setFieldErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  function setC(field: keyof CompanyData, val: string) {
    setCompany((p) => ({ ...p, [field]: val }));
    setFieldErrors((p) => { const n = { ...p }; delete n[`company_${field}`]; return n; });
  }

  const isOrg = role === "recruiter" && recruiterType === "organization";

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!account.firstName.trim()) errs.firstName = "First name is required";
    if (!account.lastName.trim()) errs.lastName = "Last name is required";
    if (!account.email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = "Enter a valid email address";
    else if (emailAvail === "taken") errs.email = "This email is already registered";

    const phoneErr = validatePhone(account.phone);
    if (phoneErr) errs.phone = phoneErr;
    else if (phoneAvail === "taken") errs.phone = "This phone number is already registered";

    if (!account.password) errs.password = "Password is required";
    else if (account.password.length < 8) errs.password = "Use at least 8 characters";
    else if (!/[A-Za-z]/.test(account.password) || !/\d/.test(account.password)) errs.password = "Include at least one letter and one number";

    if (!account.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (account.password !== account.confirmPassword) errs.confirmPassword = "Passwords don't match";

    if (isOrg && !company.name.trim()) errs.company_name = "Company name is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setError(null);
    setLoading(true);
    try {
      const authRole = role === "recruiter" ? "TRAINER" : "CLIENT";
      await registerUser({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone,
        password: account.password,
        role: authRole,
      });

      // If org recruiter, create company (user is now authenticated)
      if (isOrg && company.name.trim()) {
        try {
          await apiPost("/companies", {
            name: company.name.trim(),
            industry: company.industry.trim() || undefined,
            size: company.size || undefined,
            website: company.website.trim() || undefined,
            location: company.location.trim() || undefined,
          });
        } catch {
          // company creation failed non-critically — continue to onboarding
          addToast("warning" as any, "Account created but company setup failed. You can set it up later.");
        }
      }

      addToast("success", "Account created! Let's set up your profile.");
      router.push("/onboarding");
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number;
          data?: {
            error?: { code?: string; message?: string; field?: string; hint?: string };
            message?: string | string[];
            code?: string;
          };
        };
        message?: string;
      };
      const errBody = e.response?.data?.error ?? (e.response?.data as any) ?? {};
      const code = errBody.code ?? e.response?.data?.code;
      const rawMsg = errBody.message ?? e.response?.data?.message ?? e.message ?? "Registration failed";
      const msg = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;

      // Map structured codes → field-level errors
      switch (code) {
        case "EMAIL_EXISTS":
          setFieldErrors(p => ({ ...p, email: "This email is already registered" }));
          setError("That email is already registered. Sign in instead.");
          break;
        case "PHONE_EXISTS":
          setFieldErrors(p => ({ ...p, phone: "This phone number is already registered" }));
          setError("That phone number is already registered.");
          break;
        case "INVALID_PHONE":
          setFieldErrors(p => ({ ...p, phone: msg as string }));
          setError(null);
          break;
        case "WEAK_PASSWORD":
          setFieldErrors(p => ({ ...p, password: msg as string }));
          setError(null);
          break;
        default: {
          const is409 = e.response?.status === 409 || /exist|duplicate|already/i.test(msg as string);
          if (is409) {
            const isPhone = /phone/i.test(msg as string);
            if (isPhone) {
              setFieldErrors(p => ({ ...p, phone: "This phone number is already registered" }));
              setError("That phone number is already registered.");
            } else {
              setFieldErrors(p => ({ ...p, email: "This email is already registered" }));
              setError("That email is already registered. Sign in instead.");
            }
          } else {
            setError(msg as string);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const companySizes = [
    { value: "STARTUP", label: "Startup (1-10)" },
    { value: "SMALL", label: "Small (11-50)" },
    { value: "MEDIUM", label: "Medium (51-200)" },
    { value: "LARGE", label: "Large (201-1000)" },
    { value: "ENTERPRISE", label: "Enterprise (1000+)" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=4096&q=100"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#060b18]/85" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <span className="text-2xl font-black text-white">Uteo</span>
            <span className="w-2 h-2 rounded-full bg-[#F77B0F]" />
          </Link>
          <h1 className="text-3xl font-bold leading-tight text-white">
            {role === "recruiter" ? (
              <>Start hiring<br /><span className="text-[#F77B0F]">smarter.</span></>
            ) : (
              <>Your dream job<br /><span className="text-[#F77B0F]">finds you.</span></>
            )}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {role === "recruiter"
              ? "Post jobs, get AI-matched with qualified candidates, and manage your full hiring pipeline — all in one place."
              : "Build your profile once. Let AI match you with the right opportunities every day."}
          </p>

          <div className="mt-10 space-y-4">
            {[
              step === 1 ? "Choose your role" : "Fill your details",
              "Complete onboarding",
              role === "recruiter" ? "Start posting jobs" : "Apply with one click",
            ].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: done ? "#F77B0F" : active ? "rgba(247,123,15,0.2)" : "rgba(255,255,255,0.06)",
                      color: done || active ? "#fff" : "rgba(255,255,255,0.3)",
                      border: active ? "1.5px solid rgba(247,123,15,0.6)" : "1.5px solid transparent",
                    }}
                  >
                    {done ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : n}
                  </div>
                  <span className={`text-sm transition-colors ${active ? "font-semibold text-white" : done ? "text-slate-400" : "text-slate-600"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Role badges on left panel */}
          {step === 1 && role === "recruiter" && (
            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
                <span className="text-xs text-slate-400">AI candidate matching</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
                <span className="text-xs text-slate-400">Video interview via secure meeting room</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
                <span className="text-xs text-slate-400">Full pipeline management</span>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10">
          <p className="text-[11px] text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#F77B0F] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col bg-white dark:bg-zinc-950 lg:w-[58%]">
        <div className="mb-6 flex w-full max-w-lg self-center items-center justify-between px-6 pt-8 lg:hidden">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-black text-gray-900 dark:text-white">Uteo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
          </Link>
          <span className="text-xs text-zinc-400">Step {step} of 2</span>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 py-8 lg:px-16 overflow-y-auto">
          <div className="w-full max-w-lg">
            {/* ── Step 1: Role choice ─────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#F77B0F]">Step 1 of 2</div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">What brings you to Uteo?</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Choose your role to get the right experience.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Job seeker */}
                  <button
                    type="button"
                    onClick={() => setRole("seeker")}
                    className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                      role === "seeker"
                        ? "border-[#F77B0F] bg-[#F77B0F]/5 dark:bg-[#F77B0F]/10"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${role === "seeker" ? "bg-[#F77B0F] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">I'm looking for work</div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Find jobs that match your skills with AI powered feed</p>
                    {role === "seeker" && (
                      <div className="absolute right-3 top-3 w-5 h-5 rounded-full bg-[#F77B0F] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>

                  {/* Recruiter */}
                  <button
                    type="button"
                    onClick={() => setRole("recruiter")}
                    className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                      role === "recruiter"
                        ? "border-[#192C67] bg-[#192C67]/5 dark:bg-[#192C67]/10"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${role === "recruiter" ? "bg-[#192C67] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">I'm hiring</div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Post jobs and find the best matched candidates</p>
                    {role === "recruiter" && (
                      <div className="absolute right-3 top-3 w-5 h-5 rounded-full bg-[#192C67] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                </div>

                {/* Recruiter sub-type — animated in when recruiter is selected */}
                {role === "recruiter" && (
                  <div className="mb-6 rounded-2xl border border-[#192C67]/20 bg-[#192C67]/3 dark:bg-[#192C67]/10 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#192C67] dark:text-blue-400 mb-3">
                      What type of recruiter are you?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRecruiterType("individual")}
                        className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                          recruiterType === "individual"
                            ? "border-[#192C67] bg-white dark:bg-zinc-900"
                            : "border-zinc-200 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${recruiterType === "individual" ? "bg-[#192C67] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Individual</div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Freelance or independent recruiter</p>
                        {recruiterType === "individual" && (
                          <div className="absolute right-2 top-2 w-4 h-4 rounded-full bg-[#192C67] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRecruiterType("organization")}
                        className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                          recruiterType === "organization"
                            ? "border-[#192C67] bg-white dark:bg-zinc-900"
                            : "border-zinc-200 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${recruiterType === "organization" ? "bg-[#192C67] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Organization</div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Hiring for a company or team</p>
                        {recruiterType === "organization" && (
                          <div className="absolute right-2 top-2 w-4 h-4 rounded-full bg-[#192C67] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl bg-[#192C67] py-3 text-sm font-semibold text-white hover:bg-[#152356] transition-colors"
                >
                  Continue as {role === "seeker" ? "Job Seeker" : recruiterType === "organization" ? "Organization Recruiter" : "Individual Recruiter"}
                </button>
              </div>
            )}

            {/* ── Step 2: Account + company details ──────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="mb-6">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#F77B0F]">Step 2 of 2</div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Create your account</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Signing up as{" "}
                    <span className="font-semibold">
                      {role === "seeker" ? "Job Seeker" : recruiterType === "organization" ? "Organization Recruiter" : "Individual Recruiter"}
                    </span>
                    {" "}—{" "}
                    <button type="button" onClick={() => setStep(1)} className="text-[#F77B0F] hover:underline text-sm">Change</button>
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Personal info */}
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Personal Information</p>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="First name" error={fieldErrors.firstName} required>
                        <input className={inputCls} value={account.firstName} onChange={(e) => setA("firstName", e.target.value)} placeholder="Jane" />
                      </Field>
                      <Field label="Last name" error={fieldErrors.lastName} required>
                        <input className={inputCls} value={account.lastName} onChange={(e) => setA("lastName", e.target.value)} placeholder="Doe" />
                      </Field>
                    </div>
                    <Field label="Email address" error={fieldErrors.email} required>
                      <div className="relative">
                        <input className={inputCls + " pr-10"} type="email" value={account.email} onChange={(e) => setA("email", e.target.value)} placeholder="jane@example.com" autoComplete="email" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailAvail === "checking" && (
                            <svg className="h-4 w-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          )}
                          {emailAvail === "available" && (
                            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {emailAvail === "taken" && (
                            <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414L11.414 12l2.293 2.293a1 1 0 01-1.414 1.414L10 13.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 12 6.293 9.707a1 1 0 011.414-1.414L10 10.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </div>
                      {emailAvail === "taken" && !fieldErrors.email && (
                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                          Already in use.{" "}
                          <Link href="/login" className="underline font-semibold hover:text-red-700">Sign in instead</Link>
                        </p>
                      )}
                    </Field>
                    <Field label="Phone number" error={fieldErrors.phone} required>
                      <div className="relative">
                        <input className={inputCls + " pr-10"} type="tel" value={account.phone} onChange={(e) => setA("phone", e.target.value)} placeholder="+254 700 000 000" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {phoneAvail === "checking" && (
                            <svg className="h-4 w-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          )}
                          {phoneAvail === "available" && (
                            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {phoneAvail === "taken" && (
                            <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414L11.414 12l2.293 2.293a1 1 0 01-1.414 1.414L10 13.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 12 6.293 9.707a1 1 0 011.414-1.414L10 10.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </div>
                      {!fieldErrors.phone && phoneAvail !== "taken" && phoneAvail !== "invalid" && (
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Use international format with country code (e.g. +254, +234, +233).
                        </p>
                      )}
                      {phoneAvail === "taken" && !fieldErrors.phone && (
                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                          Already in use.{" "}
                          <Link href="/login" className="underline font-semibold hover:text-red-700">Sign in instead</Link>
                        </p>
                      )}
                    </Field>
                    <Field
                      label="Password"
                      error={fieldErrors.password}
                      required
                      action={
                        <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="h-3 w-3 cursor-pointer" />
                          Show
                        </label>
                      }
                    >
                      <input className={inputCls} type={showPwd ? "text" : "password"} value={account.password} onChange={(e) => setA("password", e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
                      {account.password && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i <= pwdStrength.score ? pwdStrength.color : "bg-zinc-200 dark:bg-zinc-700"
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`mt-1 text-[11px] ${
                            pwdStrength.score <= 1 ? "text-red-600 dark:text-red-400"
                            : pwdStrength.score === 2 ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {pwdStrength.label}{pwdStrength.score < 3 && " — add length, uppercase + symbols for a stronger password"}
                          </p>
                        </div>
                      )}
                    </Field>
                    <Field
                      label="Confirm password"
                      error={fieldErrors.confirmPassword}
                      required
                      action={
                        <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <input type="checkbox" checked={showConfirmPwd} onChange={(e) => setShowConfirmPwd(e.target.checked)} className="h-3 w-3 cursor-pointer" />
                          Show
                        </label>
                      }
                    >
                      <input className={inputCls} type={showConfirmPwd ? "text" : "password"} value={account.confirmPassword} onChange={(e) => setA("confirmPassword", e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
                    </Field>
                  </div>

                  {/* Organization section — only for org recruiters */}
                  {isOrg && (
                    <div className="rounded-2xl border border-[#192C67]/20 bg-[#192C67]/3 dark:bg-[#192C67]/10 dark:border-[#192C67]/30 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#192C67] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#192C67] dark:text-blue-400">Hiring Organization</p>
                      </div>

                      <Field label="Company / Organization Name" error={fieldErrors.company_name} required>
                        <input
                          className={inputCls}
                          value={company.name}
                          onChange={(e) => setC("name", e.target.value)}
                          placeholder="e.g. Acme Corp, Safaricom PLC, The Startup"
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Industry">
                          <input
                            className={inputCls}
                            value={company.industry}
                            onChange={(e) => setC("industry", e.target.value)}
                            placeholder="e.g. Technology, Finance"
                          />
                        </Field>
                        <Field label="Company Size">
                          <select
                            className={selectCls}
                            value={company.size}
                            onChange={(e) => setC("size", e.target.value)}
                          >
                            <option value="">Select size</option>
                            {companySizes.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Website">
                          <input
                            className={inputCls}
                            value={company.website}
                            onChange={(e) => setC("website", e.target.value)}
                            placeholder="https://example.com"
                          />
                        </Field>
                        <Field label="Location">
                          <input
                            className={inputCls}
                            value={company.location}
                            onChange={(e) => setC("location", e.target.value)}
                            placeholder="e.g. Nairobi, Kenya"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      <span>
                        {error}
                        {/email.*registered|already/i.test(error) && (
                          <> <Link href="/login" className="font-semibold underline">Sign in instead</Link></>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-[#192C67] py-2.5 text-sm font-semibold text-white transition hover:bg-[#152356] disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating account...
                      </span>
                    ) : isOrg ? "Create Account & Company" : "Create Account"}
                  </button>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#F77B0F] hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F77B0F] border-t-transparent" /></div>}>
      <RegisterPageInner />
    </Suspense>
  );
}
