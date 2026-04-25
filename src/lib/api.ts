"use client";

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import type { ApiEnvelope } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const TOKEN_KEY = "skillsasa-client-token";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (typeof window === "undefined") return Promise.reject(error);
    const url = error.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/");
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Extract items array from either a plain array or a paginated { items, total } response */
export function extractItems<T>(response: T[] | { items: T[] } | any): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object" && Array.isArray(response.items)) return response.items;
  return [];
}

export function unwrap<T>(envelope: ApiEnvelope<T> | T | any): T {
  // Handle AxiosResponse: extract .data first
  if (envelope && typeof envelope === "object" && "status" in envelope && "headers" in envelope && "data" in envelope) {
    const inner = envelope.data;
    if (inner && typeof inner === "object" && "success" in inner && "data" in inner) {
      return inner.data as T;
    }
    return inner as T;
  }
  // Handle ApiEnvelope directly
  if (envelope && typeof envelope === "object" && "success" in (envelope as object) && "data" in (envelope as object)) {
    return (envelope as ApiEnvelope<T>).data;
  }
  return envelope as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, config);
  return unwrap<T>(res.data);
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<ApiEnvelope<T>>(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<ApiEnvelope<T>>(url, config);
  return unwrap<T>(res.data);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("uteo-user");
  }
}

export default api;
