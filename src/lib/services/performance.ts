import { apiGet } from "../api";

export type PerformanceTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface PerformanceSummary {
  totalBookings: number;
  completedBookings: number;
  completionRate: number;
  totalRevenue: number;
  avgBookingValue: number;
}

export interface PerformanceReviews {
  count: number;
  avgRating: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface PerformanceDisputes {
  count: number;
  openCount: number;
  disputeRate: number;
}

export interface PerformanceResponsiveness {
  avgFirstResponseMins: number;
  samplesConsidered: number;
}

export interface PerformanceScoreBreakdown {
  completion: number;
  satisfaction: number;
  disputes: number;
  responsiveness: number;
}

export interface Performance {
  userId: string;
  period: { start: string; end: string; days: number } | string;
  summary: PerformanceSummary;
  reviews: PerformanceReviews;
  disputes: PerformanceDisputes;
  responsiveness: PerformanceResponsiveness;
  compositeScore: number;
  scoreBreakdown: PerformanceScoreBreakdown;
  tier: PerformanceTier;
}

export const performanceService = {
  async getMine(periodDays = 90): Promise<Performance> {
    return apiGet<Performance>(`/me/performance?periodDays=${periodDays}`);
  },

  async getForUser(userId: string, periodDays = 90): Promise<Performance> {
    return apiGet<Performance>(`/users/${userId}/performance?periodDays=${periodDays}`);
  },
};

/** Colors per tier */
export const TIER_COLORS: Record<PerformanceTier, { bg: string; text: string; ring: string; hex: string }> = {
  BRONZE: {
    bg: "bg-[#92400E]",
    text: "text-white",
    ring: "ring-[#92400E]/30",
    hex: "#92400E",
  },
  SILVER: {
    bg: "bg-[#6B7280]",
    text: "text-white",
    ring: "ring-[#6B7280]/30",
    hex: "#6B7280",
  },
  GOLD: {
    bg: "bg-[#F59E0B]",
    text: "text-white",
    ring: "ring-[#F59E0B]/30",
    hex: "#F59E0B",
  },
  PLATINUM: {
    bg: "bg-[#3B82F6]",
    text: "text-white",
    ring: "ring-[#3B82F6]/30",
    hex: "#3B82F6",
  },
};
