import { apiGet } from "../api";

export const categoryService = {
  getAll: async () => {
    const data = await apiGet<any>("/categories");
    if (Array.isArray(data)) return data;
    return data?.items || [];
  },
};
