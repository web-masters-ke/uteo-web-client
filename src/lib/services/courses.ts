import { apiGet, apiPost, apiPatch, apiDelete } from "../api";

export const coursesService = {
  list: (params?: {
    category?: string;
    level?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v));
      });
    return apiGet<any>(`/courses?${qs.toString()}`);
  },
  getById: (id: string) => apiGet<any>(`/courses/${id}`),
  create: (data: any) => apiPost<any>("/courses", data),
  update: (id: string, data: any) => apiPatch<any>(`/courses/${id}`, data),
  delete: (id: string) => apiDelete<any>(`/courses/${id}`),
  publish: (id: string) => apiPost<any>(`/courses/${id}/publish`),
  addLesson: (courseId: string, data: any) =>
    apiPost<any>(`/courses/${courseId}/lessons`, data),
  updateLesson: (courseId: string, lessonId: string, data: any) =>
    apiPatch<any>(`/courses/${courseId}/lessons/${lessonId}`, data),
  deleteLesson: (courseId: string, lessonId: string) =>
    apiDelete<any>(`/courses/${courseId}/lessons/${lessonId}`),
  addQuestion: (courseId: string, lessonId: string, data: any) =>
    apiPost<any>(`/courses/${courseId}/lessons/${lessonId}/questions`, data),
  getAssessments: (courseId: string, lessonId: string) =>
    apiGet<any>(`/courses/${courseId}/lessons/${lessonId}/assessments`),
  addAssessment: (courseId: string, lessonId: string, data: any) =>
    apiPost<any>(`/courses/${courseId}/lessons/${lessonId}/assessments`, data),
  deleteAssessment: (courseId: string, lessonId: string, assessmentId: string) =>
    apiDelete<any>(`/courses/${courseId}/lessons/${lessonId}/assessments/${assessmentId}`),
  enroll: (courseId: string) => apiPost<any>(`/courses/${courseId}/enroll`),
  updateProgress: (courseId: string, progress: number) =>
    apiPatch<any>(`/courses/${courseId}/progress`, { progress }),
  myCreated: () => apiGet<any>("/courses/my/created"),
  myEnrolled: () => apiGet<any>("/courses/my/enrolled"),
  createMilestone: (courseId: string, data: any) => apiPost<any>(`/courses/${courseId}/milestones`, data),
  updateMilestone: (courseId: string, milestoneId: string, data: any) => apiPatch<any>(`/courses/${courseId}/milestones/${milestoneId}`, data),
};
