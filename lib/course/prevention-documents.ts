import type { StoredUserProfile } from "@/lib/firebase/user-profile";

export type PreventionDocumentType = "prevention-plan" | "drinking-action-plan" | "pledge";

export type PreventionDocumentDefinition = {
  id: PreventionDocumentType;
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

export const preventionDocuments: PreventionDocumentDefinition[] = [
  { id: "prevention-plan", title: "재발방지계획서", description: "음주운전 재발 원인을 점검하고 구체적인 재발방지 계획을 정리하는 서식입니다." },
  { id: "drinking-action-plan", title: "음주예방실천계획서", description: "음주 습관과 음주 후 이동 계획을 점검하고 실천 기준을 정리하는 서식입니다." },
  { id: "pledge", title: "음주운전 재발방지 서약서", description: "음주 후 운전하지 않겠다는 구체적 서약사항을 정리하는 서식입니다." },
];

export function hasPreventionDocumentsAccess(productId?: string | null, amount?: number | null, productTitle?: string | null) {
  const normalizedTitle = String(productTitle || "").replace(/\s/g, "");
  return productId === DOCUMENTS_PRODUCT_ID
    || productId === ADVANCED_PRODUCT_ID
    || Number(amount) >= 89000
    || normalizedTitle.includes("서식포함");
}

export function getPreventionDocument(type?: string | null) {
  return preventionDocuments.find((document) => document.id === type) || preventionDocuments[0];
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
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(date.getDate()).padStart(2, "0")}일`;
}
