"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface UteoProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  headline?: string;
  location?: string;
  bio?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  openToWork?: boolean;
  skills?: { id: string; skillId?: string; skill?: { id: string; name: string }; name?: string; proficiency?: string }[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  jobTypes?: string[];
  minSalary?: number;
  currency?: string;
}

interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: string | number;
  endYear?: string | number;
  isCurrent?: boolean;
}

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#F77B0F] focus:ring-2 focus:ring-[#F77B0F]/20 outline-none transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0f1a]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F77B0F] border-t-transparent" />
    </div>
  );
}

function ProfileCompletion({ profile }: { profile: UteoProfile }) {
  const checks = [
    !!profile.headline,
    !!profile.bio,
    !!profile.location,
    (profile.skills?.length ?? 0) > 0,
    (profile.experience?.length ?? 0) > 0,
    (profile.education?.length ?? 0) > 0,
    !!profile.resumeUrl,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profile Completion</span>
        <span className="text-sm font-bold text-[#F77B0F]">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#F77B0F] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct < 100 && (
        <p className="text-xs text-gray-400 mt-2">
          {!profile.headline ? "Add a headline · " : ""}
          {!profile.bio ? "Add a bio · " : ""}
          {(profile.skills?.length ?? 0) === 0 ? "Add skills · " : ""}
          {(profile.experience?.length ?? 0) === 0 ? "Add experience · " : ""}
          {!profile.resumeUrl ? "Add resume URL" : ""}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<UteoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editResumeUrl, setEditResumeUrl] = useState("");
  const [editPortfolioUrl, setEditPortfolioUrl] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");

  // Skills
  const [allSkills, setAllSkills] = useState<{ id: string; name: string }[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  // Experience modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expEditing, setExpEditing] = useState<ExperienceItem | null>(null);
  const [expForm, setExpForm] = useState({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "" });

  // Education modal
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [eduEditing, setEduEditing] = useState<EducationItem | null>(null);
  const [eduForm, setEduForm] = useState({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false });

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!user) return;
    loadProfile();
    apiGet<{ items: { id: string; name: string }[] }>("/skills").then((d) => setAllSkills(Array.isArray(d) ? d : d?.items ?? [])).catch(() => {});
  }, [user, authLoading]);

  async function loadProfile() {
    try {
      const data = await apiGet<UteoProfile>("/profile/me");
      setProfile(data);
      setEditFirstName(data.firstName || "");
      setEditLastName(data.lastName || "");
      setEditPhone((data as any).phone || "");
      setEditHeadline(data.headline || "");
      setEditLocation(data.location || "");
      setEditBio(data.bio || "");
      setEditResumeUrl(data.resumeUrl || "");
      setEditPortfolioUrl(data.portfolioUrl || "");
      setEditLinkedinUrl(data.linkedinUrl || "");
    } catch {
      addToast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await apiPatch<UteoProfile>("/profile/me", {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        headline: editHeadline,
        location: editLocation,
        bio: editBio,
        resumeUrl: editResumeUrl,
        portfolioUrl: editPortfolioUrl,
        linkedinUrl: editLinkedinUrl,
      });
      setProfile(updated);
      if (updateUser) updateUser(updated as any);
      setEditModalOpen(false);
      addToast("success", "Profile updated!");
    } catch {
      addToast("error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOpenToWork() {
    if (!profile) return;
    try {
      const updated = await apiPatch<UteoProfile>("/profile/me", { openToWork: !profile.openToWork });
      setProfile(updated);
      addToast("success", profile.openToWork ? "Hidden from recruiters" : "Now visible to recruiters");
    } catch {
      addToast("error", "Failed to update status");
    }
  }

  async function addSkill(skillId: string, skillName: string) {
    setAddingSkill(true);
    try {
      await apiPost("/profile/me/skills", { skillId, proficiency: "INTERMEDIATE" });
      setProfile((p) => p ? { ...p, skills: [...(p.skills || []), { id: skillId, skillId, skill: { id: skillId, name: skillName }, proficiency: "INTERMEDIATE" }] } : p);
      setSkillSearch("");
      addToast("success", "Skill added");
    } catch {
      addToast("error", "Failed to add skill");
    } finally {
      setAddingSkill(false);
    }
  }

  async function removeSkill(id: string) {
    try {
      await apiDelete(`/profile/me/skills/${id}`);
      setProfile((p) => p ? { ...p, skills: (p.skills || []).filter((s) => s.id !== id) } : p);
      addToast("success", "Skill removed");
    } catch {
      addToast("error", "Failed to remove skill");
    }
  }

  async function saveExperience() {
    setSaving(true);
    try {
      if (expEditing) {
        const updated = await apiPatch<ExperienceItem>(`/profile/me/experience/${expEditing.id}`, expForm);
        setProfile((p) => p ? { ...p, experience: (p.experience || []).map((e) => e.id === expEditing.id ? updated : e) } : p);
      } else {
        const created = await apiPost<ExperienceItem>("/profile/me/experience", expForm);
        setProfile((p) => p ? { ...p, experience: [...(p.experience || []), created] } : p);
      }
      setExpModalOpen(false);
      setExpEditing(null);
      setExpForm({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "" });
      addToast("success", "Experience saved");
    } catch {
      addToast("error", "Failed to save experience");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExperience(id: string) {
    try {
      await apiDelete(`/profile/me/experience/${id}`);
      setProfile((p) => p ? { ...p, experience: (p.experience || []).filter((e) => e.id !== id) } : p);
      addToast("success", "Experience removed");
    } catch {
      addToast("error", "Failed to delete");
    }
  }

  async function saveEducation() {
    setSaving(true);
    try {
      if (eduEditing) {
        const updated = await apiPatch<EducationItem>(`/profile/me/education/${eduEditing.id}`, eduForm);
        setProfile((p) => p ? { ...p, education: (p.education || []).map((e) => e.id === eduEditing.id ? updated : e) } : p);
      } else {
        const created = await apiPost<EducationItem>("/profile/me/education", eduForm);
        setProfile((p) => p ? { ...p, education: [...(p.education || []), created] } : p);
      }
      setEduModalOpen(false);
      setEduEditing(null);
      setEduForm({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false });
      addToast("success", "Education saved");
    } catch {
      addToast("error", "Failed to save education");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEducation(id: string) {
    try {
      await apiDelete(`/profile/me/education/${id}`);
      setProfile((p) => p ? { ...p, education: (p.education || []).filter((e) => e.id !== id) } : p);
      addToast("success", "Education removed");
    } catch {
      addToast("error", "Failed to delete");
    }
  }

  const filteredSkillsForAdd = allSkills.filter(
    (s) =>
      !profile?.skills?.find((sk) => sk.skillId === s.id || sk.id === s.id) &&
      s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (authLoading || loading) return <Spinner />;
  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load profile.</p>
        <button onClick={loadProfile} className="px-4 py-2 bg-[#F77B0F] text-white rounded-lg text-sm font-semibold hover:bg-[#e06a0d]">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1a]">
      {/* Header / Hero */}
      <div className="bg-gradient-to-br from-[#192C67] to-[#0a1120] pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-[#F77B0F] flex items-center justify-center text-2xl font-black text-white overflow-hidden shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (profile.firstName?.[0] ?? "") + (profile.lastName?.[0] ?? "")
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-white">{profile.firstName} {profile.lastName}</h1>
                {profile.openToWork && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Open to Work
                  </span>
                )}
              </div>
              {profile.headline && <p className="text-white/70 text-sm">{profile.headline}</p>}
              {profile.location && <p className="text-white/50 text-xs mt-1">{profile.location}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={toggleOpenToWork}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    profile.openToWork
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      : "bg-white/10 border-white/20 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {profile.openToWork ? "Open to Work (click to hide)" : "Set as Open to Work"}
                </button>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F77B0F] text-white hover:bg-[#e06a0d] transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 overflow-x-auto">
            {["overview", "experience", "education", "skills"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <ProfileCompletion profile={profile} />

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Bio */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">About</h3>
              {profile.bio ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No bio added yet. <button onClick={() => setEditModalOpen(true)} className="text-[#F77B0F] hover:underline not-italic">Add one</button></p>
              )}
            </div>

            {/* Links */}
            {(profile.resumeUrl || profile.portfolioUrl || profile.linkedinUrl) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Links</h3>
                <div className="space-y-2">
                  {profile.resumeUrl && (
                    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F77B0F] hover:underline">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Resume / CV
                    </a>
                  )}
                  {profile.portfolioUrl && (
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F77B0F] hover:underline">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      Portfolio / Website
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F77B0F] hover:underline">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{profile.email}</div>
                {profile.phone && <div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{profile.phone}</div>}
              </div>
            </div>
          </div>
        )}

        {/* EXPERIENCE TAB */}
        {activeTab === "experience" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Work Experience</h3>
              <button
                onClick={() => { setExpEditing(null); setExpForm({ company: "", title: "", startDate: "", endDate: "", isCurrent: false, description: "" }); setExpModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F77B0F] text-white text-xs font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Experience
              </button>
            </div>
            {(profile.experience?.length ?? 0) === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No work experience added yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(profile.experience || []).map((exp) => (
                  <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{exp.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{exp.company}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {exp.startDate} — {exp.isCurrent ? "Present" : exp.endDate || ""}
                        </p>
                        {exp.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{exp.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setExpEditing(exp); setExpForm({ company: exp.company, title: exp.title, startDate: exp.startDate || "", endDate: exp.endDate || "", isCurrent: !!exp.isCurrent, description: exp.description || "" }); setExpModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#F77B0F] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteExperience(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === "education" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Education</h3>
              <button
                onClick={() => { setEduEditing(null); setEduForm({ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false }); setEduModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F77B0F] text-white text-xs font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Education
              </button>
            </div>
            {(profile.education?.length ?? 0) === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No education history added yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(profile.education || []).map((edu) => (
                  <div key={edu.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{edu.degree}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{edu.institution}</p>
                        <p className="text-xs text-gray-400 mt-1">{edu.startYear} — {edu.isCurrent ? "Present" : edu.endYear || ""}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEduEditing(edu); setEduForm({ institution: edu.institution, degree: edu.degree, fieldOfStudy: edu.fieldOfStudy || "", startYear: String(edu.startYear || ""), endYear: String(edu.endYear || ""), isCurrent: !!edu.isCurrent }); setEduModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#F77B0F] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteEducation(edu.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === "skills" && (
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Skills</h3>
            {(profile.skills?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {(profile.skills || []).map((s) => {
                  const name = s.skill?.name || s.name || "";
                  return (
                    <div key={s.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {name}
                      {s.proficiency && <span className="text-[10px] text-gray-400 capitalize">{s.proficiency.toLowerCase()}</span>}
                      <button onClick={() => removeSkill(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Skills</p>
              <input
                className={inputCls}
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills to add..."
              />
              {skillSearch && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredSkillsForAdd.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No skills found for "{skillSearch}"</div>
                  ) : (
                    filteredSkillsForAdd.slice(0, 8).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={addingSkill}
                        onClick={() => addSkill(s.id, s.name)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between"
                      >
                        {s.name}
                        <span className="text-[#F77B0F] font-bold text-lg">+</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Edit Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name"><input className={inputCls} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} /></Field>
                <Field label="Last Name"><input className={inputCls} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} /></Field>
              </div>
              <Field label="Phone"><input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+254 700 000 000" /></Field>
              <Field label="Professional Headline"><input className={inputCls} value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} placeholder="Senior Software Engineer" /></Field>
              <Field label="Location"><input className={inputCls} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Nairobi, Kenya" /></Field>
              <Field label="Bio"><textarea className={`${inputCls} resize-none min-h-[80px]`} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell employers about yourself..." /></Field>
              <Field label="Resume URL"><input className={inputCls} value={editResumeUrl} onChange={(e) => setEditResumeUrl(e.target.value)} placeholder="https://..." /></Field>
              <Field label="Portfolio / Website"><input className={inputCls} value={editPortfolioUrl} onChange={(e) => setEditPortfolioUrl(e.target.value)} placeholder="https://..." /></Field>
              <Field label="LinkedIn URL"><input className={inputCls} value={editLinkedinUrl} onChange={(e) => setEditLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setEditModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveProfile} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Experience Modal ── */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{expEditing ? "Edit Experience" : "Add Experience"}</h3>
              <button onClick={() => setExpModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Job Title"><input className={inputCls} value={expForm.title} onChange={(e) => setExpForm((p) => ({ ...p, title: e.target.value }))} placeholder="Software Engineer" /></Field>
                <Field label="Company"><input className={inputCls} value={expForm.company} onChange={(e) => setExpForm((p) => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date"><input type="month" className={inputCls} value={expForm.startDate} onChange={(e) => setExpForm((p) => ({ ...p, startDate: e.target.value }))} /></Field>
                <Field label="End Date"><input type="month" className={inputCls} value={expForm.endDate} disabled={expForm.isCurrent} onChange={(e) => setExpForm((p) => ({ ...p, endDate: e.target.value }))} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={expForm.isCurrent} onChange={(e) => setExpForm((p) => ({ ...p, isCurrent: e.target.checked, endDate: e.target.checked ? "" : p.endDate }))} />
                I currently work here
              </label>
              <Field label="Description"><textarea className={`${inputCls} resize-none min-h-[80px]`} value={expForm.description} onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))} placeholder="Key responsibilities..." /></Field>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setExpModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveExperience} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Education Modal ── */}
      {eduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{eduEditing ? "Edit Education" : "Add Education"}</h3>
              <button onClick={() => setEduModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Institution"><input className={inputCls} value={eduForm.institution} onChange={(e) => setEduForm((p) => ({ ...p, institution: e.target.value }))} placeholder="University of Nairobi" /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Degree"><input className={inputCls} value={eduForm.degree} onChange={(e) => setEduForm((p) => ({ ...p, degree: e.target.value }))} placeholder="Bachelor of Science" /></Field>
                <Field label="Field of Study"><input className={inputCls} value={eduForm.fieldOfStudy} onChange={(e) => setEduForm((p) => ({ ...p, fieldOfStudy: e.target.value }))} placeholder="Computer Science" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Year"><input type="number" className={inputCls} value={eduForm.startYear} onChange={(e) => setEduForm((p) => ({ ...p, startYear: e.target.value }))} placeholder="2018" /></Field>
                <Field label="End Year"><input type="number" className={inputCls} value={eduForm.endYear} disabled={eduForm.isCurrent} onChange={(e) => setEduForm((p) => ({ ...p, endYear: e.target.value }))} placeholder="2022" /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={eduForm.isCurrent} onChange={(e) => setEduForm((p) => ({ ...p, isCurrent: e.target.checked, endYear: e.target.checked ? "" : p.endYear }))} />
                I currently study here
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setEduModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={saveEducation} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
