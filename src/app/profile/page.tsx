"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { api, unwrap, apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0d0d0d]">
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

// ─────────────────────────────────────────────────────────────────────────────
// Recruiter types
// ─────────────────────────────────────────────────────────────────────────────

interface RecruiterCompany {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
}

interface RecruiterRelation {
  id: string;
  title?: string;
  company: RecruiterCompany;
}

interface TrainerProfile {
  bio?: string;
  location?: string;
  linkedinUrl?: string;
  firmName?: string;
  specialization?: string;
  isHiring?: boolean;
}

interface RecruiterProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  role: string;
  jobSeekerProfile?: { bio?: string; location?: string; linkedinUrl?: string } | null;
  trainerProfile?: TrainerProfile | null;
  recruiter?: RecruiterRelation[];
  _count?: { jobPostings?: number; applications?: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterProfilePage
// ─────────────────────────────────────────────────────────────────────────────

function RecruiterProfilePage() {
  const { user, updateUser, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<RecruiterProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isHiring, setIsHiring] = useState(true);
  const [hiringSaving, setHiringSaving] = useState(false);

  // Edit fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (!user) return;
    loadProfile();
  }, [user, authLoading]);

  // Re-fetch when returning via back button / router cache restore
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) loadProfile(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function loadProfile() {
    try {
      const raw = await apiGet<RecruiterProfileData>("/profile/me");
      setData(raw);
      setIsHiring(raw.trainerProfile?.isHiring ?? true);
      populateEditFields(raw);
    } catch {
      addToast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function toggleHiring() {
    const next = !isHiring;
    setIsHiring(next);
    setHiringSaving(true);
    try {
      await apiPatch("/profile/me", { isHiring: next });
      addToast("success", next ? "Marked as actively hiring" : "Marked as not hiring");
    } catch {
      setIsHiring(!next);
      addToast("error", "Failed to update hiring status");
    } finally {
      setHiringSaving(false);
    }
  }

  function populateEditFields(raw: RecruiterProfileData) {
    setEditFirstName(raw.firstName || "");
    setEditLastName(raw.lastName || "");
    setEditPhone((raw as any).phone || "");
    const bio = raw.trainerProfile?.bio || raw.jobSeekerProfile?.bio || "";
    const location = raw.trainerProfile?.location || raw.jobSeekerProfile?.location || "";
    const linkedin = raw.trainerProfile?.linkedinUrl || raw.jobSeekerProfile?.linkedinUrl || "";
    setEditBio(bio);
    setEditLocation(location);
    setEditLinkedinUrl(linkedin);
    setEditAvatar(raw.avatar || raw.avatarUrl || "");
  }

  async function handleAvatarFile(file: File) {
    if (!file) return;
    setAvatarUploading(true);
    try {
      // Backend-proxied upload: browser → /media/upload → MinIO. Avoids the
      // browser-to-S3 CORS round-trip that was failing on the presigned PUT.
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await api.post<any>("/media/upload?folder=avatars", fd);
      const body = unwrap<any>(upRes.data) as { url?: string; publicUrl?: string };
      const publicUrl = body.url ?? body.publicUrl ?? "";
      if (!publicUrl) throw new Error("Upload returned no URL");
      await apiPatch("/profile/me", { avatar: publicUrl });
      const fresh = await apiGet<RecruiterProfileData>("/profile/me");
      setData(fresh);
      setEditAvatar((fresh as any).avatar || fresh.avatarUrl || publicUrl);
      if (updateUser) updateUser(fresh as any);
      addToast("success", "Profile photo updated!");
    } catch {
      addToast("error", "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await apiPatch("/profile/me", {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        bio: editBio,
        location: editLocation,
        linkedinUrl: editLinkedinUrl,
        avatar: editAvatar || undefined,
      });
      // Re-fetch full user so Shell gets correct firstName/lastName/avatar
      const fresh = await apiGet<RecruiterProfileData>("/profile/me");
      setData(fresh);
      if (updateUser) updateUser(fresh as any);
      setEditModalOpen(false);
      addToast("success", "Profile updated!");
    } catch {
      addToast("error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return <Spinner />;
  if (!data) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load profile.</p>
        <button onClick={loadProfile} className="px-4 py-2 bg-[#F77B0F] text-white rounded-lg text-sm font-semibold hover:bg-[#e06a0d]">Retry</button>
      </div>
    </div>
  );

  const recruiterRelation = data.recruiter?.[0];
  const company = recruiterRelation?.company;
  const bio = data.trainerProfile?.bio || data.jobSeekerProfile?.bio || "";
  const location = data.trainerProfile?.location || data.jobSeekerProfile?.location || "";
  const linkedinUrl = data.trainerProfile?.linkedinUrl || data.jobSeekerProfile?.linkedinUrl || "";
  const specialization = data.trainerProfile?.specialization || "";
  const avatarSrc = data.avatar || data.avatarUrl || "";
  const totalJobs = data._count?.jobPostings ?? 0;
  const totalApplications = data._count?.applications ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d]">
      {/* ── Hero ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-5 border-b border-gray-100 dark:border-gray-800">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-900 shadow-md bg-[#F77B0F] flex items-center justify-center text-2xl font-black text-white overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (data.firstName?.[0] ?? "") + (data.lastName?.[0] ?? "")
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F77B0F] text-white flex items-center justify-center shadow-lg hover:bg-[#e06a0d] transition-colors border-2 border-white dark:border-gray-900"
                title="Change photo"
              >
                {avatarUploading ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16 7l-4-4-4 4M12 3v13" />
                  </svg>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
              />
            </div>

            {/* Name / title / company */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{data.firstName} {data.lastName}</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F77B0F]/10 border border-[#F77B0F]/30 text-[#F77B0F] text-xs font-bold">
                  Recruiter
                </span>
              </div>
              {(recruiterRelation?.title || specialization) && (
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  {recruiterRelation?.title || specialization}
                  {company?.name && <span className="text-gray-400 dark:text-gray-500"> · {company.name}</span>}
                </p>
              )}
              {!recruiterRelation?.title && !specialization && company?.name && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{company.name}</p>
              )}
              {location && (
                <p className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {location}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  onClick={toggleHiring}
                  disabled={hiringSaving}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                    isHiring
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHiring ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="text-xs font-semibold">{isHiring ? "Actively Hiring · click to pause" : "Not Hiring · click to activate"}</span>
                </button>
                <button
                  onClick={() => { populateEditFields(data); setEditModalOpen(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F77B0F] text-white hover:bg-[#e06a0d] transition-colors"
                >
                  Edit Profile
                </button>
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 py-4">
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{totalJobs}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Jobs Posted</p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{totalApplications}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Applications Received</p>
            </div>
            {company?.name && (
              <>
                <div className="w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-2">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-6 h-6 rounded object-contain bg-gray-100 dark:bg-gray-700 p-0.5" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-[#F77B0F]/20 flex items-center justify-center text-[#F77B0F] text-xs font-bold">
                      {company.name[0]}
                    </div>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">Recruiter at <span className="text-gray-900 dark:text-white font-semibold">{company.name}</span></span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* About */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">About</h3>
          {bio ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{bio}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No bio yet.{" "}
              <button onClick={() => { populateEditFields(data); setEditModalOpen(true); }} className="text-[#F77B0F] hover:underline not-italic">
                Add a bio
              </button>
            </p>
          )}
        </div>

        {/* Company */}
        {company && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Company</h3>
            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-14 h-14 rounded-xl object-contain border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl font-black shrink-0">
                  {company.name[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{company.name}</p>
                <p className="text-xs text-[#F77B0F] font-medium mt-0.5">
                  Recruiter at {company.name}
                </p>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-[#F77B0F] mt-1 inline-flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Contact</h3>
          <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {data.email}
            </div>
            {(data as any).phone && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {(data as any).phone}
              </div>
            )}
            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#F77B0F] hover:underline"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn Profile
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Edit Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Avatar upload inside modal */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F77B0F] flex items-center justify-center text-lg font-black text-white overflow-hidden shrink-0">
                  {editAvatar ? (
                    <img src={editAvatar} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    (editFirstName[0] ?? "") + (editLastName[0] ?? "")
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-xs font-semibold text-[#F77B0F] hover:underline"
                  >
                    {avatarUploading ? "Uploading..." : "Change photo"}
                  </button>
                  {editAvatar && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{editAvatar.split("/").pop()}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">
                  <input className={inputCls} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </Field>
                <Field label="Last Name">
                  <input className={inputCls} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </Field>
              </div>
              <Field label="Phone">
                <input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+254 700 000 000" />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Nairobi, Kenya" />
              </Field>
              <Field label="Bio">
                <textarea
                  className={`${inputCls} resize-none min-h-[90px]`}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell candidates about your recruiting focus..."
                />
              </Field>
              <Field label="LinkedIn URL">
                <input className={inputCls} value={editLinkedinUrl} onChange={(e) => setEditLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </Field>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#e06a0d] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job-seeker profile (original)
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();

  // Render role-aware gate while auth resolves
  if (authLoading) return <Spinner />;

  if (user?.role === "TRAINER") return <RecruiterProfilePage />;

  return <JobSeekerProfilePage />;
}

function JobSeekerProfilePage() {
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
  const [editAvatar, setEditAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  // Re-fetch when returning to this page (back button / router cache restore)
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) loadProfile(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function normalizeProfile(raw: any): UteoProfile {
    const jsp = raw.jobSeekerProfile ?? {};
    return {
      ...raw,
      // flatten jobSeekerProfile fields to top level
      headline: jsp.headline ?? raw.headline,
      bio: jsp.bio ?? raw.bio,
      location: jsp.location ?? raw.location,
      phone: raw.phone ?? jsp.phone,
      resumeUrl: jsp.resumeUrl ?? raw.resumeUrl,
      portfolioUrl: jsp.portfolioUrl ?? raw.portfolioUrl,
      linkedinUrl: jsp.linkedinUrl ?? raw.linkedinUrl,
      githubUrl: jsp.githubUrl ?? raw.githubUrl,
      openToWork: jsp.openToWork ?? raw.openToWork ?? false,
      // remap array fields
      experience: raw.workExperience ?? raw.experience ?? [],
      education: raw.education ?? [],
      skills: raw.userSkills ?? raw.skills ?? [],
      // remap avatar
      avatarUrl: raw.avatar ?? raw.avatarUrl,
    };
  }

  async function loadProfile() {
    try {
      const raw = await apiGet<any>("/profile/me");
      const data = normalizeProfile(raw);
      setProfile(data);
      setEditFirstName(data.firstName || "");
      setEditLastName(data.lastName || "");
      setEditPhone(data.phone || "");
      setEditHeadline(data.headline || "");
      setEditLocation(data.location || "");
      setEditBio(data.bio || "");
      setEditResumeUrl(data.resumeUrl || "");
      setEditPortfolioUrl(data.portfolioUrl || "");
      setEditLinkedinUrl(data.linkedinUrl || "");
      setEditAvatar(data.avatarUrl || "");
    } catch {
      addToast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarFile(file: File) {
    if (!file) return;
    setAvatarUploading(true);
    try {
      // Backend-proxied upload: browser → /media/upload → MinIO. Avoids the
      // browser-to-S3 CORS round-trip that was failing on the presigned PUT.
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await api.post<any>("/media/upload?folder=avatars", fd);
      const body = unwrap<any>(upRes.data) as { url?: string; publicUrl?: string };
      const publicUrl = body.url ?? body.publicUrl ?? "";
      if (!publicUrl) throw new Error("Upload returned no URL");
      await apiPatch("/profile/me", { avatar: publicUrl });
      const fresh = normalizeProfile(await apiGet<any>("/profile/me"));
      setProfile(fresh);
      setEditAvatar(fresh.avatarUrl || publicUrl);
      if (updateUser) updateUser(fresh as any);
      addToast("success", "Profile photo updated!");
    } catch {
      addToast("error", "Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await apiPatch("/profile/me", {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        headline: editHeadline,
        location: editLocation,
        bio: editBio,
        resumeUrl: editResumeUrl,
        portfolioUrl: editPortfolioUrl,
        linkedinUrl: editLinkedinUrl,
        avatar: editAvatar || undefined,
      });
      const fresh = normalizeProfile(await apiGet<any>("/profile/me"));
      setProfile(fresh);
      if (updateUser) updateUser(fresh as any);
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
    const next = !profile.openToWork;
    setProfile((p) => p ? { ...p, openToWork: next } : p); // optimistic
    try {
      await apiPatch("/profile/me", { openToWork: next });
      addToast("success", next ? "Now visible to recruiters" : "Hidden from recruiters");
      router.refresh(); // bust router cache so settings re-syncs on next visit
    } catch {
      setProfile((p) => p ? { ...p, openToWork: !next } : p); // rollback
      addToast("error", "Failed to update status");
    }
  }

  async function addSkill(skillId: string, skillName: string) {
    setAddingSkill(true);
    try {
      const created = await apiPost<{ id: string; skillId: string; skill: { id: string; name: string }; proficiency: string }>("/profile/me/skills", { skillId, proficiency: "INTERMEDIATE" });
      setProfile((p) => p ? { ...p, skills: [...(p.skills || []), created] } : p);
      setSkillSearch("");
      addToast("success", "Skill added");
    } catch {
      addToast("error", "Failed to add skill");
    } finally {
      setAddingSkill(false);
    }
  }

  async function addCustomSkill(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAddingSkill(true);
    try {
      const created = await apiPost<{ id: string; skillId: string; skill: { id: string; name: string }; proficiency: string }>("/profile/me/skills", { skillName: trimmed, proficiency: "INTERMEDIATE" });
      setProfile((p) => p ? { ...p, skills: [...(p.skills || []), created] } : p);
      setSkillSearch("");
      addToast("success", `"${trimmed}" added`);
    } catch {
      addToast("error", "Failed to add skill");
    } finally {
      setAddingSkill(false);
    }
  }

  async function removeSkill(id: string) {
    try {
      await apiDelete(`/profile/me/skills/${id}`);
      setProfile((p) => p ? { ...p, skills: (p.skills || []).filter((s) => (s.skillId || s.id) !== id) } : p);
      addToast("success", "Skill removed");
    } catch {
      addToast("error", "Failed to remove skill");
    }
  }

  async function saveExperience() {
    setSaving(true);
    try {
      // Strip empty strings so @IsOptional() @IsDateString() doesn't get "" and fail
      const payload = Object.fromEntries(
        Object.entries(expForm).filter(([, v]) => v !== "")
      );
      if (expEditing) {
        const updated = await apiPatch<ExperienceItem>(`/profile/me/experience/${expEditing.id}`, payload);
        setProfile((p) => p ? { ...p, experience: (p.experience || []).map((e) => e.id === expEditing.id ? updated : e) } : p);
      } else {
        const created = await apiPost<ExperienceItem>("/profile/me/experience", payload);
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
      const payload = Object.fromEntries(
        Object.entries(eduForm).filter(([, v]) => v !== "")
      );
      if (eduEditing) {
        const updated = await apiPatch<EducationItem>(`/profile/me/education/${eduEditing.id}`, payload);
        setProfile((p) => p ? { ...p, education: (p.education || []).map((e) => e.id === eduEditing.id ? updated : e) } : p);
      } else {
        const created = await apiPost<EducationItem>("/profile/me/education", payload);
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

  const avatarSrc = (profile as any).avatar || profile.avatarUrl;
  const initials = ((profile.firstName?.[0] ?? "") + (profile.lastName?.[0] ?? "")).toUpperCase();

  function fmtDate(raw: string | undefined) {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function toInputDate(raw: string | undefined) {
    if (!raw) return "";
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d]">
      {/* Hero — clean white card, no dark gradient */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 pb-5 border-b border-gray-100 dark:border-gray-800">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-[#F77B0F] flex items-center justify-center text-3xl font-black text-white overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-md">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F77B0F] text-white flex items-center justify-center shadow-lg hover:bg-[#e06a0d] transition-colors border-2 border-white dark:border-gray-900"
                title="Change photo"
              >
                {avatarUploading ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16 7l-4-4-4 4M12 3v13" />
                  </svg>
                )}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }} />
            </div>

            {/* Name / headline / actions */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                  {profile.firstName} {profile.lastName}
                </h1>
              </div>
              {profile.headline && <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{profile.headline}</p>}
              {profile.location && (
                <p className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {profile.location}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Open to Work toggle — same style as settings, no ambiguity */}
                <button
                  onClick={toggleOpenToWork}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${profile.openToWork ? "bg-[#F77B0F]" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${profile.openToWork ? "left-[18px]" : "left-0.5"}`} />
                  </div>
                  <span className={`text-xs font-semibold ${profile.openToWork ? "text-[#F77B0F]" : "text-gray-500 dark:text-gray-400"}`}>
                    {profile.openToWork ? "Open to Work" : "Not open to work"}
                  </span>
                </button>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F77B0F] text-white hover:bg-[#e06a0d] transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto">
            {["overview", "experience", "education", "skills"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "border-[#F77B0F] text-[#F77B0F]"
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                          {fmtDate(exp.startDate)} — {exp.isCurrent ? "Present" : fmtDate(exp.endDate)}
                        </p>
                        {exp.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{exp.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setExpEditing(exp); setExpForm({ company: exp.company, title: exp.title, startDate: toInputDate(exp.startDate), endDate: toInputDate(exp.endDate), isCurrent: !!exp.isCurrent, description: exp.description || "" }); setExpModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#F77B0F] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                      <button onClick={() => removeSkill(s.skillId || s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
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
                onKeyDown={(e) => { if (e.key === "Enter" && skillSearch.trim()) { e.preventDefault(); addCustomSkill(skillSearch); } }}
                placeholder="Type any skill and press Enter, or pick from list..."
              />
              {skillSearch && (
                <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {filteredSkillsForAdd.slice(0, 20).map((s) => (
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
                  ))}
                  {/* Always show "Add as custom skill" at the bottom */}
                  <button
                    type="button"
                    disabled={addingSkill}
                    onClick={() => addCustomSkill(skillSearch)}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#F77B0F] hover:bg-orange-50 dark:hover:bg-orange-900/10 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Add "{skillSearch}" as a skill
                  </button>
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
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#F77B0F] flex items-center justify-center text-xl font-black text-white overflow-hidden shrink-0">
                  {editAvatar ? (
                    <img src={editAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (editFirstName?.[0] ?? "") + (editLastName?.[0] ?? "")
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
                  >
                    {avatarUploading ? (
                      <><span className="w-3 h-3 border-2 border-gray-400/40 border-t-gray-600 rounded-full animate-spin" />Uploading...</>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16 7l-4-4-4 4M12 3v13" /></svg>
                        Change Photo
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">JPG, PNG or WebP · Max 5 MB</p>
                </div>
              </div>
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
                <Field label="Start Date"><input type="date" className={inputCls} value={expForm.startDate} onChange={(e) => setExpForm((p) => ({ ...p, startDate: e.target.value }))} /></Field>
                <Field label="End Date"><input type="date" className={inputCls} value={expForm.endDate} disabled={expForm.isCurrent} onChange={(e) => setExpForm((p) => ({ ...p, endDate: e.target.value }))} /></Field>
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
