export const APPLICATION_PRICES = {
  BASIC: 59000,
  DUI_WITH_DOCUMENTS: 109000,
  DUI_CBT_ADVANCED: 199000,
  PREVENTION_BASIC: 59000,
  PREVENTION_ADVANCED: 129000,
} as const;

export type ApplicationProduct = {
  id: string;
  title: string;
  price: number;
  description: string;
  includes: string[];
  badge?: string;
  courseId?: string;
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

export const basicApplicationProduct: ApplicationProduct = {
  id: "basic",
  title: "교육과 수료증이 필요한 분",
  price: APPLICATION_PRICES.BASIC,
  badge: "강의 + 수료증",
  description: "온라인 예방교육을 수강하고 수강 즉시 수료증을 발급·출력할 수 있는 기본 구성입니다.",
  includes: [
    "온라인 예방교육 수강",
    "진도율 확인",
    "수강 즉시 수료증 출력",
    "반성문 작성 가이드 및 예시 열람·인쇄·PDF 저장",
    "교육 이수 기록 확인",
  ],
};

export const duiDocumentsApplicationProduct: ApplicationProduct = {
  id: "dui-documents",
  title: "교육과 재발방지 자료를 함께 준비하는 분",
  price: APPLICATION_PRICES.DUI_WITH_DOCUMENTS,
  badge: "교육과 실천자료 포함",
  description: "예방교육과 수료증에 더해 재발방지계획서, 실천계획서, 서약서를 직접 작성하고 출력할 수 있는 구성입니다.",
  includes: [
    "온라인 예방교육 수강",
    "진도율 확인",
    "수강 즉시 수료증 출력",
    "반성문 작성 가이드 및 예시 열람·인쇄·PDF 저장",
    "재발방지계획서 출력 및 PDF 저장",
    "음주예방실천계획서 출력 및 PDF 저장",
    "음주운전 재발방지 서약서 출력 및 PDF 저장",
  ],
};

export const duiCbtAdvancedApplicationProduct: ApplicationProduct = {
  id: "dui-cbt-advanced",
  courseId: "dui-cbt-advanced",
  title: "인지행동기반 재발방지교육 심화과정",
  price: APPLICATION_PRICES.DUI_CBT_ADVANCED,
  badge: "자료 + CBT 심화",
  description: "109,000원 과정의 모든 제공 내용에 인지행동기반 재발방지 교육 수강과 CBT 이수 서류 발급을 더한 심화 구성입니다.",
  includes: [
    "온라인 예방교육 수강",
    "진도율 확인",
    "수강 즉시 수료증 출력",
    "반성문 작성 가이드 및 예시 열람·인쇄·PDF 저장",
    "재발방지계획서 출력 및 PDF 저장",
    "음주예방실천계획서 출력 및 PDF 저장",
    "음주운전 재발방지 서약서 출력 및 PDF 저장",
    "인지행동기반 재발방지 교육 수강",
    "인지행동기반 재발방지교육 이수증 출력",
    "재범방지 교육 이수 상세 내역서 출력",
  ],
};


const newPreventionApplicationProducts = new Map<string, ApplicationProduct>([
  ["violence-basic", {
    id: "violence-basic",
    courseId: "violence-basic",
    title: "기본과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "강의 + 수료증",
    description: "폭력범죄 재범방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["폭력범죄 재범방지교육 1강", "폭력범죄 재범방지교육 수료증", "온라인 인쇄 및 PDF 저장"],
  }],
  ["violence-advanced", {
    id: "violence-advanced",
    courseId: "violence-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "통합 과정",
    description: "재범·재발 방지교육과 인지행동 개선교육을 함께 수강하는 통합 과정입니다.",
    includes: ["폭력범죄 재범방지교육 1강", "인지행동 개선교육", "폭력범죄 재범방지교육 수료증", "인지행동 개선교육 이수증", "온라인 인쇄 및 PDF 저장"],
  }],
  ["gambling-basic", {
    id: "gambling-basic",
    courseId: "gambling-basic",
    title: "기본과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "강의 + 수료증",
    description: "도박중독 재발방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["도박중독 재발방지교육 1강", "도박중독 재발방지교육 수료증", "온라인 인쇄 및 PDF 저장"],
  }],
  ["gambling-advanced", {
    id: "gambling-advanced",
    courseId: "gambling-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "통합 과정",
    description: "재범·재발 방지교육과 인지행동 개선교육을 함께 수강하는 통합 과정입니다.",
    includes: ["도박중독 재발방지교육 1강", "인지행동 개선교육", "도박중독 재발방지교육 수료증", "인지행동 개선교육 이수증", "온라인 인쇄 및 PDF 저장"],
  }],
  ["sexual-offense-basic", {
    id: "sexual-offense-basic",
    courseId: "sexual-offense-basic",
    title: "기본과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "강의 + 수료증",
    description: "성범죄 재범방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["성범죄 재범방지교육 1강", "성범죄 재범방지교육 수료증", "온라인 인쇄 및 PDF 저장"],
  }],
  ["sexual-offense-advanced", {
    id: "sexual-offense-advanced",
    courseId: "sexual-offense-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "통합 과정",
    description: "재범·재발 방지교육과 인지행동 개선교육을 함께 수강하는 통합 과정입니다.",
    includes: ["성범죄 재범방지교육 1강", "인지행동 개선교육", "성범죄 재범방지교육 수료증", "인지행동 개선교육 이수증", "온라인 인쇄 및 PDF 저장"],
  }],
]);

function getNewPreventionProducts(basicId: string, advancedId: string) {
  return [newPreventionApplicationProducts.get(basicId), newPreventionApplicationProducts.get(advancedId)].filter(Boolean) as ApplicationProduct[];
}

export const applicationCourseCategories: ApplicationCourseCategory[] = [
  {
    id: "dui",
    title: "음주운전 예방교육",
    description: "음주운전 위험성과 재발 예방을 온라인 예방교육으로 차분히 점검합니다.",
    summary: "기본 수강권과 3종 서식 포함 수강권 중 선택 가능",
    icon: "car",
    status: "available",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "violence-prevention",
    title: "폭력범죄 재범방지교육",
    description: "폭력범죄 사건 이후 책임 인식과 재범방지 계획을 온라인 교육으로 정리합니다.",
    summary: "기본과정 59,000원, 심화과정 129,000원",
    icon: "alert",
    status: "available",
    products: getNewPreventionProducts("violence-basic", "violence-advanced"),
    defaultProductId: "violence-basic",
  },
  {
    id: "gambling-relapse-prevention",
    title: "도박중독 재발방지교육",
    description: "도박중독 재발 위험요인과 생활 관리 계획을 온라인 교육으로 정리합니다.",
    summary: "기본과정 59,000원, 심화과정 129,000원",
    icon: "dice",
    status: "available",
    products: getNewPreventionProducts("gambling-basic", "gambling-advanced"),
    defaultProductId: "gambling-basic",
  },
  {
    id: "sexual-offense-prevention",
    title: "성범죄 재범방지교육",
    description: "성범죄 재범방지와 관계 윤리, 책임 인식을 온라인 교육으로 점검합니다.",
    summary: "기본과정 59,000원, 심화과정 129,000원",
    icon: "shieldCheck",
    status: "available",
    products: getNewPreventionProducts("sexual-offense-basic", "sexual-offense-advanced"),
    defaultProductId: "sexual-offense-basic",
  },
  {
    id: "fraud",
    title: "사기 예방교육",
    description: "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "3개 가격 상품 구성, 준비중",
    icon: "fileSearch",
    status: "comingSoon",
    comingSoonText: "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "drug",
    title: "마약 예방교육",
    description: "마약류 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "3개 가격 상품 구성, 준비중",
    icon: "alert",
    status: "comingSoon",
    comingSoonText: "마약류 문제의 위험성과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "basic",
  },
];

export const applicationNoticeText =
  "신규 재범·재발 방지교육 기본과정은 해당 교육 1강과 수료증을 제공합니다. 심화과정은 해당 교육 1강에 기존 인지행동 개선교육과 기존 이수증 발급 권한을 함께 제공합니다. 제공 자료는 특정 법적 결과를 보장하지 않습니다.";

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

  return category.products.find((product) => product.id === productId) || null;
}
