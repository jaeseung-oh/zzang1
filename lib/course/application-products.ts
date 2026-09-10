export const APPLICATION_PRICES = {
  BASIC: 49000,
  DUI_WITH_DOCUMENTS: 49000,
  DUI_CBT_ADVANCED: 99000,
  PREVENTION_BASIC: 49000,
  PREVENTION_ADVANCED: 99000,
  DRUG_ADDICTION_BASIC: 49000,
  DRUG_ADDICTION_PREMIUM: 99000,
  DIGITAL_CRIME_BASIC: 49000,
  DIGITAL_CRIME_ADVANCED: 99000,
  FRAUD_BASIC: 49000,
  FRAUD_ADVANCED: 99000,
  UNLICENSED_DRIVING_BASIC: 49000,
  UNLICENSED_DRIVING_ADVANCED: 99000,
  HANGOVER_DRIVING_BASIC: 49000,
  HANGOVER_DRIVING_ADVANCED: 99000,
  RECKLESS_RETALIATORY_DRIVING_BASIC: 49000,
  RECKLESS_RETALIATORY_DRIVING_ADVANCED: 99000,
  DEFAMATION_INSULT_BASIC: 49000,
  DEFAMATION_INSULT_ADVANCED: 99000,
  LEGAL_COMPLIANCE_AWARENESS_BASIC: 49000,
  LEGAL_COMPLIANCE_AWARENESS_ADVANCED: 99000,
  VOICE_PHISHING_BASIC: 49000,
  VOICE_PHISHING_ADVANCED: 99000,
  DIGITAL_SEXUAL_CRIME_BASIC: 49000,
  DIGITAL_SEXUAL_CRIME_ADVANCED: 99000,
  PROSTITUTION_BASIC: 49000,
  PROSTITUTION_ADVANCED: 99000,
  COUNSELING_COMPREHENSIVE: 199000,
} as const;

export type ApplicationProduct = {
  id: string;
  title: string;
  price: number;
  description: string;
  includes: string[];
  badge?: string;
  courseId?: string;
  canonicalCourseId?: string;
  planId?: "basic" | "premium" | "advanced" | "counseling";
};

export type ApplicationIconName = "car" | "fileSearch" | "dice" | "alert" | "shieldCheck";

export type ApplicationCourseCategory = {
  id: string;
  title: string;
  description: string;
  summary: string;
  icon: ApplicationIconName;
  status: "available" | "comingSoon";
  comingSoonText?: string;
  products: ApplicationProduct[];
  defaultProductId: string;
};


const advancedMaterialIncludes = [
  "인지행동기반(CBT) 재범방지교육 및 추가 이수증",
  "재범방지 교육 이수 상세 내역서",
  "교육 소감문 작성자료",
];

export const counselingNoticeText = "심리상담과정은 유선 상담이 가능하며, 결제 후 1영업일 이내 개별 연락드립니다.";
export const counselingEvaluationNoticeText = "심리상담 의견서 및 상담기관 탄원서는 심리상담 및 종합 평가 후 발급됩니다.";

function basicProvidedMaterials(certificate: string, plan: string, actionPlan: string, pledge: string) {
  return [
    "온라인 재범방지교육",
    certificate,
    plan,
    actionPlan,
    pledge,
    "인쇄 및 PDF 저장",
  ];
}

function advancedProvidedMaterials(certificate: string, plan: string, actionPlan: string, pledge: string) {
  return [
    ...basicProvidedMaterials(certificate, plan, actionPlan, pledge).filter((item) => item !== "인쇄 및 PDF 저장"),
    ...advancedMaterialIncludes,
    "인쇄 및 PDF 저장",
  ];
}

function counselingProvidedMaterials(advancedIncludes: string[]) {
  return [
    "심화이수과정 전체 포함",
    ...advancedIncludes.filter((item) => item !== "인쇄 및 PDF 저장"),
    "유선 상담 가능(방문 없이 진행)",
    "심리상담 의견서",
    "상담기관 탄원서",
    "심리상담 및 종합 평가 후 발급",
    "인쇄 및 PDF 저장",
  ];
}

export const basicApplicationProduct: ApplicationProduct = {
  id: "basic",
  title: "기본 수료과정",
  price: APPLICATION_PRICES.BASIC,
  badge: "가장 부담 없이 시작",
  description: "온라인 재범방지교육을 이수하고 수료증 및 기본적인 재범방지 실천자료를 발급받을 수 있는 과정입니다.",
  includes: basicProvidedMaterials("교육 수료증 PDF 발급", "재발방지계획서", "음주예방실천계획서", "음주운전 재발방지 서약서"),
};

export const duiDocumentsApplicationProduct: ApplicationProduct = {
  id: "dui-cbt-basic",
  title: "기본 수료과정",
  price: APPLICATION_PRICES.DUI_WITH_DOCUMENTS,
  badge: "가장 부담 없이 시작",
  description: "온라인 재범방지교육을 이수하고 수료증 및 기본적인 재범방지 실천자료를 발급받을 수 있는 과정입니다.",
  includes: basicProvidedMaterials("음주운전 재범방지교육 수료증", "재발방지계획서", "음주예방실천계획서", "음주운전 재발방지 서약서"),
};

export const duiCbtAdvancedApplicationProduct: ApplicationProduct = {
  id: "dui-cbt-advanced",
  courseId: "dui-cbt-advanced",
  title: "심화이수과정",
  price: APPLICATION_PRICES.DUI_CBT_ADVANCED,
  badge: "가장 많이 선택하는 과정",
  description: "기본 수료과정의 모든 구성에 더해 인지행동기반 재범방지교육과 추가 이수증, 교육이수 상세내역서, 교육 소감문까지 함께 준비할 수 있는 과정입니다.",
  includes: advancedProvidedMaterials("음주운전 재범방지교육 수료증", "재발방지계획서", "음주예방실천계획서", "음주운전 재발방지 서약서"),
};

export const duiCounselingApplicationProduct: ApplicationProduct = {
  id: "dui-cbt-counseling",
  courseId: "dui-cbt-advanced",
  planId: "counseling",
  title: "심리상담 종합과정",
  price: APPLICATION_PRICES.COUNSELING_COMPREHENSIVE,
  badge: "상위 과정",
  description: "심화이수과정의 모든 제공 내용에 더해 방문 없이 가능한 유선 심리상담과 심리상담의견서·상담기관 탄원서 발급 절차를 포함한 과정입니다.",
  includes: counselingProvidedMaterials(duiCbtAdvancedApplicationProduct.includes),
};


const newPreventionApplicationProducts = new Map<string, ApplicationProduct>([
  ["violence-basic", {
    id: "violence-basic",
    courseId: "violence-basic",
    planId: "basic",
    title: "기본 수료과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "폭력범죄 사건 이후의 위험요인과 재범방지 실천 기준을 차분히 점검하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("폭력범죄 재범방지교육 수료증", "폭력범죄 재범방지계획서", "폭력예방 실천계획서", "폭력범죄 재범방지 서약서"),
  }],
  ["violence-advanced", {
    id: "violence-advanced",
    courseId: "violence-advanced",
    planId: "advanced",
    title: "심화이수과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "재범방지교육과 자기성찰 실천자료를 함께 정리하는 심화이수과정입니다.",
    includes: advancedProvidedMaterials("폭력범죄 재범방지교육 수료증", "폭력범죄 재범방지계획서", "폭력예방 실천계획서", "폭력범죄 재범방지 서약서"),
  }],
  ["gambling-basic", {
    id: "gambling-basic",
    courseId: "gambling-basic",
    planId: "basic",
    title: "기본 수료과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "도박 충동과 재발 위험요인을 점검하고 재발방지 실천 기준을 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("도박중독 재발방지교육 수료증", "도박중독 재발방지계획서", "도박예방 실천계획서", "도박중독 재발방지 서약서"),
  }],
  ["gambling-advanced", {
    id: "gambling-advanced",
    courseId: "gambling-advanced",
    planId: "advanced",
    title: "심화이수과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "재범방지교육과 자기성찰 실천자료를 함께 정리하는 심화이수과정입니다.",
    includes: advancedProvidedMaterials("도박중독 재발방지교육 수료증", "도박중독 재발방지계획서", "도박예방 실천계획서", "도박중독 재발방지 서약서"),
  }],
  ["sexual-offense-basic", {
    id: "sexual-offense-basic",
    courseId: "sexual-offense-basic",
    planId: "basic",
    title: "기본 수료과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "성범죄 사건 이후 책임 인식과 관계 윤리, 재범방지 실천 기준을 점검하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("성범죄 재범방지교육 수료증", "성범죄 재범방지계획서", "성범죄예방 실천계획서", "성범죄 재범방지 서약서"),
  }],
  ["sexual-offense-advanced", {
    id: "sexual-offense-advanced",
    courseId: "sexual-offense-advanced",
    planId: "advanced",
    title: "심화이수과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "재범방지교육과 자기성찰 실천자료를 함께 정리하는 심화이수과정입니다.",
    includes: advancedProvidedMaterials("성범죄 재범방지교육 수료증", "성범죄 재범방지계획서", "성범죄예방 실천계획서", "성범죄 재범방지 서약서"),
  }],
  ["prostitution-basic", {
    id: "prostitution-basic",
    courseId: "prostitution-basic",
    planId: "basic",
    title: "성매매 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.PROSTITUTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "성매매 행동으로 이어진 위험상황과 접근경로를 점검하고 전용 작성자료를 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("성매매 재범방지교육 수료증", "성매매 재발방지계획서", "성매매 예방 실천계획서", "성매매 재범방지 서약서"),
  }],
  ["prostitution-advanced", {
    id: "prostitution-advanced",
    courseId: "prostitution-advanced",
    planId: "advanced",
    title: "성매매 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.PROSTITUTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("성매매 재범방지교육 수료증", "성매매 재발방지계획서", "성매매 예방 실천계획서", "성매매 재범방지 서약서"),
  }],
  ["drug-basic", {
    id: "drug-basic",
    courseId: "drug-basic",
    planId: "basic",
    title: "기본 수료과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "마약류 사용의 위험성과 재사용 유발요인을 점검하고 재범방지 실천 기준을 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("마약중독 재범방지교육 수료증", "마약범죄 재범방지계획서", "마약범죄 재범방지실천계획서", "마약범죄 재범방지서약서"),
  }],
  ["drug-advanced", {
    id: "drug-advanced",
    courseId: "drug-advanced",
    planId: "advanced",
    title: "심화이수과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "재범방지교육과 자기성찰 실천자료를 함께 정리하는 심화이수과정입니다.",
    includes: advancedProvidedMaterials("마약중독 재범방지교육 수료증", "마약범죄 재범방지계획서", "마약범죄 재범방지실천계획서", "마약범죄 재범방지서약서"),
  }],
  ["drug-addiction-basic", {
    id: "drug-addiction-basic",
    courseId: "drug-addiction-basic",
    canonicalCourseId: "drug-addiction-relapse-prevention",
    planId: "basic",
    title: "마약중독 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.DRUG_ADDICTION_BASIC,
    badge: "기본 수료과정",
    description: "마약류 사용의 위험성과 재사용 유발요인을 점검하고 마약범죄 재범방지 3종 작성자료를 정리하는 과정입니다.",
    includes: basicProvidedMaterials("마약중독 재범방지교육 수료증", "마약범죄 재범방지계획서", "마약범죄 재범방지실천계획서", "마약범죄 재범방지서약서"),
  }],
  ["drug-addiction-premium", {
    id: "drug-addiction-premium",
    courseId: "drug-addiction-premium",
    canonicalCourseId: "drug-addiction-relapse-prevention",
    planId: "premium",
    title: "마약중독 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.DRUG_ADDICTION_PREMIUM,
    badge: "심화이수과정",
    description: "기본 수료과정의 3종 작성자료에 인지행동기반 재범방지교육과 이수 확인 자료를 더한 독립 상품입니다.",
    includes: advancedProvidedMaterials("마약중독 재범방지교육 수료증", "마약범죄 재범방지계획서", "마약범죄 재범방지실천계획서", "마약범죄 재범방지서약서"),
  }],
  ["digital-crime-basic", {
    id: "digital-crime-basic",
    courseId: "digital-crime-basic",
    planId: "basic",
    title: "디지털범죄 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.DIGITAL_CRIME_BASIC,
    badge: "가장 부담 없이 시작",
    description: "디지털 공간에서의 행동이 피해자와 현실에 미치는 영향을 이해하고, 자신의 위험요인과 온라인 사용 습관을 점검하여 구체적인 재범방지 계획을 수립하는 과정입니다.",
    includes: basicProvidedMaterials("디지털범죄 재범방지교육 수료증", "디지털범죄 재발방지계획서", "디지털범죄 재범방지 실천계획서", "디지털범죄 재범방지 실천서약서"),
  }],
  ["digital-crime-advanced", {
    id: "digital-crime-advanced",
    courseId: "digital-crime-advanced",
    planId: "advanced",
    title: "디지털범죄 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.DIGITAL_CRIME_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정의 교육 내용에 인지행동 기반의 위험상황 분석과 충동조절, 왜곡된 사고 교정, 디지털 환경관리 및 피해자 보호계획을 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("디지털범죄 재범방지교육 수료증", "디지털범죄 재발방지계획서", "디지털범죄 재범방지 실천계획서", "디지털범죄 재범방지 실천서약서"),
  }],
  ["fraud-basic", {
    id: "fraud-basic",
    courseId: "fraud-basic",
    planId: "basic",
    title: "사기 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.FRAUD_BASIC,
    badge: "가장 부담 없이 시작",
    description: "사기 사건 이후 거래 책임과 의사결정 과정을 점검하고 재범방지 실천계획을 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("사기 재범방지교육 수료증", "사기범죄 재범방지계획서", "사기범죄 예방 실천계획서", "사기범죄 재범방지 서약서"),
  }],
  ["fraud-advanced", {
    id: "fraud-advanced",
    courseId: "fraud-advanced",
    planId: "advanced",
    title: "사기 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.FRAUD_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("사기 재범방지교육 수료증", "사기범죄 재범방지계획서", "사기범죄 예방 실천계획서", "사기범죄 재범방지 서약서"),
  }],
  ["unlicensed-driving-basic", {
    id: "unlicensed-driving-basic",
    courseId: "unlicensed-driving-basic",
    planId: "basic",
    title: "무면허운전 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.UNLICENSED_DRIVING_BASIC,
    badge: "가장 부담 없이 시작",
    description: "무면허 상태에서 운전하게 된 판단과 생활 패턴을 점검하고 재범방지 기준을 세우는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("무면허운전 재범방지교육 수료증", "무면허운전 재범방지계획서", "무면허운전 예방 실천계획서", "무면허운전 재범방지 서약서"),
  }],
  ["unlicensed-driving-advanced", {
    id: "unlicensed-driving-advanced",
    courseId: "unlicensed-driving-advanced",
    planId: "advanced",
    title: "무면허운전 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.UNLICENSED_DRIVING_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("무면허운전 재범방지교육 수료증", "무면허운전 재범방지계획서", "무면허운전 예방 실천계획서", "무면허운전 재범방지 서약서"),
  }],
  ["hangover-driving-basic", {
    id: "hangover-driving-basic",
    courseId: "hangover-driving-basic",
    planId: "basic",
    title: "숙취운전 재발방지교육 기본 수료과정",
    price: APPLICATION_PRICES.HANGOVER_DRIVING_BASIC,
    badge: "가장 부담 없이 시작",
    description: "전날 음주와 다음 날 운전 위험을 점검하고 숙취운전을 반복하지 않기 위한 생활 기준을 세우는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("숙취운전 재발방지교육 수료증", "숙취운전 재발방지계획서", "숙취운전 예방 실천계획서", "숙취운전 재발방지 서약서"),
  }],
  ["hangover-driving-advanced", {
    id: "hangover-driving-advanced",
    courseId: "hangover-driving-advanced",
    planId: "advanced",
    title: "숙취운전 재발방지교육 심화이수과정",
    price: APPLICATION_PRICES.HANGOVER_DRIVING_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("숙취운전 재발방지교육 수료증", "숙취운전 재발방지계획서", "숙취운전 예방 실천계획서", "숙취운전 재발방지 서약서"),
  }],
  ["reckless-retaliatory-driving-basic", {
    id: "reckless-retaliatory-driving-basic",
    courseId: "reckless-retaliatory-driving-basic",
    planId: "basic",
    title: "난폭·보복운전 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.RECKLESS_RETALIATORY_DRIVING_BASIC,
    badge: "가장 부담 없이 시작",
    description: "위협적 운전, 끼어들기 보복, 급가속·급제동 등 운전 중 충동과 분노 반응을 점검하고 반복을 막는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("난폭·보복운전 재범방지교육 수료증", "난폭·보복운전 재범방지계획서", "난폭·보복운전 예방 실천계획서", "난폭·보복운전 재범방지 서약서"),
  }],
  ["reckless-retaliatory-driving-advanced", {
    id: "reckless-retaliatory-driving-advanced",
    courseId: "reckless-retaliatory-driving-advanced",
    planId: "advanced",
    title: "난폭·보복운전 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.RECKLESS_RETALIATORY_DRIVING_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("난폭·보복운전 재범방지교육 수료증", "난폭·보복운전 재범방지계획서", "난폭·보복운전 예방 실천계획서", "난폭·보복운전 재범방지 서약서"),
  }],
  ["defamation-insult-basic", {
    id: "defamation-insult-basic",
    courseId: "defamation-insult-basic",
    planId: "basic",
    title: "악플·모욕·명예훼손 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.DEFAMATION_INSULT_BASIC,
    badge: "가장 부담 없이 시작",
    description: "악플과 온라인·대면 표현에서 타인의 명예와 인격권을 침해하는 말·글의 위험을 점검하고 재범방지 기준을 세우는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("악플·모욕·명예훼손 재범방지교육 수료증", "악플·모욕·명예훼손 재범방지계획서", "악플·모욕·명예훼손 예방 실천계획서", "악플·모욕·명예훼손 재범방지 서약서"),
  }],
  ["defamation-insult-advanced", {
    id: "defamation-insult-advanced",
    courseId: "defamation-insult-advanced",
    planId: "advanced",
    title: "악플·모욕·명예훼손 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.DEFAMATION_INSULT_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("악플·모욕·명예훼손 재범방지교육 수료증", "악플·모욕·명예훼손 재범방지계획서", "악플·모욕·명예훼손 예방 실천계획서", "악플·모욕·명예훼손 재범방지 서약서"),
  }],
  ["voice-phishing-basic", {
    id: "voice-phishing-basic",
    courseId: "voice-phishing-basic",
    planId: "basic",
    title: "보이스피싱 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.VOICE_PHISHING_BASIC,
    badge: "가장 부담 없이 시작",
    description: "보이스피싱 범죄 가담 위험과 범죄 제안 대처 기준을 점검하고 전용 작성자료를 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("보이스피싱 재범방지교육 수료증", "보이스피싱 재범방지계획서", "보이스피싱 예방 실천계획서", "보이스피싱 재범방지 서약서"),
  }],
  ["voice-phishing-advanced", {
    id: "voice-phishing-advanced",
    courseId: "voice-phishing-advanced",
    planId: "advanced",
    title: "보이스피싱 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.VOICE_PHISHING_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("보이스피싱 재범방지교육 수료증", "보이스피싱 재범방지계획서", "보이스피싱 예방 실천계획서", "보이스피싱 재범방지 서약서"),
  }],
  ["digital-sexual-crime-basic", {
    id: "digital-sexual-crime-basic",
    courseId: "digital-sexual-crime-basic",
    planId: "basic",
    title: "디지털성범죄 재범방지교육 기본 수료과정",
    price: APPLICATION_PRICES.DIGITAL_SEXUAL_CRIME_BASIC,
    badge: "가장 부담 없이 시작",
    description: "디지털성범죄의 피해 영향과 온라인 위험 행동을 점검하고 전용 작성자료를 정리하는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("디지털성범죄 재범방지교육 수료증", "디지털성범죄 재범방지계획서", "디지털성범죄 예방 실천계획서", "디지털성범죄 재범방지 서약서"),
  }],
  ["digital-sexual-crime-advanced", {
    id: "digital-sexual-crime-advanced",
    courseId: "digital-sexual-crime-advanced",
    planId: "advanced",
    title: "디지털성범죄 재범방지교육 심화이수과정",
    price: APPLICATION_PRICES.DIGITAL_SEXUAL_CRIME_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더한 심화이수과정입니다.",
    includes: advancedProvidedMaterials("디지털성범죄 재범방지교육 수료증", "디지털성범죄 재범방지계획서", "디지털성범죄 예방 실천계획서", "디지털성범죄 재범방지 서약서"),
  }],
  ["legal-compliance-awareness-basic", {
    id: "legal-compliance-awareness-basic",
    courseId: "legal-compliance-awareness-basic",
    planId: "basic",
    title: "준법의식 교육 기본 수료과정",
    price: APPLICATION_PRICES.LEGAL_COMPLIANCE_AWARENESS_BASIC,
    badge: "가장 부담 없이 시작",
    description: "사건 이후 법규 준수 태도와 생활 속 의사결정 기준을 점검하고 재발방지 실천 기준을 세우는 기본 수료과정입니다.",
    includes: basicProvidedMaterials("준법의식 교육 수료증", "준법의식 개선계획서", "준법생활 실천계획서", "준법의식 실천 서약서"),
  }],
  ["legal-compliance-awareness-advanced", {
    id: "legal-compliance-awareness-advanced",
    courseId: "legal-compliance-awareness-advanced",
    planId: "advanced",
    title: "준법의식 교육 심화이수과정",
    price: APPLICATION_PRICES.LEGAL_COMPLIANCE_AWARENESS_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "기본 수료과정에 인지행동기반 재발방지교육과 이수 확인 자료를 더해 법규 준수 행동계획을 구체화하는 심화이수과정입니다.",
    includes: advancedProvidedMaterials("준법의식 교육 수료증", "준법의식 개선계획서", "준법생활 실천계획서", "준법의식 실천 서약서"),
  }],
]);

function buildCounselingProduct(advancedProduct: ApplicationProduct): ApplicationProduct {
  return {
    ...advancedProduct,
    id: advancedProduct.id + "-counseling",
    planId: "counseling",
    title: "심리상담 종합과정",
    price: APPLICATION_PRICES.COUNSELING_COMPREHENSIVE,
    badge: "상위 과정",
    description: "심화이수과정의 모든 제공 내용에 더해 방문 없이 가능한 유선 심리상담과 심리상담의견서·상담기관 탄원서 발급 절차를 포함한 과정입니다.",
    includes: counselingProvidedMaterials(advancedProduct.includes),
  };
}

function getNewPreventionProducts(basicId: string, advancedId: string) {
  const basicProduct = newPreventionApplicationProducts.get(basicId);
  const advancedProduct = newPreventionApplicationProducts.get(advancedId);
  return [basicProduct, advancedProduct, advancedProduct ? buildCounselingProduct(advancedProduct) : null].filter(Boolean) as ApplicationProduct[];
}

export const applicationCourseCategories: ApplicationCourseCategory[] = [
  {
    id: "dui",
    title: "음주운전 재범방지교육",
    description: "음주운전 위험성과 재발 예방을 온라인 재범방지교육으로 차분히 점검합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "car",
    status: "available",
    products: [duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct, duiCounselingApplicationProduct],
    defaultProductId: "dui-cbt-basic",
  },
  {
    id: "violence-prevention",
    title: "폭력범죄 재범방지교육",
    description: "폭력범죄 사건 이후 책임 인식과 재범방지 계획을 온라인 교육으로 정리합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "alert",
    status: "available",
    products: getNewPreventionProducts("violence-basic", "violence-advanced"),
    defaultProductId: "violence-basic",
  },
  {
    id: "gambling-relapse-prevention",
    title: "도박중독 재발방지교육",
    description: "도박중독 재발 위험요인과 생활 관리 계획을 온라인 교육으로 정리합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "dice",
    status: "available",
    products: getNewPreventionProducts("gambling-basic", "gambling-advanced"),
    defaultProductId: "gambling-basic",
  },
  {
    id: "sexual-offense-prevention",
    title: "성범죄 재범방지교육",
    description: "성범죄 재범방지와 관계 윤리, 책임 인식을 온라인 교육으로 점검합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("sexual-offense-basic", "sexual-offense-advanced"),
    defaultProductId: "sexual-offense-basic",
  },
  {
    id: "prostitution-prevention",
    title: "성매매 재범방지교육",
    description: "성매매 행동으로 이어질 수 있는 위험상황과 자기합리화, 접근경로 차단 기준을 온라인 교육으로 점검합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("prostitution-basic", "prostitution-advanced"),
    defaultProductId: "prostitution-basic",
  },
  {
    id: "fraud-prevention",
    title: "사기 재범방지교육",
    description: "사기 사건 이후 거래 책임과 재범 위험요인을 온라인 교육으로 점검합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "fileSearch",
    status: "available",
    products: getNewPreventionProducts("fraud-basic", "fraud-advanced"),
    defaultProductId: "fraud-basic",
  },
  {
    id: "drug-rehab-prevention",
    title: "마약중독 재범방지교육",
    description: "마약류 사용의 위험성을 이해하고, 재사용을 유발하는 상황과 사고방식을 점검하여 구체적인 재발방지 실천계획을 수립하는 온라인 교육과정입니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "alert",
    status: "available",
    products: getNewPreventionProducts("drug-addiction-basic", "drug-addiction-premium"),
    defaultProductId: "drug-addiction-basic",
  },
  {
    id: "digital-crime",
    title: "디지털범죄 재범방지교육",
    description: "온라인에서의 행동이 현실의 피해와 책임으로 이어지는 과정을 이해하고, 같은 행동을 반복하지 않기 위한 구체적인 실천계획을 수립합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("digital-crime-basic", "digital-crime-advanced"),
    defaultProductId: "digital-crime-basic",
  },
  {
    id: "unlicensed-driving-prevention",
    title: "무면허운전 재범방지교육",
    description: "면허 정지·취소 상태의 운전 위험과 반복 원인을 점검하고 운전 차단 기준을 정리합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "car",
    status: "available",
    products: getNewPreventionProducts("unlicensed-driving-basic", "unlicensed-driving-advanced"),
    defaultProductId: "unlicensed-driving-basic",
  },
  {
    id: "hangover-driving-prevention",
    title: "숙취운전 재발방지교육",
    description: "전날 음주와 다음 날 운전 위험을 이해하고 숙취운전 예방 생활 기준을 세웁니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "car",
    status: "available",
    products: getNewPreventionProducts("hangover-driving-basic", "hangover-driving-advanced"),
    defaultProductId: "hangover-driving-basic",
  },
  {
    id: "reckless-retaliatory-driving-prevention",
    title: "난폭·보복운전 재범방지교육",
    description: "운전 중 분노, 위협적 운전, 보복 행동의 반복 원인을 점검하고 안전 운전 기준을 세웁니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "car",
    status: "available",
    products: getNewPreventionProducts("reckless-retaliatory-driving-basic", "reckless-retaliatory-driving-advanced"),
    defaultProductId: "reckless-retaliatory-driving-basic",
  },
  {
    id: "defamation-insult-prevention",
    title: "악플·모욕·명예훼손 재범방지교육",
    description: "악플과 말, 글, 온라인 게시물의 책임을 이해하고 타인의 명예와 인격권을 침해하지 않는 표현 기준을 세웁니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "fileSearch",
    status: "available",
    products: getNewPreventionProducts("defamation-insult-basic", "defamation-insult-advanced"),
    defaultProductId: "defamation-insult-basic",
  },
  {
    id: "voice-phishing-prevention",
    title: "보이스피싱 재범방지교육",
    description: "보이스피싱 범죄의 구조와 가담 위험요인을 이해하고 유사 범죄 제안에 대처하는 기준을 정리합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "fileSearch",
    status: "available",
    products: getNewPreventionProducts("voice-phishing-basic", "voice-phishing-advanced"),
    defaultProductId: "voice-phishing-basic",
  },
  {
    id: "digital-sexual-crime-prevention",
    title: "디지털성범죄 재범방지교육",
    description: "디지털성범죄의 피해 영향과 온라인 환경의 위험요인을 점검하고 책임 있는 행동 기준을 세웁니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("digital-sexual-crime-basic", "digital-sexual-crime-advanced"),
    defaultProductId: "digital-sexual-crime-basic",
  },
  {
    id: "legal-compliance-awareness",
    title: "준법의식 교육",
    description: "사건 이후 준법 태도, 의사결정 기준, 생활 속 법규 준수 계획을 온라인 교육으로 정리합니다.",
    summary: "기본 수료과정 49,000원, 심화이수과정 99,000원, 심리상담 종합과정 199,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("legal-compliance-awareness-basic", "legal-compliance-awareness-advanced"),
    defaultProductId: "legal-compliance-awareness-basic",
  },
];

export const applicationNoticeText =
  "기본 수료과정은 온라인 재범방지교육, 수료증, 과정별 3종 작성자료를 제공합니다. 심화이수과정은 인지행동기반 재범방지교육 이수증과 상세 내역서 출력 구성을 함께 제공합니다.";

export function formatApplicationKrw(value: number) {
  return value.toLocaleString("ko-KR") + "원";
}

export function getApplicationCategory(categoryId: string | null | undefined) {
  return applicationCourseCategories.find((category) => category.id === categoryId) || null;
}

export function getApplicationProduct(categoryId: string | null | undefined, productId: string | null | undefined) {
  const category = getApplicationCategory(categoryId);
  if (!category) {
    return null;
  }

  const normalizedProductId = productId === "dui-documents" ? "dui-cbt-basic" : productId;
  return category.products.find((product) => product.id === normalizedProductId) || null;
}

export function getAdvancedProductForBasicCheckout(categoryId: string | null | undefined, productId: string | null | undefined) {
  const category = getApplicationCategory(categoryId);
  const basicProduct = getApplicationProduct(categoryId, productId);
  const isBasicCheckoutProduct = Boolean(
    basicProduct
    && basicProduct.price === APPLICATION_PRICES.BASIC
    && basicProduct.planId !== "advanced"
    && basicProduct.planId !== "premium"
    && basicProduct.planId !== "counseling"
    && !isCounselingProductId(basicProduct.id)
  );
  if (!category || !isBasicCheckoutProduct) {
    return null;
  }

  return category.products.find((product) => {
    const isAdvancedPlan = product.planId === "advanced" || product.planId === "premium" || product.id === "dui-cbt-advanced";
    return isAdvancedPlan && product.price === APPLICATION_PRICES.PREVENTION_ADVANCED && !isCounselingProductId(product.id);
  }) || null;
}

export function isCounselingProductId(productId: string | null | undefined) {
  return String(productId || "").endsWith("-counseling");
}
