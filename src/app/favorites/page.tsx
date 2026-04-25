"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import Pagination from "@/components/ui/Pagination";
import { favoritesService } from "@/lib/services/favorites";
import { formatCurrency, getInitials } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating)
              ? "text-[#F77B0F]"
              : "text-zinc-200 dark:text-zinc-700"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await favoritesService.list({ page, limit: 12 });
      const items = Array.isArray(data)
        ? data
        : data?.items ?? data?.data ?? [];
      setFavorites(items);
      setTotalPages(data?.totalPages ?? 1);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (trainerId: string) => {
    setRemoving(trainerId);
    try {
      await favoritesService.remove(trainerId);
      setFavorites((prev) =>
        prev.filter((f) => {
          const fTrainerId = f.trainerId || f.trainer?.id || f.id;
          return fTrainerId !== trainerId;
        })
      );
    } catch {
      // silently fail
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          My Favorites
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Trainers you have saved for quick access.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const trainer = fav.trainer || fav;
              const user = trainer.user || trainer;
              const trainerId = fav.trainerId || trainer.id;
              const name = `${user.firstName || "Unknown"} ${user.lastName || "Trainer"}`;
              const avatar = user.avatarUrl || user.avatar;
              const initials = getInitials(user.firstName, user.lastName);
              const isRemoving = removing === trainerId;

              return (
                <div
                  key={fav.id || trainerId}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-3">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#192C67]/10 text-sm font-bold text-[#192C67] dark:bg-[#192C67]/20 dark:text-[#5b8bc7]">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/trainers/${trainerId}`}
                        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:text-[#192C67] dark:hover:text-[#5b8bc7] transition-colors truncate block"
                      >
                        {name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Stars rating={trainer.rating || 0} />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          ({trainer.totalReviews || 0})
                        </span>
                      </div>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(trainerId)}
                      disabled={isRemoving}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Remove from favorites"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                    </button>
                  </div>

                  {/* Specialization */}
                  {trainer.specialization && (
                    <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {trainer.specialization}
                    </p>
                  )}

                  {/* Location */}
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {trainer.city || trainer.county || trainer.location || "Kenya"}
                  </div>

                  {/* Hourly rate */}
                  {trainer.hourlyRate && (
                    <div className="mb-4">
                      <span className="text-lg font-bold text-[#192C67] dark:text-[#F77B0F]">
                        {formatCurrency(trainer.hourlyRate)}
                      </span>
                      <span className="text-xs text-zinc-400">/hr</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Link
                      href={`/book/${trainerId}`}
                      className="flex-1 rounded-lg bg-[#192C67] py-2 text-center text-xs font-semibold text-white hover:bg-[#192C67]/90 transition-colors"
                    >
                      Book
                    </Link>
                    <Link
                      href={`/messages?to=${trainerId}`}
                      className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Message
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="No favorites yet"
          description="Browse trainers and tap the heart icon to save them here for quick access."
          action={{
            label: "Find Trainers",
            onClick: () => (window.location.href = "/trainers"),
          }}
        />
      )}
    </>
  );
}
