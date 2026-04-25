import { apiGet, apiPost, apiDelete } from "../api";

export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

export interface FollowUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  avatar?: string;
  specialization?: string;
  role?: string;
  trainerProfile?: {
    id: string;
    specialization?: string;
    rating?: number;
    hourlyRate?: number;
  };
}

export interface PaginatedFollows {
  items: FollowUser[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export const followsService = {
  async follow(userId: string): Promise<{ ok: boolean }> {
    return apiPost<{ ok: boolean }>(`/users/${userId}/follow`);
  },

  async unfollow(userId: string): Promise<{ ok: boolean }> {
    return apiDelete<{ ok: boolean }>(`/users/${userId}/follow`);
  },

  async stats(userId: string): Promise<FollowStats> {
    try {
      return await apiGet<FollowStats>(`/users/${userId}/follow-stats`);
    } catch {
      return { followerCount: 0, followingCount: 0 };
    }
  },

  async isFollowing(userId: string): Promise<boolean> {
    try {
      const res = await apiGet<{ isFollowing: boolean } | boolean>(`/users/${userId}/is-following`);
      if (typeof res === "boolean") return res;
      return !!(res as any)?.isFollowing;
    } catch {
      return false;
    }
  },

  async followers(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedFollows> {
    const qs = new URLSearchParams();
    qs.set("page", String(params?.page ?? 1));
    qs.set("limit", String(params?.limit ?? 20));
    return apiGet<PaginatedFollows>(`/users/${userId}/followers?${qs.toString()}`);
  },

  async following(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedFollows> {
    const qs = new URLSearchParams();
    qs.set("page", String(params?.page ?? 1));
    qs.set("limit", String(params?.limit ?? 20));
    return apiGet<PaginatedFollows>(`/users/${userId}/following?${qs.toString()}`);
  },
};
