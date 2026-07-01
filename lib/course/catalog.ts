import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";

export type CourseModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  highlights: string[];
  actionChecklist: string[];
  secureVideoPath?: string;
  cloudflareStreamUid?: string;
};

export type CourseDefinition = {
  id: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  priceKrw: number;
  priceLabel: string;
  caseTypes: string[];
  outputs: string[];
  accessValidMonths: number;
  accessValidLabel: string;
  modules: CourseModule[];
};

export const courseCatalog: CourseDefinition[] = [
  {
    id: duiPreventionCourseProduct.courseId,
    title: duiPreventionCourseProduct.courseTitle,
    subtitle: duiPreventionCourseProduct.description,
    durationMinutes: 50,
    priceKrw: duiPreventionCourseProduct.price,
    priceLabel: formatKrw(duiPreventionCourseProduct.price),
    accessValidMonths: 3,
    accessValidLabel: `결제일로부터 ${duiPreventionCourseProduct.durationDays}일`,
    caseTypes: ["음주운전"],
    outputs: ["수료증", "금주 실천 서약서", "재발방지 계획서"],
    modules: [
      {
        id: "dui-lesson-1",
        title: "1강. 음주운전의 실제 위험과 사고 흐름 이해",
        minutes: 10,
        summary: "음주운전이 단순 실수가 아니라 예측 가능한 위험 행동이라는 점을 사고 흐름 중심으로 정리합니다. 한 번의 선택이 본인, 동승자, 보행자, 가족에게 어떤 연쇄 영향을 만드는지 차분히 살펴봅니다.",
        highlights: [
          "음주운전이 발생하는 전형적 상황과 사고 전개 구조 이해",
          "사소한 거리, 늦은 시간, 익숙한 길이라는 자기합리화 점검",
          "피해가 개인 문제를 넘어 타인 안전 문제로 확장되는 이유 정리",
        ],
        actionChecklist: [
          "내가 음주 후 운전을 가볍게 여겼던 표현을 3가지 적어보기",
          "최근 6개월 내 음주 후 이동 결정 패턴 돌아보기",
          "다시 같은 상황이 오면 선택을 바꿀 대안을 한 문장으로 정리하기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-1.mp4",
        cloudflareStreamUid: "22193ede6a22e4b27b2dc1d3ecce214c",
      },
      {
        id: "dui-lesson-2",
        title: "2강. 알코올이 판단력과 운전능력에 미치는 영향",
        minutes: 10,
        summary: "알코올이 반응속도, 시야, 거리감, 주의집중, 위험판단에 어떤 저하를 만드는지 이해합니다. 스스로 멀쩡하다고 느끼는 상태와 실제 수행능력 사이의 차이를 점검합니다.",
        highlights: [
          "취기 자각과 실제 운전 수행능력 저하가 다른 이유 이해",
          "반응 지연, 충동성 증가, 자신감 과잉이 위험해지는 과정 파악",
          "숙취 상태와 다음 날 운전 위험성까지 함께 점검",
        ],
        actionChecklist: [
          "술자리 후 스스로 괜찮다고 판단했던 기준 적어보기",
          "운전 대신 선택 가능한 귀가 수단 3개 정리하기",
          "숙취 운전 가능성까지 포함한 개인 금지 기준 세우기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-2.mp4",
        cloudflareStreamUid: "b002bb63a6c9c854a267e95a29ab648f",
      },
      {
        id: "dui-lesson-3",
        title: "3강. 사고 사례와 법적·사회적 책임 구조",
        minutes: 10,
        summary: "음주운전 사고가 발생했을 때 생기는 형사적 책임, 민사적 부담, 직장과 가족 관계의 손상 등 현실적인 결과를 사례 흐름으로 살펴봅니다. 결과를 두려움으로만 보는 것이 아니라 책임 인식의 출발점으로 정리합니다.",
        highlights: [
          "사고 유무와 관계없이 발생할 수 있는 법적 책임 범위 이해",
          "보험, 직장 신뢰, 가족 관계, 대외 평판에 미치는 영향 파악",
          "사건 이후 반복되는 변명 패턴과 책임 회피 언어 점검",
        ],
        actionChecklist: [
          "내 행동으로 영향받은 사람을 개인별로 적어보기",
          "사과가 필요한 대상과 방식 정리하기",
          "책임 회피성 표현 대신 사용할 문장 2개 적어보기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-3.mp4",
        cloudflareStreamUid: "6aaf94b5c70b938de49809e8d4e50a74",
      },
      {
        id: "dui-lesson-4",
        title: "4강. 인지행동기반 재발방지: 자동사고와 고위험 상황 점검",
        minutes: 10,
        summary: "음주 후 운전으로 이어지는 자동사고, 감정 반응, 행동 선택의 연결고리를 CBT 관점에서 점검합니다. 반복되는 고위험 상황을 구체적으로 분해하고 다른 선택을 준비합니다.",
        highlights: [
          "음주운전으로 이어지는 자동사고와 합리화 언어 파악",
          "감정, 장소, 관계, 시간대가 위험 행동에 미치는 영향 점검",
          "고위험 상황별 대안 사고와 행동 차단 전략 설계",
        ],
        actionChecklist: [
          "내가 반복해 온 자동사고 문장 3가지 적어보기",
          "고위험 상황을 감정, 사람, 장소 기준으로 분류하기",
          "위험 신호가 보일 때 사용할 대체 행동 2가지 정하기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-4.mp4",
        cloudflareStreamUid: "7c452891a700328cdb8f56cb39260970",
      },
      {
        id: "dui-lesson-5",
        title: "5강. 인지행동기반 재발방지: 대처기술과 재발방지 계획",
        minutes: 10,
        summary: "CBT 기반 대처기술을 활용해 음주 약속 전후의 행동 기준, 도움 요청, 대체 이동수단, 자기점검 루틴을 재발방지 계획으로 정리합니다.",
        highlights: [
          "충동과 갈망이 올라오는 순간의 대처기술 이해",
          "실패 가능성을 전제로 한 2차, 3차 안전 계획 구성",
          "가족·직장과 공유할 재발방지 점검 루틴 설계",
        ],
        actionChecklist: [
          "위험 상황에서 사용할 멈춤 문장과 도움 요청 문장 만들기",
          "대리운전 실패 시 사용할 2차, 3차 대안 정리하기",
          "한 달간 점검할 CBT 재발방지 루틴 작성하기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-5.mp4",
        cloudflareStreamUid: "afa89d104a50e779ee12112f1ec59655",
      },
    ],
  },
];

export const defaultCourse = courseCatalog[0];

export const DUI_CBT_ADVANCED_COURSE_ID = "dui-cbt-advanced";
export const duiBasicModules = defaultCourse.modules.slice(0, 3);
export const duiCbtAdvancedModules = defaultCourse.modules.slice(3, 5);
