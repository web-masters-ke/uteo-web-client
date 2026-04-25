export type UUID = string;

export type UserRole = "CLIENT" | "TRAINER" | "ADMIN";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type BookingStatus = "PENDING" | "PENDING_PAYMENT" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED" | "NO_SHOW";

export type SessionType = "VIRTUAL" | "PHYSICAL" | "HYBRID" | "PRE_RECORDED";

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "ESCROW_HOLD" | "ESCROW_RELEASE" | "COMMISSION" | "REFUND";

export type SubscriptionPlanName = "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
export interface SubscriptionPlan { id: string; name: string; price: number; currency?: string; interval?: string; features: string[]; description?: string; isPopular?: boolean; isRecommended?: boolean; isActive?: boolean; duration?: number; }

export interface User {
  id: UUID;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  avatarUrl?: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  bio?: string;
  specialization?: string;
  hourlyRate?: number;
  experience?: number;
  location?: string;
  city?: string;
  county?: string;
  languages?: string[];
  portfolioUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  sessionTypes?: string[];
  skills?: string[];
  certifications?: any[];
  availability?: any[];
  createdAt: string;
}

export interface TrainerProfile {
  id: UUID;
  userId: UUID;
  user?: User;
  bio?: string;
  hourlyRate: number;
  currency: string;
  rating: number;
  totalReviews: number;
  verificationStatus: VerificationStatus;
  tier?: TrainerTier;
  trainerType?: TrainerType;
  categoryId?: string;
  experience: number;
  location?: string;
  city?: string;
  county?: string;
  specialization?: string;
  languages: string[];
  skills: any[];
  certifications: any[];
  portfolioUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  availableForOnline: boolean;
  availableForPhysical: boolean;
  availableForHybrid: boolean;
  availabilitySlots: AvailabilitySlot[];
  completedSessions: number;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: UUID;
  trainerId: UUID;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface Booking {
  id: UUID;
  trainerId: UUID;
  clientId: UUID;
  amount: number;
  currency: string;
  status: BookingStatus;
  sessionType: SessionType;
  scheduledAt: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  meetingUrl?: string;
  notes?: string;
  cancelReason?: string;
  escrowStatus?: string;
  trainer?: TrainerProfile & { user?: User };
  client?: User;
  review?: Review;
  reviews?: Review[];
  createdAt: string;
}

export interface Wallet {
  id: UUID;
  userId: UUID;
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "SUSPENDED";
  recentTransactions?: WalletTransaction[];
  escrowHeldByMe?: number;
  escrowHeldCount?: number;
  escrowPendingForMe?: number;
  escrowPendingCount?: number;
  totalEarned?: number;
  totalSpent?: number;
  updatedAt: string;
}

export interface WalletTransactionEntry {
  entryType: "DEBIT" | "CREDIT";
  amount: number;
}

export interface WalletTransaction {
  id: UUID;
  walletId?: UUID;
  type?: TransactionType;
  referenceType: string;
  referenceId?: string;
  description: string;
  idempotencyKey?: string;
  amount: number;
  currency?: string;
  reference?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  entries?: WalletTransactionEntry[];
  createdAt: string;
}

export interface Review {
  id: UUID;
  bookingId: UUID;
  reviewerId: UUID;
  trainerId: UUID;
  rating: number;
  comment?: string;
  reviewer?: User;
  reviewee?: User;
  trainer?: User;
  booking?: Booking;
  createdAt: string;
}

export type TrainerTier = 'CERTIFIED' | 'EXPERIENCED' | 'ENTRY_LEVEL';
export type TrainerType = 'PROFESSIONAL' | 'VOCATIONAL' | 'BOTH';
export type CredentialType = 'DEGREE' | 'DIPLOMA' | 'CERTIFICATE' | 'LICENSE' | 'PROFESSIONAL_MEMBERSHIP' | 'TRADE_CERTIFICATE' | 'APPRENTICESHIP' | 'PORTFOLIO';
export type CredentialVerificationStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Category {
  id: UUID;
  name: string;
  description?: string;
  icon?: string;
  trainerCount?: number;
  trainerType?: TrainerType | null;
}

export interface Subscription {
  id: UUID;
  userId: UUID;
  plan: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  features: string[];
}

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ";
export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP";

export interface Notification {
  id: UUID;
  userId?: UUID;
  type: string;
  channel?: NotificationChannel;
  title: string;
  body?: string;
  message?: string;
  link?: string;
  read: boolean;
  isRead?: boolean;
  status?: NotificationStatus;
  metadata?: Record<string, unknown>;
  resourceType?: string;
  resourceId?: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: UUID;
  conversationId?: UUID;
  senderId: UUID;
  senderName: string;
  body: string;
  content?: string;
  sender?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdAt: string;
}

export interface Conversation {
  id: UUID;
  title: string;
  type?: "DIRECT" | "GROUP";
  bookingId?: UUID;
  participants: { id: UUID; name: string; firstName?: string; lastName?: string; avatarUrl?: string; role?: string }[];
  lastMessage?: any;
  lastMessageAt?: string;
  unread: number;
  unreadCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface TrainerSearchParams {
  keyword?: string;
  category?: string;
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sessionType?: string;
  isVerified?: boolean;
  tier?: TrainerTier;
  trainerType?: TrainerType;
  verificationStatus?: string;
  credentialType?: CredentialType;
  sortBy?: "rating" | "price_asc" | "price_desc" | "reviews" | "newest" | "followers";
  isOrganization?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
  message?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

/* ===== Compatibility aliases for page components ===== */

export type Trainer = TrainerProfile & {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  isVerified: boolean;
  reviewCount?: number;
  sessionTypes?: SessionType[];
  skills: Skill[];
  certifications: Certification[];
  availability: AvailabilitySlot[];
  portfolio: PortfolioItem[];
};

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type SkillDemand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface Skill { id: string; name: string; categoryId?: string; category?: Category; trainerType?: TrainerType; description?: string; icon?: string; level?: SkillLevel; isActive?: boolean; demand?: SkillDemand; tags?: string[]; _count?: { trainers: number }; }
export interface Certification { id: string; name: string; issuer: string; year: number; documentUrl?: string; userId?: string; credentialType?: CredentialType; verificationStatus?: CredentialVerificationStatus; rejectedReason?: string; reviewNote?: string; }
export interface PortfolioItem { id: string; title: string; description?: string; imageUrl?: string; url?: string; }
export type PaginatedResponse<T> = Paginated<T>;
export interface PlatformStats { totalTrainers: number; totalBookings: number; totalReviews: number; averageRating: number; }
export interface RatingDistribution { 1: number; 2: number; 3: number; 4: number; 5: number; }
export type Transaction = WalletTransaction & { balanceAfter: number; };
export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { firstName: string; lastName: string; email: string; phone: string; password: string; role: 'CLIENT' | 'TRAINER'; bio?: string; specialization?: string; hourlyRate?: number; experience?: number; location?: string; skills?: string[]; }
export interface AuthResponse { accessToken: string; user: User; }
export interface ForgotPasswordPayload { email: string; }
export interface ResetPasswordPayload { token: string; password: string; }
export interface UpdateProfilePayload { firstName?: string; lastName?: string; phone?: string; bio?: string; specialization?: string; hourlyRate?: number; experience?: number; location?: string; city?: string; county?: string; languages?: string[]; portfolioUrl?: string; linkedinUrl?: string; websiteUrl?: string; sessionTypes?: string[]; }
export interface NotificationPreferences { emailNotifications: boolean; smsNotifications: boolean; pushNotifications: boolean; }
export interface ClientDashboardStats { upcomingBookings: number; completedSessions: number; walletBalance: number; totalSpent: number; }
export interface TrainerDashboardStats { upcomingSessions: number; completedSessions: number; walletBalance: number; totalEarned: number; averageRating: number; }
export interface EarningsData { date: string; amount: number; }
export interface CreateBookingPayload { trainerId: string; date?: string; startTime?: string; endTime?: string; scheduledAt?: string; duration: number; sessionType: SessionType | string; location?: string; notes?: string; paymentMethod?: 'WALLET' | 'MPESA'; }
export interface CreateReviewPayload { bookingId: string; rating: number; comment: string; }
export interface CreateCertificationPayload { name: string; issuer: string; year: number; documentUrl?: string; }
export interface SetAvailabilityPayload { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; }
export interface DepositPayload { amount: number; paymentMethod: 'MPESA'; phoneNumber?: string; }
export interface WithdrawPayload { amount: number; phoneNumber: string; }
export interface SendMessagePayload { conversationId?: string; recipientId?: string; content: string; }
export type Message = ChatMessage;

/* ===== Pillar 1: Milestones, Attendance, Content Access ===== */

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'RELEASED' | 'DISPUTED';

export interface Milestone {
  id: UUID;
  bookingId: UUID;
  title: string;
  description?: string;
  amount: number;
  orderIndex: number;
  status: MilestoneStatus;
  dueDate?: string;
  deliveredAt?: string;
  releasedAt?: string;
  releasedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMilestonePayload {
  title: string;
  description?: string;
  amount: number;
  orderIndex?: number;
  dueDate?: string;
}

export interface UpdateMilestonePayload {
  title?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
}

export type PresenceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceEntry {
  userId: UUID;
  presenceStatus: PresenceStatus;
  note?: string;
}

export interface AttendanceRecord {
  id: UUID;
  bookingId: UUID;
  milestoneId?: UUID;
  userId: UUID;
  presenceStatus: PresenceStatus;
  note?: string;
  recordedAt?: string;
  recordedBy?: string;
  user?: User;
  createdAt?: string;
}

export interface RecordAttendancePayload {
  milestoneId?: UUID;
  entries: AttendanceEntry[];
}

export interface ContentAccess {
  canAccess: boolean;
  reason?: string;
  escrowStatus?: string;
}

/* ===== Pillar 2: Course milestones + grading rubric ===== */

export type AssessmentType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TEXT" | "FILE_UPLOAD" | "CHECKBOX";

export interface CourseMilestone {
  id: UUID;
  courseId: UUID;
  title: string;
  description?: string;
  orderIndex: number;
  passingScore: number;
  weight: number;
  lessons?: Array<{ id: UUID; title: string; orderIndex?: number; contentType?: string; sortOrder?: number }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonAssessment {
  id: UUID;
  lessonId: UUID;
  question: string;
  type: AssessmentType;
  options?: string[];
  /** correctAnswer is only present on instructor responses; stripped for learners */
  correctAnswer?: string | string[];
  points: number;
  orderIndex: number;
  explanation?: string;
  createdAt?: string;
}

export interface LessonSubmission {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  answers: Record<string, string | string[]>;
  score: number;
  passed: boolean;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string | null;
  lesson?: { id: UUID; title: string; milestoneId?: UUID; contentType?: string };
  user?: { id: UUID; firstName: string; lastName: string; avatarUrl?: string };
}

export interface SubmitAssessmentResponse {
  id: UUID;
  score: number;
  passed: boolean;
  submittedAt: string;
  gradedAt: string | null;
  needsManualGrading?: boolean;
}

export interface MyGradeMilestone {
  milestoneId: UUID;
  title: string;
  bestScore: number;
  passingScore?: number;
  weight?: number;
  passed: boolean;
}

export interface MyGradeResponse {
  finalGrade: number;
  milestoneCount: number;
  milestones: MyGradeMilestone[];
  allMilestonesPassed: boolean;
}

export interface CallSession {
  id: UUID;
  conversationId?: UUID;
  initiatorId: string;
  type: "VOICE" | "VIDEO";
  status: "INITIATED" | "RINGING" | "ONGOING" | "COMPLETED" | "MISSED" | "FAILED";
  startedAt?: string;
  endedAt?: string;
  scheduledAt?: string;
  durationSec?: number;
  recordingUrl?: string;
  meetingUrl?: string;
  roomName?: string;
  meetingTitle?: string;
  participantIds?: string;
  recurrenceRule?: string;
  recurrenceParentId?: string;
  meetingPassword?: string;
  createdAt: string;
}
