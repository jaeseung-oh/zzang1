import {
  duiCbtAdvancedApplicationProduct,
  duiDocumentsApplicationProduct,
  getApplicationCategory,
  type ApplicationProduct,
} from "@/lib/course/application-products";

export type CourseCategory = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  navTitle: string;
  summary: string;
  description: string;
  heroLabel: string;
  targetAudience: string;
  whyNeeded: string[];
  learningPoints: string[];
  tags: string[];
  basicProductId: string;
  advancedProductId: string;
  certificateTitle: string;
  availableDocuments: string[];
  imageAlt: string;
  seo: {
    title: string;
    description: string;
  };
};

export const platformCourseCategories: CourseCategory[] = [
  {
    id: "dui",
    slug: "dui-prevention",
    title: "음주운전 예방교육",
    shortTitle: "음주운전",
    navTitle: "음주운전 재범방지",
    summary: "음주운전의 위험성과 반복 원인을 이해하고, 음주 상황과 운전을 분리하기 위한 구체적인 생활 규칙을 학습하는 온라인 예방교육입니다.",
    description: "음주운전 사건 이후 예방교육, 재발방지 실천자료, 생활개선 계획을 정리할 수 있는 민간 온라인 교육 과정입니다.",
    heroLabel: "음주운전 재범방지 교육",
    targetAudience: "음주운전 사건 이후 자신의 음주와 운전 습관을 점검하고, 재발 방지 행동을 구체적으로 정리하려는 사람",
    whyNeeded: [
      "음주 후 판단력과 반응 속도 저하",
      "반복되는 음주운전 위험 상황",
      "음주 일정과 차량 이용 관리 필요",
      "사건 이후 생활 습관 점검 필요",
      "재발 방지를 위한 구체적인 행동 계획 필요",
    ],
    learningPoints: [
      "음주운전이 개인과 타인에게 미치는 영향",
      "음주운전이 반복되는 심리와 상황",
      "음주 예정일 차량 이용 차단",
      "대리운전·택시·대중교통 이용 계획",
      "다음 날 숙취 운전 예방",
      "가족 또는 지인과의 차량 열쇠 관리",
      "음주 및 운전 습관 점검",
    ],
    tags: ["음주 관리", "운전 차단", "재발 방지 계획"],
    basicProductId: "dui-documents",
    advancedProductId: "dui-cbt-advanced",
    certificateTitle: "음주운전 예방교육 수료증",
    availableDocuments: [
      "음주운전 예방교육 수료증",
      "반성문 작성 가이드",
      "재발방지계획서",
      "음주예방실천계획서",
      "음주운전 재발방지 서약서",
      "인지행동 개선교육 이수증: 심화과정에 한함",
    ],
    imageAlt: "온라인 강의와 재발방지 자료를 함께 확인하는 교육 화면",
    seo: {
      title: "음주운전 예방교육 온라인 과정 | ResetEdu 재발방지교육센터",
      description: "음주운전의 위험성과 반복 원인을 이해하고 구체적인 재발 방지 행동을 학습하는 온라인 예방교육입니다.",
    },
  },
  {
    id: "violence-prevention",
    slug: "violence-prevention",
    title: "폭력범죄 재범방지교육",
    shortTitle: "폭력범죄",
    navTitle: "폭력범죄 재범방지",
    summary: "분노와 충동이 폭력 행동으로 이어지는 과정을 이해하고, 갈등 상황에서 행동을 멈추고 안전한 대처를 선택하는 방법을 학습하는 온라인 교육입니다.",
    description: "폭력 사건 이후 교육 수료증과 재범방지 노력을 정리할 수 있도록 구성한 민간 온라인 교육 과정입니다.",
    heroLabel: "폭력범죄 재범방지교육",
    targetAudience: "폭력 사건 이후 분노와 충동의 원인을 이해하고, 비슷한 상황에서 폭력 행동을 반복하지 않기 위한 구체적인 대처 방법을 배우려는 사람",
    whyNeeded: [
      "폭력 직전의 감정과 신체 반응을 알아차리기 어려움",
      "상대의 행동을 공격적으로 해석하는 경향",
      "자존심과 체면 때문에 갈등이 확대되는 상황",
      "음주 후 충동과 공격성 증가",
      "갈등을 안전하게 종료하는 행동 기술 부족",
    ],
    learningPoints: [
      "신체적·언어적·심리적 폭력의 이해",
      "폭력이 피해자와 가족에게 미치는 영향",
      "폭력 행동으로 이어지는 감정·생각·신체 반응",
      "적대적 해석과 인지 왜곡 점검",
      "분노와 충동의 초기 신호",
      "STOP 행동 기술",
      "거리 두기와 타임아웃",
      "비폭력적 의사표현",
      "생활 관리와 위험 상황 차단",
      "피해자에 대한 2차 가해 예방",
    ],
    tags: ["분노 조절", "충동 관리", "갈등 대처"],
    basicProductId: "violence-basic",
    advancedProductId: "violence-advanced",
    certificateTitle: "폭력범죄 재범방지교육 수료증",
    availableDocuments: ["폭력범죄 재범방지교육 수료증", "인지행동 개선교육 이수증: 심화과정에 한함"],
    imageAlt: "갈등 상황에서 멈춤과 거리 두기를 상징하는 교육 화면",
    seo: {
      title: "폭력범죄 재범방지교육 온라인 과정 | ResetEdu 재발방지교육센터",
      description: "분노와 충동, 폭력 위험 신호를 이해하고 갈등 상황에서 행동을 멈추는 방법을 배우는 온라인 교육입니다.",
    },
  },
  {
    id: "gambling-relapse-prevention",
    slug: "gambling-relapse-prevention",
    title: "도박중독 재발방지교육",
    shortTitle: "도박중독",
    navTitle: "도박중독 재발방지",
    summary: "도박을 반복하게 만드는 보상 기대와 손실 추격 심리를 이해하고, 돈·시간·휴대폰·관계를 관리하는 재발 방지 방법을 학습하는 온라인 교육입니다.",
    description: "도박 문제 이후 교육 수료증과 생활 관리 계획을 정리할 수 있도록 구성한 민간 온라인 교육 과정입니다.",
    heroLabel: "도박중독 재발방지교육",
    targetAudience: "도박 문제로 경제적·관계적 어려움을 경험했거나, 반복되는 도박 행동을 멈추기 위한 구체적인 생활 관리 방법을 배우려는 사람",
    whyNeeded: [
      "잃은 돈을 되찾으려는 손실 추격",
      "자신의 분석이나 감으로 결과를 통제할 수 있다는 믿음",
      "도박 사실과 채무를 숨기는 행동",
      "온라인 도박의 높은 접근성",
      "도박 충동을 유발하는 돈·시간·감정·관계 요인",
      "도박으로 인한 가족·직장·경제 문제",
    ],
    learningPoints: [
      "도박중독이 반복되는 원리",
      "뇌의 보상 기대와 불확실한 보상",
      "손실 추격과 통제 착각",
      "선택 기억과 한방 사고",
      "도박 전·중·후 감정 변화",
      "개인별 유발 요인 점검",
      "온라인 도박 접근 차단",
      "계좌·카드·현금 관리",
      "휴대폰과 연락망 정리",
      "충동이 올라올 때 행동을 미루는 방법",
      "회복 파트너와 전문기관 활용",
    ],
    tags: ["손실 추격 차단", "재정 관리", "접근 환경 차단"],
    basicProductId: "gambling-basic",
    advancedProductId: "gambling-advanced",
    certificateTitle: "도박중독 재발방지교육 수료증",
    availableDocuments: ["도박중독 재발방지교육 수료증", "인지행동 개선교육 이수증: 심화과정에 한함"],
    imageAlt: "돈과 휴대폰 접근 관리를 상징하는 교육 화면",
    seo: {
      title: "도박중독 재발방지교육 온라인 과정 | ResetEdu 재발방지교육센터",
      description: "손실 추격과 도박 충동의 원리를 이해하고 돈·휴대폰·시간을 관리하는 재발 방지 온라인 교육입니다.",
    },
  },
  {
    id: "sexual-offense-prevention",
    slug: "sexual-offense-prevention",
    title: "성범죄 재범방지교육",
    shortTitle: "성범죄",
    navTitle: "성범죄 재범방지",
    summary: "동의와 경계, 성적 자기결정권을 이해하고, 위험한 생각과 상황을 점검하여 행동을 중단하는 예방 원칙을 학습하는 온라인 교육입니다.",
    description: "성범죄 사건 이후 교육 수료증과 재범방지 노력을 정리할 수 있도록 구성한 민간 온라인 교육 과정입니다.",
    heroLabel: "성범죄 재범방지교육",
    targetAudience: "성범죄 사건 이후 동의와 경계에 대한 이해를 높이고, 위험한 생각과 행동을 반복하지 않기 위한 구체적인 예방 원칙을 배우려는 사람",
    whyNeeded: [
      "침묵이나 소극적 반응을 동의로 오해하는 문제",
      "관계가 있다는 이유로 동의를 당연하게 생각하는 태도",
      "거절을 받아들이지 못하는 행동",
      "술이나 감정을 이유로 책임을 축소하는 생각",
      "디지털 공간에서 성적 침해를 가볍게 인식하는 문제",
      "피해자에게 반복적으로 연락하거나 사과를 강요하는 2차 가해 위험",
    ],
    learningPoints: [
      "성적 자기결정권의 이해",
      "자유롭고 명확한 동의",
      "동의의 철회와 경계 존중",
      "권리의식과 인지 왜곡 점검",
      "거절을 받아들이는 방법",
      "음주와 위험 상황 관리",
      "디지털 성폭력 예방",
      "성적 메시지·촬영·저장·전송의 주의사항",
      "위험한 충동이 생겼을 때 STOP 기술",
      "피해자 접촉과 2차 가해 예방",
      "재범 위험 환경 차단",
    ],
    tags: ["동의와 경계", "인지 왜곡 점검", "위험 상황 차단"],
    basicProductId: "sexual-offense-basic",
    advancedProductId: "sexual-offense-advanced",
    certificateTitle: "성범죄 재범방지교육 수료증",
    availableDocuments: ["성범죄 재범방지교육 수료증", "인지행동 개선교육 이수증: 심화과정에 한함"],
    imageAlt: "존중과 경계를 상징하는 온라인 교육 화면",
    seo: {
      title: "성범죄 재범방지교육 온라인 과정 | ResetEdu 재발방지교육센터",
      description: "동의와 경계, 성적 자기결정권을 이해하고 위험한 생각과 상황을 차단하는 온라인 교육입니다.",
    },
  },
];

export const commonFaqs = [
  ["어떤 교육과정을 선택해야 하나요?", "사건 유형에 맞는 기본교육을 선택할 수 있으며, 인지행동 개선교육을 함께 수강하려면 심화과정을 선택할 수 있습니다."],
  ["교육은 온라인으로 진행되나요?", "PC와 모바일을 통해 온라인으로 수강할 수 있습니다."],
  ["기본과정과 심화과정의 차이는 무엇인가요?", "기본과정에는 사건 유형별 예방교육과 함께 반성문 예시, 재발방지계획서, 실천서약서, 생활개선계획 등 기본 실천자료가 포함됩니다. 심화과정은 여기에 인지행동기반 재발방지교육, 심화 이수증, 교육 이수 및 실천자료 출력 구성이 추가됩니다."],
  ["수료증에 기본과정 또는 심화과정이 표시되나요?", "과정별 수료증에는 교육 이수 내용이 표시되며, 실천자료는 직접 확인·작성·출력할 수 있습니다."],
  ["수료증이 반드시 인정되나요?", "본 센터의 수료증과 이수증은 민간 교육 이수 자료이며, 제출 가능 여부와 활용 결과는 개별 사건과 제출기관의 판단에 따라 달라질 수 있습니다."],
  ["교육을 수강하면 특정 결과가 보장되나요?", "교육 수강이나 자료 제출만으로 특정한 처분이나 결과가 보장되지는 않습니다."],
  ["법률상담도 받을 수 있나요?", "본 센터는 법률상담이나 법률사무를 제공하지 않습니다. 구체적인 법률문제는 변호사 등 법률 전문가에게 문의해야 합니다."],
] as const;

export const changeLearningAreas = [
  ["행동의 원인 이해", "문제 행동이 어떤 감정, 생각, 상황에서 시작되는지 점검합니다."],
  ["위험 신호 확인", "행동이 반복되기 전에 나타나는 신체·감정·환경적 신호를 알아차립니다."],
  ["대처 행동 학습", "위험한 순간에 멈추고, 거리를 두고, 도움을 요청하는 행동을 학습합니다."],
  ["생활 구조 변경", "음주, 돈, 휴대폰, 관계, 시간 등 재발 위험을 높이는 환경을 조정합니다."],
] as const;

export const processSteps = [
  ["교육 선택", "사건 유형과 필요한 교육 범위에 맞는 과정을 확인합니다."],
  ["과정 결제", "기본과정 또는 심화과정을 선택하고 온라인으로 결제합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 PC 또는 모바일로 교육을 수강합니다."],
  ["문서 확인", "과정에서 제공되는 수료증과 이수증을 확인하고 인쇄하거나 PDF로 저장합니다."],
] as const;

export function getPlatformCourseBySlug(slug: string) {
  return platformCourseCategories.find((course) => course.slug === slug) || null;
}

export function getPlatformCourseProducts(course: CourseCategory): ApplicationProduct[] {
  const category = getApplicationCategory(course.id);
  if (category?.products.length) {
    return category.products;
  }

  if (course.id === "dui") {
    return [duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct];
  }

  return [];
}

export function getMainProductPair(course: CourseCategory) {
  const products = getPlatformCourseProducts(course);
  return {
    basic: products.find((product) => product.id === course.basicProductId) || products[0] || null,
    advanced: products.find((product) => product.id === course.advancedProductId) || products[products.length - 1] || null,
  };
}

export function getApplyHref(course: CourseCategory, productId?: string) {
  const query = new URLSearchParams({ category: course.id });
  if (productId) query.set("productId", productId);
  return "/courses/apply?" + query.toString();
}
