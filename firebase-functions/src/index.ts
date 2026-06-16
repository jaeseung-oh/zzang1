import axios from "axios";
import { createHash } from "crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

initializeApp();

const db = getFirestore();
const storage = getStorage();
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const LEGAL_NOTICE =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 자발적인 교육 이수와 생활 실천 계획 정리를 돕는 민간 교육 서비스입니다.";

const COURSE_ACCESS_VALID_MONTHS = 3;
const COURSE_ACCESS_VALID_DAYS = 90;
const COURSE_PRICE_KRW: Record<string, number> = {
  "dui-prevention-basic": 55000,
  "rapid-sentencing-prep": 55000,
};
const DUI_COURSE_ID = "dui-prevention-basic";
const DUI_COURSE_TITLE = "음주운전 예방교육";
const DUI_TOTAL_LESSONS = 5;
const DUI_CERTIFICATE_ISSUER = {
  issuerName: process.env.CERTIFICATE_ISSUER_NAME || "리셋에듀센터",
  issuerBusinessNumber: process.env.CERTIFICATE_ISSUER_BUSINESS_NUMBER || "",
  issuerContact: process.env.CERTIFICATE_ISSUER_CONTACT || "",
  issuerEmail: process.env.CERTIFICATE_ISSUER_EMAIL || "",
};

function parsePurchaseExpiry(value: unknown) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date.getTime();
  }
  return null;
}

const COURSE_VIDEO_ASSETS: Record<
  string,
  Record<string, { storagePath: string; durationHintSeconds: number; streamUidEnvKey?: string }>
> = {
  "dui-prevention-basic": {
    "dui-lesson-1": {
      storagePath: "course-videos/rapid-sentencing-prep/lesson-1.mp4",
      durationHintSeconds: 600,
      streamUidEnvKey: "CLOUDFLARE_STREAM_DUI_LESSON_1_UID",
    },
    "dui-lesson-2": {
      storagePath: "course-videos/rapid-sentencing-prep/lesson-2.mp4",
      durationHintSeconds: 600,
      streamUidEnvKey: "CLOUDFLARE_STREAM_DUI_LESSON_2_UID",
    },
    "dui-lesson-3": {
      storagePath: "course-videos/rapid-sentencing-prep/lesson-3.mp4",
      durationHintSeconds: 600,
      streamUidEnvKey: "CLOUDFLARE_STREAM_DUI_LESSON_3_UID",
    },
    "dui-lesson-4": {
      storagePath: "course-videos/rapid-sentencing-prep/lesson-4.mp4",
      durationHintSeconds: 600,
      streamUidEnvKey: "CLOUDFLARE_STREAM_DUI_LESSON_4_UID",
    },
    "dui-lesson-5": {
      storagePath: "course-videos/rapid-sentencing-prep/lesson-5.mp4",
      durationHintSeconds: 600,
      streamUidEnvKey: "CLOUDFLARE_STREAM_DUI_LESSON_5_UID",
    },
    "dui-lesson-6": { storagePath: "course-videos/rapid-sentencing-prep/lesson-6.mp4", durationHintSeconds: 600 },
  },
};


type DraftInput = {
  documentType: "reflection-letter-guide" | "petition-letter-guide";
  caseType: "dui" | "sexual" | "drug" | "violence" | "other";
  caseStage: "police" | "prosecution" | "trial";
  remorseReason: string;
  familyContext: string;
  preventionPlan: string;
  specialNotes?: string;
  legalAccepted: boolean;
  userReviewAccepted: boolean;
};

type ConfirmPaymentRequest = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  uid?: string | null;
  courseId?: string | null;
  legalDisclaimerAccepted?: boolean;
  finalReviewResponsibilityAccepted?: boolean;
};

type ModuleProgressPayload = Record<
  string,
  {
    watchedSeconds: number;
    durationSeconds: number;
    completionRate: number;
    lastPlaybackPositionSeconds: number;
    isCompleted: boolean;
  }
>;

type SaveCourseProgressRequest = {
  courseId?: string;
  courseTitle?: string;
  caseType?: "dui" | "sexual" | "drug" | "violence" | "other";
  watchedSeconds?: number;
  durationSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  completionRate?: number;
  isCompleted?: boolean;
  legalAccepted?: boolean;
  userReviewAccepted?: boolean;
  moduleProgress?: ModuleProgressPayload;
};

type GetCourseVideoAccessRequest = {
  courseId?: string;
  moduleId?: string;
};

type IssueCertificateRequest = {
  courseId?: string;
};

type CorsResponse = {
  set(name: string, value: string): void;
};

function applyCors(response: CorsResponse) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

function getTossAuthHeader() {
  const tossSecretKey = process.env.TOSS_SECRET_KEY;

  if (!tossSecretKey) {
    throw new Error("TOSS_SECRET_KEY is not configured.");
  }

  return `Basic ${Buffer.from(`${tossSecretKey}:`).toString("base64")}`;
}

function assertValidInput(data: Partial<DraftInput>): asserts data is DraftInput {
  if (!data.legalAccepted || !data.userReviewAccepted) {
    throw new HttpsError("failed-precondition", "면책 고지 및 직접 검토 책임 확인이 필요합니다.");
  }

  if (!data.remorseReason?.trim() || !data.preventionPlan?.trim()) {
    throw new HttpsError("invalid-argument", "반성 사유와 재범 방지 계획은 필수입니다.");
  }

  if (!data.documentType || !data.caseType || !data.caseStage) {
    throw new HttpsError("invalid-argument", "필수 입력값이 누락되었습니다.");
  }
}

function assertValidProgressInput(data: SaveCourseProgressRequest): asserts data is Required<SaveCourseProgressRequest> {
  if (!data.courseId || !data.courseTitle || !data.caseType) {
    throw new HttpsError("invalid-argument", "수강 저장에 필요한 필수값이 누락되었습니다.");
  }

  if (typeof data.watchedSeconds !== "number" || Number.isFinite(data.watchedSeconds) === false || data.watchedSeconds < 0) {
    throw new HttpsError("invalid-argument", "watchedSeconds 형식이 올바르지 않습니다.");
  }

  if (typeof data.durationSeconds !== "number" || Number.isFinite(data.durationSeconds) === false || data.durationSeconds <= 0) {
    throw new HttpsError("invalid-argument", "durationSeconds 형식이 올바르지 않습니다.");
  }

  if (
    typeof data.lastPlaybackPositionSeconds !== "number" ||
    Number.isFinite(data.lastPlaybackPositionSeconds) === false ||
    data.lastPlaybackPositionSeconds < 0
  ) {
    throw new HttpsError("invalid-argument", "lastPlaybackPositionSeconds 형식이 올바르지 않습니다.");
  }

  if (typeof data.completionRate !== "number" || Number.isFinite(data.completionRate) === false) {
    throw new HttpsError("invalid-argument", "completionRate 형식이 올바르지 않습니다.");
  }

  if (typeof data.isCompleted !== "boolean") {
    throw new HttpsError("invalid-argument", "isCompleted 형식이 올바르지 않습니다.");
  }
}

function getAuthenticatedUid(request: { auth?: { uid?: string } | null }) {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  return uid;
}

function assertDateOfBirthText(value: unknown) {
  if (typeof value !== "string") {
    throw new HttpsError("failed-precondition", "수료증 발급을 위해 생년월일을 입력해 주세요.");
  }

  const matched = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    throw new HttpsError("failed-precondition", "생년월일은 YYYY-MM-DD 형식이어야 합니다.");
  }

  const [, yearText, monthText, dayText] = matched;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(year, month - 1, day);
  const valid =
    !Number.isNaN(candidate.getTime()) &&
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!valid) {
    throw new HttpsError("failed-precondition", "생년월일은 YYYY-MM-DD 형식이어야 합니다.");
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (candidate > todayStart) {
    throw new HttpsError("failed-precondition", "생년월일은 미래 날짜로 입력할 수 없습니다.");
  }

  return value.trim();
}

async function getCertificateIdentity(uid: string, options?: { lockIfMissing?: boolean; purchaseId?: string | null; lockSource?: "payment" | "completion" | "admin" }) {
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();
  const userData = userSnapshot.data() ?? {};
  const lockedIdentity = userData.certificateIdentity ?? {};
  const lockedName = typeof lockedIdentity.realName === "string" && lockedIdentity.realName.trim() ? lockedIdentity.realName.trim() : null;
  const lockedDateOfBirth = typeof lockedIdentity.dateOfBirth === "string" && lockedIdentity.dateOfBirth.trim() ? lockedIdentity.dateOfBirth.trim() : null;

  if (lockedName && lockedDateOfBirth) {
    return {
      realName: lockedName,
      dateOfBirth: assertDateOfBirthText(lockedDateOfBirth),
      isLocked: true,
    };
  }

  const realName =
    typeof userData.realName === "string" && userData.realName.trim()
      ? userData.realName.trim()
      : typeof userData.fullName === "string" && userData.fullName.trim()
        ? userData.fullName.trim()
        : null;

  if (!realName) {
    throw new HttpsError("failed-precondition", "회원가입 단계에서 저장한 실명이 필요합니다.");
  }

  const dateOfBirth = assertDateOfBirthText(userData.dateOfBirth ?? userData.birthDate ?? null);

  if (options?.lockIfMissing) {
    await userRef.set(
      {
        certificateIdentity: {
          realName,
          dateOfBirth,
          lockedAt: FieldValue.serverTimestamp(),
          lockSource: options.lockSource ?? "completion",
          purchaseId: options.purchaseId ?? null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return {
    realName,
    dateOfBirth,
    isLocked: false,
  };
}

async function getPaidPurchase(uid: string, courseId: string) {
  const snapshot = await db
    .collection("purchases")
    .where("uid", "==", uid)
    .where("courseId", "==", courseId)
    .where("paymentStatus", "==", "paid")
    .limit(20)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("failed-precondition", "결제 완료 이력이 확인되지 않아 수강 완료를 저장할 수 없습니다.");
  }

  const now = Date.now();
  const activePurchase = snapshot.docs.find((doc) => {
    const expiresAt = parsePurchaseExpiry(doc.data().expiresAt);
    return expiresAt === null || expiresAt >= now;
  });

  if (!activePurchase) {
    throw new HttpsError("failed-precondition", "해당 강의의 수강기간은 결제일로부터 90일이며, 현재 수강기간이 만료되어 수강할 수 없습니다.");
  }

  return activePurchase;
}


function parseTimestampToDate(value: unknown) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function formatCertificateDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createCertificateNumber(certificateId: string, issuedAt: Date) {
  const suffix = createHash("sha256").update(certificateId).digest("hex").slice(0, 6).toUpperCase();
  return `CERT-DUI-${formatCertificateDate(issuedAt)}-${suffix}`;
}

async function getActiveEnrollment(uid: string, courseId: string) {
  const enrollmentId = `${uid}_${courseId}`;
  const enrollmentRef = db.collection("enrollments").doc(enrollmentId);
  const snapshot = await enrollmentRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  if ((data.userId ?? data.uid) !== uid || data.courseId !== courseId || data.paymentStatus !== "paid") {
    return null;
  }

  if (data.accessStatus !== "active") {
    return null;
  }

  const expiresAt = parseTimestampToDate(data.expiresAt);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return null;
  }

  return { ref: enrollmentRef, id: enrollmentId, data };
}

function isActiveEnrollmentData(data: Record<string, any> | undefined, uid: string, courseId: string) {
  if (!data) return false;
  const ownerId = data.userId ?? data.uid;
  const paymentStatus = String(data.paymentStatus ?? "").toLowerCase();
  const accessStatus = String(data.enrollmentStatus ?? data.accessStatus ?? "").toLowerCase();
  const expiresAt = parseTimestampToDate(data.expiresAt);
  return ownerId === uid && data.courseId === courseId && paymentStatus === "paid" && accessStatus === "active" && (!expiresAt || expiresAt.getTime() >= Date.now());
}

async function hasVerifiedCourseAccess(uid: string, courseId: string) {
  const [userDoc, userRecord] = await Promise.all([
    db.collection("users").doc(uid).get().catch(() => null),
    getAuth().getUser(uid).catch(() => null),
  ]);

  const email = String(userRecord?.email ?? "").toLowerCase();
  const role = userDoc?.exists ? userDoc.data()?.role : null;
  if (userRecord?.customClaims?.admin === true || role === "admin" || email === "cfv47@naver.com") {
    return true;
  }

  const [rootEnrollment, nestedEnrollment] = await Promise.all([
    db.collection("enrollments").doc(uid + "_" + courseId).get(),
    db.collection("users").doc(uid).collection("enrollments").doc(courseId).get(),
  ]);

  return isActiveEnrollmentData(rootEnrollment.data(), uid, courseId) || isActiveEnrollmentData(nestedEnrollment.data(), uid, courseId);
}

async function getLatestPaidPurchaseForCertificate(uid: string, courseId: string) {
  const snapshot = await db
    .collection("purchases")
    .where("uid", "==", uid)
    .where("courseId", "==", courseId)
    .where("paymentStatus", "==", "paid")
    .limit(20)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("failed-precondition", "정상 결제된 교육과정이 확인되지 않습니다.");
  }

  const now = Date.now();
  const activePurchase = snapshot.docs.find((doc) => {
    const data = doc.data();
    const expiresAt = parseTimestampToDate(data.expiresAt);
    return (data.accessStatus ?? "active") === "active" && (!expiresAt || expiresAt.getTime() >= now);
  });

  if (!activePurchase) {
    throw new HttpsError("failed-precondition", "수강기간이 만료되어 수료증을 발급받을 수 없습니다.");
  }

  return activePurchase;
}

async function issueDuiCertificate(uid: string, courseId: string) {
  if (courseId !== DUI_COURSE_ID) {
    throw new HttpsError("invalid-argument", "지원하지 않는 교육과정입니다.");
  }

  const certificateId = `${uid}_${courseId}`;
  const certificateRef = db.collection("certificates").doc(certificateId);
  const existingCertificate = await certificateRef.get();

  if (existingCertificate.exists) {
    const existing = existingCertificate.data() ?? {};
    if (existing.documentType === "completion") {
      const existingNo = existing.certificateNo ?? existing.issueNumber ?? "";
      const issuedAt = parseTimestampToDate(existing.issuedAt ?? existing.certificateIssuedAt) ?? new Date();
      const [activeEnrollment, activePurchase] = await Promise.all([
        getActiveEnrollment(uid, courseId).catch(() => null),
        getLatestPaidPurchaseForCertificate(uid, courseId).catch(() => null),
      ]);

      if (activeEnrollment) {
        await activeEnrollment.ref.set(
          {
            certificateIssued: true,
            certificateIssuedAt: existing.issuedAt ?? issuedAt,
            certificateId,
            certificateNo: existingNo,
            completedAt: existing.completedAt ?? issuedAt,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (activePurchase) {
        await activePurchase.ref.set(
          {
            certificateIssued: true,
            certificateIssuedAt: existing.issuedAt ?? issuedAt,
            certificateId,
            certificateNo: existingNo,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        certificateId,
        certificateNo: existingNo,
        issuedAt: existing.issuedAt ?? existing.createdAt ?? null,
        alreadyIssued: true,
      };
    }
  }

  const [userSnapshot, progressSnapshot, activeEnrollment, purchaseSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("courseProgress").doc(`${uid}_${courseId}`).get(),
    getActiveEnrollment(uid, courseId),
    getLatestPaidPurchaseForCertificate(uid, courseId),
  ]);

  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "회원 정보를 확인할 수 없습니다.");
  }

  if (!activeEnrollment) {
    throw new HttpsError("failed-precondition", "정상 결제된 교육과정이 확인되지 않습니다.");
  }

  const userData = userSnapshot.data() ?? {};
  const identity = await getCertificateIdentity(uid, {
    lockIfMissing: true,
    purchaseId: activeEnrollment.id,
    lockSource: "completion",
  });
  const email = typeof userData.email === "string" ? userData.email : "";
  const phoneNumber = typeof userData.phoneNumber === "string" ? userData.phoneNumber : "";
  const progressData = progressSnapshot.data() ?? {};
  const enrollmentData = activeEnrollment.data;
  const completedLessons = Math.max(Number(enrollmentData.completedLessons || 0), Number(progressData.completedModuleCount || 0));
  const progress = Math.max(Number(enrollmentData.progress || 0), Number(progressData.completionRate || 0));
  const progressCompleted = Boolean(progressData.isCompleted) || completedLessons >= DUI_TOTAL_LESSONS || progress >= 100;

  const purchasedAt = parseTimestampToDate(enrollmentData.purchasedAt) ?? parseTimestampToDate(purchaseSnapshot.data().purchasedAt ?? purchaseSnapshot.data().approvedAt);
  const expiresAt = parseTimestampToDate(enrollmentData.expiresAt) ?? parseTimestampToDate(purchaseSnapshot.data().expiresAt);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new HttpsError("failed-precondition", "수강기간이 만료되어 수료증을 발급받을 수 없습니다.");
  }

  const completedAt = progressCompleted ? (parseTimestampToDate(progressData.completedAt) ?? new Date()) : null;
  const issuedAt = new Date();
  const certificateNo = createCertificateNumber(certificateId, issuedAt);
  const certificateRecord = {
    certificateId,
    certificateNo,
    issueNumber: certificateNo,
    userId: uid,
    uid,
    userName: identity.realName,
    birthDate: identity.dateOfBirth,
    dateOfBirth: identity.dateOfBirth,
    email,
    phoneNumber,
    courseId,
    courseTitle: DUI_COURSE_TITLE,
    totalLessons: DUI_TOTAL_LESSONS,
    completedLessons,
    progress,
    completedAt,
    purchasedAt,
    expiresAt,
    issuedAt,
    certificateIssuedAt: issuedAt,
    issuerName: DUI_CERTIFICATE_ISSUER.issuerName,
    issuerBusinessNumber: DUI_CERTIFICATE_ISSUER.issuerBusinessNumber,
    issuerContact: DUI_CERTIFICATE_ISSUER.issuerContact,
    issuerEmail: DUI_CERTIFICATE_ISSUER.issuerEmail,
    status: "issued",
    documentType: progressCompleted ? "completion" : "attendance",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    const freshCertificate = await transaction.get(certificateRef);
    if (freshCertificate.exists) {
      return;
    }

    transaction.set(certificateRef, certificateRecord, { merge: true });
    transaction.set(
      activeEnrollment.ref,
      {
        certificateIssued: true,
        certificateIssuedAt: issuedAt,
        attendanceCertificateIssued: !progressCompleted,
        attendanceCertificateIssuedAt: !progressCompleted ? issuedAt : null,
        certificateId,
        certificateNo,
        completedAt,
        completedLessons,
        progress,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    transaction.set(
      purchaseSnapshot.ref,
      {
        certificateIssued: true,
        certificateIssuedAt: issuedAt,
        attendanceCertificateIssued: !progressCompleted,
        attendanceCertificateIssuedAt: !progressCompleted ? issuedAt : null,
        certificateId,
        certificateNo,
        completedLessons,
        progress,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  const finalSnapshot = await certificateRef.get();
  const finalData = finalSnapshot.data() ?? certificateRecord;
  return {
    certificateId,
    certificateNo: finalData.certificateNo ?? certificateNo,
    issuedAt: finalData.issuedAt ?? issuedAt,
    alreadyIssued: false,
  };
}

function getCourseVideoAsset(courseId: string, moduleId: string) {
  const courseAssets = COURSE_VIDEO_ASSETS[courseId];
  const asset = courseAssets?.[moduleId];

  if (!asset) {
    throw new HttpsError("not-found", "등록된 강의 영상 정보를 찾을 수 없습니다.");
  }

  return asset;
}

function buildPrompt(data: DraftInput) {
  const documentLabel =
    data.documentType === "reflection-letter-guide" ? "성찰문 글쓰기 가이드" : "주변인 의견문 정리 가이드";

  return [
    "당신은 사용자가 자신의 경험과 생활 변화를 차분히 정리할 수 있도록 돕는 성찰문 글쓰기 가이드입니다.",
    "반드시 지켜야 할 원칙:",
    "1. 법률 자문, 판결 예측, 결과 보장 표현 금지",
    "2. 사실관계와 반성, 재범 방지 계획 중심으로 차분하고 진정성 있게 작성",
    "3. 사용자가 직접 수정할 수 있도록 과장되지 않은 문장 구조 제공",
    "4. 변호사, 법률대리, 법률문서 대행처럼 읽히는 문장 금지",
    "5. 마지막 문단에는 사용자가 사실관계를 다시 확인해야 한다는 취지의 안내 한 줄 포함",
    "",
    `문서 유형: ${documentLabel}`,
    `사건 유형: ${data.caseType}`,
    `절차 단계: ${data.caseStage}`,
    `반성 사유: ${data.remorseReason}`,
    `가족 및 생활 배경: ${data.familyContext || "해당 없음"}`,
    `재범 방지 계획: ${data.preventionPlan}`,
    `추가 메모: ${data.specialNotes?.trim() || "해당 없음"}`,
    "",
    "출력 형식:",
    "- 제목 1개",
    "- 본문 4~6개 단락",
    "- 지나치게 장황하지 않게 작성",
  ].join("\n");
}

function buildFallbackDraft(data: DraftInput) {
  const title =
    data.documentType === "reflection-letter-guide" ? "성찰문 글쓰기 가이드" : "주변인 의견문 정리 가이드";

  return `${title}\n\n저는 이번 사건으로 인해 제 행동이 사회와 주변 사람들에게 미칠 수 있는 영향을 무겁게 받아들이고 있습니다. 경솔했던 판단과 부주의한 태도에 대해 깊이 반성하고 있으며, 같은 일이 반복되지 않도록 생활 전반을 다시 정비하고자 합니다.\n\n특히 ${data.remorseReason.trim()}와 같은 점을 계속 돌아보며, 단순한 후회에 그치지 않고 실제 행동 변화로 이어가야 한다고 생각하고 있습니다. ${data.familyContext.trim() || "가족과 주변 환경 또한 제게 더 신중한 태도를 요구하고 있습니다."}\n\n앞으로는 ${data.preventionPlan.trim()}와 같은 구체적인 재범 방지 계획을 실천하면서, 다시는 유사한 일이 발생하지 않도록 교육과 생활 관리를 병행하겠습니다.\n\n본 문안은 자기점검과 글 정리를 돕기 위한 참고용 예시이며, 실제 사용 전에는 사실관계와 표현을 직접 다시 확인하고 자신의 말로 수정해 사용하시기 바랍니다.`;
}

export const confirmPayment = onRequest({ region: "asia-northeast3" }, async (request, response) => {
  applyCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    response.status(400).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const {
    paymentKey,
    orderId,
    amount,
    uid = null,
    courseId = null,
    legalDisclaimerAccepted = false,
    finalReviewResponsibilityAccepted = false,
  } = (request.body || {}) as ConfirmPaymentRequest;

  if (!paymentKey || !orderId || typeof amount !== "number" || !uid || !courseId) {
    response.status(400).json({ message: "paymentKey, orderId, amount, uid, courseId가 모두 필요합니다." });
    return;
  }

  const expectedAmount = COURSE_PRICE_KRW[courseId];
  if (!expectedAmount || amount !== expectedAmount) {
    response.status(400).json({ message: "결제 금액이 현재 강의 수강료와 일치하지 않습니다." });
    return;
  }

  try {
    const tossAuthHeader = getTossAuthHeader();
    const tossResponse = await axios.post(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        paymentKey,
        orderId,
        amount,
      },
      {
        headers: {
          Authorization: tossAuthHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const approved = tossResponse.data;
    const accessStartsAt = approved.approvedAt ? new Date(approved.approvedAt) : new Date();
    const expiresAt = new Date(accessStartsAt.getTime() + COURSE_ACCESS_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await db.collection("purchases").doc(orderId).set(
      {
        uid,
        courseId,
        orderId,
        paymentKey,
        paymentStatus: "paid",
        paymentProvider: "toss-payments",
        amount,
        method: approved.method || null,
        receiptUrl: approved.receipt?.url || null,
        legalDisclaimerAccepted,
        finalReviewResponsibilityAccepted,
        orderedAt: approved.approvedAt || null,
        approvedAt: approved.approvedAt || null,
        accessValidMonths: COURSE_ACCESS_VALID_MONTHS,
        accessValidDays: COURSE_ACCESS_VALID_DAYS,
        expiresAt,
        rawResponse: approved,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await getCertificateIdentity(uid, {
      lockIfMissing: true,
      purchaseId: orderId,
      lockSource: "payment",
    }).catch(() => null);

    response.status(200).json({
      ...approved,
      savedPurchaseId: orderId,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      response.status(400).json({
        message: error.response?.data?.message || "토스 결제 승인 중 오류가 발생했습니다.",
        code: error.response?.data?.code || "TOSS_CONFIRM_FAILED",
      });
      return;
    }

    response.status(400).json({
      message: "토스 결제 승인 중 알 수 없는 오류가 발생했습니다.",
    });
  }
});

export const saveCourseProgress = onCall({ region: "asia-northeast3" }, async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = request.data as SaveCourseProgressRequest;
  assertValidProgressInput(data);

  const certificateIdentity = await getCertificateIdentity(uid, {
    lockIfMissing: false,
  });
  const learnerName = certificateIdentity.realName;
  const progressId = `${uid}_${data.courseId}`;
  const moduleProgress = Object.fromEntries(
    Object.entries(data.moduleProgress || {}).map(([moduleId, item]) => {
      const durationSeconds = Math.max(1, Math.round(item.durationSeconds));
      const watchedSeconds = Math.max(0, Math.min(durationSeconds, Math.round(item.watchedSeconds)));
      const lastPlaybackPositionSeconds = Math.max(0, Math.min(durationSeconds, Math.round(item.lastPlaybackPositionSeconds)));
      const completionRate = Math.max(0, Math.min(100, Math.floor((watchedSeconds / durationSeconds) * 100)));

      return [
        moduleId,
        {
          watchedSeconds,
          durationSeconds,
          completionRate,
          lastPlaybackPositionSeconds,
          isCompleted: item.isCompleted || completionRate >= 95,
        },
      ];
    })
  ) as ModuleProgressPayload;
  const durationSeconds = Object.values(moduleProgress).length
    ? Object.values(moduleProgress).reduce((sum, item) => sum + item.durationSeconds, 0)
    : Math.max(1, Math.round(data.durationSeconds));
  const watchedSeconds = Object.values(moduleProgress).length
    ? Object.values(moduleProgress).reduce((sum, item) => sum + item.watchedSeconds, 0)
    : Math.max(0, Math.min(durationSeconds, Math.round(data.watchedSeconds)));
  const lastPlaybackPositionSeconds = Math.max(0, Math.min(durationSeconds, Math.round(data.lastPlaybackPositionSeconds)));
  const completionRate = Math.max(0, Math.min(100, Math.floor((watchedSeconds / durationSeconds) * 100)));
  const remainingSeconds = Math.max(durationSeconds - watchedSeconds, 0);
  const completedModuleCount = Object.values(moduleProgress).filter((item) => item.isCompleted).length;
  const totalModuleCount = Object.keys(moduleProgress).length;
  const isCompleted = totalModuleCount > 0 ? completedModuleCount === totalModuleCount : data.isCompleted || completionRate >= 95;
  const purchaseSnapshot = isCompleted ? await getPaidPurchase(uid, data.courseId).catch(() => null) : null;
  const activeEnrollment = isCompleted ? await getActiveEnrollment(uid, data.courseId).catch(() => null) : null;
  if (purchaseSnapshot) {
    await getCertificateIdentity(uid, {
      lockIfMissing: true,
      purchaseId: activeEnrollment?.id ?? purchaseSnapshot.id,
      lockSource: "completion",
    });
  }
  const certificateEligible = isCompleted && Boolean(purchaseSnapshot) && Boolean(activeEnrollment) && Boolean(data.legalAccepted) && Boolean(data.userReviewAccepted);

  await db.collection("courseProgress").doc(progressId).set(
    {
      uid,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      purchaseId: purchaseSnapshot?.id || null,
      learnerName,
      caseType: data.caseType,
      watchedSeconds,
      durationSeconds,
      completionRate,
      remainingSeconds,
      lastPlaybackPositionSeconds,
      completedModuleCount,
      totalModuleCount,
      moduleProgress,
      isCompleted,
      legalDisclaimerAccepted: Boolean(data.legalAccepted),
      userReviewAccepted: Boolean(data.userReviewAccepted),
      completedAt: isCompleted ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const issuedCertificates: Array<{
    certificateId: string;
    documentType: string;
    downloadUrl: string;
    issueNumber: string;
  }> = [];

  if (activeEnrollment) {
    await activeEnrollment.ref.set(
      {
        progress: completionRate,
        completedLessons: completedModuleCount,
        totalLessons: Math.max(totalModuleCount, DUI_TOTAL_LESSONS),
        completedAt: isCompleted ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (purchaseSnapshot) {
    await purchaseSnapshot.ref.set(
      {
        progress: completionRate,
        completedLessons: completedModuleCount,
        totalLessons: Math.max(totalModuleCount, DUI_TOTAL_LESSONS),
        completedAt: isCompleted ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (certificateEligible && purchaseSnapshot) {
    const certificate = await issueDuiCertificate(uid, data.courseId);
    issuedCertificates.push({
      certificateId: certificate.certificateId,
      documentType: "completion",
      downloadUrl: `/certificate?certificateId=${encodeURIComponent(certificate.certificateId)}`,
      issueNumber: certificate.certificateNo,
    });
  }

  return {
    progressId,
    completionRate,
    isCompleted,
    paymentVerified: Boolean(purchaseSnapshot),
    certificateEligible,
    issuedCertificates,
  };
});

export const issueCertificate = onCall({ region: "asia-northeast3" }, async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = (request.data || {}) as IssueCertificateRequest;
  const courseId = data.courseId?.trim() || DUI_COURSE_ID;

  try {
    return await issueDuiCertificate(uid, courseId);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error(error);
    throw new HttpsError("internal", "수료증 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
});

export const syncEmailVerificationStatus = onCall({ region: "asia-northeast3" }, async (request) => {
  const uid = getAuthenticatedUid(request);
  const userRecord = await getAuth().getUser(uid);
  const isEmailVerified = Boolean(userRecord.emailVerified);
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();
  const existing = snapshot.data() ?? {};
  const resolvedName =
    typeof existing.realName === "string" && existing.realName.trim()
      ? existing.realName.trim()
      : typeof existing.fullName === "string" && existing.fullName.trim()
        ? existing.fullName.trim()
        : null;

  await userRef.set(
    {
      fullName: resolvedName,
      realName: resolvedName,
      email: userRecord.email ?? existing.email ?? null,
      isEmailVerified,
      emailVerifiedAt: isEmailVerified ? FieldValue.serverTimestamp() : existing.emailVerifiedAt ?? null,
      provider: existing.provider ?? "password",
      providerLabel: existing.providerLabel ?? "이메일 회원",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existing.createdAt ?? FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    isEmailVerified,
    email: userRecord.email ?? null,
  };
});

export const getCourseVideoAccess = onCall({ region: "asia-northeast3" }, async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = (request.data || {}) as GetCourseVideoAccessRequest;
  const courseId = data.courseId?.trim();
  const moduleId = data.moduleId?.trim();

  if (!courseId || !moduleId) {
    throw new HttpsError("invalid-argument", "courseId와 moduleId가 필요합니다.");
  }

  const allowed = await hasVerifiedCourseAccess(uid, courseId);
  if (!allowed) {
    throw new HttpsError("permission-denied", "수강권 결제 후 이용할 수 있습니다.");
  }

  const asset = getCourseVideoAsset(courseId, moduleId);
  const streamUid = asset.streamUidEnvKey ? process.env[asset.streamUidEnvKey]?.trim() : "";

  if (streamUid) {
    return {
      provider: "cloudflare-stream",
      streamUid,
      videoUrl: `https://iframe.videodelivery.net/${streamUid}`,
      expiresAt: Date.now() + 1000 * 60 * 60,
      durationHintSeconds: asset.durationHintSeconds,
    };
  }

  const bucket = storage.bucket();
  const file = bucket.file(asset.storagePath);
  const [exists] = await file.exists();

  if (!exists) {
    throw new HttpsError("not-found", "등록된 강의 영상 파일을 찾을 수 없습니다.");
  }

  const expiresAt = Date.now() + 1000 * 60 * 15;
  const [videoUrl] = await file.getSignedUrl({
    action: "read",
    expires: expiresAt,
    version: "v4",
  });

  return {
    provider: "storage",
    videoUrl,
    expiresAt,
    durationHintSeconds: asset.durationHintSeconds,
  };
});

export const generateSentencingDraft = onCall({ region: "asia-northeast3" }, async (request) => {
  const data = request.data as Partial<DraftInput>;
  assertValidInput(data);

  const warnings = [
    LEGAL_NOTICE,
    "생성 결과는 참고용 초안입니다. 제출 전 사용자가 직접 사실관계를 확인하고 수정해야 합니다.",
  ];

  let draft = buildFallbackDraft(data);

  if (openai) {
    const completion = await openai.responses.create({
      model: "gpt-5-mini",
      input: buildPrompt(data),
    });

    const outputText = completion.output_text?.trim();
    if (outputText) {
      draft = outputText;
    }
  }

  const docRef = await db.collection("aiDocuments").add({
    uid: request.auth?.uid || null,
    purchaseId: null,
    documentType: data.documentType,
    caseType: data.caseType,
    caseStage: data.caseStage,
    remorseReason: data.remorseReason,
    familyContext: data.familyContext || "",
    preventionPlan: data.preventionPlan,
    specialNotes: data.specialNotes || "",
    generatedDraft: draft,
    userEditedDraft: draft,
    userConfirmedManualReview: data.userReviewAccepted,
    legalDisclaimerAccepted: data.legalAccepted,
    legalNoticeText: LEGAL_NOTICE,
    warnings,
    version: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    documentId: docRef.id,
    draft,
    warnings,
  };
});
