import { apiGet, apiPost } from "../api";
import type { Wallet, WalletTransaction } from "../types";

export interface TransactionFilters {
  search?: string;
  type?: string; // CREDIT | DEBIT
  referenceType?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
  page?: number;
  limit?: number;
}

export const walletService = {
  async get(): Promise<Wallet> {
    return apiGet<Wallet>("/wallet/me");
  },

  async getTransactions(params?: TransactionFilters): Promise<any> {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, String(v)); });
    const queryStr = qs.toString();
    const res = await apiGet<WalletTransaction[] | { items: WalletTransaction[]; total?: number; totalPages?: number }>(`/wallet/transactions${queryStr ? `?${queryStr}` : ""}`);
    if (Array.isArray(res)) return { items: res, total: res.length, totalPages: 1 };
    return { items: (res as any)?.items ?? [], total: (res as any)?.total ?? 0, totalPages: (res as any)?.totalPages ?? 1 };
  },

  async getStatement(params?: TransactionFilters): Promise<any> {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, String(v)); });
    return apiGet<any>(`/wallet/transactions/statement${qs.toString() ? `?${qs.toString()}` : ""}`);
  },

  async getReceipt(txId: string): Promise<any> {
    return apiGet<any>(`/wallet/transactions/${txId}/receipt`);
  },

  async getUpcomingEscrow(): Promise<any[]> {
    return apiGet<any[]>("/wallet/escrow/upcoming");
  },

  async getInsights(months = 6): Promise<any> {
    return apiGet<any>(`/wallet/spending/insights?months=${months}`);
  },

  async getWithdrawals(limit = 20): Promise<any[]> {
    return apiGet<any[]>(`/wallet/withdrawals?limit=${limit}`);
  },

  async deposit(payload: { amount: number; provider?: string; phone?: string; currency?: string }): Promise<void> {
    await apiPost("/wallet/deposit", { provider: "MPESA", ...payload });
  },

  async withdraw(payload: { amount: number; provider?: string; phone?: string; accountNumber?: string; currency?: string }): Promise<void> {
    await apiPost("/wallet/withdraw", { provider: "MPESA", ...payload });
  },

  async transfer(payload: { toUserId: string; amount: number; description?: string }): Promise<void> {
    await apiPost("/wallet/transfer", payload);
  },

  // Aliases
  getWallet: () => walletService.get(),
  getTransactionsPaginated: async (params?: TransactionFilters) => walletService.getTransactions(params),
};
