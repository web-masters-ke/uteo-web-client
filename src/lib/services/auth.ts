import { apiPost, setAuthToken, TOKEN_KEY } from "../api";
import type { User } from "../types";

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: "CLIENT" | "TRAINER";
  bio?: string;
  specialization?: string;
  hourlyRate?: number;
  experience?: number;
  location?: string;
  city?: string;
  county?: string;
  skills?: string[];
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiPost<LoginResponse>("/auth/login", { email, password });
    const token = res.accessToken;
    setAuthToken(token);
    if (res.user && typeof window !== "undefined") {
      localStorage.setItem("skillsasa-user", JSON.stringify(res.user));
    }
    return res;
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const res = await apiPost<LoginResponse>("/auth/register", payload);
    setAuthToken(res.accessToken);
    if (res.user && typeof window !== "undefined") {
      localStorage.setItem("skillsasa-user", JSON.stringify(res.user));
    }
    return res;
  },

  async forgotPassword(emailOrPayload: string | { email: string }): Promise<void> {
    const email = typeof emailOrPayload === "string" ? emailOrPayload : emailOrPayload.email;
    await apiPost("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiPost("/auth/reset-password", { token, password });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiPost("/auth/change-password", { currentPassword, newPassword });
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("skillsasa-user");
    }
  },

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("skillsasa-user") ?? "null");
    } catch {
      return null;
    }
  },
};
