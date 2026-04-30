// Uteo recruitment types
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE' | 'HYBRID';
export type JobStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
export type ApplicationStatus = 'SUBMITTED' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'HIRED' | 'REJECTED';

export interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  size: string;
  location?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  posterUrl?: string;
  location?: string;
  jobType: JobType;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  status: JobStatus;
  createdAt: string;
  postedById?: string;
  company: Company;
  jobSkills?: { skill: { id: string; name: string } }[];
  matchScore?: number;
  _count?: { applications: number };
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  appliedAt: string;
  updatedAt: string;
  job: Job;
}

export interface FeedResponse {
  items: Job[];
  total: number;
  page: number;
}
