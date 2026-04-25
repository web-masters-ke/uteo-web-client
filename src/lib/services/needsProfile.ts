import { apiGet, apiPut } from "../api";

export type NeedsLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type NeedsUrgency = "low" | "medium" | "high";

export interface NeedsProfile {
  id?: string;
  userId?: string;
  goals: string[];
  currentLevel: NeedsLevel;
  categoriesInterest: string[];
  preferredSessionTypes: string[];
  budgetMin?: number;
  budgetMax?: number;
  timeframeWeeks?: number;
  urgency?: NeedsUrgency;
  problemStatement?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNeedsProfilePayload {
  goals?: string[];
  currentLevel?: NeedsLevel;
  categoriesInterest?: string[];
  preferredSessionTypes?: string[];
  budgetMin?: number;
  budgetMax?: number;
  timeframeWeeks?: number;
  urgency?: NeedsUrgency;
  problemStatement?: string;
}

export const needsProfileService = {
  /** Get my own needs profile. Returns null if not yet created. */
  async get(): Promise<NeedsProfile | null> {
    try {
      return await apiGet<NeedsProfile>("/auth/needs-profile");
    } catch {
      return null;
    }
  },

  /** Create or update the needs profile. Partial payloads are allowed. */
  async update(payload: UpdateNeedsProfilePayload): Promise<NeedsProfile> {
    return apiPut<NeedsProfile>("/auth/needs-profile", payload);
  },
};
