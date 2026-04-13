export type CourseModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  highlights: string[];
  actionChecklist: string[];
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
    subtitle: "위험 신호 인식, 판단력 저하 이해, 관계 회복, 생활 관리 계획까지 단계적으로 정리하는 자기점검형 음주운전 예방교육 과정",
    durationMinutes: 60,
    priceLabel: "결제 연동 보류",
    caseTypes: ["음주운전"],
    outputs: ["학습확인서", "금주 실천 서약서", "재발방지 계획서"],
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
      },
      {
        id: "dui-lesson-4",
        title: "4강. 재음주운전 위험 상황 진단과 차단 전략",
        minutes: 10,
        summary: "회식, 모임, 야간 귀가, 대리운전 취소, 차량을 미리 가져간 날처럼 반복되기 쉬운 장면을 중심으로 위험 상황을 분해합니다. 재발은 의지 부족만이 아니라 준비 부족에서도 생긴다는 점을 다룹니다.",
        highlights: [
          "재발 가능성이 높은 시간대, 장소, 관계, 감정 상태 구분",
          "술자리 전 준비와 술자리 중 차단 행동의 차이 이해",
          "차량 키 보관, 동행 요청, 귀가 예약 같은 사전 장치 설계",
        ],
        actionChecklist: [
          "내 재발 위험 상황을 시간, 사람, 장소 기준으로 적어보기",
          "술 마시는 날 차량을 아예 두고 가는 원칙 세우기",
          "대리운전 실패 시 사용할 2차, 3차 대안 만들기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-4.mp4",
      },
      {
        id: "dui-lesson-5",
        title: "5강. 가족·직장·사회적 신뢰 회복 행동 설계",
        minutes: 10,
        summary: "신뢰 회복은 말보다 반복 행동으로 이뤄진다는 전제에서 출발합니다. 가족, 동료, 지인 앞에서 보여줄 수 있는 구체 행동과 약속 관리 방식을 정리합니다.",
        highlights: [
          "신뢰 회복에서 중요한 것은 해명보다 일관된 행동이라는 점 이해",
          "가까운 관계에서 불안감을 낮추는 보고·공유 방식 설계",
          "생활 루틴 변화가 재발 방지 신호가 되는 이유 파악",
        ],
        actionChecklist: [
          "가족이나 동료에게 공유할 변화 계획 3가지 적기",
          "음주 약속 전후로 보고할 기준 문장 만들기",
          "한 달 동안 유지할 생활관리 항목 정리하기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-5.mp4",
      },
      {
        id: "dui-lesson-6",
        title: "6강. 개인 재발방지 계획서 작성과 생활 복귀 점검",
        minutes: 10,
        summary: "앞선 강의 내용을 바탕으로 개인 재발방지 계획서를 완성합니다. 금주·절주 판단, 이동수단 대안, 도움 요청 대상, 위험 신호 대응 절차를 실제 생활 계획으로 연결합니다.",
        highlights: [
          "재발방지 계획서는 선언이 아니라 실행 절차라는 점 정리",
          "위험 신호를 느꼈을 때 즉시 실행할 행동 순서 구성",
          "교육 이후 1주, 1개월, 3개월 점검 항목 설계",
        ],
        actionChecklist: [
          "술자리 전, 중, 후 행동 원칙을 단계별로 적기",
          "도움 요청 가능한 사람 2명 이상 지정하기",
          "다음 달 점검 일정과 확인 항목 캘린더에 넣기",
        ],
        secureVideoPath: "course-videos/rapid-sentencing-prep/lesson-6.mp4",
      },
    ],
  },
];

export const defaultCourse = courseCatalog[0];
