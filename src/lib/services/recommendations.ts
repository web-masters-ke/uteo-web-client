import { apiGet } from "../api";
import type { NeedsProfile } from "./needsProfile";

export interface RecommendedTrainer {
  trainer: any;
  score: number;
  reasons: string[];
}

export interface RecommendedCourse {
  course: any;
  score: number;
  reasons: string[];
}

export interface OnboardingRecommendations {
  profile: NeedsProfile;
  trainers: RecommendedTrainer[];
  courses: RecommendedCourse[];
}

export const recommendationsService = {
  async onboarding(): Promise<OnboardingRecommendations> {
    return apiGet<OnboardingRecommendations>("/recommendations/onboarding");
  },

  async trainers(params?: { page?: number; limit?: number }): Promise<{
    items: RecommendedTrainer[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiGet(`/recommendations/trainers${qs.toString() ? `?${qs.toString()}` : ""}`);
  },

  async courses(params?: { page?: number; limit?: number }): Promise<{
    items: RecommendedCourse[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiGet(`/recommendations/courses${qs.toString() ? `?${qs.toString()}` : ""}`);
  },
};
