import axios from "axios";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

initializeApp();

const db = getFirestore();
const storage = getStorage();
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const tossSecretKey = "test_sk_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const tossAuthHeader = `Basic ${Buffer.from(`${tossSecretKey}:`).toString("base64")}`;

const LEGAL_NOTICE =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 자발적인 교육 이수와 생활 실천 계획 정리를 돕는 민간 교육 서비스입니다.";

const COURSE_COMPLETION_DOCUMENTS = [
  {
    documentType: "completion",
    title: "건전음주 교육 이수증",
    subtitle: "1시간 온라인 교육 과정 이수 확인",
    body: [
      "신청자는 자기점검과 재발 방지 학습을 위한 1시간 온라인 교육 과정을 수료했습니다.",
      "본 문서는 사용자의 자발적인 교육 참여와 이수 사실을 확인하기 위한 민간 교육 자료입니다.",
    ],
  },
  {
    documentType: "psychology-report",
    title: "인지행동 심리검사 결과지",
    subtitle: "자기 점검 기반 재범 방지 계획 정리",
    body: [
      "신청자는 사건 이후 생활 관리 계획과 재범 방지 실행 항목을 점검했습니다.",
      "본 결과지는 자기 점검용 교육 자료이며 법률적 판단이나 의료적 진단을 의미하지 않습니다.",
    ],
  },
  {
    documentType: "compliance-pledge",
    title: "준법 서약서",
    subtitle: "재발 방지와 생활 관리 계획 서약",
    body: [
      "신청자는 향후 동일 또는 유사한 일이 반복되지 않도록 생활 관리 계획을 수립했습니다.",
      "본 서약 문구는 사용자의 자필 서명과 최종 검토를 거쳐 개인 기록용 또는 교육 확인용으로 활용할 수 있습니다.",
    ],
  },
] as const;

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
};

type CorsResponse = {
  set(name: string, value: string): void;
};

function applyCors(response: CorsResponse) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
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

async function getUserFullName(uid: string) {
  const userSnapshot = await db.collection("users").doc(uid).get();
  const fullName = userSnapshot.data()?.fullName;

  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new HttpsError("failed-precondition", "회원가입 단계에서 저장한 실명이 필요합니다.");
  }

  return fullName.trim();
}

async function getPaidPurchase(uid: string, courseId: string) {
  const snapshot = await db
    .collection("purchases")
    .where("uid", "==", uid)
    .where("courseId", "==", courseId)
    .where("paymentStatus", "==", "paid")
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("failed-precondition", "결제 완료 이력이 확인되지 않아 수강 완료를 저장할 수 없습니다.");
  }

  return snapshot.docs[0];
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

function formatCaseType(caseType: SaveCourseProgressRequest["caseType"]) {
  const labels = {
    dui: "음주운전",
    sexual: "성범죄",
    drug: "마약",
    violence: "폭행",
    other: "기타",
  } as const;

  return caseType ? labels[caseType] : "기타";
}

function createIssueNumber(uid: string, documentType: string, issuedAt: string) {
  const compactDate = issuedAt.slice(0, 10).replace(/-/g, "");
  return `RLE-${compactDate}-${documentType.toUpperCase()}-${uid.slice(0, 6).toUpperCase()}`;
}

async function buildCertificatePdfBytes(args: {
  learnerName: string;
  courseTitle: string;
  documentTitle: string;
  subtitle: string;
  issueNumber: string;
  issuedAt: string;
  caseTypeLabel: string;
  body: readonly string[];
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, color: rgb(0.03, 0.07, 0.12) });
  page.drawRectangle({ x: 46, y: 46, width: 750, height: 503, borderColor: rgb(0.83, 0.68, 0.38), borderWidth: 1.5 });

  page.drawText("RESET EDU CENTER", {
    x: 64,
    y: 515,
    size: 14,
    font: titleFont,
    color: rgb(0.94, 0.8, 0.52),
  });

  page.drawText(args.documentTitle, {
    x: 64,
    y: 455,
    size: 28,
    font: titleFont,
    color: rgb(0.96, 0.96, 0.96),
  });

  page.drawText(args.subtitle, {
    x: 64,
    y: 425,
    size: 13,
    font: bodyFont,
    color: rgb(0.75, 0.78, 0.82),
  });

  page.drawText(`성명: ${args.learnerName}`, {
    x: 64,
    y: 370,
    size: 16,
    font: titleFont,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText(`사건 유형: ${args.caseTypeLabel}`, {
    x: 64,
    y: 342,
    size: 12,
    font: bodyFont,
    color: rgb(0.8, 0.83, 0.87),
  });

  page.drawText(`과정명: ${args.courseTitle}`, {
    x: 64,
    y: 318,
    size: 12,
    font: bodyFont,
    color: rgb(0.8, 0.83, 0.87),
  });

  page.drawText(`문서번호: ${args.issueNumber}`, {
    x: 64,
    y: 294,
    size: 12,
    font: bodyFont,
    color: rgb(0.8, 0.83, 0.87),
  });

  page.drawText(`발급시각: ${args.issuedAt}`, {
    x: 64,
    y: 270,
    size: 12,
    font: bodyFont,
    color: rgb(0.8, 0.83, 0.87),
  });

  let y = 218;
  for (const line of args.body) {
    page.drawText(line, {
      x: 64,
      y,
      size: 13,
      font: bodyFont,
      color: rgb(0.9, 0.92, 0.95),
      maxWidth: 700,
    });
    y -= 28;
  }

  page.drawText(LEGAL_NOTICE, {
    x: 64,
    y: 92,
    size: 10,
    font: bodyFont,
    color: rgb(0.76, 0.78, 0.8),
    maxWidth: 700,
  });

  return pdfDoc.save();
}

async function storeCertificate(args: {
  uid: string;
  courseId: string;
  courseTitle: string;
  purchaseId: string;
  learnerName: string;
  caseTypeLabel: string;
  documentType: (typeof COURSE_COMPLETION_DOCUMENTS)[number]["documentType"];
  title: string;
  subtitle: string;
  body: readonly string[];
  issuedAt: string;
}) {
  const certificateId = `${args.uid}_${args.courseId}_${args.documentType}`;
  const issueNumber = createIssueNumber(args.uid, args.documentType, args.issuedAt);
  const pdfBytes = await buildCertificatePdfBytes({
    learnerName: args.learnerName,
    courseTitle: args.courseTitle,
    documentTitle: args.title,
    subtitle: args.subtitle,
    issueNumber,
    issuedAt: args.issuedAt,
    caseTypeLabel: args.caseTypeLabel,
    body: args.body,
  });

  const filePath = `certificates/${args.uid}/${args.courseId}/${args.documentType}.pdf`;
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  await file.save(Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=3600",
      contentDisposition: `attachment; filename="${args.documentType}.pdf"`,
    },
  });

  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2035-01-01",
  });

  await db.collection("certificates").doc(certificateId).set(
    {
      uid: args.uid,
      courseId: args.courseId,
      courseTitle: args.courseTitle,
      purchaseId: args.purchaseId,
      documentType: args.documentType,
      learnerName: args.learnerName,
      issueNumber,
      storagePath: filePath,
      downloadUrl,
      submittedByUser: false,
      issuedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    certificateId,
    documentType: args.documentType,
    downloadUrl,
    issueNumber,
  };
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

  try {
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
        rawResponse: approved,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

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

  const learnerName = await getUserFullName(uid);
  const progressId = `${uid}_${data.courseId}`;
  const durationSeconds = Math.max(1, Math.round(data.durationSeconds));
  const watchedSeconds = Math.max(0, Math.min(durationSeconds, Math.round(data.watchedSeconds)));
  const lastPlaybackPositionSeconds = Math.max(0, Math.min(durationSeconds, Math.round(data.lastPlaybackPositionSeconds)));
  const completionRate = Math.max(0, Math.min(100, Math.floor((watchedSeconds / durationSeconds) * 100)));
  const remainingSeconds = Math.max(durationSeconds - watchedSeconds, 0);
  const isCompleted = data.isCompleted || completionRate >= 100;
  const purchaseSnapshot = isCompleted ? await getPaidPurchase(uid, data.courseId).catch(() => null) : null;
  const certificateEligible = isCompleted && Boolean(purchaseSnapshot) && Boolean(data.legalAccepted) && Boolean(data.userReviewAccepted);

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

  if (certificateEligible && purchaseSnapshot) {
    const issuedAt = new Date().toISOString();
    const caseTypeLabel = formatCaseType(data.caseType);

    for (const definition of COURSE_COMPLETION_DOCUMENTS) {
      const stored = await storeCertificate({
        uid,
        courseId: data.courseId,
        courseTitle: data.courseTitle,
        purchaseId: purchaseSnapshot.id,
        learnerName,
        caseTypeLabel,
        documentType: definition.documentType,
        title: definition.title,
        subtitle: definition.subtitle,
        body: definition.body,
        issuedAt,
      });

      issuedCertificates.push(stored);
    }
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
