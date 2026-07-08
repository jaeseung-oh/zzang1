import type { StoredUserProfile } from "@/lib/firebase/user-profile";

export type PreventionDocumentCategory = "dui" | "violence" | "gambling" | "sexual-offense";
export type PreventionDocumentKind = "prevention-plan" | "action-plan" | "pledge";
export type PreventionDocumentType = string;

export type PreventionDocumentDefinition = {
  id: PreventionDocumentType;
  category: PreventionDocumentCategory;
  kind: PreventionDocumentKind;
  title: string;
  description: string;
};

export type PreventionDocumentIdentity = {
  name: string;
  birthDate: string;
  phoneNumber: string;
  address: string;
  writtenDate: string;
};

export const DOCUMENTS_PRODUCT_ID = "dui-documents";
export const ADVANCED_PRODUCT_ID = "dui-cbt-advanced";

export const preventionDocumentCategoryLabels: Record<PreventionDocumentCategory, string> = {
  dui: "음주운전 예방교육",
  violence: "폭력범죄 재범방지교육",
  gambling: "도박중독 재발방지교육",
  "sexual-offense": "성범죄 재범방지교육",
};

export const preventionDocumentApplyInfo: Record<PreventionDocumentCategory, { category: string; productId: string }> = {
  dui: { category: "dui", productId: "dui-documents" },
  violence: { category: "violence-prevention", productId: "violence-basic" },
  gambling: { category: "gambling-relapse-prevention", productId: "gambling-basic" },
  "sexual-offense": { category: "sexual-offense-prevention", productId: "sexual-offense-basic" },
};

export const preventionDocuments: PreventionDocumentDefinition[] = [
  { id: "prevention-plan", category: "dui", kind: "prevention-plan", title: "재발방지계획서 서식", description: "음주운전 재발 원인을 점검하고 구체적인 재발방지 계획을 정리하는 서식입니다." },
  { id: "drinking-action-plan", category: "dui", kind: "action-plan", title: "음주예방실천계획서 서식", description: "음주 습관과 음주 후 이동 계획을 점검하고 실천 기준을 정리하는 서식입니다." },
  { id: "pledge", category: "dui", kind: "pledge", title: "음주운전 재발방지 서약서 서식", description: "음주 후 운전하지 않겠다는 구체적 서약사항을 정리하는 서식입니다." },
  { id: "violence-prevention-plan", category: "violence", kind: "prevention-plan", title: "폭력범죄 재범방지계획서 서식", description: "분노·충동·갈등 상황을 점검하고 폭력 행동을 차단하기 위한 계획서입니다." },
  { id: "violence-action-plan", category: "violence", kind: "action-plan", title: "폭력예방 실천계획서 서식", description: "갈등 발생 전후의 멈춤, 거리두기, 비폭력 대화 실천 기준을 정리하는 서식입니다." },
  { id: "violence-pledge", category: "violence", kind: "pledge", title: "폭력범죄 재범방지 서약서 서식", description: "신체적·언어적 폭력을 반복하지 않겠다는 구체적 서약사항을 정리하는 서식입니다." },
  { id: "gambling-prevention-plan", category: "gambling", kind: "prevention-plan", title: "도박중독 재발방지계획서 서식", description: "도박 충동, 금전 관리, 접근 차단, 회복 지원 계획을 정리하는 서식입니다." },
  { id: "gambling-action-plan", category: "gambling", kind: "action-plan", title: "도박예방 실천계획서 서식", description: "도박 접근 경로와 금전 사용을 관리하고 대체 행동을 세우는 실천 서식입니다." },
  { id: "gambling-pledge", category: "gambling", kind: "pledge", title: "도박중독 재발방지 서약서 서식", description: "도박 및 사행성 행위에 다시 접근하지 않기 위한 생활 서약서입니다." },
  { id: "sexual-offense-prevention-plan", category: "sexual-offense", kind: "prevention-plan", title: "성범죄 재범방지계획서 서식", description: "동의·경계·왜곡된 인식·위험 상황을 점검하고 재범방지 계획을 정리하는 서식입니다." },
  { id: "sexual-offense-action-plan", category: "sexual-offense", kind: "action-plan", title: "성범죄예방 실천계획서 서식", description: "관계 윤리, 디지털 경계, 위험 상황 회피와 도움 요청 기준을 정리하는 서식입니다." },
  { id: "sexual-offense-pledge", category: "sexual-offense", kind: "pledge", title: "성범죄 재범방지 서약서 서식", description: "타인의 성적 자기결정권과 경계를 존중하겠다는 구체적 서약서입니다." },
];

export function getPreventionDocumentCategoryFromCourseId(courseId?: string | null): PreventionDocumentCategory {
  const normalized = String(courseId || "");
  if (normalized.includes("violence")) return "violence";
  if (normalized.includes("gambling")) return "gambling";
  if (normalized.includes("sexual-offense")) return "sexual-offense";
  return "dui";
}

export function getPreventionDocumentCategoryFromProduct(productId?: string | null, productTitle?: string | null): PreventionDocumentCategory {
  const normalized = String(productId || productTitle || "").replace(/\s/g, "");
  if (normalized.includes("violence") || normalized.includes("폭력")) return "violence";
  if (normalized.includes("gambling") || normalized.includes("도박")) return "gambling";
  if (normalized.includes("sexual-offense") || normalized.includes("성범죄")) return "sexual-offense";
  return "dui";
}

export function getPreventionDocumentsForCategory(category: PreventionDocumentCategory) {
  return preventionDocuments.filter((document) => document.category === category);
}

export function getPreventionDocumentsForCourse(courseId?: string | null) {
  return getPreventionDocumentsForCategory(getPreventionDocumentCategoryFromCourseId(courseId));
}

export function getPreventionDocument(type?: string | null, courseId?: string | null) {
  const documents = courseId ? getPreventionDocumentsForCourse(courseId) : preventionDocuments;
  return documents.find((document) => document.id === type)
    || preventionDocuments.find((document) => document.id === type)
    || documents[0]
    || preventionDocuments[0];
}

export function hasPreventionDocumentsAccess(productId?: string | null, amount?: number | null, productTitle?: string | null) {
  const normalizedProductId = String(productId || "");
  const normalizedTitle = String(productTitle || "").replace(/\s/g, "");
  return normalizedProductId === DOCUMENTS_PRODUCT_ID
    || normalizedProductId === ADVANCED_PRODUCT_ID
    || normalizedProductId.startsWith("violence-")
    || normalizedProductId.startsWith("gambling-")
    || normalizedProductId.startsWith("sexual-offense-")
    || Number(amount) >= 49000
    || normalizedTitle.includes("서식포함")
    || normalizedTitle.includes("재범방지교육")
    || normalizedTitle.includes("재발방지교육");
}

export function getPreventionDocumentsApplyHref(category: PreventionDocumentCategory) {
  const info = preventionDocumentApplyInfo[category];
  return "/courses/apply/?category=" + encodeURIComponent(info.category) + "&productId=" + encodeURIComponent(info.productId);
}

export function buildDocumentIdentity(profile: StoredUserProfile | null): PreventionDocumentIdentity {
  const identity = profile?.certificateIdentity;
  return {
    name: identity?.realName || profile?.realName || profile?.fullName || "",
    birthDate: identity?.dateOfBirth || profile?.dateOfBirth || profile?.birthDate || "",
    phoneNumber: profile?.phoneNumber || "",
    address: "",
    writtenDate: formatKoreanDate(new Date()),
  };
}

export function formatKoreanDate(date: Date) {
  return date.getFullYear() + "년 " + String(date.getMonth() + 1).padStart(2, "0") + "월 " + String(date.getDate()).padStart(2, "0") + "일";
}
