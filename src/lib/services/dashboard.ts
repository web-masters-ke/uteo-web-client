import { apiGet } from "../api";
import type { ClientDashboardStats, TrainerDashboardStats, EarningsData, Booking, Review } from "../types";

export const dashboardService = {
  getClientStats: async (): Promise<ClientDashboardStats> => apiGet("/dashboard/client/stats"),
  getTrainerStats: async (): Promise<TrainerDashboardStats> => apiGet("/dashboard/trainer/stats"),
  getUpcomingBookings: async (limit = 5): Promise<Booking[]> => apiGet("/dashboard/upcoming-bookings", { params: { limit } }),
  getRecentActivity: async (limit = 10): Promise<{ id: string; type: string; message: string; createdAt: string }[]> => apiGet("/dashboard/recent-activity", { params: { limit } }),
  getRecentReviews: async (limit = 5): Promise<Review[]> => apiGet("/dashboard/recent-reviews", { params: { limit } }),
  getEarningsChart: async (days = 30): Promise<EarningsData[]> => apiGet("/dashboard/earnings-chart", { params: { days } }),
};
