import { apiGet, apiPost, apiDelete } from "../api";

export const favoritesService = {
  list: (params?: { page?: number; limit?: number }) =>
    apiGet<any>(
      `/favorites?${new URLSearchParams(
        Object.entries(params || {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    ),
  add: (trainerId: string) => apiPost<any>("/favorites", { trainerId }),
  remove: (trainerId: string) => apiDelete<any>(`/favorites/${trainerId}`),
  check: (trainerId: string) =>
    apiGet<{ isFavorite: boolean }>(`/favorites/check/${trainerId}`),
};
