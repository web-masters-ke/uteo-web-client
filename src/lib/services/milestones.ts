import { apiGet, apiPost, apiPatch } from "../api";
import type {
  Milestone,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  AttendanceRecord,
  RecordAttendancePayload,
  ContentAccess,
} from "../types";

export const milestoneService = {
  list: (bookingId: string): Promise<Milestone[]> =>
    apiGet<Milestone[]>(`/bookings/${bookingId}/milestones`),

  create: (bookingId: string, data: CreateMilestonePayload): Promise<Milestone> =>
    apiPost<Milestone>(`/bookings/${bookingId}/milestones`, data),

  update: (id: string, data: UpdateMilestonePayload): Promise<Milestone> =>
    apiPatch<Milestone>(`/milestones/${id}`, data),

  deliver: (id: string): Promise<Milestone> =>
    apiPost<Milestone>(`/milestones/${id}/deliver`),

  release: (id: string): Promise<Milestone> =>
    apiPost<Milestone>(`/milestones/${id}/release`),

  dispute: (id: string, note: string): Promise<Milestone> =>
    apiPost<Milestone>(`/milestones/${id}/dispute`, { note }),

  listAttendance: (bookingId: string): Promise<AttendanceRecord[]> =>
    apiGet<AttendanceRecord[]>(`/bookings/${bookingId}/attendance`),

  recordAttendance: (bookingId: string, data: RecordAttendancePayload): Promise<AttendanceRecord[]> =>
    apiPost<AttendanceRecord[]>(`/bookings/${bookingId}/attendance`, data),

  contentAccess: (bookingId: string): Promise<ContentAccess> =>
    apiGet<ContentAccess>(`/bookings/${bookingId}/content-access`),
};

export default milestoneService;
