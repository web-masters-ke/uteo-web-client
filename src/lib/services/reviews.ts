import { apiGet, apiPost, apiPatch, apiDelete, extractItems } from "../api";
import type { Review, Paginated } from "../types";

export const reviewService = {
  async listByTrainer(trainerId: string): Promise<Paginated<Review>> {
    return apiGet<Paginated<Review>>(`/trainers/${trainerId}/reviews`);
  },

  async listMyReviews(): Promise<Review[]> {
    // Backend: GET /reviews?reviewerId=<current user> — no /reviews/mine endpoint
    // Fetch all and filter client-side, or pass reviewerId param
    try {
      const userId = JSON.parse(localStorage.getItem("skillsasa-user") ?? "{}").id;
      const res = await apiGet<Review[] | { items: Review[] }>(`/reviews${userId ? `?reviewerId=${userId}` : ""}`);
      const items = Array.isArray(res) ? res : extractItems<Review>(res);
      return items;
    } catch {
      return [];
    }
  },

  async listReviewsOfMe(): Promise<Review[]> {
    // Backend: GET /reviews?trainerId=<current user> — no /reviews/of-me endpoint
    try {
      const userId = JSON.parse(localStorage.getItem("skillsasa-user") ?? "{}").id;
      const res = await apiGet<Review[] | { items: Review[] }>(`/reviews${userId ? `?trainerId=${userId}` : ""}`);
      const items = Array.isArray(res) ? res : extractItems<Review>(res);
      return items;
    } catch {
      return [];
    }
  },

  async create(data: { bookingId: string; rating: number; comment?: string }): Promise<Review> {
    return apiPost<Review>("/reviews", data);
  },

  async update(id: string, data: { rating?: number; comment?: string }): Promise<Review> {
    return apiPatch<Review>(`/reviews/${id}`, data);
  },

  async remove(id: string): Promise<void> {
    await apiDelete(`/reviews/${id}`);
  },

  // Aliases
  getMyReviews: async (params?: { page?: number; limit?: number }) => {
    const items = await reviewService.listMyReviews();
    return { items, total: items.length, totalPages: 1, page: params?.page || 1, limit: params?.limit || 10 };
  },
  getReviewsOfMe: async (params?: { page?: number; limit?: number }) => {
    const items = await reviewService.listReviewsOfMe();
    return { items, total: items.length, totalPages: 1, page: params?.page || 1, limit: params?.limit || 10 };
  },
  getTrainerReviews: async (trainerId: string, params?: { page?: number; limit?: number }) => {
    return reviewService.listByTrainer(trainerId);
  },
  getRatingDistribution: async (trainerId: string) => {
    // Backend: GET /reviews/stats/:trainerId — use the real endpoint
    try {
      const stats = await apiGet<any>(`/reviews/stats/${trainerId}`);
      return stats?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    } catch {
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { 1: number; 2: number; 3: number; 4: number; 5: number };
    }
  },
};
