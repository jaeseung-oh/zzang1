export const APPLICATION_PRICES = {
  BASIC: 55000,
  DUI_WITH_DOCUMENTS: 89000,
} as const;

export type ApplicationProduct = {
  id: string;
  title: string;
  price: number;
  description: string;
  includes: string[];
  badge?: string;
};

export type ApplicationIconName = "car" | "fileSearch" | "dice" | "alert" | "shieldCheck";

export type ApplicationCourseCategory = {
  id: string;
  title: string;
  description: string;
  summary: string;
  icon: ApplicationIconName;
  products: ApplicationProduct[];
  defaultProductId: string;
};

export const basicApplicationProduct: ApplicationProduct = {
  id: "basic",
  title: "일반 수료형 교육",
  price: APPLICATION_PRICES.BASIC,
  description: "교육 이수 후 수료증 발급이 가능한 기본형 교육",
  includes: ["온라인 강의 수강", "진도율 확인", "수료증 발급"],
};

export const duiDocumentsApplicationProduct: ApplicationProduct = {
  id: "dui-documents",
  title: "실천자료 포함형",
  price: APPLICATION_PRICES.DUI_WITH_DOCUMENTS,
  description: "교육 이수 후 수료증과 함께 실천계획 관련 참고서식 2종을 제공하는 상품",
  includes: [
    "온라인 강의 수강",
    "진도율 확인",
    "수료증 발급",
    "음주예방실천계획서 참고서식",
    "재발방지계획서 참고서식",
  ],
  badge: "자료 포함",
};

export const applicationCourseCategories: ApplicationCourseCategory[] = [
  {
    id: "dui",
    title: "음주운전 예방교육",
    description: "음주운전 위험성과 재발 예방을 온라인 강의로 차분히 점검합니다.",
    summary: "온라인 강의, 진도율 확인, 수료증, 참고서식 선택 가능",
    icon: "car",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct],
    defaultProductId: "dui-documents",
  },
  {
    id: "fraud",
    title: "사기 예방교육",
    description: "거래 윤리와 책임 있는 의사결정을 학습하는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "fileSearch",
    products: [basicApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "gambling",
    title: "도박 예방교육",
    description: "도박 위험 신호와 생활관리 원칙을 정리하는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "dice",
    products: [basicApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "drug",
    title: "마약 예방교육",
    description: "약물 오남용 위험성과 자기점검 방법을 다루는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "alert",
    products: [basicApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "sex-crime",
    title: "성범죄 예방교육",
    description: "관계 윤리와 경계 존중, 책임 있는 행동 기준을 학습합니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "shieldCheck",
    products: [basicApplicationProduct],
    defaultProductId: "basic",
  },
];

export const applicationNoticeText =
  "제공되는 수료증 및 참고서식은 교육 이수 사실과 수강자의 자기점검 및 실천계획 정리를 돕기 위한 자료입니다. 특정 법적 결과를 보장하는 서비스가 아닙니다.";

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
