import api, { unwrap, apiGet, apiPost, apiPatch } from "../api";
import type { Booking, Paginated, CreateBookingPayload, SessionType } from "../types";

const bookingService = {
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<Paginated<Booking>> {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
      });
    }
    return apiGet<Paginated<Booking>>(`/bookings?${qs.toString()}`);
  },

  async getById(id: string): Promise<Booking> {
    return apiGet<Booking>(`/bookings/${id}`);
  },

  async create(data: CreateBookingPayload | {
    trainerId: string;
    scheduledAt: string;
    duration: number;
    sessionType: string;
    notes?: string;
    location?: string;
  }): Promise<Booking> {
    return apiPost<Booking>("/bookings", data);
  },

  async cancel(id: string, reason?: string): Promise<Booking> {
    return apiPatch<Booking>(`/bookings/${id}/status`, { status: 'CANCELLED', reason });
  },

  async confirm(id: string): Promise<Booking> {
    return apiPatch<Booking>(`/bookings/${id}/status`, { status: 'CONFIRMED' });
  },

  async updateStatus(id: string, status: string, reason?: string): Promise<Booking> {
    return apiPatch<Booking>(`/bookings/${id}/status`, { status, reason });
  },

  async reschedule(id: string, scheduledAt: string, reason?: string): Promise<Booking> {
    return apiPatch<Booking>(`/bookings/${id}/reschedule`, { scheduledAt, reason });
  },

  async getJaasToken(bookingId: string): Promise<{ token: string; moderator: boolean }> {
    return apiGet<{ token: string; moderator: boolean }>(`/bookings/${bookingId}/jaas-token`);
  },

  // Aliases used by pages
  getMyBookings: (params?: { status?: string; page?: number; limit?: number }) => bookingService.list(params),
  getUpcoming: async (limit = 5): Promise<Booking[]> => {
    const res = await bookingService.list({ status: "CONFIRMED", limit });
    return res.items;
  },
};

export { bookingService };
