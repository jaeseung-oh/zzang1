export const APPLICATION_PRICES = {
  BASIC: 59000,
  DUI_WITH_DOCUMENTS: 109000,
  DUI_CBT_ADVANCED: 290000,
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
    id: "gambling",
    title: "도박 예방교육",
    description: "도박 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "3개 가격 상품 구성, 준비중",
    icon: "dice",
    status: "comingSoon",
    comingSoonText: "도박 문제와 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
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
  {
    id: "sex-crime",
    title: "성범죄 예방교육",
    description: "성범죄 예방과 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "3개 가격 상품 구성, 준비중",
    icon: "shieldCheck",
    status: "comingSoon",
    comingSoonText: "성범죄 예방과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct],
    defaultProductId: "basic",
  },
];

export const applicationNoticeText =
  "음주운전 예방교육 결제 완료 회원에게 반성문 작성 가이드와 예시 열람·인쇄·PDF 저장 기능을 제공합니다. 109,000원 서식 포함 수강권은 여기에 재발방지계획서·음주예방실천계획서·음주운전 재발방지 서약서까지 함께 제공합니다. 290,000원 심화과정은 109,000원 과정의 모든 제공 내용에 인지행동기반 재발방지 교육 수강, 인지행동기반 재발방지교육 이수증, 재범방지 교육 이수 상세 내역서 발급을 함께 제공합니다. 제공 자료는 특정 법적 결과를 보장하지 않습니다.";

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
