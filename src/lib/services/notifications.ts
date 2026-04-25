import { apiGet, apiPatch, extractItems } from "../api";
import type { Notification, Paginated } from "../types";

export const notificationService = {
  getAll: async (params?: { page?: number; limit?: number; isRead?: boolean }): Promise<Paginated<Notification>> => apiGet("/notifications", { params }),
  markAsRead: async (id: string): Promise<void> => { await apiPatch(`/notifications/${id}/read`); },
  markAllAsRead: async (): Promise<void> => { await apiPatch("/notifications/read-all"); },
  getUnreadCount: async (): Promise<number> => {
    // Backend does not have a dedicated unread-count endpoint.
    // Fetch all notifications and count unread client-side.
    try {
      const res = await apiGet<any>("/notifications", { params: { limit: 100 } });
      const items = extractItems<any>(res);
      return items.filter((n: any) => !n.read && n.readAt == null).length;
    } catch {
      return 0;
    }
  },
};
