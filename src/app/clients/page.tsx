"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingSkeleton";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearnerEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bookings: any[];
  totalSpent: number;
  lastBooking: string | null;
}

interface AddLearnerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

const EMPTY_FORM: AddLearnerForm = { firstName: "", lastName: "", email: "", phone: "", password: "" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(learner: LearnerEntry): boolean {
  if (!learner.lastBooking) return false;
  const ago = new Date();
  ago.setDate(ago.getDate() - 30);
  return new Date(learner.lastBooking) > ago;
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MyLearnersPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [learners, setLearners] = useState<LearnerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalClients: 0, activeCount: 0, newThisMonth: 0, totalRevenue: 0 });

  // Add learner modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddLearnerForm>(EMPTY_FORM);
  const [addBusy, setAddBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLearners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (filter !== "all") qs.set("filter", filter);
      const data = await apiGet<any>(`/bookings/my/clients?${qs.toString()}`);
      const items = data?.items || [];
      const mapped: LearnerEntry[] = items.map((c: any) => ({
        id: c.id,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        phone: c.phone || "",
        avatarUrl: c.avatar || "",
        bookings: [],
        totalSpent: Number(c.totalSpent || 0),
        lastBooking: c.lastSessionAt,
      }));
      setLearners(mapped);
      setTotalPages(data?.totalPages || 1);
      setTotal(data?.total || mapped.length);
      if (data?.stats) setStats(data.stats);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load learners");
      setLearners([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filter]);

  useEffect(() => { fetchLearners(); }, [fetchLearners]);

  const submitAddLearner = async () => {
    if (!addForm.firstName.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      addToast("error", "First name, email and password are required");
      return;
    }
    setAddBusy(true);
    try {
      await apiPost("/users/invite-learner", addForm);
      addToast("success", `Learner ${addForm.firstName} added successfully`);
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      setShowPassword(false);
      setSearch("");
      fetchLearners();
    } catch (e: any) {
      addToast("error", e?.response?.data?.error?.message || e?.response?.data?.message || "Failed to add learner");
    } finally {
      setAddBusy(false);
    }
  };

  const totalLearners = stats.totalClients;
  const activeLearners = stats.activeCount;
  const newThisMonth = stats.newThisMonth;
  const totalRevenue = stats.totalRevenue;

  return (
    <>
      {/* ── Hero with splash image ─────────────────────────────── */}
      <section className="relative h-[42vh] min-h-[340px] flex items-end pb-10 overflow-hidden -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-10">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2400&q=80"
            alt="Learners"
            className="h-full w-full object-cover object-top"
          />
          {/* Gradient overlay — not a solid fill, just readable text */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(10,15,30,0.88) 0%, rgba(10,15,30,0.45) 50%, rgba(10,15,30,0.15) 100%)'
          }} />
          {/* Subtle navy radial splash on left */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 0% 100%, rgba(25,44,103,0.35) 0%, transparent 55%)'
          }} />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50 mb-3">
                Trainer Dashboard
              </p>
              <h1 className="text-4xl lg:text-5xl font-black text-white leading-none tracking-tight">
                My Learners
              </h1>
              <p className="mt-3 text-base text-white/65 max-w-lg leading-relaxed">
                Track progress, manage bookings, and build lasting training relationships with your learners.
              </p>
            </div>

            {/* Add Learner button — in the hero */}
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white text-sm font-bold hover:bg-white/20 transition-all shrink-0"
            >
              <PlusIcon className="h-4 w-4" />
              Add Learner
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats — outline splash cards ─────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Learners",  value: totalLearners,              accent: "rgba(25,44,103,0.10)",  text: "text-[#192C67] dark:text-[#7ba5e0]" },
            { label: "Active (30d)",    value: activeLearners,             accent: "rgba(16,185,129,0.10)", text: "text-emerald-600 dark:text-emerald-400" },
            { label: "New This Month",  value: newThisMonth,               accent: "rgba(247,123,15,0.10)", text: "text-[#F77B0F]" },
            { label: "Total Revenue",   value: formatCurrency(totalRevenue), accent: "rgba(124,58,237,0.08)", text: "text-violet-600 dark:text-violet-400" },
          ].map(s => (
            <div key={s.label} className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4">
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full"
                style={{ background: `radial-gradient(circle, ${s.accent} 0%, transparent 70%)` }} />
              <p className={cn("text-2xl font-bold relative z-10", s.text)}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 relative z-10">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + filter bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all capitalize",
                filter === f
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#192C67]/30 dark:border-[#7ba5e0]/30 text-[#192C67] dark:text-[#7ba5e0] text-sm font-bold hover:border-[#192C67]/60 hover:bg-[#192C67]/5 dark:hover:bg-[#7ba5e0]/5 transition-all shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Learner
        </button>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {total} learner{total !== 1 ? "s" : ""}
          {filter !== "all" && <span className="ml-1 text-[#192C67] dark:text-[#7ba5e0] font-medium">· {filter}</span>}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={fetchLearners} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* ── Learner list ─────────────────────────────────────────── */}
      {loading ? (
        <ListSkeleton rows={6} />
      ) : learners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-16">
          <EmptyState
            title={total === 0 ? "No learners yet" : "No matching learners"}
            description={total === 0 ? "Learners will appear here once they book sessions with you." : "Try adjusting your search or filter."}
            action={search ? { label: "Clear search", onClick: () => { setSearch(""); setFilter("all"); } } : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {learners.map((learner) => {
            const active = isActive(learner);
            const isExpanded = expandedId === learner.id;

            return (
              <div
                key={learner.id}
                className={cn(
                  "group bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-200",
                  isExpanded
                    ? "border-[#192C67]/25 dark:border-[#7ba5e0]/25 shadow-md shadow-[#192C67]/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
                )}
              >
                {/* Hover splash */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl overflow-hidden"
                  style={{ background: 'radial-gradient(ellipse at 95% 50%, rgba(25,44,103,0.03) 0%, transparent 60%)' }} />

                <button
                  onClick={() => setExpandedId(isExpanded ? null : learner.id)}
                  className="relative z-10 w-full flex items-center gap-4 p-4 sm:p-5 text-left"
                >
                  {/* Avatar */}
                  <Avatar
                    src={learner.avatarUrl}
                    firstName={learner.firstName}
                    lastName={learner.lastName}
                    size="lg"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {learner.firstName} {learner.lastName}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-transparent",
                        active
                          ? "border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                          : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                      )}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {learner.email && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {learner.email}
                        </span>
                      )}
                      {learner.phone && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {learner.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right-side stats */}
                  <div className="hidden sm:flex items-center gap-8 text-right shrink-0">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{learner.bookings.length}</p>
                      <p className="text-[11px] text-gray-400">Sessions</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(learner.totalSpent)}</p>
                      <p className="text-[11px] text-gray-400">Spent</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{learner.lastBooking ? formatRelative(learner.lastBooking) : "—"}</p>
                      <p className="text-[11px] text-gray-400">Last session</p>
                    </div>
                  </div>

                  <ChevronDownIcon className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", isExpanded && "rotate-180")} />
                </button>

                {/* Mobile stats */}
                {!isExpanded && (
                  <div className="sm:hidden flex items-center gap-4 px-5 pb-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{learner.bookings.length} sessions</span>
                    <span>{formatCurrency(learner.totalSpent)}</span>
                    <span className="ml-auto">{learner.lastBooking ? formatRelative(learner.lastBooking) : "No sessions"}</span>
                  </div>
                )}

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {/* Splash in panel */}
                    <div className="relative overflow-hidden">
                      <div className="pointer-events-none absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(25,44,103,0.04) 0%, transparent 60%)' }} />

                      {/* Action buttons */}
                      <div className="relative z-10 flex flex-wrap gap-2 p-4 sm:p-5 pb-3">
                        <Link
                          href={`/messages?userId=${learner.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#192C67]/25 dark:border-[#7ba5e0]/25 text-[#192C67] dark:text-[#7ba5e0] hover:border-[#192C67]/50 hover:bg-[#192C67]/5 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Message
                        </Link>
                        <Link
                          href="/bookings"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Book Session
                        </Link>
                      </div>

                      {/* Summary mini-stats */}
                      <div className="relative z-10 grid grid-cols-3 gap-3 px-4 sm:px-5 pb-5">
                        {[
                          { label: "Total Sessions", value: learner.bookings.length },
                          { label: "Revenue",         value: formatCurrency(learner.totalSpent) },
                          { label: "Last Session",    value: learner.lastBooking ? formatDate(learner.lastBooking) : "N/A" },
                        ].map(s => (
                          <div key={s.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-3">
                            <p className="text-base font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 disabled:opacity-40 transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 px-2">
            Page {page} of {totalPages} · {total} learners
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Add Learner Modal ─────────────────────────────────────── */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setAddForm(EMPTY_FORM); setShowPassword(false); }} title="Add New Learner" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name *</label>
              <input
                type="text"
                value={addForm.firstName}
                onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Jane"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
              <input
                type="text"
                value={addForm.lastName}
                onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Muthoni"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={addForm.email}
              onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jane@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
            <input
              type="tel"
              value={addForm.phone}
              onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+254 700 000 000"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Temporary Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67]/30 focus:border-[#192C67]/50 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">The learner can change this after their first login.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setAddOpen(false); setAddForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submitAddLearner}
              disabled={addBusy || !addForm.firstName.trim() || !addForm.email.trim() || !addForm.password.trim()}
              className="px-5 py-2 text-sm font-bold rounded-xl bg-[#192C67] text-white hover:bg-[#1e3580] disabled:opacity-50 transition-all"
            >
              {addBusy ? "Adding…" : "Add Learner"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
