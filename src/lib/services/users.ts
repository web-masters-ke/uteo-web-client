import { api, apiGet, apiPatch, apiPost, apiDelete } from "../api";
import type { User, UpdateProfilePayload, NotificationPreferences, ApiEnvelope } from "../types";
import { unwrap } from "../api";

export const userService = {
  getProfile: async (): Promise<User> => apiGet("/users/me"),
  updateProfile: async (payload: UpdateProfilePayload & { id?: string }): Promise<User> => {
    // Backend expects PATCH /users/:id — get the user id from the payload or fetch it
    let userId = payload.id;
    if (!userId) {
      try {
        const u = JSON.parse(localStorage.getItem("uteo-user") ?? "{}");
        userId = u?.id;
      } catch { /* noop */ }
    }
    if (!userId) {
      // Fallback: fetch current user to get id
      const me = await apiGet<User>("/users/me");
      userId = me.id;
    }
    return apiPatch(`/users/${userId}`, payload);
  },
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post<ApiEnvelope<{ url: string }>>("/media/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data);
  },
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    try {
      return await apiGet("/users/notification-preferences");
    } catch {
      // Endpoint may not exist yet — return defaults
      return { emailNotifications: true, pushNotifications: true, smsNotifications: false };
    }
  },
  updateNotificationPreferences: async (payload: NotificationPreferences): Promise<NotificationPreferences> => {
    try {
      return await apiPatch("/users/notification-preferences", payload);
    } catch {
      // Endpoint may not exist yet — return the payload as-is
      return payload;
    }
  },
  deleteAccount: async (): Promise<void> => {
    let userId: string | undefined;
    try {
      const u = JSON.parse(localStorage.getItem("uteo-user") ?? "{}");
      userId = u?.id;
    } catch { /* noop */ }
    if (userId) {
      await apiDelete(`/users/${userId}`);
    }
  },
};
