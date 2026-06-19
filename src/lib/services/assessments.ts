import { apiGet, apiPost, apiPut, apiPatch } from '../api';

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

export interface AssessmentResultQuestion {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  options?: AssessmentOption[];
  correct: string[];
  rubric?: string | null;
  points: number;
  response: { optionIds: string[]; text: string };
  isCorrect: boolean | null;
  aiFeedback?: { points: number; feedback: string } | null;
}

export interface AssessmentResult {
  applicationId: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  passThreshold: number;
  submittedAt: string | null;
  questions: AssessmentResultQuestion[];
}

export const assessmentsService = {
  // Recruiter
  getForJob: (jobId: string) => apiGet<Assessment | null>(`/assessments/job/${jobId}`),
  upsert: (jobId: string, body: Partial<Assessment> & { questions: AssessmentQuestion[] }) =>
    apiPut<Assessment>(`/assessments/job/${jobId}`, body),
  draft: (jobId: string, count?: number) =>
    apiPost<{ questions: AssessmentQuestion[] }>(`/assessments/job/${jobId}/draft`, { count }),
  // Paste questions → AI structures them + generates the answers/rubrics
  importQuestions: (jobId: string, text: string) =>
    apiPost<{ questions: AssessmentQuestion[] }>(`/assessments/job/${jobId}/import`, { text }),

  // Review a candidate's recorded responses + grading
  result: (applicationId: string) =>
    apiGet<AssessmentResult | null>(`/assessments/application/${applicationId}/result`),
  // Manually override a candidate's score
  overrideScore: (applicationId: string, score: number, passed?: boolean) =>
    apiPatch<{ score: number; passed: boolean }>(`/assessments/application/${applicationId}/score`, { score, passed }),

  // Candidate: my own pending assessment link for an application (no email needed)
  myLink: (applicationId: string) =>
    apiGet<{ token: string; status: string; expired: boolean; done: boolean } | null>(`/assessments/my/${applicationId}`),
  // Candidate (token-gated)
  take: (token: string) => apiGet<TakeAssessment>(`/assessments/take/${token}`),
  submit: (token: string, answers: SubmitAnswer[]) =>
    apiPost<{ score: number; passed: boolean | null; needsManual: boolean }>(`/assessments/take/${token}/submit`, { answers }),
};
