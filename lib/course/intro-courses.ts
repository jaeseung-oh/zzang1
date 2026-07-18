export type IntroCourse = {
  slug: string;
  title: string;
  shortTitle: string;
  headline: string;
  summary: string;
  audience: string[];
  outcomes: string[];
  documents: string[];
  image: string;
  tags: string[];
};

export const introCourses: IntroCourse[] = [
  {
    slug: "dui-prevention",
    title: "음주운전 재범방지교육",
    shortTitle: "음주운전",
    headline: "음주운전 사건 이후 필요한 교육 이수와 재발방지 자료를 온라인으로 준비하세요.",
    summary: "금주 실천 의지, 생활 패턴 점검, 재발방지 계획을 정리할 수 있도록 구성한 유료 온라인 교육입니다. 수강자는 교육 이수 확인 자료와 금주실천서약서, 재발방지계획서 작성자료를 함께 활용할 수 있습니다.",
    audience: ["음주운전 사건 이후 자발적 교육 이수 자료가 필요한 분", "금주 계획과 재발방지 노력을 문서로 정리하려는 분", "방문 없이 온라인으로 교육과 작성자료를 준비하려는 분"],
    outcomes: ["음주 위험성 인식과 책임 의식 정리", "금주 실천 계획 작성 방향 확인", "재발방지 생활 관리 계획 정리"],
    documents: ["교육 이수 확인 자료", "금주실천서약서 작성자료", "재발방지계획서 작성자료"],
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    tags: ["금주 계획", "재발방지", "이수 확인"],
  },
  {
    slug: "fraud-prevention",
    title: "사기 재범방지교육",
    shortTitle: "사기",
    headline: "거래 책임과 신뢰 회복 노력을 교육 이수 자료와 함께 정리하세요.",
    summary: "문서 책임, 거래 윤리, 피해 회복 의지, 재발방지 계획을 정리하는 데 초점을 둔 온라인 교육입니다. 사건 이후 반성문 외에 교육 참여 기록과 계획서 형태의 참고자료를 준비하려는 분에게 적합합니다.",
    audience: ["사기 관련 사건 이후 재발방지 노력을 정리해야 하는 분", "거래 윤리와 문서 책임을 다시 점검하려는 분", "교육 이수 자료와 계획서 작성자료이 필요한 분"],
    outcomes: ["거래 과정의 책임 인식 정리", "피해 회복과 신뢰 회복 방향 점검", "재발방지 실천 계획 구성"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "책임 점검 체크리스트"],
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
    tags: ["문서 책임", "신뢰 회복", "계획 수립"],
  },
  {
    slug: "gambling-relapse-prevention",
    title: "도박중독 재발방지교육",
    shortTitle: "도박중독",
    headline: "도박중독 재발 위험을 점검하고 실천 계획을 온라인으로 정리하세요.",
    summary: "도박중독 재발 위험성, 충동 관리, 금전 관리, 재발방지 환경 조성을 중심으로 구성한 온라인 교육입니다. 자신의 행동을 돌아보고 향후 실천 계획을 자료 형태로 정리할 수 있도록 돕습니다.",
    audience: ["도박 관련 사건 이후 교육 이수 자료가 필요한 분", "충동 관리와 금전 관리 계획을 정리하려는 분", "재발방지 계획을 빠르게 준비하려는 분"],
    outcomes: ["도박 위험성과 반복 원인 점검", "금전·시간 관리 계획 정리", "재발방지 환경 조성 방향 확인"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "생활 관리 계획 작성자료"],
    image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1600&q=80",
    tags: ["충동 관리", "금전 관리", "재발방지"],
  },
  {
    slug: "drug-prevention",
    title: "마약 재범방지교육",
    shortTitle: "마약",
    headline: "약물 문제의 위험성을 점검하고 회복 중심의 실천 계획을 준비하세요.",
    summary: "약물 사용의 위험성, 생활 환경 관리, 재발방지 습관 형성, 도움 요청 계획을 정리하는 온라인 교육입니다. 교육 이수와 실천 계획을 참고자료로 정리하려는 분을 위한 구성입니다.",
    audience: ["마약 관련 사건 이후 교육 참여 자료가 필요한 분", "생활 환경과 관계를 다시 정리하려는 분", "재발방지 실천 계획을 문서화하려는 분"],
    outcomes: ["약물 위험성과 책임 인식 정리", "생활 환경 관리 계획 수립", "도움 요청과 재발방지 기준 점검"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "회복 실천 계획 작성자료"],
    image: "https://images.unsplash.com/photo-1579154341098-e4e158cc7f55?auto=format&fit=crop&w=1600&q=80",
    tags: ["위험성 인식", "회복 계획", "재발방지"],
  },
  {
    slug: "sexual-offense-prevention",
    title: "성범죄 재범방지교육",
    shortTitle: "성범죄",
    headline: "관계 윤리와 경계 인식을 점검하고 책임 있는 재범방지 계획을 정리하세요.",
    summary: "상대방의 경계, 관계 윤리, 피해 공감, 책임 인식을 중심으로 구성한 온라인 교육입니다. 사건 이후 교육 참여 기록과 실천 계획을 참고자료 형태로 갖추려는 분에게 적합합니다.",
    audience: ["성범죄 관련 사건 이후 교육 이수 자료가 필요한 분", "관계 윤리와 책임 인식을 다시 점검하려는 분", "재발방지 계획을 정리해야 하는 분"],
    outcomes: ["경계 인식과 관계 윤리 점검", "피해 공감과 책임 의식 정리", "재발방지 행동 기준 수립"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "관계 윤리 점검표"],
    image: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1600&q=80",
    tags: ["관계 윤리", "피해 공감", "책임 인식"],
  },
  {
    slug: "violence-prevention",
    title: "폭력범죄 재범방지교육",
    shortTitle: "폭력범죄",
    headline: "분노 조절과 책임 의식을 점검하고 재범방지 계획을 준비하세요.",
    summary: "갈등 상황, 감정 조절, 피해 인식, 재범방지 행동 계획을 정리하는 온라인 교육입니다. 폭력범죄 사건 이후 자발적인 개선 노력을 자료로 정리하려는 분에게 맞춘 구성입니다.",
    audience: ["폭력 관련 사건 이후 교육 이수 자료가 필요한 분", "분노 조절과 갈등 대응 방식을 점검하려는 분", "재발방지 계획을 문서로 정리하려는 분"],
    outcomes: ["갈등 상황과 감정 반응 점검", "피해 인식과 책임 의식 정리", "재발방지 행동 계획 수립"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "감정 관리 계획 작성자료"],
    image: "https://images.unsplash.com/photo-1494172961521-33799ddd43a5?auto=format&fit=crop&w=1600&q=80",
    tags: ["감정 관리", "책임 정리", "재발방지"],
  },
  {
    slug: "comprehensive-prevention",
    title: "재범방지 종합교육",
    shortTitle: "재범방지",
    headline: "사건 유형에 맞춰 교육 이수와 재발방지 자료를 한 번에 정리하세요.",
    summary: "책임 인식, 생활 습관 개선, 피해 회복 의지, 실천 계획 정리를 종합적으로 다루는 온라인 교육입니다. 여러 사건 유형에 공통으로 필요한 재발방지 자료 준비 흐름을 제공합니다.",
    audience: ["사건 이후 종합적인 재발방지 교육이 필요한 분", "교육 이수 자료와 실천 계획을 함께 준비하려는 분", "온라인으로 빠르게 자료 준비를 진행하려는 분"],
    outcomes: ["책임 의식과 생활 습관 점검", "피해 회복과 관계 회복 방향 정리", "지속 가능한 재발방지 계획 수립"],
    documents: ["교육 이수 확인 자료", "재발방지계획서 작성자료", "생활 개선 계획 작성자료"],
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    tags: ["종합 점검", "실천 계획", "자료 준비"],
  },
];

export function getIntroCourse(slug: string) {
  return introCourses.find((course) => course.slug === slug);
}
