import axios from "axios";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

initializeApp();

const db = getFirestore();
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const tossSecretKey = "test_sk_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const tossAuthHeader = `Basic ${Buffer.from(`${tossSecretKey}:`).toString("base64")}`;

const LEGAL_NOTICE =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 스스로 양형자료를 준비할 수 있도록 돕는 교육 및 보조 양식 제공 서비스입니다.";

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

function buildPrompt(data: DraftInput) {
  const documentLabel =
    data.documentType === "reflection-letter-guide" ? "반성문 초안 작성 가이드" : "탄원서 초안 작성 가이드";

  return [
    "당신은 대한민국 형사절차에 제출할 양형자료 초안 정리를 돕는 문서 작성 보조자입니다.",
    "반드시 지켜야 할 원칙:",
    "1. 법률 자문, 판결 예측, 감형 보장 표현 금지",
    "2. 사실관계와 반성, 재범 방지 계획 중심으로 차분하고 진정성 있게 작성",
    "3. 사용자가 직접 수정할 수 있도록 과장되지 않은 문장 구조 제공",
    "4. 변호사, 법률대리, 결과 보장처럼 읽히는 문장 금지",
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
    data.documentType === "reflection-letter-guide" ? "반성문 초안 작성 가이드" : "탄원서 초안 작성 가이드";

  return `${title}\n\n저는 이번 사건으로 인해 제 행동이 사회와 주변 사람들에게 미칠 수 있는 영향을 무겁게 받아들이고 있습니다. 경솔했던 판단과 부주의한 태도에 대해 깊이 반성하고 있으며, 같은 일이 반복되지 않도록 생활 전반을 다시 정비하고자 합니다.\n\n특히 ${data.remorseReason.trim()}와 같은 점을 계속 돌아보며, 단순한 후회에 그치지 않고 실제 행동 변화로 이어가야 한다고 생각하고 있습니다. ${data.familyContext.trim() || "가족과 주변 환경 또한 제게 더 신중한 태도를 요구하고 있습니다."}\n\n앞으로는 ${data.preventionPlan.trim()}와 같은 구체적인 재범 방지 계획을 실천하면서, 다시는 유사한 일이 발생하지 않도록 교육과 생활 관리를 병행하겠습니다.\n\n본 초안은 제출 준비를 돕기 위한 참고용 문안이며, 실제 제출 전에는 사건 경위와 사실관계를 직접 다시 확인하고 문구를 수정해 사용하시기 바랍니다.`;
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

  if (!paymentKey || !orderId || typeof amount !== "number") {
    response.status(400).json({ message: "paymentKey, orderId, amount가 모두 필요합니다." });
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    documentId: docRef.id,
    draft,
    warnings,
  };
});
