import { apiGet, apiPost, apiPut } from '../api';

export type AssessmentQuestionType = 'MCQ' | 'MULTI' | 'TRUE_FALSE' | 'FREE_TEXT';

export interface AssessmentOption { id: string; text: string }

export interface AssessmentQuestion {
  id?: string;
  type: AssessmentQuestionType;
  prompt: string;
  options?: AssessmentOption[];
  correct?: string[];
  rubric?: string;
  points?: number;
  order?: number;
}

export interface Assessment {
  id: string;
  jobId: string;
  title: string;
  instructions?: string | null;
  passThreshold: number;
  timeLimitMins?: number | null;
  isActive: boolean;
  questions: AssessmentQuestion[];
}

// Candidate-facing shape (no correct answers / rubric)
export interface TakeAssessment {
  token: string;
  title: string;
  instructions?: string | null;
  timeLimitMins?: number | null;
  jobTitle: string;
  companyName: string;
  questions: { id: string; type: AssessmentQuestionType; prompt: string; options?: AssessmentOption[]; points: number }[];
}

export interface SubmitAnswer { questionId: string; optionIds?: string[]; text?: string }

export const assessmentsService = {
  // Recruiter
  getForJob: (jobId: string) => apiGet<Assessment | null>(`/assessments/job/${jobId}`),
  upsert: (jobId: string, body: Partial<Assessment> & { questions: AssessmentQuestion[] }) =>
    apiPut<Assessment>(`/assessments/job/${jobId}`, body),
  draft: (jobId: string, count?: number) =>
    apiPost<{ questions: AssessmentQuestion[] }>(`/assessments/job/${jobId}/draft`, { count }),

  // Candidate (token-gated)
  take: (token: string) => apiGet<TakeAssessment>(`/assessments/take/${token}`),
  submit: (token: string, answers: SubmitAnswer[]) =>
    apiPost<{ score: number; passed: boolean | null; needsManual: boolean }>(`/assessments/take/${token}/submit`, { answers }),
};
