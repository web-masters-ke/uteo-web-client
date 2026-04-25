import { apiGet } from "../api";

export const analyticsService = {
  overview: () => apiGet<any>("/analytics/overview"),
  revenue: (period?: string) =>
    apiGet<any>(`/analytics/revenue${period ? `?period=${period}` : ""}`),
  bookings: (period?: string) =>
    apiGet<any>(`/analytics/bookings${period ? `?period=${period}` : ""}`),
  users: (period?: string) =>
    apiGet<any>(`/analytics/users${period ? `?period=${period}` : ""}`),
  topTrainers: (limit?: number) =>
    apiGet<any>(
      `/analytics/top-trainers${limit ? `?limit=${limit}` : ""}`
    ),
  categories: () => apiGet<any>("/analytics/categories"),
};
