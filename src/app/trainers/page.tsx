"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TrainerCard from "@/components/TrainerCard";
import SearchBar from "@/components/ui/SearchBar";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Trainer, Category, TrainerSearchParams, TrainerType, TrainerTier } from "@/lib/types";
import { trainerService } from "@/lib/services/trainers";
import { useAuth } from "@/lib/auth";

function TrainerHero({ isTrainer }: { isTrainer: boolean }) {
  return (
    <section className="relative h-[40vh] min-h-[320px] flex items-end pb-12 overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?auto=format&fit=crop&w=4096&q=100" alt="Training session" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,15,30,0.90) 0%, rgba(10,15,30,0.50) 50%, rgba(10,15,30,0.20) 100%)' }} />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
        <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">SkillSasa Directory</p>
        <h1 className="text-4xl lg:text-6xl font-black text-white">
          {isTrainer ? "Trainer Directory" : "Find Your Trainer"}
        </h1>
        {isTrainer ? (
          <p className="mt-4 text-lg text-white/80 max-w-xl">See how your firm appears to clients. Browse and connect with fellow professionals across Kenya.</p>
        ) : (
          <p className="mt-4 text-lg text-white/80 max-w-xl">Browse verified professional trainers across all 47 counties in Kenya. Filter by skill, location, price, and rating.</p>
        )}
      </div>
    </section>
  );
}

const TIER_OPTIONS: { value: TrainerTier | ''; label: string; color: string; activeColor: string }[] = [
  { value: '', label: 'All Tiers', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', activeColor: 'bg-[#192C67] text-white' },
  { value: 'CERTIFIED', label: 'Certified', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400', activeColor: 'bg-emerald-600 text-white' },
  { value: 'EXPERIENCED', label: 'Experienced', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400', activeColor: 'bg-blue-600 text-white' },
  { value: 'ENTRY_LEVEL', label: 'Entry Level', color: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400', activeColor: 'bg-gray-600 text-white' },
];

function TrainersPageInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // New classification filters
  const [selectedType, setSelectedType] = useState<TrainerType | ''>('');
  const [selectedTier, setSelectedTier] = useState<TrainerTier | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showOrgsOnly, setShowOrgsOnly] = useState(false);

  const [filters, setFilters] = useState<TrainerSearchParams>({
    keyword: searchParams.get("keyword") || "",
    category: searchParams.get("category") || "",
    location: "",
    minRating: undefined,
    sessionType: "",
    isVerified: undefined,
    sortBy: "rating",
    page: 1,
    limit: 12,
  });

  const isTrainerRole = user?.role === "TRAINER";
  const isClientRole = user?.role === "CLIENT";

  // Find own trainer profile ID for trainers viewing the directory
  const ownProfileId = isTrainerRole ? (user as any)?.trainerProfileId || (user as any)?.trainerProfile?.id || null : null;

  // Load categories based on selected trainer type
  useEffect(() => {
    trainerService.getCategories(selectedType || undefined).then((cv) => {
      setCategories(Array.isArray(cv) ? cv : (cv as any)?.items ?? (cv as any)?.data ?? []);
    }).catch(() => setCategories([]));
  }, [selectedType]);

  // Load counties once
  useEffect(() => {
    trainerService.getCounties().then((ctv) => {
      setCounties(Array.isArray(ctv) ? ctv : (ctv as any)?.items ?? (ctv as any)?.data ?? []);
    }).catch(() => {});
  }, []);

  // Reset category when type changes
  useEffect(() => {
    setSelectedCategoryId('');
  }, [selectedType]);

  const fetchTrainers = useCallback(async () => { // eslint-disable-line react-hooks/exhaustive-deps
    setLoading(true);
    try {
      const clean: Record<string, unknown> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) clean[k] = v; });
      // Add classification filters
      if (selectedType && !showOrgsOnly) clean.trainerType = selectedType;
      if (selectedTier) clean.tier = selectedTier;
      if (selectedCategoryId) clean.categoryId = selectedCategoryId;
      if (showOrgsOnly) clean.isOrganization = true;
      const data = await trainerService.search(clean as TrainerSearchParams);
      setTrainers(data.items); setTotal(data.total); setTotalPages(data.totalPages);
    } catch { setTrainers([]); } finally { setLoading(false); }
  }, [filters, selectedType, selectedTier, selectedCategoryId, showOrgsOnly]);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const uf = (key: keyof TrainerSearchParams, value: unknown) => {
    setFilters((p) => ({ ...p, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  /** Check if a trainer profile belongs to the current user */
  const isOwnProfile = (trainer: Trainer) => {
    if (!user || !isTrainerRole) return false;
    return trainer.userId === user.id || trainer.id === ownProfileId;
  };

  /** Determine what CTA button text to show per card */
  const getCardCta = (trainer: Trainer): { label: string; href: string; variant: "primary" | "secondary" | "outline" } => {
    if (isOwnProfile(trainer)) {
      return { label: "Edit Profile", href: "/profile", variant: "secondary" };
    }
    if (isTrainerRole) {
      return { label: "View Profile", href: `/trainers/${trainer.id}`, variant: "outline" };
    }
    // CLIENT or unauthenticated — show profile first, book from there
    return { label: "View Profile", href: `/trainers/${trainer.id}`, variant: "primary" };
  };

  const clearAll = () => {
    setFilters({ page: 1, limit: 12, sortBy: "rating" });
    setSelectedType('');
    setSelectedTier('');
    setSelectedCategoryId('');
    setShowOrgsOnly(false);
  };

  return (
    <>
    <TrainerHero isTrainer={isTrainerRole} />
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">

      {/* Trainer-role top bar: Preview Your Profile */}
      {isTrainerRole && ownProfileId && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">See how clients view your profile</p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">Preview your public trainer profile and make sure it looks great.</p>
          </div>
          <Link
            href={`/trainers/${ownProfileId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Your Profile
          </Link>
        </div>
      )}

      {/* Trainer Type Toggle */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setSelectedType(''); setShowOrgsOnly(false); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
              selectedType === '' && !showOrgsOnly ? 'border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7] bg-[#192C67]/5' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            All Trainers
          </button>
          <button
            onClick={() => { setSelectedType('PROFESSIONAL'); setShowOrgsOnly(false); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
              selectedType === 'PROFESSIONAL' && !showOrgsOnly ? 'border-[#192C67] dark:border-[#5b8bc7] text-[#192C67] dark:text-[#5b8bc7] bg-[#192C67]/5' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Professional Trainers
          </button>
          <button
            onClick={() => { setSelectedType('VOCATIONAL'); setShowOrgsOnly(false); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
              selectedType === 'VOCATIONAL' && !showOrgsOnly ? 'border-[#F77B0F] text-[#F77B0F] bg-[#F77B0F]/5' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Vocational Trainers
          </button>
          <button
            onClick={() => { setShowOrgsOnly(true); setSelectedType(''); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
              showOrgsOnly ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Organizations
          </button>
        </div>
      </div>

      {/* Tier Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.value || 'all'}
            onClick={() => setSelectedTier(opt.value as TrainerTier | '')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedTier === opt.value ? opt.activeColor : opt.color
            }`}
          >
            {opt.value === 'CERTIFIED' && <span className="mr-1">&#10003;</span>}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category Dropdown (dynamic based on type) */}
      {categories.length > 0 && (
        <div className="mb-6">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchBar placeholder="Search by name, skill, or keyword..." onSearch={(q) => uf("keyword", q)} defaultValue={filters.keyword} className="flex-1" />
        <div className="flex gap-2">
          <select value={filters.sortBy || "rating"} onChange={(e) => uf("sortBy", e.target.value as any)} className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="rating">Top Rated</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="reviews">Most Reviews</option><option value="followers">Most Followed</option><option value="newest">Newest</option>
          </select>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>Filters
          </button>
        </div>
      </div>
      <div className="flex gap-8">
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block w-full lg:w-72 flex-shrink-0`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label><select value={filters.category || ""} onChange={(e) => uf("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">County</label><select value={filters.location || ""} onChange={(e) => uf("location", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"><option value="">All</option>{counties.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Rating</label><div className="flex gap-1">{[1,2,3,4,5].map((r) => <button key={r} onClick={() => uf("minRating", filters.minRating === r ? undefined : r)} className={`w-10 h-10 rounded-lg text-sm font-medium flex items-center justify-center ${filters.minRating && filters.minRating <= r ? "bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>{r}+</button>)}</div></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Type</label><div className="flex flex-wrap gap-2">{["Virtual","Physical","Hybrid"].map((t) => <button key={t} onClick={() => uf("sessionType", filters.sessionType === t.toUpperCase() ? "" : t.toUpperCase())} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filters.sessionType === t.toUpperCase() ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>{t}</button>)}</div></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Verified Only</label><button onClick={() => uf("isVerified", filters.isVerified ? undefined : true)} className={`w-11 h-6 rounded-full ${filters.isVerified ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"}`}><div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${filters.isVerified ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            <button onClick={clearAll} className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Clear All</button>
          </div>
        </aside>
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
          ) : trainers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trainers.map((t) => {
                  const own = isOwnProfile(t);
                  const cta = getCardCta(t);
                  return (
                    <div key={t.id} className="relative">
                      {/* YOUR FIRM badge for trainer viewing own card */}
                      {own && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          Your Firm
                        </div>
                      )}
                      {/* Organization badge for any org trainer */}
                      {!own && (t as any).isOrganization && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          Org · {(t as any).teamSize} members
                        </div>
                      )}
                      <TrainerCard trainer={t} ctaLabel={cta.label} ctaHref={cta.href} ctaVariant={cta.variant} />
                    </div>
                  );
                })}
              </div>
              <Pagination currentPage={filters.page || 1} totalPages={totalPages} onPageChange={(p) => uf("page", p)} />
            </>
          ) : (
            <EmptyState title="No trainers found" description="Try adjusting your filters." action={{ label: "Clear Filters", onClick: clearAll }} />
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default function TrainersPage() {
  return <Suspense><TrainersPageInner /></Suspense>;
}
