import { apiGet, apiPost } from "../api";
import type { Subscription } from "../types";

export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval?: "MONTH" | "YEAR" | string;
  features: string[];
  description?: string;
  isPopular?: boolean;
  isRecommended?: boolean;
  isActive?: boolean;
  duration?: number;
}

export const subscriptionService = {
  async getCurrent(): Promise<Subscription | null> {
    try {
      return await apiGet<Subscription>("/subscriptions/me");
    } catch {
      return null;
    }
  },

  async getPlans(): Promise<any[]> {
    try {
      return await apiGet<any[]>("/subscriptions/plans");
    } catch {
      return [];
    }
  },

  async subscribe(planId: string): Promise<Subscription> {
    return apiPost<Subscription>("/subscriptions/subscribe", { planId });
  },

  async cancel(): Promise<void> {
    await apiPost("/subscriptions/cancel", {});
  },

  // Aliases
  getMySubscription: () => subscriptionService.getCurrent(),
};
