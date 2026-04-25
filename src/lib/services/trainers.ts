import api, { unwrap, apiGet, apiPost } from "../api";
import type { Trainer, TrainerProfile, TrainerSearchParams, Category, Paginated, PaginatedResponse, AvailabilitySlot, Review, RatingDistribution, Certification, CredentialType } from "../types";

export const trainerService = {
  async search(params: TrainerSearchParams): Promise<Paginated<Trainer>> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    return apiGet<Paginated<Trainer>>(`/trainers?${qs.toString()}`);
  },

  async getById(id: string): Promise<Trainer> {
    return apiGet<Trainer>(`/trainers/${id}`);
  },

  async getByType(type: string): Promise<Trainer[]> {
    return apiGet<Trainer[]>(`/trainers/by-type/${type}`);
  },

  async getCategories(trainerType?: string): Promise<Category[]> {
    const qs = trainerType ? `?trainerType=${trainerType}` : '';
    return apiGet<Category[]>(`/categories${qs}`);
  },

  async getCounties(): Promise<string[]> {
    const data = await apiGet<any[]>("/locations/counties");
    // Backend returns [{id, name}] — extract names
    return (data || []).map((c: any) => (typeof c === "string" ? c : c.name || c.id || "")).filter(Boolean);
  },

  async getAvailability(trainerId?: string, date?: string): Promise<any[]> {
    if (!trainerId) return apiGet<any[]>("/trainers/availability").catch(() => []);
    return apiGet<any[]>(`/trainers/${trainerId}/availability${date ? `?date=${date}` : ""}`).catch(() => []);
  },

  async getAvailableSlots(trainerId: string, date: string): Promise<{ startTime: string; endTime: string }[]> {
    try {
      const res = await api.get(`/trainers/${trainerId}/availability?date=${date}`);
      return unwrap<{ startTime: string; endTime: string }[]>(res);
    } catch {
      return [];
    }
  },

  async getReviews(trainerId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Review>> {
    const res = await api.get(`/trainers/${trainerId}/reviews`, { params });
    return unwrap<PaginatedResponse<Review>>(res);
  },

  async getRatingDistribution(trainerId: string): Promise<RatingDistribution> {
    const res = await api.get(`/trainers/${trainerId}/rating-distribution`);
    return unwrap<RatingDistribution>(res);
  },

  async getFeatured(limit = 6): Promise<Trainer[]> {
    try { return await apiGet<Trainer[]>("/trainers/featured", { params: { limit } }); }
    catch { const res = await trainerService.search({ sortBy: "rating", limit }); return res.items; }
  },
  async getPlatformStats() {
    try { return await apiGet<{ totalTrainers: number; totalBookings: number; totalReviews: number; averageRating: number }>("/stats/platform"); }
    catch { return { totalTrainers: 0, totalBookings: 0, totalReviews: 0, averageRating: 0 }; }
  },
  async getRelated(trainerId: string, limit = 4): Promise<Trainer[]> {
    try { return await apiGet<Trainer[]>(`/trainers/${trainerId}/related`, { params: { limit } }); }
    catch { return []; }
  },
  async recommend(params?: { skills?: string; category?: string; sessionType?: string; budget?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, String(v)); });
    return apiGet<any>(`/trainers/recommend/for-me?${qs.toString()}`);
  },

  async getSkills() {
    try {
      const data = await apiGet<any>("/skills");
      const items = Array.isArray(data) ? data : data?.items ?? [];
      return items;
    }
    catch { return []; }
  },
  async getTestimonials() {
    try { return await apiGet<{ name: string; role: string; comment: string; rating: number }[]>("/testimonials"); }
    catch { return []; }
  },
  async getCertifications() {
    try { return await apiGet<Certification[]>("/trainers/certifications"); }
    catch { return []; }
  },
  async addCertification(payload: { name: string; issuer: string; year: number; credentialType?: CredentialType; documentUrl?: string }) {
    return apiPost<Certification>("/trainers/certifications", payload);
  },
  async removeCertification(id: string) {
    const res = await api.delete(`/trainers/certifications/${id}`);
    return unwrap(res);
  },
  async submitCertForVerification(certificationId: string) {
    return apiPost<Certification>(`/verification/credential/${certificationId}`);
  },
  async addSkill(_skillId: string) { },
  async removeSkill(_skillId: string) { },
  async setAvailability(_slots: unknown[]) { return []; },
  async uploadMedia(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<{ url: string; key: string }>(res);
  },
};
