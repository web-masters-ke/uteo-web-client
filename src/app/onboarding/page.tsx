"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const SEEKER_STEPS = [
  "Basic Info",
  "Skills",
  "Experience",
  "Education",
  "Resume",
  "Preferences",
];

const RECRUITER_STEPS = ["Company Setup", "Done"];

const SKILL_PROFICIENCY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
type ProficiencyLevel = (typeof SKILL_PROFICIENCY_LEVELS)[number];

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE", "HYBRID"] as const;

interface Skill { id: string; name: string; }
interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}
interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
}

const EMPTY_EXP: ExperienceEntry = { company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "" };
const EMPTY_EDU: EducationEntry = { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false };

const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#F77B0F] focus:ring-2 focus:ring-[#F77B0F]/20 outline-none transition-all";

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i < current ? "bg-[#F77B0F]" : i === current - 1 ? "bg-[#F77B0F]" : "bg-gray-200 dark:bg-gray-700"}`}
        />
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();

  const redirectedRef = useRef(false);
  const isRecruiter = (user as any)?.role === "TRAINER"; // TRAINER maps to recruiter/employer in Uteo

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  // Seeker step 1: Basic info
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Seeker step 2: Skills
  const [selectedSkills, setSelectedSkills] = useState<{ id: string; name: string; proficiency: ProficiencyLevel }[]>([]);

  // Seeker step 3: Experience
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([{ ...EMPTY_EXP }]);

  // Seeker step 4: Education
  const [educations, setEducations] = useState<EducationEntry[]>([{ ...EMPTY_EDU }]);

  // Seeker step 5: Resume
  const [resumeUrl, setResumeUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Seeker step 6: Preferences
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [currency, setCurrency] = useState("KES");

  // Recruiter step 1: Company setup
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  useEffect(() => {
    if (!authLoading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiGet<{ items: Skill[] }>("/skills")
      .then((d) => setAllSkills(Array.isArray(d) ? d : d?.items ?? []))
      .catch(() => {});
  }, [user]);

  const filteredSkills = allSkills.filter(
    (s) =>
      !selectedSkills.find((sk) => sk.id === s.id) &&
      s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const steps = isRecruiter ? RECRUITER_STEPS : SEEKER_STEPS;
  const totalSteps = steps.length;

  const addSkill = (s: Skill) => {
    setSelectedSkills((prev) => [...prev, { id: s.id, name: s.name, proficiency: "INTERMEDIATE" }]);
  };
  const removeSkill = (id: string) => setSelectedSkills((prev) => prev.filter((s) => s.id !== id));
  const updateSkillProficiency = (id: string, proficiency: ProficiencyLevel) => {
    setSelectedSkills((prev) => prev.map((s) => s.id === id ? { ...s, proficiency } : s));
  };

  const toggleJobType = (jt: string) => {
    setJobTypes((prev) => prev.includes(jt) ? prev.filter((t) => t !== jt) : [...prev, jt]);
  };

  async function saveStepAndAdvance() {
    setError(null);
    setSaving(true);
    try {
      if (isRecruiter) {
        if (step === 1) {
          if (!companyName.trim()) { setError("Company name is required."); setSaving(false); return; }
          await apiPost("/companies", {
            name: companyName,
            industry,
            size: companySize,
            location: companyLocation,
            website: companyWebsite,
            description: companyDescription,
          });
          setStep(2);
        } else {
          router.push("/recruiter");
        }
        return;
      }

      // Seeker flows
      if (step === 1) {
        await apiPatch("/profile/me", { headline, location, bio });
        setStep(2);
      } else if (step === 2) {
        for (const skill of selectedSkills) {
          await apiPost("/profile/me/skills", { skillId: skill.id, proficiency: skill.proficiency }).catch(() => {});
        }
        setStep(3);
      } else if (step === 3) {
        for (const exp of experiences) {
          if (exp.company && exp.title) {
            await apiPost("/profile/me/experience", exp).catch(() => {});
          }
        }
        setStep(4);
      } else if (step === 4) {
        for (const edu of educations) {
          if (edu.institution && edu.degree) {
            await apiPost("/profile/me/education", edu).catch(() => {});
          }
        }
        setStep(5);
      } else if (step === 5) {
        await apiPatch("/profile/me", { resumeUrl, portfolioUrl, linkedinUrl });
        setStep(6);
      } else if (step === 6) {
        await apiPatch("/profile/me", {
          jobTypes,
          preferredLocations: preferredLocations ? [preferredLocations] : [],
          minSalary: minSalary ? Number(minSalary) : undefined,
          currency,
        });
        addToast("success", "Profile setup complete! Welcome to Uteo.");
        router.push("/feed");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Could not save. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    addToast("info", "You can complete your profile anytime from settings.");
    router.push(isRecruiter ? "/recruiter" : "/feed");
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0f1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const stepLabel = steps[step - 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1a] py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-black text-gray-900 dark:text-white">Uteo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F77B0F]" />
          </Link>
          <button type="button" onClick={skip} className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Skip for now
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F77B0F]">Step {step} of {totalSteps}</p>
              <p className="text-[11px] font-semibold text-gray-400">Setting up your {isRecruiter ? "employer" : "job seeker"} profile</p>
            </div>
            <StepBar current={step} total={totalSteps} />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{stepLabel}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRecruiter && step === 1 && "Tell us about the company you're hiring for."}
              {isRecruiter && step === 2 && "You're all set! Start posting jobs."}
              {!isRecruiter && step === 1 && "Help employers understand who you are at a glance."}
              {!isRecruiter && step === 2 && "Add skills to power the AI job matching."}
              {!isRecruiter && step === 3 && "Add your work history. Skip if you're new to the workforce."}
              {!isRecruiter && step === 4 && "Add your education background."}
              {!isRecruiter && step === 5 && "Link your resume and professional profiles."}
              {!isRecruiter && step === 6 && "Tell us what kind of work you're looking for."}
            </p>
          </div>

          {/* ── RECRUITER STEP 1: Company Setup ── */}
          {isRecruiter && step === 1 && (
            <div className="space-y-4">
              <Field label="Company Name *">
                <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Industry">
                  <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology, Finance, Healthcare..." />
                </Field>
                <Field label="Company Size">
                  <select className={inputCls} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Location">
                  <input className={inputCls} value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} placeholder="Nairobi, Kenya" />
                </Field>
                <Field label="Website">
                  <input className={inputCls} value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                </Field>
              </div>
              <Field label="Company Description">
                <textarea className={`${inputCls} resize-none min-h-[80px]`} value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="What does your company do?" />
              </Field>
            </div>
          )}

          {/* ── RECRUITER STEP 2: Done ── */}
          {isRecruiter && step === 2 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're ready to hire!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Your company profile has been created. Start posting jobs and finding great candidates.</p>
              <Link href="/post-job" className="inline-flex items-center gap-2 px-6 py-3 bg-[#F77B0F] text-white font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors">
                Post Your First Job
              </Link>
            </div>
          )}

          {/* ── SEEKER STEP 1: Basic Info ── */}
          {!isRecruiter && step === 1 && (
            <div className="space-y-4">
              <Field label="Professional Headline">
                <input className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Senior Software Engineer | React & Node.js" />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nairobi, Kenya" />
              </Field>
              <Field label="Professional Bio">
                <textarea className={`${inputCls} resize-none min-h-[100px]`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell employers about yourself, your experience, and what you're looking for..." />
              </Field>
            </div>
          )}

          {/* ── SEEKER STEP 2: Skills ── */}
          {!isRecruiter && step === 2 && (
            <div className="space-y-4">
              {selectedSkills.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Added Skills</p>
                  {selectedSkills.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                      <select
                        value={s.proficiency}
                        onChange={(e) => updateSkillProficiency(s.id, e.target.value as ProficiencyLevel)}
                        className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 outline-none"
                      >
                        {SKILL_PROFICIENCY_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
                      </select>
                      <button onClick={() => removeSkill(s.id)} className="text-red-400 hover:text-red-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Search & Add Skills</p>
                <input className={inputCls} value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Search skills (React, Python, Marketing...)" />
              </div>
              {skillSearch && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredSkills.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No skills found for "{skillSearch}"</div>
                  ) : (
                    filteredSkills.slice(0, 10).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { addSkill(s); setSkillSearch(""); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between"
                      >
                        {s.name}
                        <span className="text-[#F77B0F] font-bold text-lg">+</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedSkills.length === 0 && !skillSearch && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">Start typing to search and add skills. You can add more later from your profile.</p>
              )}
            </div>
          )}

          {/* ── SEEKER STEP 3: Experience ── */}
          {!isRecruiter && step === 3 && (
            <div className="space-y-4">
              {experiences.map((exp, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Position {i + 1}</span>
                    {experiences.length > 1 && (
                      <button type="button" onClick={() => setExperiences((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Job Title">
                      <input className={inputCls} value={exp.title} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Software Engineer" />
                    </Field>
                    <Field label="Company">
                      <input className={inputCls} value={exp.company} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} placeholder="Acme Corp" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Date">
                      <input type="month" className={inputCls} value={exp.startDate} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, startDate: e.target.value } : x))} />
                    </Field>
                    <Field label="End Date">
                      <input type="month" className={inputCls} value={exp.endDate} disabled={exp.isCurrent} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, endDate: e.target.value } : x))} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={exp.isCurrent} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, isCurrent: e.target.checked, endDate: e.target.checked ? "" : x.endDate } : x))} />
                    I currently work here
                  </label>
                  <Field label="Description (optional)">
                    <textarea className={`${inputCls} resize-none min-h-[60px]`} value={exp.description} onChange={(e) => setExperiences((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Key responsibilities and achievements..." />
                  </Field>
                </div>
              ))}
              <button type="button" onClick={() => setExperiences((prev) => [...prev, { ...EMPTY_EXP }])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 hover:border-[#F77B0F] hover:text-[#F77B0F] transition-colors">
                + Add Another Position
              </button>
            </div>
          )}

          {/* ── SEEKER STEP 4: Education ── */}
          {!isRecruiter && step === 4 && (
            <div className="space-y-4">
              {educations.map((edu, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Education {i + 1}</span>
                    {educations.length > 1 && (
                      <button type="button" onClick={() => setEducations((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <Field label="Institution">
                    <input className={inputCls} value={edu.institution} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, institution: e.target.value } : x))} placeholder="University of Nairobi" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Degree">
                      <input className={inputCls} value={edu.degree} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, degree: e.target.value } : x))} placeholder="Bachelor of Science" />
                    </Field>
                    <Field label="Field of Study">
                      <input className={inputCls} value={edu.fieldOfStudy} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, fieldOfStudy: e.target.value } : x))} placeholder="Computer Science" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Year">
                      <input type="number" className={inputCls} min="1960" max={new Date().getFullYear() + 5} value={edu.startYear} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, startYear: e.target.value } : x))} placeholder="2018" />
                    </Field>
                    <Field label="End Year">
                      <input type="number" className={inputCls} min="1960" max={new Date().getFullYear() + 5} value={edu.endYear} disabled={edu.isCurrent} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, endYear: e.target.value } : x))} placeholder="2022" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={edu.isCurrent} onChange={(e) => setEducations((prev) => prev.map((x, j) => j === i ? { ...x, isCurrent: e.target.checked, endYear: e.target.checked ? "" : x.endYear } : x))} />
                    I currently study here
                  </label>
                </div>
              ))}
              <button type="button" onClick={() => setEducations((prev) => [...prev, { ...EMPTY_EDU }])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 hover:border-[#F77B0F] hover:text-[#F77B0F] transition-colors">
                + Add Another Education
              </button>
            </div>
          )}

          {/* ── SEEKER STEP 5: Resume ── */}
          {!isRecruiter && step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                Add a link to your resume, portfolio, or LinkedIn profile. Employers will see these when you apply.
              </div>
              <Field label="Resume URL">
                <input className={inputCls} value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/file/your-resume" />
              </Field>
              <Field label="Portfolio / Website">
                <input className={inputCls} value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" />
              </Field>
              <Field label="LinkedIn Profile">
                <input className={inputCls} value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
              </Field>
            </div>
          )}

          {/* ── SEEKER STEP 6: Preferences ── */}
          {!isRecruiter && step === 6 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Job Types You're Interested In</p>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((jt) => (
                    <button
                      key={jt}
                      type="button"
                      onClick={() => toggleJobType(jt)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                        jobTypes.includes(jt)
                          ? "bg-[#F77B0F] text-white border-[#F77B0F]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {jt.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Preferred Locations">
                <input className={inputCls} value={preferredLocations} onChange={(e) => setPreferredLocations(e.target.value)} placeholder="e.g. Nairobi, Remote, Mombasa" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Minimum Salary Expectation">
                  <input type="number" className={inputCls} value={minSalary} onChange={(e) => setMinSalary(e.target.value)} placeholder="50000" />
                </Field>
                <Field label="Currency">
                  <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>
          )}

          {/* Navigation */}
          {!(isRecruiter && step === 2) && (
            <div className="mt-8 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={saveStepAndAdvance}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#F77B0F] py-2.5 text-sm font-semibold text-white hover:bg-[#e06a0d] disabled:opacity-60"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </span>
                ) : step === totalSteps ? (
                  isRecruiter ? "Create Company Profile" : "Finish & See My Feed"
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          You can update these details anytime from your{" "}
          <Link href="/profile" className="font-semibold text-[#F77B0F] hover:underline">Profile</Link>.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F77B0F] border-t-transparent" /></div>}>
      <OnboardingInner />
    </Suspense>
  );
}
