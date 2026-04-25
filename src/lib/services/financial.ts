import { apiGet, apiPost, apiPatch } from "../api";

export const financialService = {
  // My reports
  myEarnings: (period?: string) =>
    apiGet<any>(`/reports/my/earnings${period ? `?period=${period}` : ""}`),
  mySpending: (period?: string) =>
    apiGet<any>(`/reports/my/spending${period ? `?period=${period}` : ""}`),
  myInvoicesSummary: () => apiGet<any>("/reports/my/invoices-summary"),

  // Firm
  firmFinancial: () => apiGet<any>("/dashboard/firm/financial"),
  firmConsultant: (id: string) => apiGet<any>(`/dashboard/firm/consultant/${id}`),

  // Invoices
  myInvoices: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v));
      });
    const q = qs.toString();
    return apiGet<any>(`/invoices${q ? `?${q}` : ""}`);
  },
  invoiceDetail: (id: string) => apiGet<any>(`/invoices/${id}`),
  createInvoice: (data: Record<string, any>) => apiPost<any>("/invoices", data),
  sendInvoice: (id: string) => apiPatch<any>(`/invoices/${id}/send`),
  markPaid: (id: string) => apiPatch<any>(`/invoices/${id}/paid`),
  voidInvoice: (id: string) => apiPatch<any>(`/invoices/${id}/void`),
  generateInvoice: (bookingId: string) =>
    apiPost<any>(`/invoices/auto/${bookingId}`),
  invoiceStats: () => apiGet<any>("/invoices/stats"),

  // Payouts
  requestPayout: (data: {
    amount: number;
    method: string;
    destination: string;
  }) => apiPost<any>("/payouts/request", data),
  myPayouts: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v));
      });
    const q = qs.toString();
    return apiGet<any>(`/payouts${q ? `?${q}` : ""}`);
  },
};
