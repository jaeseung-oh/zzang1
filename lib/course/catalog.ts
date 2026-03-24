export type CourseModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
};

export type CourseDefinition = {
  id: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  priceLabel: string;
  caseTypes: string[];
  outputs: string[];
  modules: CourseModule[];
};

export const courseCatalog: CourseDefinition[] = [
  {
    id: "rapid-sentencing-prep",
    title: "자기점검과 실천 계획 정리 1시간 코스",
    subtitle: "교육 이수와 생활 실천 계획 정리를 위한 핵심 교육, 체크리스트, 확인 자료 흐름",
    durationMinutes: 60,
    priceLabel: "결제 연동 보류",
    caseTypes: ["음주운전", "성범죄", "마약", "폭행", "기타"],
    outputs: ["건전음주 교육 이수증", "인지행동 심리검사 결과지", "준법 서약서"],
    modules: [
      {
        id: "orientation",
        title: "오리엔테이션과 이용 전 유의사항",
        minutes: 10,
        summary: "서비스 성격, 면책 고지, 사용자 직접 검토 책임을 먼저 확인합니다.",
      },
      {
        id: "case-organization",
        title: "상황 정리와 일정 점검",
        minutes: 15,
        summary: "개인 일정, 준비 항목, 우선순위를 차분히 정리합니다.",
      },
      {
        id: "prevention-plan",
        title: "반성 내용과 재범 방지 계획 구성",
        minutes: 20,
        summary: "교육, 치료, 상담, 생활 관리 계획을 문서형으로 정리합니다.",
      },
      {
        id: "final-review",
        title: "최종 점검과 확인 자료 살펴보기",
        minutes: 15,
        summary: "자기 검토 체크 후 확인 자료와 글쓰기 가이드를 함께 살펴봅니다.",
      },
    ],
  },
];

export const defaultCourse = courseCatalog[0];
