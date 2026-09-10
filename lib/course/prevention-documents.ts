import type { StoredUserProfile } from "@/lib/firebase/user-profile";


function firstNonEmptyIdentityText(...values: unknown[]) {
  const stack = [...values];
  while (stack.length) {
    const value = stack.shift();
    if (Array.isArray(value)) {
      stack.unshift(...value);
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function getProfileBirthDate(profile: StoredUserProfile | null) {
  return firstNonEmptyIdentityText(
    profile?.certificateIdentity?.dateOfBirth,
    profile?.dateOfBirth,
    profile?.birthDate,
  );
}

function getProfileDisplayName(profile: StoredUserProfile | null) {
  return firstNonEmptyIdentityText(
    profile?.certificateIdentity?.realName,
    profile?.realName,
    profile?.fullName,
  );
}

export type PreventionDocumentCategory = "dui" | "violence" | "gambling" | "sexual-offense" | "drug" | "digital-crime" | "digital-sexual-crime" | "prostitution" | "fraud" | "voice-phishing" | "unlicensed-driving" | "hangover-driving" | "reckless-retaliatory-driving" | "defamation-insult" | "legal-compliance-awareness";
export type PreventionDocumentKind = "prevention-plan" | "action-plan" | "pledge" | "education-review";
export type PreventionDocumentType = string;

export type PreventionDocumentDefinition = {
  id: PreventionDocumentType;
  category: PreventionDocumentCategory;
  kind: PreventionDocumentKind;
  title: string;
  description: string;
  advancedOnly?: boolean;
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
  "digital-sexual-crime": "디지털성범죄 재범방지교육",
  prostitution: "성매매 재범방지교육",
  fraud: "사기 재범방지교육",
  "voice-phishing": "보이스피싱 재범방지교육",
  "unlicensed-driving": "무면허운전 재범방지교육",
  "hangover-driving": "숙취운전 재발방지교육",
  "reckless-retaliatory-driving": "난폭·보복운전 재범방지교육",
  "defamation-insult": "악플·모욕·명예훼손 재범방지교육",
  "legal-compliance-awareness": "준법의식 교육",
};

export const preventionDocumentApplyInfo: Record<PreventionDocumentCategory, { category: string; productId: string }> = {
  dui: { category: "dui", productId: "dui-cbt-basic" },
  violence: { category: "violence-prevention", productId: "violence-basic" },
  gambling: { category: "gambling-relapse-prevention", productId: "gambling-basic" },
  "sexual-offense": { category: "sexual-offense-prevention", productId: "sexual-offense-basic" },
  drug: { category: "drug-rehab-prevention", productId: "drug-addiction-basic" },
  "digital-crime": { category: "digital-crime", productId: "digital-crime-basic" },
  "digital-sexual-crime": { category: "digital-sexual-crime-prevention", productId: "digital-sexual-crime-basic" },
  prostitution: { category: "prostitution-prevention", productId: "prostitution-basic" },
  fraud: { category: "fraud-prevention", productId: "fraud-basic" },
  "voice-phishing": { category: "voice-phishing-prevention", productId: "voice-phishing-basic" },
  "unlicensed-driving": { category: "unlicensed-driving-prevention", productId: "unlicensed-driving-basic" },
  "hangover-driving": { category: "hangover-driving-prevention", productId: "hangover-driving-basic" },
  "reckless-retaliatory-driving": { category: "reckless-retaliatory-driving-prevention", productId: "reckless-retaliatory-driving-basic" },
  "defamation-insult": { category: "defamation-insult-prevention", productId: "defamation-insult-basic" },
  "legal-compliance-awareness": { category: "legal-compliance-awareness", productId: "legal-compliance-awareness-basic" },
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
  { id: "prostitution-prevention-plan", category: "prostitution", kind: "prevention-plan", title: "성매매 재발방지계획서", description: "성매매 행동으로 이어진 위험상황과 접근경로를 점검하고 재발방지 계획을 정리하는 작성자료입니다." },
  { id: "prostitution-action-plan", category: "prostitution", kind: "action-plan", title: "성매매 예방 실천계획서", description: "검색, 앱, 연락처, 음주·숙박 등 위험상황별 차단 기준을 정리하는 실천 자료입니다." },
  { id: "prostitution-pledge", category: "prostitution", kind: "pledge", title: "성매매 재범방지 서약서", description: "성매매 관련 검색·연락·이동·결제를 반복하지 않겠다는 구체적 서약서입니다." },
  { id: "drug-prevention-plan", category: "drug", kind: "prevention-plan", title: "마약범죄 재범방지계획서", description: "마약류 재사용 위험요인, 접근 차단, 치료·상담 연계, 회복 지원체계를 구체적으로 정리하는 작성자료입니다." },
  { id: "drug-pledge", category: "drug", kind: "pledge", title: "마약범죄 재범방지서약서", description: "마약류 구매·보관·사용·관련자 접촉을 중단하고 회복 원칙을 지키겠다는 서약서입니다." },
  { id: "drug-action-plan", category: "drug", kind: "action-plan", title: "마약범죄 재범방지실천계획서", description: "고위험 상황, 갈망, 연락망, 생활 루틴을 관리하기 위한 실행 중심 계획서입니다." },
  { id: "digital-crime-prevention-plan", category: "digital-crime", kind: "prevention-plan", title: "디지털범죄 재발방지계획서", description: "온라인 행동과 위험상황을 돌아보고 같은 행동을 반복하지 않기 위한 계획서입니다." },
  { id: "digital-crime-action-plan", category: "digital-crime", kind: "action-plan", title: "디지털범죄 재범방지 실천계획서", description: "일상에서 바로 실행할 디지털 사용 규칙과 4주 실천계획을 정리하는 자료입니다." },
  { id: "digital-crime-pledge", category: "digital-crime", kind: "pledge", title: "디지털범죄 재범방지 실천서약서", description: "디지털 공간에서 타인의 권리와 안전을 존중하고 같은 행동을 반복하지 않겠다는 서약서입니다." },
  { id: "digital-sexual-crime-prevention-plan", category: "digital-sexual-crime", kind: "prevention-plan", title: "디지털성범죄 재범방지계획서", description: "디지털성범죄 위험요인과 온라인 행동을 점검하고 재범방지 계획을 정리하는 작성자료입니다." },
  { id: "digital-sexual-crime-action-plan", category: "digital-sexual-crime", kind: "action-plan", title: "디지털성범죄 예방 실천계획서", description: "기기, 계정, 채팅방, 피해자 접촉 차단 등 온라인 환경관리 기준을 정리하는 실천 자료입니다." },
  { id: "digital-sexual-crime-pledge", category: "digital-sexual-crime", kind: "pledge", title: "디지털성범죄 재범방지 서약서", description: "동의 없는 촬영·저장·전송·유포를 하지 않고 타인의 권리와 경계를 존중하겠다는 서약서입니다." },
  { id: "fraud-prevention-plan", category: "fraud", kind: "prevention-plan", title: "사기범죄 재범방지계획서", description: "금전 거래와 약속 이행 과정의 위험요인을 점검하고 재범방지 계획을 정리하는 작성자료입니다." },
  { id: "fraud-action-plan", category: "fraud", kind: "action-plan", title: "사기범죄 예방 실천계획서", description: "거래 전 확인, 설명, 문서 관리, 조력자 점검 기준을 정리하는 실천 자료입니다." },
  { id: "fraud-pledge", category: "fraud", kind: "pledge", title: "사기범죄 재범방지 서약서", description: "무리한 약속과 부정확한 설명을 반복하지 않겠다는 구체적 서약서입니다." },
  { id: "voice-phishing-prevention-plan", category: "voice-phishing", kind: "prevention-plan", title: "보이스피싱 재범방지계획서", description: "보이스피싱 범죄 제안과 가담 위험요인을 점검하고 재범방지 계획을 정리하는 작성자료입니다." },
  { id: "voice-phishing-action-plan", category: "voice-phishing", kind: "action-plan", title: "보이스피싱 예방 실천계획서", description: "의심스러운 제안, 금전 전달, 계좌 제공, 연락망 관리 기준을 정리하는 실천 자료입니다." },
  { id: "voice-phishing-pledge", category: "voice-phishing", kind: "pledge", title: "보이스피싱 재범방지 서약서", description: "범죄 제안에 가담하지 않고 고위험 상황에서 즉시 중단·확인·신고하겠다는 서약서입니다." },
  { id: "unlicensed-driving-prevention-plan", category: "unlicensed-driving", kind: "prevention-plan", title: "무면허운전 재범방지계획서", description: "면허 상태 확인, 차량 접근 차단, 대체 이동수단을 정리하는 작성자료입니다." },
  { id: "unlicensed-driving-action-plan", category: "unlicensed-driving", kind: "action-plan", title: "무면허운전 예방 실천계획서", description: "운전 금지 상황과 이동 대안을 구체적으로 정리하는 실천 자료입니다." },
  { id: "unlicensed-driving-pledge", category: "unlicensed-driving", kind: "pledge", title: "무면허운전 재범방지 서약서", description: "면허가 유효하지 않은 상태에서는 운전하지 않겠다는 서약서입니다." },
  { id: "hangover-driving-prevention-plan", category: "hangover-driving", kind: "prevention-plan", title: "숙취운전 재발방지계획서", description: "전날 음주와 다음 날 운전 위험을 점검하고 재발방지 계획을 정리하는 작성자료입니다." },
  { id: "hangover-driving-action-plan", category: "hangover-driving", kind: "action-plan", title: "숙취운전 예방 실천계획서", description: "음주 일정, 귀가 방법, 다음 날 운전 금지 기준을 정리하는 실천 자료입니다." },
  { id: "hangover-driving-pledge", category: "hangover-driving", kind: "pledge", title: "숙취운전 재발방지 서약서", description: "숙취 상태에서 운전하지 않겠다는 구체적 서약서입니다." },
  { id: "reckless-retaliatory-driving-prevention-plan", category: "reckless-retaliatory-driving", kind: "prevention-plan", title: "난폭·보복운전 재범방지계획서", description: "운전 중 분노, 위협적 운전, 보복 행동의 위험요인을 점검하고 차단 계획을 정리하는 작성자료입니다." },
  { id: "reckless-retaliatory-driving-action-plan", category: "reckless-retaliatory-driving", kind: "action-plan", title: "난폭·보복운전 예방 실천계획서", description: "도로 위 갈등 상황에서 속도, 거리, 감정 반응을 관리하는 실천 자료입니다." },
  { id: "reckless-retaliatory-driving-pledge", category: "reckless-retaliatory-driving", kind: "pledge", title: "난폭·보복운전 재범방지 서약서", description: "위협 운전과 보복 운전을 반복하지 않겠다는 구체적 서약서입니다." },
  { id: "defamation-insult-prevention-plan", category: "defamation-insult", kind: "prevention-plan", title: "악플·모욕·명예훼손 재범방지계획서", description: "말과 글, 게시물 작성 과정의 위험요인을 점검하고 재범방지 계획을 정리하는 작성자료입니다." },
  { id: "defamation-insult-action-plan", category: "defamation-insult", kind: "action-plan", title: "악플·모욕·명예훼손 예방 실천계획서", description: "온라인·대면 표현 전 확인 기준과 감정 조절 절차를 정리하는 실천 자료입니다." },
  { id: "defamation-insult-pledge", category: "defamation-insult", kind: "pledge", title: "악플·모욕·명예훼손 재범방지 서약서", description: "타인의 명예와 인격권을 침해하는 표현을 반복하지 않겠다는 구체적 서약서입니다." },
  { id: "legal-compliance-awareness-prevention-plan", category: "legal-compliance-awareness", kind: "prevention-plan", title: "준법의식 개선계획서", description: "법규 위반으로 이어진 판단과 생활 습관을 점검하고 개선 계획을 정리하는 작성자료입니다." },
  { id: "legal-compliance-awareness-action-plan", category: "legal-compliance-awareness", kind: "action-plan", title: "준법생활 실천계획서", description: "일상과 업무, 관계 속에서 지킬 준법 기준과 확인 절차를 정리하는 실천 자료입니다." },
  { id: "legal-compliance-awareness-pledge", category: "legal-compliance-awareness", kind: "pledge", title: "준법의식 실천 서약서", description: "법규와 사회적 책임을 준수하고 같은 문제를 반복하지 않겠다는 구체적 서약서입니다." },
  { id: "dui-education-review", category: "dui", kind: "education-review", title: "음주운전 재범방지교육 소감문", description: "교육에서 배운 내용과 본인의 위험 판단, 재범방지 실천계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "violence-education-review", category: "violence", kind: "education-review", title: "폭력범죄 재범방지교육 소감문", description: "분노 신호, 갈등 상황, 폭력 차단 계획을 자기 상황에 맞게 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "gambling-education-review", category: "gambling", kind: "education-review", title: "도박중독 재발방지교육 소감문", description: "도박 충동과 손실 만회 사고, 접근 차단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "sexual-offense-education-review", category: "sexual-offense", kind: "education-review", title: "성범죄 재범방지교육 소감문", description: "동의와 경계 존중, 위험 상황 관리, 피해 인식을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "prostitution-education-review", category: "prostitution", kind: "education-review", title: "성매매 재범방지교육 교육소감문", description: "교육을 통해 알게 된 점과 자기합리화, 접근경로 차단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "drug-education-review", category: "drug", kind: "education-review", title: "마약류 재범방지교육 소감문", description: "재사용 위험요인과 접근 차단, 도움 요청 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "digital-crime-education-review", category: "digital-crime", kind: "education-review", title: "디지털범죄 재범방지교육 소감문", description: "온라인 행동의 피해와 동의 없는 저장·공유 차단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "fraud-education-review", category: "fraud", kind: "education-review", title: "사기범죄 재범방지교육 소감문", description: "금전 거래에서의 은폐와 합리화, 제3자 점검 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "voice-phishing-education-review", category: "voice-phishing", kind: "education-review", title: "보이스피싱 재범방지교육 소감문", description: "범죄 제안과 고위험 상황 차단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "digital-sexual-crime-education-review", category: "digital-sexual-crime", kind: "education-review", title: "디지털성범죄 재범방지교육 소감문", description: "디지털 경계와 피해자 보호, 온라인 환경관리 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "unlicensed-driving-education-review", category: "unlicensed-driving", kind: "education-review", title: "무면허운전 재범방지교육 소감문", description: "면허 상태 확인과 차량 접근 차단, 대체 이동수단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "hangover-driving-education-review", category: "hangover-driving", kind: "education-review", title: "숙취운전 재발방지교육 소감문", description: "전날 음주와 다음 날 운전 위험, 사전 일정 조정 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "reckless-retaliatory-driving-education-review", category: "reckless-retaliatory-driving", kind: "education-review", title: "난폭·보복운전 재범방지교육 소감문", description: "도로 위 분노 신호와 감속·거리두기·회피 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "legal-compliance-awareness-education-review", category: "legal-compliance-awareness", kind: "education-review", title: "준법의식 교육 소감문", description: "준법 기준과 책임 인식, 생활 속 실천계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
  { id: "defamation-insult-education-review", category: "defamation-insult", kind: "education-review", title: "악플·모욕·명예훼손 재범방지교육 소감문", description: "표현 전 확인 기준과 감정적 게시·연락 중단 계획을 정리하는 심화이수과정 전용 작성자료입니다.", advancedOnly: true },
];

export function getPreventionDocumentCategoryFromCourseId(courseId?: string | null): PreventionDocumentCategory {
  const normalized = String(courseId || "");
  if (normalized.includes("violence")) return "violence";
  if (normalized.includes("gambling")) return "gambling";
  if (normalized.includes("digital-sexual-crime")) return "digital-sexual-crime";
  if (normalized.includes("prostitution")) return "prostitution";
  if (normalized.includes("sexual-offense")) return "sexual-offense";
  if (normalized.includes("digital-crime")) return "digital-crime";
  if (normalized.includes("voice-phishing")) return "voice-phishing";
  if (normalized.includes("fraud")) return "fraud";
  if (normalized.includes("unlicensed-driving")) return "unlicensed-driving";
  if (normalized.includes("hangover-driving")) return "hangover-driving";
  if (normalized.includes("reckless-retaliatory-driving")) return "reckless-retaliatory-driving";
  if (normalized.includes("defamation-insult")) return "defamation-insult";
  if (normalized.includes("legal-compliance-awareness")) return "legal-compliance-awareness";
  if (normalized.includes("drug")) return "drug";
  return "dui";
}

export function getPreventionDocumentCategoryFromProduct(productId?: string | null, productTitle?: string | null): PreventionDocumentCategory {
  const normalized = String(productId || productTitle || "").replace(/\s/g, "");
  if (normalized.includes("violence") || normalized.includes("폭력")) return "violence";
  if (normalized.includes("gambling") || normalized.includes("도박")) return "gambling";
  if (normalized.includes("digital-sexual-crime") || normalized.includes("디지털성범죄")) return "digital-sexual-crime";
  if (normalized.includes("prostitution") || normalized.includes("성매매")) return "prostitution";
  if (normalized.includes("sexual-offense") || normalized.includes("성범죄")) return "sexual-offense";
  if (normalized.includes("digital-crime") || normalized.includes("디지털범죄")) return "digital-crime";
  if (normalized.includes("voice-phishing") || normalized.includes("보이스피싱")) return "voice-phishing";
  if (normalized.includes("fraud") || normalized.includes("사기")) return "fraud";
  if (normalized.includes("unlicensed-driving") || normalized.includes("무면허")) return "unlicensed-driving";
  if (normalized.includes("hangover-driving") || normalized.includes("숙취")) return "hangover-driving";
  if (normalized.includes("reckless-retaliatory-driving") || normalized.includes("난폭") || normalized.includes("보복운전")) return "reckless-retaliatory-driving";
  if (normalized.includes("defamation-insult") || normalized.includes("악플") || normalized.includes("명예훼손") || normalized.includes("모욕")) return "defamation-insult";
  if (normalized.includes("legal-compliance-awareness") || normalized.includes("준법")) return "legal-compliance-awareness";
  if (normalized.includes("drug") || normalized.includes("마약")) return "drug";
  return "dui";
}

export function getPreventionDocumentsForCategory(category: PreventionDocumentCategory, options: { includeAdvancedOnly?: boolean } = {}) {
  return preventionDocuments.filter((document) => document.category === category && (options.includeAdvancedOnly || !document.advancedOnly));
}

export function getPreventionDocumentsForCourse(courseId?: string | null, options: { includeAdvancedOnly?: boolean } = {}) {
  return getPreventionDocumentsForCategory(getPreventionDocumentCategoryFromCourseId(courseId), options);
}

export function getPreventionDocument(type?: string | null, courseId?: string | null) {
  const documents = courseId ? getPreventionDocumentsForCourse(courseId, { includeAdvancedOnly: true }) : preventionDocuments;
  return documents.find((document) => document.id === type)
    || preventionDocuments.find((document) => document.id === type)
    || documents[0]
    || preventionDocuments[0];
}

export type PreventionDocumentsEnrollmentLike = {
  courseId?: string | null;
  canonicalCourseId?: string | null;
  productId?: string | null;
  productTitle?: string | null;
  courseTitle?: string | null;
  amount?: number | null;
};

const preventionDocumentProductIds = new Set([
  "basic",
  "dui",
  "dui-documents",
  "dui-cbt-basic",
  "dui-prevention",
  "dui-prevention-basic",
  ADVANCED_PRODUCT_ID,
  "dui-cbt-counseling",
  "violence-basic",
  "violence-advanced",
  "gambling-basic",
  "gambling-advanced",
  "sexual-offense-basic",
  "sexual-offense-advanced",
  "drug-basic",
  "drug-advanced",
  "drug-addiction-basic",
  "drug-addiction-premium",
  "drug-addiction-relapse-prevention",
  "digital-crime-basic",
  "digital-crime-advanced",
  "digital-sexual-crime-basic",
  "digital-sexual-crime-advanced",
  "prostitution-basic",
  "prostitution-advanced",
  "fraud-basic",
  "fraud-advanced",
  "voice-phishing-basic",
  "voice-phishing-advanced",
  "unlicensed-driving-basic",
  "unlicensed-driving-advanced",
  "hangover-driving-basic",
  "hangover-driving-advanced",
  "reckless-retaliatory-driving-basic",
  "reckless-retaliatory-driving-advanced",
  "defamation-insult-basic",
  "defamation-insult-advanced",
  "legal-compliance-awareness-basic",
  "legal-compliance-awareness-advanced",
]);

export function hasPreventionDocumentsAccess(productId?: string | null, amount?: number | null, productTitle?: string | null) {
  const normalizedProductId = String(productId || "");
  const normalizedTitle = String(productTitle || "").replace(/\s/g, "");
  return preventionDocumentProductIds.has(normalizedProductId)
    || normalizedProductId.startsWith("violence-")
    || normalizedProductId.startsWith("gambling-")
    || normalizedProductId.startsWith("sexual-offense-")
    || normalizedProductId.startsWith("drug-")
    || normalizedProductId.startsWith("digital-crime-")
    || normalizedProductId.startsWith("digital-sexual-crime-")
    || normalizedProductId.startsWith("prostitution-")
    || normalizedProductId.startsWith("fraud-")
    || normalizedProductId.startsWith("voice-phishing-")
    || normalizedProductId.startsWith("unlicensed-driving-")
    || normalizedProductId.startsWith("hangover-driving-")
    || normalizedProductId.startsWith("reckless-retaliatory-driving-")
    || normalizedProductId.startsWith("defamation-insult-")
    || normalizedProductId.startsWith("legal-compliance-awareness-")
    || Number(amount) >= 49000
    || normalizedTitle.includes("작성자료포함")
    || normalizedTitle.includes("재범방지교육")
    || normalizedTitle.includes("재발방지교육")
    || normalizedTitle.includes("재범방지")
    || normalizedTitle.includes("재발방지");
}

function isGenericDuiProduct(productId?: string | null) {
  return ["basic", "dui", "dui-documents", "dui-cbt-basic", "dui-prevention", "dui-prevention-basic"].includes(String(productId || ""));
}

export function getPreventionDocumentCategoryFromEnrollment(enrollment: PreventionDocumentsEnrollmentLike): PreventionDocumentCategory {
  const courseId = enrollment.courseId || enrollment.canonicalCourseId;
  if (courseId && !isGenericDuiProduct(courseId)) return getPreventionDocumentCategoryFromCourseId(courseId);
  if (enrollment.productId && !isGenericDuiProduct(enrollment.productId)) return getPreventionDocumentCategoryFromProduct(enrollment.productId, enrollment.productTitle || enrollment.courseTitle);
  return getPreventionDocumentCategoryFromProduct(enrollment.productId || courseId, enrollment.productTitle || enrollment.courseTitle);
}

export function isPreventionDocumentsEnrollment(enrollment: PreventionDocumentsEnrollmentLike) {
  return hasPreventionDocumentsAccess(enrollment.productId || enrollment.courseId || enrollment.canonicalCourseId, enrollment.amount, enrollment.productTitle || enrollment.courseTitle);
}


export function isAdvancedPreventionDocumentsEnrollment(enrollment: PreventionDocumentsEnrollmentLike) {
  const productId = String(enrollment.productId || enrollment.courseId || enrollment.canonicalCourseId || "");
  const title = String(enrollment.productTitle || enrollment.courseTitle || "").replace(/\s/g, "");
  return productId === ADVANCED_PRODUCT_ID
    || productId.endsWith("-advanced")
    || productId.endsWith("-premium")
    || productId.endsWith("-counseling")
    || title.includes("심화이수과정") || title.includes("충실준비과정") || title.includes("충실 준비과정")
    || title.includes("심리상담종합과정")
    || title.includes("프리미엄")
    || Number(enrollment.amount) >= 99000;
}

export function canAccessPreventionDocument(document: PreventionDocumentDefinition, enrollment: PreventionDocumentsEnrollmentLike) {
  return isPreventionDocumentsEnrollment(enrollment)
    && getPreventionDocumentCategoryFromEnrollment(enrollment) === document.category
    && (!document.advancedOnly || isAdvancedPreventionDocumentsEnrollment(enrollment));
}

export function getPreventionDocumentsForEnrollment(enrollment: PreventionDocumentsEnrollmentLike) {
  return getPreventionDocumentsForCategory(getPreventionDocumentCategoryFromEnrollment(enrollment), {
    includeAdvancedOnly: isAdvancedPreventionDocumentsEnrollment(enrollment),
  });
}

export function getPreventionDocumentsApplyHref(category: PreventionDocumentCategory) {
  const info = preventionDocumentApplyInfo[category];
  return "/courses/apply/?category=" + encodeURIComponent(info.category) + "&productId=" + encodeURIComponent(info.productId);
}

export function buildDocumentIdentity(profile: StoredUserProfile | null): PreventionDocumentIdentity {
  return {
    name: getProfileDisplayName(profile),
    birthDate: getProfileBirthDate(profile),
    phoneNumber: profile?.phoneNumber || "",
    address: "",
    writtenDate: formatKoreanDate(new Date()),
  };
}

export function formatKoreanDate(date: Date) {
  return date.getFullYear() + "년 " + String(date.getMonth() + 1).padStart(2, "0") + "월 " + String(date.getDate()).padStart(2, "0") + "일";
}
