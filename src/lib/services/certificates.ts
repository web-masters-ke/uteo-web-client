import { apiGet, apiPost } from "../api";

export interface CertificateInstructor {
  firstName: string;
  lastName: string;
}

export interface CertificateCourse {
  title: string;
  category?: string;
  thumbnail?: string | null;
  instructor?: CertificateInstructor;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  finalGrade?: number | string;
  letterGrade?: string;
  issuedAt: string;
  status?: string;
  revokedAt?: string | null;
  course: CertificateCourse;
}

export interface CertificateListResponse {
  items: Certificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CertificateVerification {
  valid: boolean;
  certificateNumber?: string;
  studentName?: string;
  courseTitle?: string;
  instructorName?: string;
  finalGrade?: number | string;
  letterGrade?: string;
  issuedAt?: string;
  status?: string;
  revokedAt?: string | null;
  reason?: string;
}

export const certificatesService = {
  listMy: (page = 1, limit = 20) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    return apiGet<CertificateListResponse>(`/certificates/my?${qs.toString()}`);
  },

  getById: (id: string) => apiGet<Certificate>(`/certificates/${id}`),

  verify: (code: string) =>
    apiGet<CertificateVerification>(`/certificates/verify/${code}`),

  revoke: (id: string, reason?: string) =>
    apiPost<Certificate>(`/certificates/${id}/revoke`, reason ? { reason } : {}),

  issue: (courseId: string, userId: string) =>
    apiPost<Certificate>(`/courses/${courseId}/certificates/issue/${userId}`),
};
