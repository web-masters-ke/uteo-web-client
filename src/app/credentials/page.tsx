"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import api, { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Config ──────────────────────────────────────────────────────────────────

const CRED_TYPES = [
  "DEGREE","DIPLOMA","CERTIFICATE","LICENSE",
  "PROFESSIONAL_MEMBERSHIP","TRADE_CERTIFICATE","APPRENTICESHIP","PORTFOLIO",
];

const CRED_LABELS: Record<string, string> = {
  DEGREE: "Degree",
  DIPLOMA: "Diploma",
  CERTIFICATE: "Certificate",
  LICENSE: "License",
  PROFESSIONAL_MEMBERSHIP: "Professional Membership",
  TRADE_CERTIFICATE: "Trade Certificate",
  APPRENTICESHIP: "Apprenticeship",
  PORTFOLIO: "Portfolio",
};

const CRED_STYLE: Record<string, { accent: string; bg: string; text: string; icon: string }> = {
  DEGREE:                { accent: "bg-violet-500",  bg: "bg-violet-50 dark:bg-violet-900/20",  text: "text-violet-700 dark:text-violet-300",  icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
  DIPLOMA:               { accent: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20",      text: "text-blue-700 dark:text-blue-300",      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  CERTIFICATE:           { accent: "bg-teal-500",    bg: "bg-teal-50 dark:bg-teal-900/20",      text: "text-teal-700 dark:text-teal-300",      icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
  LICENSE:               { accent: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20",text: "text-emerald-700 dark:text-emerald-300", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" },
  PROFESSIONAL_MEMBERSHIP:{ accent: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20",  text: "text-indigo-700 dark:text-indigo-300",  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  TRADE_CERTIFICATE:     { accent: "bg-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20",  text: "text-orange-700 dark:text-orange-300",  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  APPRENTICESHIP:        { accent: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-300",    icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" },
  PORTFOLIO:             { accent: "bg-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-800",        text: "text-zinc-700 dark:text-zinc-300",      icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
};

const TIER_CFG: Record<string, { label: string; bg: string; text: string }> = {
  CERTIFIED:   { label: "Certified",   bg: "bg-emerald-500/20 border border-emerald-500/40", text: "text-emerald-300" },
  EXPERIENCED: { label: "Experienced", bg: "bg-blue-500/20 border border-blue-500/40",       text: "text-blue-300" },
  ENTRY_LEVEL: { label: "Entry Level", bg: "bg-zinc-500/20 border border-zinc-500/40",       text: "text-zinc-300" },
};

const ic = "w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-[#192C67] outline-none placeholder:text-zinc-400";

type Tab = "all" | "pending" | "approved" | "rejected";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CredentialsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [editing, setEditing] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [form, setForm] = useState({
    name: "", credentialType: "CERTIFICATE", issuer: "",
    yearObtained: new Date().getFullYear(), documentUrl: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<any>("/verification/my/credentials");
      setData(d);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/media/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000, maxContentLength: Infinity, maxBodyLength: Infinity,
    });
    return (res.data as any)?.data?.url || (res.data as any)?.url || "";
  }

  async function uploadDocInBackground(certId: string, profileId: string, file: File) {
    try {
      const url = await uploadFile(file);
      await apiPatch(`/trainers/${profileId}/certifications/${certId}`, { documentUrl: url });
      addToast("success", "Document uploaded and attached");
      fetchData();
    } catch {
      addToast("error", "Document upload failed — re-upload from the credential card");
    }
  }

  async function handleSave() {
    const targetProfileId = selectedMemberId || data?.profile?.id;
    if (!form.name || !targetProfileId) { addToast("error", "Credential name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        let docUrl = form.documentUrl;
        if (docFile) { setUploading(true); docUrl = await uploadFile(docFile); setUploading(false); }
        await apiPost(`/verification/credential/${editing.id}`, { documentUrl: docUrl });
        addToast("success", "Resubmitted for verification");
      } else {
        const payload = {
          name: form.name, credentialType: form.credentialType,
          issuer: form.issuer || undefined,
          yearObtained: Number(form.yearObtained) || undefined,
        };
        const cert = await apiPost<any>(`/trainers/${targetProfileId}/certifications`, payload);
        const member = data?.teamMembers?.find((m: any) => m.profileId === targetProfileId);
        const forName = member && !member.isMe ? ` for ${member.firstName} ${member.lastName}` : "";
        addToast("success", `Credential added${forName}${docFile ? " — uploading document in background…" : ""}`);
        if (docFile && cert?.id) uploadDocInBackground(cert.id, targetProfileId, docFile);
      }
      setShowAdd(false); setEditing(null);
      setForm({ name: "", credentialType: "CERTIFICATE", issuer: "", yearObtained: new Date().getFullYear(), documentUrl: "" });
      setDocFile(null);
      fetchData();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to save credential");
    } finally {
      setSaving(false); setUploading(false);
    }
  }

  async function handleSubmitForVerification(cert: any) {
    try {
      await apiPost(`/verification/credential/${cert.id}`, { documentUrl: cert.documentUrl });
      addToast("success", "Submitted for review");
      fetchData();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to submit");
    }
  }

  async function handleDelete() {
    if (!deleting || !data?.profile?.id) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/trainers/${data.profile.id}/certifications/${deleting.id}`);
      addToast("success", "Credential deleted");
      setDeleting(null); fetchData();
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  }

  function openEdit(cert: any) {
    setEditing(cert);
    setForm({ name: cert.name || "", credentialType: cert.credentialType || "CERTIFICATE", issuer: cert.issuer || "", yearObtained: cert.yearObtained || new Date().getFullYear(), documentUrl: cert.documentUrl || "" });
    setDocFile(null);
    setSelectedMemberId(data?.profile?.id || "");
    setShowAdd(true);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", credentialType: "CERTIFICATE", issuer: "", yearObtained: new Date().getFullYear(), documentUrl: "" });
    setDocFile(null);
    setSelectedMemberId(data?.profile?.id || "");
    setShowAdd(true);
  }

  const certs: any[] = data?.certifications || [];
  const stats = data?.stats || { totalCertifications: 0, pendingCredentials: 0, approvedCredentials: 0, rejectedCredentials: 0, byType: {} };
  const profile = data?.profile;

  const filteredCerts = useMemo(() => {
    let list = certs;
    if (tab === "pending")  list = list.filter((c) => !c.verified && !c.rejectedReason);
    if (tab === "approved") list = list.filter((c) => c.verified);
    if (tab === "rejected") list = list.filter((c) => !!c.rejectedReason);
    if (typeFilter) list = list.filter((c) => c.credentialType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(q) || c.issuer?.toLowerCase().includes(q) || c.credentialType?.toLowerCase().includes(q));
    }
    return list;
  }, [certs, tab, typeFilter, search]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all",      label: "All",           count: certs.length },
    { key: "pending",  label: "Pending",        count: stats.pendingCredentials },
    { key: "approved", label: "Approved",       count: stats.approvedCredentials },
    { key: "rejected", label: "Rejected",       count: stats.rejectedCredentials },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#192C67] mb-6 px-6 py-8 sm:px-10">
        {/* subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(to right,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* orange glow blob */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[#F77B0F] opacity-10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">
              SkillSasa · Credentials
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">
              My Credentials
            </h1>
            <p className="mt-1.5 text-sm text-white/70 max-w-lg">
              Certifications, licences &amp; qualifications that build your professional credibility.
            </p>

            {/* Tier pill */}
            {profile?.tier && (
              <div className="mt-4 inline-flex items-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold", TIER_CFG[profile.tier]?.bg, TIER_CFG[profile.tier]?.text)}>
                  {TIER_CFG[profile.tier]?.label || profile.tier} tier
                </span>
                {stats.approvedCredentials > 0 && (
                  <span className="text-xs text-white/50">{stats.approvedCredentials} verified credential{stats.approvedCredentials !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
          </div>

          {/* Stats + CTA */}
          <div className="flex flex-col items-start sm:items-end gap-4">
            <div className="grid grid-cols-2 sm:flex gap-2">
              {[
                { v: stats.totalCertifications,  label: "Total",    color: "bg-white/10 text-white" },
                { v: stats.pendingCredentials,   label: "Pending",  color: "bg-[#F77B0F]/20 text-[#F77B0F]" },
                { v: stats.approvedCredentials,  label: "Approved", color: "bg-emerald-500/20 text-emerald-300" },
                { v: stats.rejectedCredentials,  label: "Rejected", color: "bg-red-500/20 text-red-300" },
              ].map((s) => (
                <div key={s.label} className={cn("flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[56px]", s.color)}>
                  <span className="text-2xl font-black leading-none">{s.v}</span>
                  <span className="text-[10px] font-medium mt-0.5 opacity-80">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F77B0F] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#F77B0F]/30 hover:bg-[#e06b00] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Credential
            </button>
          </div>
        </div>
      </div>

      {/* ── Type Filter Pills ── */}
      {Object.keys(stats.byType || {}).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(stats.byType).map(([type, count]: any) => {
            const s = CRED_STYLE[type];
            const active = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(active ? "" : type)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  active
                    ? cn(s?.bg, s?.text, "border-current ring-2 ring-offset-2 ring-[#192C67]")
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                )}
              >
                {CRED_LABELS[type] || type}
                <span className={cn(
                  "inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold",
                  active ? "bg-white/40" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}>{count}</span>
              </button>
            );
          })}
          {typeFilter && (
            <button
              onClick={() => setTypeFilter("")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Toolbar (tabs + search) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                tab === t.key
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full",
                  tab === t.key
                    ? "bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                )}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-[#192C67] outline-none"
          />
        </div>
      </div>

      {/* ── Credential List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 animate-pulse">
              <div className="w-1.5 shrink-0 bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex-1 p-5 bg-white dark:bg-zinc-900 space-y-2">
                <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#192C67]/10 dark:bg-[#192C67]/20">
            <svg className="h-8 w-8 text-[#192C67] dark:text-[#5b8bc7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {search || typeFilter || tab !== "all" ? "No matching credentials" : "No credentials yet"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            {search || typeFilter || tab !== "all"
              ? "Try adjusting your filters."
              : "Add your first credential to start building trust with clients."}
          </p>
          {!search && !typeFilter && tab === "all" && (
            <button
              onClick={openAdd}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#192C67] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2D5A8E] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add First Credential
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCerts.map((cert: any) => {
            const status = cert.verified ? "APPROVED" : cert.rejectedReason ? "REJECTED" : "PENDING";
            const style = CRED_STYLE[cert.credentialType] ?? CRED_STYLE.PORTFOLIO;

            return (
              <div
                key={cert.id}
                className="group flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-shadow hover:shadow-md dark:hover:shadow-black/20"
              >
                {/* Left accent strip */}
                <div className={cn("w-1.5 shrink-0", style.accent)} />

                {/* Card body */}
                <div className="flex-1 min-w-0 p-5">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", style.bg)}>
                      <svg className={cn("h-5 w-5", style.text)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
                      </svg>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: type + owner + status */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", style.bg, style.text)}>
                          {CRED_LABELS[cert.credentialType] || cert.credentialType}
                        </span>

                        {cert.owner && !cert.owner.isMe && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#192C67]/10 dark:bg-[#192C67]/20 px-2 py-0.5 text-[10px] font-semibold text-[#192C67] dark:text-[#5b8bc7]">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {cert.owner.firstName} {cert.owner.lastName}
                          </span>
                        )}

                        {/* Status badge */}
                        {status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Verified
                          </span>
                        )}
                        {status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            Rejected
                          </span>
                        )}
                        {status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <svg className="w-2.5 h-2.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            Pending
                          </span>
                        )}

                        {cert.verifiedAt && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {formatDate(cert.verifiedAt)}
                          </span>
                        )}
                      </div>

                      {/* Credential name */}
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                        {cert.name}
                      </h3>

                      {/* Meta row */}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {cert.issuer && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {cert.issuer}
                          </span>
                        )}
                        {cert.yearObtained && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {cert.yearObtained}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Expires {formatDate(cert.expiryDate)}
                          </span>
                        )}
                      </div>

                      {/* Rejection note */}
                      {cert.rejectedReason && (
                        <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-0.5">Rejection reason</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{cert.rejectedReason}</p>
                        </div>
                      )}

                      {/* Verification note */}
                      {cert.verified && cert.verificationNote && (
                        <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">Note</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">{cert.verificationNote}</p>
                        </div>
                      )}

                      {/* Action strip */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {cert.documentUrl && (
                          <a
                            href={cert.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View Doc
                          </a>
                        )}
                        <button
                          onClick={() => setDetail(cert)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Details
                        </button>
                        {status === "REJECTED" && (
                          <button
                            onClick={() => openEdit(cert)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Resubmit
                          </button>
                        )}
                        {status === "PENDING" && !cert.documentUrl && (
                          <button
                            onClick={() => openEdit(cert)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            Upload Doc
                          </button>
                        )}
                        {status === "PENDING" && cert.documentUrl && (
                          <button
                            onClick={() => handleSubmitForVerification(cert)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#192C67] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#2D5A8E] transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Submit for Review
                          </button>
                        )}
                        <button
                          onClick={() => setDeleting(cert)}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Verification Requests ── */}
      {data?.requests && data.requests.length > 0 && (
        <section className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
            Verification Requests
          </h3>
          <div className="space-y-2">
            {data.requests.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{r.documentType}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Submitted {formatDate(r.createdAt)}</p>
                  {r.reviewNote && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{r.reviewNote}</p>}
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                  r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  r.status === "REJECTED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>{r.status}</span>
                {r.documentUrl && (
                  <a href={r.documentUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-[#192C67] dark:text-[#5b8bc7] hover:underline">
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Resubmit Credential" : "Add Credential"} size="lg">
        <div className="space-y-5">
          {editing && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>{editing.name}</strong> was rejected. Upload a new document to resubmit for review.
              </p>
            </div>
          )}

          {/* Team member picker */}
          {!editing && data?.isOrgOwner && data?.teamMembers?.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Add for</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {data.teamMembers.map((m: any) => (
                  <button
                    key={m.profileId}
                    type="button"
                    onClick={() => setSelectedMemberId(m.profileId)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                      selectedMemberId === m.profileId
                        ? "border-[#192C67] bg-[#192C67]/5 dark:border-[#5b8bc7] dark:bg-[#192C67]/10"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      selectedMemberId === m.profileId
                        ? "bg-[#192C67] text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    )}>
                      {(m.firstName?.[0] || "").toUpperCase()}{(m.lastName?.[0] || "").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {m.firstName} {m.lastName}
                        {m.isMe && <span className="ml-1.5 text-[10px] font-bold text-[#192C67] dark:text-[#5b8bc7]">(you)</span>}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{m.role}{m.tier ? ` · ${m.tier}` : ""}</p>
                    </div>
                    {selectedMemberId === m.profileId && (
                      <svg className="h-4 w-4 shrink-0 text-[#192C67] dark:text-[#5b8bc7]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Credential Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Credential Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. PMP Certification, NITA Welding Certificate"
              disabled={!!editing}
              className={ic}
            />
          </div>

          {/* Type + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type *</label>
              <select value={form.credentialType} onChange={(e) => setForm({ ...form, credentialType: e.target.value })} disabled={!!editing} className={ic}>
                {CRED_TYPES.map((t) => <option key={t} value={t}>{CRED_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Year Obtained</label>
              <input type="number" min={1950} max={new Date().getFullYear()} value={form.yearObtained} onChange={(e) => setForm({ ...form, yearObtained: Number(e.target.value) })} disabled={!!editing} className={ic} />
            </div>
          </div>

          {/* Issuer */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Issuer / Institution</label>
            <input type="text" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g. PMI, University of Nairobi, NITA Kenya" disabled={!!editing} className={ic} />
          </div>

          {/* Document upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Supporting Document</label>
            {form.documentUrl && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Current document attached
              </div>
            )}
            <label className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors",
              uploading ? "opacity-50 cursor-not-allowed" : "border-zinc-300 dark:border-zinc-600 hover:border-[#192C67] hover:bg-[#192C67]/5"
            )}>
              {uploading ? (
                <svg className="w-5 h-5 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              )}
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {uploading ? "Uploading…" : docFile ? docFile.name : "Click to upload PDF, PNG or JPG"}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {docFile ? `${(docFile.size / 1024).toFixed(1)} KB` : "Reviewed within 48 hours"}
                </p>
              </div>
              <input type="file" accept=".pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocFile(f); }} disabled={uploading} className="hidden" />
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
            <button onClick={() => { setShowAdd(false); setEditing(null); }} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || uploading || !form.name}
              className="rounded-lg bg-[#192C67] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2D5A8E] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : uploading ? "Uploading…" : editing ? "Resubmit" : "Add Credential"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.name || ""} size="md">
        {detail && (() => {
          const s = CRED_STYLE[detail.credentialType] ?? CRED_STYLE.PORTFOLIO;
          const status = detail.verified ? "APPROVED" : detail.rejectedReason ? "REJECTED" : "PENDING";
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", s.bg, s.text)}>
                  {CRED_LABELS[detail.credentialType] || detail.credentialType}
                </span>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
                  status === "APPROVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  status === "REJECTED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>{status}</span>
              </div>

              <dl className="space-y-2 text-sm">
                {detail.issuer && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Issuer</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100 text-right max-w-[60%]">{detail.issuer}</dd>
                  </div>
                )}
                {detail.yearObtained && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Year</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{detail.yearObtained}</dd>
                  </div>
                )}
                {detail.expiryDate && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Expires</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(detail.expiryDate)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Added</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{formatDateTime(detail.createdAt)}</dd>
                </div>
                {detail.verifiedAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400">Verified</dt>
                    <dd className="text-zinc-900 dark:text-zinc-100">{formatDateTime(detail.verifiedAt)}</dd>
                  </div>
                )}
              </dl>

              {detail.documentUrl && (
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Document</p>
                  {detail.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={detail.documentUrl} alt={detail.name} className="w-full max-h-[480px] object-contain rounded-xl border border-zinc-200 dark:border-zinc-700" />
                  ) : detail.documentUrl.match(/\.pdf$/i) ? (
                    <iframe src={detail.documentUrl} className="w-full h-[480px] rounded-xl border border-zinc-200 dark:border-zinc-700" title="Document" />
                  ) : (
                    <a href={detail.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#192C67] dark:text-[#5b8bc7] hover:underline break-all">{detail.documentUrl}</a>
                  )}
                </div>
              )}

              {detail.rejectedReason && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{detail.rejectedReason}</p>
                </div>
              )}
              {detail.verificationNote && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Verification Note</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{detail.verificationNote}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── DELETE CONFIRM ── */}
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Credential"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </>
  );
}
