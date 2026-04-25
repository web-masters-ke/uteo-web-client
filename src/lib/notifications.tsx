"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Notification } from "./types";
import { apiGet, apiPatch } from "./api";

interface NotificationsCtx {
  items: Notification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  push: (n: Notification) => void;
}

const Ctx = createContext<NotificationsCtx | null>(null);

function mapRaw(raw: unknown[]): Notification[] {
  return raw.map((n: any) => ({
    id: n.id ?? "",
    type: n.type ?? n.channel ?? "",
    title: n.title ?? "",
    body: n.body ?? n.message ?? undefined,
    link: n.link ?? (n.metadata?.courseId ? `/courses/${n.metadata.courseId}` : undefined),
    read: !!(n.read || n.isRead || n.status === "READ" || n.readAt != null),
    createdAt: n.createdAt ?? new Date().toISOString(),
  }));
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiGet<{ items: unknown[]; total: number } | unknown[]>("/notifications");
      if (signal?.aborted) return;
      const raw: unknown[] = Array.isArray(res) ? res : (res as any)?.items ?? [];
      setItems(mapRaw(raw));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAll(ctrl.signal);
    const interval = setInterval(() => fetchAll(ctrl.signal), 30_000);
    return () => { ctrl.abort(); clearInterval(interval); };
  }, [fetchAll]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    // Fire-and-forget PATCH to backend: PATCH /notifications/:id/read
    apiPatch(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    // Fire-and-forget PATCH to backend: PATCH /notifications/read-all
    apiPatch("/notifications/read-all").catch(() => {});
  }, []);

  const push = useCallback((n: Notification) => {
    setItems((prev) => [n, ...prev]);
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return <Ctx.Provider value={{ items, unread, markRead, markAllRead, push }}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return { items: [], unread: 0, markRead: () => {}, markAllRead: () => {}, push: () => {} };
  }
  return ctx;
}
