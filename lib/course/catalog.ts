export type CourseModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  secureVideoPath?: string;
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
    title: "음주운전 예방교육 6강 코스",
    subtitle: "6강 누적 수강을 기준으로 위험 인식부터 재발방지 계획 수립까지 이어지는 음주운전 예방교육 과정",
    durationMinutes: 60,
    priceLabel: "결제 연동 보류",
    caseTypes: ["음주운전"],
    outputs: ["학습확인서", "금주 실천 서약서", "재발방지 계획서"],
    modules: [
      {
        id: "dui-lesson-1",
        title: "음주운전 1강 강의 영상",
        minutes: 10,
        summary: "음주운전의 위험성과 사고 인식을 도입하는 핵심 강의입니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-1.mp4",
      },
      {
        id: "dui-lesson-2",
        title: "알코올의 신체 반응과 운전능력 저하 메커니즘",
        minutes: 10,
        summary: "반응속도, 시야, 판단력 저하가 실제 운전에 미치는 영향을 구조적으로 이해합니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-2.mp4",
      },
      {
        id: "dui-lesson-3",
        title: "사고 사례 분석과 법적 책임 이해",
        minutes: 10,
        summary: "실제 사고 흐름과 책임 구조를 사례 중심으로 정리하는 단계입니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-3.mp4",
      },
      {
        id: "dui-lesson-4",
        title: "재음주운전 위험요인 진단과 회피전략",
        minutes: 10,
        summary: "회식, 야간 귀가, 모임 상황에서 반복될 수 있는 위험 장면과 회피 전략을 다룹니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-4.mp4",
      },
      {
        id: "dui-lesson-5",
        title: "가족·직장·사회적 신뢰 회복 행동",
        minutes: 10,
        summary: "일상 복귀와 관계 회복을 위한 실제 행동 계획을 세우는 강의입니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-5.mp4",
      },
      {
        id: "dui-lesson-6",
        title: "개인 재발방지 계획서 작성과 생활복귀 점검",
        minutes: 10,
        summary: "교육 내용을 실천 가능한 계획서로 정리하고 생활 복귀 점검까지 마무리합니다.",
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-6.mp4",
      },
    ],
  },
];

export const defaultCourse = courseCatalog[0];
