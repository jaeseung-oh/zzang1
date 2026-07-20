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
    title: "음주운전 재범방지교육",
    shortTitle: "음주운전",
    navTitle: "음주운전 재범방지",
    summary: "음주운전의 위험성과 반복 원인을 이해하고, 음주 상황과 운전을 분리하기 위한 구체적인 생활 규칙을 학습하는 온라인 재범방지교육입니다.",
    description: "음주운전 사건 이후 재범방지교육, 재발방지 실천자료, 생활개선 계획을 정리할 수 있는 민간 온라인 교육 과정입니다.",
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
    certificateTitle: "음주운전 재범방지교육 수료증",
    availableDocuments: [
      "음주운전 재범방지교육 수료증",
      "반성문 작성자료",
      "재발방지계획서",
      "음주예방실천계획서",
      "음주운전 재발방지 서약서",
      "인지행동기반 재발방지교육 이수증: 심화과정에 한함",
    ],
    imageAlt: "온라인 강의와 재발방지 자료를 함께 확인하는 교육 화면",
    seo: {
      title: "음주운전 재범방지교육 온라인 과정 | 리셋 재범방지교육센터",
      description: "음주운전의 위험성과 반복 원인을 이해하고 구체적인 재발 방지 행동을 학습하는 온라인 재범방지교육입니다.",
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
    availableDocuments: ["폭력범죄 재범방지교육 수료증", "폭력범죄 재범방지계획서", "폭력예방 실천계획서", "폭력범죄 재범방지 서약서", "인지행동기반 재발방지교육 이수증: 심화과정에 한함"],
    imageAlt: "갈등 상황에서 멈춤과 거리 두기를 상징하는 교육 화면",
    seo: {
      title: "폭력범죄 재범방지교육 온라인 과정 | 리셋 재범방지교육센터",
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
    availableDocuments: ["도박중독 재발방지교육 수료증", "도박중독 재발방지계획서", "도박예방 실천계획서", "도박중독 재발방지 서약서", "인지행동기반 재발방지교육 이수증: 심화과정에 한함"],
    imageAlt: "돈과 휴대폰 접근 관리를 상징하는 교육 화면",
    seo: {
      title: "도박중독 재발방지교육 온라인 과정 | 리셋 재범방지교육센터",
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
    availableDocuments: ["성범죄 재범방지교육 수료증", "성범죄 재범방지계획서", "성범죄예방 실천계획서", "성범죄 재범방지 서약서", "인지행동기반 재발방지교육 이수증: 심화과정에 한함"],
    imageAlt: "존중과 경계를 상징하는 온라인 교육 화면",
    seo: {
      title: "성범죄 재범방지교육 온라인 과정 | 리셋 재범방지교육센터",
      description: "동의와 경계, 성적 자기결정권을 이해하고 위험한 생각과 상황을 차단하는 온라인 교육입니다.",
    },
  },

  {
    id: "drug-rehab-prevention",
    slug: "drug-addiction-relapse-prevention",
    title: "마약중독 재범방지교육",
    shortTitle: "마약중독",
    navTitle: "마약중독 재범방지",
    summary: "마약류 사용의 위험성을 이해하고, 재사용을 유발하는 상황과 사고방식을 점검하여 구체적인 재발방지 실천계획을 수립하는 온라인 교육과정입니다.",
    description: "마약중독 문제 이후 재사용 위험상황, 갈망, 유발요인, 보호요인을 점검하고 재발방지 실천계획을 정리할 수 있도록 구성한 민간 온라인 교육 과정입니다.",
    heroLabel: "마약중독 재범방지교육",
    targetAudience: "마약류 사용 문제 이후 재사용 위험을 낮추기 위해 구체적인 생활 관리 기준과 대처계획을 세우려는 사람",
    whyNeeded: [
      "재사용을 유발하는 사람·장소·감정·생활 패턴 점검 필요",
      "갈망이 올라올 때 즉시 사용할 대처 행동 필요",
      "고위험 상황을 미리 피하고 도움을 요청하는 기준 필요",
      "회복을 지지하는 관계와 일상 루틴 정리 필요",
      "재발방지 실천계획과 자기점검 기록 필요",
    ],
    learningPoints: [
      "마약류 사용의 신체적·심리적 위험 이해",
      "재사용을 유발하는 자동사고와 합리화 점검",
      "갈망과 충동이 생기는 고위험 상황 분류",
      "위험 상황 회피와 즉시 대처 행동",
      "보호요인과 지지체계 정리",
    ],
    tags: ["유발요인 점검", "재범방지 계획", "실천서약"],
    basicProductId: "drug-addiction-basic",
    advancedProductId: "drug-addiction-premium",
    certificateTitle: "마약중독 재범방지교육 수료증",
    availableDocuments: [
      "마약중독 재범방지교육 기본과정 수료증",
      "교육 상세내역서",
      "마약범죄 재범방지계획서",
      "마약범죄 재범방지서약서",
      "마약범죄 재범방지실천계획서",
      "인지행동기반 재발방지교육 이수증: 심화과정에 한함",
      "재범방지 교육 이수 상세 내역서: 심화과정에 한함",
    ],
    imageAlt: "재사용 위험요인과 회복계획을 점검하는 온라인 교육 화면",
    seo: {
      title: "마약중독 재범방지교육 온라인 과정 | 리셋 재범방지교육센터",
      description: "마약류 사용 위험성과 재사용 유발요인을 이해하고 재발방지 실천계획을 세우는 온라인 교육입니다.",
    },
  },
  {
    id: "digital-crime",
    slug: "digital-crime-prevention",
    title: "디지털범죄 재범방지교육",
    shortTitle: "디지털범죄",
    navTitle: "디지털범죄 재범방지",
    summary: "온라인에서의 행동이 현실의 피해와 책임으로 이어지는 과정을 이해하고, 같은 행동을 반복하지 않기 위한 구체적인 실천계획을 수립합니다.",
    description: "디지털 공간에서의 행동, 감정과 충동, 온라인 사용 습관을 점검하고 피해자 보호와 재범방지 실천계획을 정리하는 온라인 교육 과정입니다.",
    heroLabel: "디지털범죄 재범방지교육",
    targetAudience: "디지털범죄 관련 사건 이후 자신의 온라인 행동과 사용 습관을 점검하고, 피해자 접촉과 2차 피해를 방지하며 구체적인 실천계획을 세우려는 사람",
    whyNeeded: [
      "디지털 공간의 행동이 현실의 피해로 이어지는 이유 이해",
      "피해자의 심리적·사회적 피해와 재유포 불안 이해",
      "자신의 책임 회피와 왜곡된 사고 점검",
      "분노, 질투, 수치심, 외로움 등 위험감정 파악",
      "익명 계정, 단체방, 위험 사이트 등 환경적 위험요인 파악",
      "피해자 접촉과 2차 피해 방지 원칙 이해",
      "구체적인 디지털 사용 및 재범방지계획 수립",
    ],
    learningPoints: [
      "디지털범죄의 개념과 주요 유형",
      "온라인 행동이 현실의 피해로 이어지는 과정",
      "디지털 정보의 복제성과 재유포 위험",
      "익명성과 책임 회피 사고 점검",
      "감정·생각·행동의 연결 과정",
      "왜곡된 사고와 정당화 점검",
      "위험 계정·사이트·채팅방 등 환경 관리",
      "피해자 접촉 및 2차 피해 방지",
      "충동조절과 감정조절 전략",
      "재범방지계획과 실천서약 작성",
    ],
    tags: ["온라인 행동 점검", "디지털 환경관리", "피해자 보호"],
    basicProductId: "digital-crime-basic",
    advancedProductId: "digital-crime-advanced",
    certificateTitle: "디지털범죄 재범방지교육 수료증",
    availableDocuments: [
      "디지털범죄 재범방지교육 기본과정 수료증",
      "디지털범죄 재범방지교육 심화과정 수료증",
      "디지털범죄 재발방지계획서",
      "디지털범죄 재범방지 실천계획서",
      "디지털범죄 재범방지 실천서약서",
      "반성문 작성자료",
      "재범방지 교육 이수 상세 내역서: 심화과정에 한함",
    ],
    imageAlt: "스마트폰 보안과 온라인 네트워크를 점검하는 교육 화면",
    seo: {
      title: "디지털범죄 재범방지교육 온라인 과정 | 리셋 재범방지교육센터",
      description: "온라인 행동과 위험요인을 점검하고 디지털 사용환경 관리와 재범방지 실천계획을 세우는 교육입니다.",
    },
  },
];

export const commonFaqs = [
  ["어떤 교육과정을 선택해야 하나요?", "사건 유형에 맞는 기본교육을 선택할 수 있으며, 인지행동 개선교육을 함께 수강하려면 심화과정을 선택할 수 있습니다."],
  ["교육은 온라인으로 진행되나요?", "PC와 모바일을 통해 온라인으로 수강할 수 있습니다."],
  ["기본과정과 심화과정의 차이는 무엇인가요?", "기본과정에는 사건 유형별 재범방지교육과 수료증, 과정별 재발방지계획서, 실천계획서, 재발방지 서약서가 포함됩니다. 심화과정은 같은 3종 작성자료에 반성문 작성자료, 인지행동기반 재발방지교육 이수증, 상세 내역서 출력 구성이 추가됩니다."],
  ["수료증에 기본과정 또는 심화과정이 표시되나요?", "과정별 수료증에는 교육 이수 내용이 표시되며, 실천자료는 직접 확인·작성·출력할 수 있습니다."],
  ["수료증과 이수증은 어떻게 활용하나요?", "수료 후 발급되는 문서는 교육 이수 내용과 학습 기록을 정리해 보관하거나 필요한 기관에 제출할 때 참고자료로 활용할 수 있습니다."],
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
