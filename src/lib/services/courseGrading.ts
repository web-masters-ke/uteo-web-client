import { apiGet, apiPost, apiPatch, apiDelete } from "../api";
import type {
  CourseMilestone,
  LessonAssessment,
  LessonSubmission,
  AssessmentType,
  MyGradeResponse,
  SubmitAssessmentResponse,
} from "../types";

export interface CreateCourseMilestonePayload {
  title: string;
  description?: string;
  orderIndex?: number;
  passingScore?: number;
  weight?: number;
}

export interface UpdateCourseMilestonePayload {
  title?: string;
  description?: string;
  orderIndex?: number;
  passingScore?: number;
  weight?: number;
}

export interface CreateAssessmentPayload {
  question: string;
  type: AssessmentType;
  options?: string[];
  correctAnswer?: string | string[];
  points?: number;
  orderIndex?: number;
}

export interface UpdateAssessmentPayload extends Partial<CreateAssessmentPayload> {}

export interface SubmitLessonPayload {
  answers: Record<string, string | string[]>;
}

export interface GradeSubmissionPayload {
  score: number;
  passed: boolean;
  feedback?: string;
}

export const courseGradingService = {
  /** ── Milestones ── */
  listMilestones: (courseId: string) =>
    apiGet<CourseMilestone[]>(`/courses/${courseId}/milestones`),

  createMilestone: (courseId: string, data: CreateCourseMilestonePayload) =>
    apiPost<CourseMilestone>(`/courses/${courseId}/milestones`, data),

  updateMilestone: (milestoneId: string, data: UpdateCourseMilestonePayload) =>
    apiPatch<CourseMilestone>(`/course-milestones/${milestoneId}`, data),

  deleteMilestone: (milestoneId: string) =>
    apiDelete<{ success: boolean }>(`/course-milestones/${milestoneId}`),

  /** ── Assessments ── */
  listAssessments: (lessonId: string) =>
    apiGet<LessonAssessment[]>(`/lessons/${lessonId}/assessments`),

  createAssessment: (lessonId: string, data: CreateAssessmentPayload) =>
    apiPost<LessonAssessment>(`/lessons/${lessonId}/assessments`, data),

  updateAssessment: (assessmentId: string, data: UpdateAssessmentPayload) =>
    apiPatch<LessonAssessment>(`/assessments/${assessmentId}`, data),

  deleteAssessment: (assessmentId: string) =>
    apiDelete<{ success: boolean }>(`/assessments/${assessmentId}`),

  /** ── Submissions ── */
  submitLesson: (lessonId: string, data: SubmitLessonPayload) =>
    apiPost<SubmitAssessmentResponse>(`/lessons/${lessonId}/submit`, data),

  listMySubmissions: (lessonId: string) =>
    apiGet<LessonSubmission[]>(`/lessons/${lessonId}/submissions`),

  gradeSubmission: (submissionId: string, data: GradeSubmissionPayload) =>
    apiPatch<LessonSubmission>(`/submissions/${submissionId}/grade`, data),

  /** Instructor grading inbox: submissions awaiting manual grading for a course */
  listPendingSubmissions: (courseId: string) =>
    apiGet<LessonSubmission[]>(`/courses/${courseId}/submissions/pending`),

  /** ── Grade summary ── */
  myGrade: (courseId: string) =>
    apiGet<MyGradeResponse>(`/courses/${courseId}/my-grade`),
};
