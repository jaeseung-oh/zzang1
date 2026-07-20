import type { StoredUserProfile } from "@/lib/firebase/user-profile";

export type PreventionDocumentCategory = "dui" | "violence" | "gambling" | "sexual-offense" | "drug" | "digital-crime";
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
  dui: "음주운전 재범방지교육",
  violence: "폭력범죄 재범방지교육",
  gambling: "도박중독 재발방지교육",
  "sexual-offense": "성범죄 재범방지교육",
  drug: "마약중독 재범방지교육",
  "digital-crime": "디지털범죄 재범방지교육",
};

export const preventionDocumentApplyInfo: Record<PreventionDocumentCategory, { category: string; productId: string }> = {
  dui: { category: "dui", productId: "dui-documents" },
  violence: { category: "violence-prevention", productId: "violence-basic" },
  gambling: { category: "gambling-relapse-prevention", productId: "gambling-basic" },
  "sexual-offense": { category: "sexual-offense-prevention", productId: "sexual-offense-basic" },
  drug: { category: "drug-rehab-prevention", productId: "drug-addiction-basic" },
  "digital-crime": { category: "digital-crime", productId: "digital-crime-basic" },
};

export const preventionDocuments: PreventionDocumentDefinition[] = [
  { id: "prevention-plan", category: "dui", kind: "prevention-plan", title: "재발방지계획서", description: "음주운전 재발 원인을 점검하고 구체적인 재발방지 계획을 정리하는 작성자료입니다." },
  { id: "drinking-action-plan", category: "dui", kind: "action-plan", title: "음주예방실천계획서", description: "음주 습관과 음주 후 이동 계획을 점검하고 실천 기준을 정리하는 작성자료입니다." },
  { id: "pledge", category: "dui", kind: "pledge", title: "음주운전 재발방지 서약서", description: "음주 후 운전하지 않겠다는 구체적 서약사항을 정리하는 작성자료입니다." },
  { id: "violence-prevention-plan", category: "violence", kind: "prevention-plan", title: "폭력범죄 재범방지계획서", description: "분노·충동·갈등 상황을 점검하고 폭력 행동을 차단하기 위한 계획서입니다." },
  { id: "violence-action-plan", category: "violence", kind: "action-plan", title: "폭력예방 실천계획서", description: "갈등 발생 전후의 멈춤, 거리두기, 비폭력 대화 실천 기준을 정리하는 작성자료입니다." },
  { id: "violence-pledge", category: "violence", kind: "pledge", title: "폭력범죄 재범방지 서약서", description: "신체적·언어적 폭력을 반복하지 않겠다는 구체적 서약사항을 정리하는 작성자료입니다." },
  { id: "gambling-prevention-plan", category: "gambling", kind: "prevention-plan", title: "도박중독 재발방지계획서", description: "도박 충동, 금전 관리, 접근 차단, 회복 지원 계획을 정리하는 작성자료입니다." },
  { id: "gambling-action-plan", category: "gambling", kind: "action-plan", title: "도박예방 실천계획서", description: "도박 접근 경로와 금전 사용을 관리하고 대체 행동을 세우는 실천 자료입니다." },
  { id: "gambling-pledge", category: "gambling", kind: "pledge", title: "도박중독 재발방지 서약서", description: "도박 및 사행성 행위에 다시 접근하지 않기 위한 생활 서약서입니다." },
  { id: "sexual-offense-prevention-plan", category: "sexual-offense", kind: "prevention-plan", title: "성범죄 재범방지계획서", description: "동의·경계·왜곡된 인식·위험 상황을 점검하고 재범방지 계획을 정리하는 작성자료입니다." },
  { id: "sexual-offense-action-plan", category: "sexual-offense", kind: "action-plan", title: "성범죄예방 실천계획서", description: "관계 윤리, 디지털 경계, 위험 상황 회피와 도움 요청 기준을 정리하는 작성자료입니다." },
  { id: "sexual-offense-pledge", category: "sexual-offense", kind: "pledge", title: "성범죄 재범방지 서약서", description: "타인의 성적 자기결정권과 경계를 존중하겠다는 구체적 서약서입니다." },
  { id: "drug-prevention-plan", category: "drug", kind: "prevention-plan", title: "마약범죄 재범방지계획서", description: "마약류 재사용 위험요인, 접근 차단, 치료·상담 연계, 회복 지원체계를 구체적으로 정리하는 작성자료입니다." },
  { id: "drug-pledge", category: "drug", kind: "pledge", title: "마약범죄 재범방지서약서", description: "마약류 구매·보관·사용·관련자 접촉을 중단하고 회복 원칙을 지키겠다는 서약서입니다." },
  { id: "drug-action-plan", category: "drug", kind: "action-plan", title: "마약범죄 재범방지실천계획서", description: "고위험 상황, 갈망, 연락망, 생활 루틴을 관리하기 위한 실행 중심 계획서입니다." },
  { id: "digital-crime-prevention-plan", category: "digital-crime", kind: "prevention-plan", title: "디지털범죄 재발방지계획서", description: "온라인 행동과 위험상황을 돌아보고 같은 행동을 반복하지 않기 위한 계획서입니다." },
  { id: "digital-crime-advanced-prevention-plan", category: "digital-crime", kind: "prevention-plan", title: "디지털범죄 심화 재발방지계획서", description: "감정, 자동적 생각, 왜곡된 사고, 행동 연결 과정과 디지털 환경관리까지 정리하는 심화 계획서입니다." },
  { id: "digital-crime-action-plan", category: "digital-crime", kind: "action-plan", title: "디지털범죄 재범방지 실천계획서", description: "일상에서 바로 실행할 디지털 사용 규칙과 4주 실천계획을 정리하는 자료입니다." },
  { id: "digital-crime-pledge", category: "digital-crime", kind: "pledge", title: "디지털범죄 재범방지 실천서약서", description: "디지털 공간에서 타인의 권리와 안전을 존중하고 같은 행동을 반복하지 않겠다는 서약서입니다." },
];

export function getPreventionDocumentCategoryFromCourseId(courseId?: string | null): PreventionDocumentCategory {
  const normalized = String(courseId || "");
  if (normalized.includes("violence")) return "violence";
  if (normalized.includes("gambling")) return "gambling";
  if (normalized.includes("sexual-offense")) return "sexual-offense";
  if (normalized.includes("digital-crime") || normalized.includes("digital")) return "digital-crime";
  if (normalized.includes("drug")) return "drug";
  return "dui";
}

export function getPreventionDocumentCategoryFromProduct(productId?: string | null, productTitle?: string | null): PreventionDocumentCategory {
  const normalized = String(productId || productTitle || "").replace(/\s/g, "");
  if (normalized.includes("violence") || normalized.includes("폭력")) return "violence";
  if (normalized.includes("gambling") || normalized.includes("도박")) return "gambling";
  if (normalized.includes("sexual-offense") || normalized.includes("성범죄")) return "sexual-offense";
  if (normalized.includes("digital-crime") || normalized.includes("digital") || normalized.includes("디지털범죄")) return "digital-crime";
  if (normalized.includes("drug") || normalized.includes("마약")) return "drug";
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
    || normalizedProductId.startsWith("drug-")
    || normalizedProductId.startsWith("digital-crime-")
    || Number(amount) >= 49000
    || normalizedTitle.includes("작성자료포함")
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
