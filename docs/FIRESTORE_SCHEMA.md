# Firestore Schema Design

## Overview

이 서비스는 법률 대리나 법률 검토를 제공하는 구조가 아니라,
사용자가 스스로 법원 제출용 양형자료를 준비할 수 있도록 돕는 교육 및 문서 보조 서비스입니다.
따라서 결제, 수강, 문서 발급, AI 초안 작성 이력뿐 아니라 면책 고지 동의와 사용자 최종 검토 확인 기록도 함께 저장합니다.

## Collections

### users/{uid}
- fullName: string
- phone: string
- birthDate: string
- caseType: "dui" | "sexual" | "drug" | "violence" | "other"
- caseStage: "police" | "prosecution" | "trial"
- deadlineAt: Timestamp
- marketingConsent: boolean
- legalNoticeAcceptedAt: Timestamp | null
- createdAt: Timestamp
- lastLoginAt: Timestamp

### courses/{courseId}
- slug: string
- title: string
- subtitle: string
- caseCategory: string[]
- durationMinutes: number
- price: number
- includedDocuments: string[]
- curriculum: string[]
- isActive: boolean
- complianceNotice: string

### purchases/{purchaseId}
- uid: string
- courseId: string
- paymentStatus: "pending" | "paid" | "failed" | "refunded"
- paymentProvider: string
- amount: number
- receiptUrl: string | null
- legalDisclaimerAccepted: boolean
- finalReviewResponsibilityAccepted: boolean
- orderedAt: Timestamp
- expiresAt: Timestamp

### courseProgress/{progressId}
- uid: string
- purchaseId: string
- courseId: string
- watchedSeconds: number
- completionRate: number
- isCompleted: boolean
- completedAt: Timestamp | null

### certificates/{certificateId}
- uid: string
- purchaseId: string
- courseId: string
- documentType: "completion" | "psychology-report" | "compliance-pledge"
- issueNumber: string
- storagePath: string
- downloadUrl: string
- issuedAt: Timestamp
- submittedByUser: boolean

### aiDocuments/{documentId}
- uid: string
- purchaseId: string | null
- documentType: "reflection-letter-guide" | "petition-letter-guide"
- caseType: string
- remorseReason: string
- familyContext: string
- preventionPlan: string
- generatedDraft: string
- userEditedDraft: string
- userConfirmedManualReview: boolean
- version: number
- createdAt: Timestamp

## Functions Trigger Flow

1. purchase paid
2. legalDisclaimerAccepted and finalReviewResponsibilityAccepted stored
3. user watches VOD
4. courseProgress.isCompleted -> true
5. Cloud Functions generates 3 PDFs
6. certificates documents saved in Storage + Firestore
7. dashboard enables download after user review
