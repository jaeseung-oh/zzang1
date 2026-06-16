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
  status: "available" | "comingSoon";
  comingSoonText?: string;
  products: ApplicationProduct[];
  defaultProductId: string;
};

export const basicApplicationProduct: ApplicationProduct = {
  id: "basic",
  title: "기본 수강권",
  price: APPLICATION_PRICES.BASIC,
  badge: "강의 + 수료증",
  description: "온라인 강의 수강과 수강 즉시 수료증 출력이 필요한 분을 위한 기본 과정입니다.",
  includes: ["온라인 강의 5강 수강", "진도율 확인", "수강 즉시 수료증 출력", "교육 이수 기록 확인"],
};

export const duiDocumentsApplicationProduct: ApplicationProduct = {
  id: "dui-documents",
  title: "서식 포함 수강권",
  price: APPLICATION_PRICES.DUI_WITH_DOCUMENTS,
  badge: "강의 + 수료증 + 3종 서식",
  description: "강의와 수료증에 더해 재발방지 관련 3종 서식을 출력·PDF 저장까지 이용하려는 분을 위한 과정입니다.",
  includes: [
    "온라인 강의 5강 수강",
    "진도율 확인",
    "수강 즉시 수료증 출력",
    "재발방지계획서 출력 및 PDF 저장",
    "음주예방실천계획서 출력 및 PDF 저장",
    "음주운전 재발방지 서약서 출력 및 PDF 저장",
  ],
};

export const applicationCourseCategories: ApplicationCourseCategory[] = [
  {
    id: "dui",
    title: "음주운전 예방교육",
    description: "음주운전 위험성과 재발 예방을 온라인 강의로 차분히 점검합니다.",
    summary: "기본 수강권과 3종 서식 포함 수강권 중 선택 가능",
    icon: "car",
    status: "available",
    products: [basicApplicationProduct, duiDocumentsApplicationProduct],
    defaultProductId: "basic",
  },
  {
    id: "fraud",
    title: "사기 예방교육",
    description: "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "준비중",
    icon: "fileSearch",
    status: "comingSoon",
    comingSoonText: "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [],
    defaultProductId: "",
  },
  {
    id: "gambling",
    title: "도박 예방교육",
    description: "도박 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "준비중",
    icon: "dice",
    status: "comingSoon",
    comingSoonText: "도박 문제와 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [],
    defaultProductId: "",
  },
  {
    id: "drug",
    title: "마약 예방교육",
    description: "마약류 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "준비중",
    icon: "alert",
    status: "comingSoon",
    comingSoonText: "마약류 문제의 위험성과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [],
    defaultProductId: "",
  },
  {
    id: "sex-crime",
    title: "성범죄 예방교육",
    description: "성범죄 예방과 재발방지 계획을 다루는 교육 과정은 준비중입니다.",
    summary: "준비중",
    icon: "shieldCheck",
    status: "comingSoon",
    comingSoonText: "성범죄 예방과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다.",
    products: [],
    defaultProductId: "",
  },
];

export const applicationNoticeText =
  "55,000원 기본 수강권은 강의와 수강 즉시 수료증 출력 중심이며, 89,000원 서식 포함 수강권은 재발방지계획서·음주예방실천계획서·음주운전 재발방지 서약서 출력 및 PDF 저장 기능을 함께 제공합니다. 제공 자료는 특정 법적 결과를 보장하지 않습니다.";

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
