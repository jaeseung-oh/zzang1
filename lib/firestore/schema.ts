export type CaseType = "dui" | "sexual" | "drug" | "violence" | "other";

export interface UserProfile {
  fullName: string;
  realName?: string;
  email: string | null;
  phoneNumber: string | null;
  dateOfBirth?: string;
  birthDate?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  caseType?: CaseType;
  caseStage?: "police" | "prosecution" | "trial";
  deadlineAt?: string;
  marketingConsent?: boolean;
  legalNoticeAcceptedAt?: string | null;
  provider: string;
  providerLabel?: string;
  nickname?: string | null;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  caseCategory: CaseType[];
  durationMinutes: number;
  price: number;
  includedDocuments: string[];
  complianceNotice: string;
  isActive: boolean;
}

export interface Purchase {
  uid: string | null;
  courseId: string | null;
  orderId: string;
  paymentKey: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentProvider: string;
  amount: number;
  method?: string | null;
  receiptUrl?: string | null;
  legalDisclaimerAccepted: boolean;
  finalReviewResponsibilityAccepted: boolean;
  orderedAt: string | null;
  approvedAt?: string | null;
}

export interface Certificate {
  uid: string;
  purchaseId: string;
  documentType: "completion" | "psychology-report" | "compliance-pledge";
  issueNumber: string;
  downloadUrl: string;
  submittedByUser: boolean;
  issuedAt: string;
}

export interface CourseModuleProgress {
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  lastPlaybackPositionSeconds: number;
  isCompleted: boolean;
}

export interface CourseProgress {
  uid: string;
  courseId: string;
  courseTitle: string;
  purchaseId: string | null;
  learnerName: string;
  caseType: CaseType;
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  remainingSeconds: number;
  lastPlaybackPositionSeconds: number;
  completedModuleCount: number;
  totalModuleCount: number;
  moduleProgress: Record<string, CourseModuleProgress>;
  isCompleted: boolean;
  legalDisclaimerAccepted: boolean;
  userReviewAccepted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AiDraftDocument {
  uid: string;
  purchaseId: string | null;
  documentType: "reflection-letter-guide" | "petition-letter-guide";
  caseType: CaseType;
  remorseReason: string;
  familyContext: string;
  preventionPlan: string;
  generatedDraft: string;
  userEditedDraft: string;
  userConfirmedManualReview: boolean;
  createdAt: string;
}

export interface ReviewDocument {
  uid: string;
  authorName: string;
  courseLabel: string;
  title: string;
  body: string;
  rating: number;
  createdAt: string;
  updatedAt?: string;
}
