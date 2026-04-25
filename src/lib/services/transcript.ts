import { apiGet } from "../api";

export interface TranscriptUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface TranscriptSummary {
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  totalCertificates: number;
  cgpa: number;
}

export interface TranscriptCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  category?: string;
  instructorName?: string;
  enrolledAt: string;
  completedAt?: string | null;
  finalGrade?: number | null;
  letterGrade?: string | null;
  milestoneCount: number;
  passedMilestones: number;
  certificateId?: string | null;
  certificateNumber?: string | null;
}

export interface Transcript {
  user: TranscriptUser;
  summary: TranscriptSummary;
  courses: TranscriptCourse[];
}

export interface SessionRecording {
  id: string;
  url: string;
  title?: string;
  sessionTitle?: string;
  courseTitle?: string;
  duration?: number | string;
  recordedAt?: string;
  createdAt?: string;
  startedAt?: string;
  endedAt?: string;
  thumbnailUrl?: string | null;
  bookingId?: string;
}

export interface RecordingsResponse {
  items: SessionRecording[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const transcriptService = {
  getMine: () => apiGet<Transcript>("/me/transcript"),

  getRecordings: (page = 1, limit = 10) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    return apiGet<RecordingsResponse>(`/me/recordings?${qs.toString()}`);
  },
};
