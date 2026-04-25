"use client";

import { useState, useEffect } from "react";
import { favoritesService } from "@/lib/services/favorites";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  /** Must be the trainer's USER id (not trainer-profile id) */
  trainerUserId: string;
  className?: string;
  iconOnly?: boolean;
}

export default function FavoriteButton({ trainerUserId, className, iconOnly = true }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // All hooks above — conditional logic below is safe
  const isClient = !!user && user.role !== "TRAINER";

  useEffect(() => {
    if (!isClient || !trainerUserId) return;
    favoritesService
      .check(trainerUserId)
      .then((res) => setIsFav(res.isFavorite ?? false))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [trainerUserId, isClient]);

  if (!isClient || !trainerUserId || !checked) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const prev = isFav;
    setIsFav(!prev);
    try {
      if (prev) {
        await favoritesService.remove(trainerUserId);
      } else {
        await favoritesService.add(trainerUserId);
      }
    } catch {
      setIsFav(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isFav ? "Remove from favorites" : "Save to favorites"}
      aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full transition-all",
        iconOnly
          ? "w-8 h-8 justify-center hover:scale-110"
          : "px-3 py-1.5 text-xs font-semibold",
        isFav
          ? "text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
          : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
        loading && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <svg
        className={cn("shrink-0", iconOnly ? "w-4 h-4" : "w-3.5 h-3.5")}
        viewBox="0 0 24 24"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isFav ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {!iconOnly && (isFav ? "Saved to Favourites" : "Save to Favourites")}
    </button>
  );
}
