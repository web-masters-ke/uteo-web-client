import { apiGet, apiPost, apiPatch, apiDelete } from "../api";

export const affiliationsService = {
  list: () => apiGet<any>("/affiliations"),
  forUser: (userId: string) => apiGet<any>(`/affiliations/user/${userId}`),
  create: (data: any) => apiPost<any>("/affiliations", data),
  update: (id: string, data: any) => apiPatch<any>(`/affiliations/${id}`, data),
  delete: (id: string) => apiDelete<any>(`/affiliations/${id}`),
};
