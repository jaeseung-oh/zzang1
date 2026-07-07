export const APPLICATION_PRICES = {
  BASIC: 49000,
  DUI_WITH_DOCUMENTS: 49000,
  DUI_CBT_ADVANCED: 99000,
  PREVENTION_BASIC: 49000,
  PREVENTION_ADVANCED: 99000,
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
  title: "기본과정",
  price: APPLICATION_PRICES.BASIC,
  badge: "가장 부담 없이 시작",
  description: "온라인 예방교육과 수료증, 기본 실천자료를 함께 확인하는 기본 구성입니다.",
  includes: [
    "온라인 예방교육",
    "교육 수료증 PDF 발급",
    "기본 실천자료 제공",
    "재발방지 체크리스트",
    "생활습관 점검자료",
  ],
};

export const duiDocumentsApplicationProduct: ApplicationProduct = {
  id: "dui-documents",
  title: "기본과정",
  price: APPLICATION_PRICES.DUI_WITH_DOCUMENTS,
  badge: "가장 부담 없이 시작",
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
  title: "심화과정",
  price: APPLICATION_PRICES.DUI_CBT_ADVANCED,
  badge: "가장 많이 선택하는 과정",
  description: "기본과정의 모든 제공 내용에 인지행동기반 재발방지 교육 수강과 CBT 이수 서류 발급을 더한 심화 구성입니다.",
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
    badge: "가장 부담 없이 시작",
    description: "폭력범죄 재범방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "기본 실천자료 제공", "재발방지 체크리스트", "생활습관 점검자료"],
  }],
  ["violence-advanced", {
    id: "violence-advanced",
    courseId: "violence-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "예방교육과 양형자료 준비 참고자료를 함께 정리하는 심화 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "반성문 예시", "재발방지계획서", "실천서약서", "생활개선계획", "양형자료 준비 참고자료", "PDF 저장 및 출력"],
  }],
  ["gambling-basic", {
    id: "gambling-basic",
    courseId: "gambling-basic",
    title: "기본과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "도박중독 재발방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "기본 실천자료 제공", "재발방지 체크리스트", "생활습관 점검자료"],
  }],
  ["gambling-advanced", {
    id: "gambling-advanced",
    courseId: "gambling-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "예방교육과 양형자료 준비 참고자료를 함께 정리하는 심화 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "반성문 예시", "재발방지계획서", "실천서약서", "생활개선계획", "양형자료 준비 참고자료", "PDF 저장 및 출력"],
  }],
  ["sexual-offense-basic", {
    id: "sexual-offense-basic",
    courseId: "sexual-offense-basic",
    title: "기본과정",
    price: APPLICATION_PRICES.PREVENTION_BASIC,
    badge: "가장 부담 없이 시작",
    description: "성범죄 재범방지교육 1강과 수료증을 제공하는 기본 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "기본 실천자료 제공", "재발방지 체크리스트", "생활습관 점검자료"],
  }],
  ["sexual-offense-advanced", {
    id: "sexual-offense-advanced",
    courseId: "sexual-offense-advanced",
    title: "심화과정",
    price: APPLICATION_PRICES.PREVENTION_ADVANCED,
    badge: "가장 많이 선택하는 과정",
    description: "예방교육과 양형자료 준비 참고자료를 함께 정리하는 심화 과정입니다.",
    includes: ["온라인 예방교육", "교육 수료증 PDF 발급", "반성문 예시", "재발방지계획서", "실천서약서", "생활개선계획", "양형자료 준비 참고자료", "PDF 저장 및 출력"],
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
    summary: "기본과정 49,000원, 심화과정 99,000원",
    icon: "car",
    status: "available",
    products: [duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "dui-documents",
  },
  {
    id: "violence-prevention",
    title: "폭력범죄 재범방지교육",
    description: "폭력범죄 사건 이후 책임 인식과 재범방지 계획을 온라인 교육으로 정리합니다.",
    summary: "기본과정 49,000원, 심화과정 99,000원",
    icon: "alert",
    status: "available",
    products: getNewPreventionProducts("violence-basic", "violence-advanced"),
    defaultProductId: "violence-basic",
  },
  {
    id: "gambling-relapse-prevention",
    title: "도박중독 재발방지교육",
    description: "도박중독 재발 위험요인과 생활 관리 계획을 온라인 교육으로 정리합니다.",
    summary: "기본과정 49,000원, 심화과정 99,000원",
    icon: "dice",
    status: "available",
    products: getNewPreventionProducts("gambling-basic", "gambling-advanced"),
    defaultProductId: "gambling-basic",
  },
  {
    id: "sexual-offense-prevention",
    title: "성범죄 재범방지교육",
    description: "성범죄 재범방지와 관계 윤리, 책임 인식을 온라인 교육으로 점검합니다.",
    summary: "기본과정 49,000원, 심화과정 99,000원",
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
    products: [duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "dui-documents",
  },
  {
    id: "drug",
    title: "마약 예방교육",
    description: "마약류 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "3개 가격 상품 구성, 준비중",
    icon: "alert",
    status: "comingSoon",
    comingSoonText: "마약류 문제의 위험성과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "dui-documents",
  },
];

export const applicationNoticeText =
  "기본과정은 온라인 예방교육, 수료증, 기본 실천자료를 제공합니다. 심화과정은 재발방지계획서, 실천서약서, 생활개선계획 등 양형자료 준비 참고자료를 함께 제공합니다. 제공 자료는 특정 법적 결과를 보장하지 않습니다.";

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
