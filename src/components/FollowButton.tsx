"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { followsService } from "@/lib/services/follows";

interface FollowButtonProps {
  userId: string;
  /** Optional initial counts and following state to avoid extra requests */
  initialFollowerCount?: number;
  initialIsFollowing?: boolean;
  /** Hide the follower-count chip. Default: show */
  showCount?: boolean;
  /** Optional callback when follower count changes */
  onCountChange?: (count: number) => void;
  className?: string;
}

export default function FollowButton({
  userId,
  initialFollowerCount,
  initialIsFollowing,
  showCount = true,
  onCountChange,
  className = "",
}: FollowButtonProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState<boolean>(!!initialIsFollowing);
  const [count, setCount] = useState<number>(initialFollowerCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const isSelf = !!user && user.id === userId;

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // Always fetch stats to keep follower count accurate
      const statsPromise = followsService.stats(userId);
      const isFollowingPromise = user && !isSelf ? followsService.isFollowing(userId) : Promise.resolve(false);

      const [stats, following] = await Promise.all([statsPromise, isFollowingPromise]);
      if (cancelled) return;
      setCount(stats.followerCount);
      setIsFollowing(!!following);
      setHydrated(true);
    }

    // If we already have both initial values, skip hydration
    if (initialFollowerCount !== undefined && initialIsFollowing !== undefined) {
      setHydrated(true);
    } else {
      hydrate();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.id]);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (isSelf || loading) return;

    const prevFollowing = isFollowing;
    const prevCount = count;
    // Optimistic update
    const nextFollowing = !prevFollowing;
    const nextCount = Math.max(0, prevCount + (nextFollowing ? 1 : -1));
    setIsFollowing(nextFollowing);
    setCount(nextCount);
    onCountChange?.(nextCount);
    setLoading(true);

    try {
      if (nextFollowing) {
        await followsService.follow(userId);
        addToast("success", "Now following");
      } else {
        await followsService.unfollow(userId);
        addToast("info", "Unfollowed");
      }
    } catch (err: any) {
      // Revert on failure
      setIsFollowing(prevFollowing);
      setCount(prevCount);
      onCountChange?.(prevCount);
      const msg = err?.response?.data?.message || err?.message || "Could not update follow status";
      addToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const activeCls = isFollowing
    ? "bg-white text-[#192C67] border border-[#192C67] hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:bg-transparent dark:text-[#5b8bc7] dark:border-[#5b8bc7] dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-500"
    : "bg-[#192C67] text-white border border-[#192C67] hover:bg-[#162d4a]";

  const selfCls = "bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 cursor-not-allowed";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={loading || isSelf}
        title={isSelf ? "You can't follow yourself" : undefined}
        aria-label={isFollowing ? "Unfollow" : "Follow"}
        className={`${base} ${isSelf ? selfCls : activeCls}`}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isFollowing ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
        {isSelf ? "This is you" : isFollowing ? "Following" : "Follow"}
      </button>
      {showCount && hydrated && (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {count.toLocaleString()}
          <span className="text-gray-400 dark:text-gray-500">{count === 1 ? "follower" : "followers"}</span>
        </span>
      )}
    </div>
  );
}
