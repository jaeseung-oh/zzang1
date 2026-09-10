import { applicationCourseCategories, formatApplicationKrw, type ApplicationCourseCategory, type ApplicationProduct } from "@/lib/course/application-products";

export type ProcedureStageId = "police_before" | "police_investigation" | "prosecution_investigation" | "trial_preparation" | "trial_in_progress" | "before_sentencing" | "after_judgment" | "unknown";
export type PriorHistoryId = "none" | "one" | "two" | "three_plus" | "unknown";
export type RiskLevel = "low" | "moderate" | "high";
export type RecommendedPlan = "basic" | "advanced" | "counseling";

export type AssessmentInput = {
  categoryId: string;
  procedureStageId: ProcedureStageId;
  priorHistoryId: PriorHistoryId;
  commonRiskIds: string[];
  categoryRiskIds: string[];
  effortIds: string[];
};

export type AssessmentOption = {
  id: string;
  label: string;
  description?: string;
  score: number;
  severity?: "minor" | "important";
  exclusive?: boolean;
};

export const assessmentStepLabels = ["1 사건유형", "2 사건단계", "3 전력", "4 사건특성", "5 준비상황", "결과"] as const;

export const procedureStageOptions: AssessmentOption[] = [
  { id: "police_before", label: "경찰 수사 전 또는 조사 예정", description: "경찰 출석요구를 받았거나 최초 조사를 앞두고 있는 단계", score: 0 },
  { id: "police_investigation", label: "경찰 수사 진행 중", description: "경찰 조사를 이미 받았거나 추가 조사·송치를 기다리고 있는 단계", score: 1 },
  { id: "prosecution_investigation", label: "검찰 송치 후 수사 단계", description: "사건이 검찰에 송치되어 검사 처분을 기다리고 있는 단계", score: 2 },
  { id: "trial_preparation", label: "검찰 기소 후 재판 준비 단계", description: "기소되어 첫 공판 또는 재판 절차를 준비하고 있는 단계", score: 3 },
  { id: "trial_in_progress", label: "재판 진행 중", description: "공판이 진행되고 있으며 관련 자료를 준비하고 있는 단계", score: 3 },
  { id: "before_sentencing", label: "선고를 앞두고 있음", description: "심리가 상당 부분 진행되어 선고기일을 앞둔 단계", score: 4 },
  { id: "after_judgment", label: "판결 이후 재범방지 목적", description: "판결 또는 처분 이후 재범예방 및 자기관리 목적으로 교육을 찾는 경우", score: 1 },
  { id: "unknown", label: "잘 모르겠음", description: "현재 사건 진행단계를 정확히 알지 못하는 경우", score: 1 },
];

export const priorHistoryOptions: AssessmentOption[] = [
  { id: "none", label: "없음", description: "현재 사건이 최초인 경우", score: 0 },
  { id: "one", label: "1회 있음", description: "과거 동일하거나 유사한 사건 전력이 1회 있는 경우", score: 2 },
  { id: "two", label: "2회 있음", description: "과거 동일하거나 유사한 사건 전력이 2회 있는 경우", score: 4 },
  { id: "three_plus", label: "3회 이상 있음", description: "동종·유사 사건이 반복된 경우", score: 6 },
  { id: "unknown", label: "잘 모르겠음", score: 2 },
];

export const commonRiskOptions: AssessmentOption[] = [
  { id: "personal_harm", label: "인적 피해가 발생함", score: 2, severity: "important" },
  { id: "property_damage", label: "물적 피해가 발생함", score: 1, severity: "minor" },
  { id: "victim_recovery_pending", label: "피해자가 존재하고 합의 또는 피해회복 문제가 남아 있음", score: 2, severity: "important" },
  { id: "repeated_behavior", label: "동일한 행동이 반복적으로 이루어짐", score: 2, severity: "important" },
  { id: "impaired_control", label: "사건 당시 충동조절 또는 판단력 저하가 두드러졌음", score: 2, severity: "important" },
  { id: "combined_risk", label: "음주·약물·도박 등 다른 위험요인이 함께 존재함", score: 2, severity: "important" },
  { id: "self_concern", label: "현재 본인도 재발 가능성에 대한 우려가 있음", score: 2, severity: "important" },
  { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
  { id: "unknown", label: "잘 모르겠음", score: 1, exclusive: true },
];

const drivingRiskOptions: AssessmentOption[] = [
  { id: "long_distance", label: "상당한 거리를 운전함", score: 1, severity: "minor" },
  { id: "accident", label: "사고가 발생함", score: 2, severity: "important" },
  { id: "personal_injury", label: "인명피해가 발생함", score: 2, severity: "important" },
  { id: "no_plan", label: "운전하지 않기 위한 구체적인 대책이 아직 없음", score: 2, severity: "important" },
  { id: "past_behavior", label: "과거에도 유사한 운전 행동을 한 경험이 있었음", score: 2, severity: "important" },
  { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
  { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
];

export const categoryRiskQuestionFallback = "이번 사건에서 추가로 해당되는 사항을 선택해 주세요.";

export const categoryRiskConfigs: Record<string, { question: string; options: AssessmentOption[] }> = {
  dui: {
    question: "이번 음주운전 사건에서 해당되는 사항을 선택해 주세요.",
    options: [
      { id: "high_bac", label: "혈중알코올농도가 비교적 높게 측정됨", score: 2, severity: "important" },
      { id: "long_distance", label: "상당한 거리를 운전함", score: 1, severity: "minor" },
      { id: "accident", label: "사고가 발생함", score: 2, severity: "important" },
      { id: "personal_injury", label: "인명피해가 발생함", score: 2, severity: "important" },
      { id: "no_plan", label: "음주 후 운전하지 않기 위한 구체적인 대책이 아직 없음", score: 2, severity: "important" },
      { id: "past_drunk_driving", label: "과거에도 음주 후 운전한 경험이 있었음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "hangover-driving-prevention": { question: "이번 숙취운전 사건에서 해당되는 사항을 선택해 주세요.", options: drivingRiskOptions },
  "unlicensed-driving-prevention": { question: "이번 무면허운전 사건에서 해당되는 사항을 선택해 주세요.", options: drivingRiskOptions },
  "reckless-retaliatory-driving-prevention": { question: "이번 난폭·보복운전 사건에서 해당되는 사항을 선택해 주세요.", options: drivingRiskOptions },
  "violence-prevention": {
    question: "이번 폭력 사건에서 해당되는 사항을 선택해 주세요.",
    options: [
      { id: "injury", label: "피해자가 다침", score: 2, severity: "important" },
      { id: "repeated_threat", label: "반복적인 폭력 또는 위협이 있었음", score: 2, severity: "important" },
      { id: "dangerous_object", label: "흉기 또는 위험한 물건이 관련됨", score: 2, severity: "important" },
      { id: "alcohol_related", label: "음주상태에서 발생함", score: 1, severity: "minor" },
      { id: "anger_control", label: "분노 또는 충동조절 문제가 반복됨", score: 2, severity: "important" },
      { id: "ongoing_conflict", label: "피해자와 갈등이 현재도 지속되고 있음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "prostitution-prevention": {
    question: "이번 성매매 사건과 관련해 점검이 필요한 사항을 선택해 주세요.",
    options: [
      { id: "repeated_behavior", label: "유사한 검색·연락·접근 행동이 반복된 적이 있음", score: 2, severity: "important" },
      { id: "control_difficulty", label: "충동 또는 성매매 관련 검색 욕구 조절에 어려움을 경험함", score: 2, severity: "important" },
      { id: "alcohol_or_lodging", label: "음주, 출장, 숙박, 혼자 있는 시간이 주요 위험요인이었음", score: 2, severity: "important" },
      { id: "access_routes", label: "관련 앱, 사이트, 연락처 등 접근경로 정리가 필요함", score: 2, severity: "important" },
      { id: "no_plan", label: "재발방지를 위한 구체적인 행동계획이 아직 없음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "sexual-offense-prevention": {
    question: "이번 사건과 관련해 점검이 필요한 사항을 선택해 주세요.",
    options: [
      { id: "repeated_behavior", label: "유사 행동이 반복된 적이 있음", score: 2, severity: "important" },
      { id: "control_difficulty", label: "충동 또는 성적 행동 통제에 어려움을 경험함", score: 2, severity: "important" },
      { id: "digital_context", label: "디지털 매체 또는 온라인 환경이 주요 위험요인이었음", score: 1, severity: "minor" },
      { id: "boundary_review", label: "상대방의 동의·경계에 대한 인식 점검이 필요함", score: 2, severity: "important" },
      { id: "no_plan", label: "재발방지를 위한 구체적인 행동계획이 아직 없음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "digital-crime": {
    question: "이번 디지털 관련 사건에서 점검이 필요한 사항을 선택해 주세요.",
    options: [
      { id: "repeated_behavior", label: "유사 행동이 반복된 적이 있음", score: 2, severity: "important" },
      { id: "control_difficulty", label: "충동 또는 성적 행동 통제에 어려움을 경험함", score: 2, severity: "important" },
      { id: "digital_context", label: "디지털 매체 또는 온라인 환경이 주요 위험요인이었음", score: 2, severity: "important" },
      { id: "boundary_review", label: "상대방의 동의·경계에 대한 인식 점검이 필요함", score: 2, severity: "important" },
      { id: "no_plan", label: "재발방지를 위한 구체적인 행동계획이 아직 없음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "drug-rehab-prevention": {
    question: "마약·약물 문제와 관련해 해당되는 사항을 선택해 주세요.",
    options: [
      { id: "repeated_use", label: "반복적인 사용 경험이 있음", score: 2, severity: "important" },
      { id: "hard_to_stop", label: "혼자 중단하기 어렵다고 느낀 적이 있음", score: 2, severity: "important" },
      { id: "environment_trigger", label: "주변 사람·환경이 다시 사용하게 만드는 요인이 됨", score: 2, severity: "important" },
      { id: "stress_trigger", label: "스트레스 상황에서 사용 충동이 발생함", score: 2, severity: "important" },
      { id: "no_professional_help", label: "전문적인 상담 또는 치료를 받은 적이 없음", score: 1, severity: "minor" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "gambling-relapse-prevention": {
    question: "도박 문제와 관련해 해당되는 사항을 선택해 주세요.",
    options: [
      { id: "repeated_gambling", label: "반복적으로 도박한 경험이 있음", score: 2, severity: "important" },
      { id: "continued_after_loss", label: "금전적 손실에도 계속함", score: 2, severity: "important" },
      { id: "debt", label: "빚 또는 경제적 문제가 발생함", score: 2, severity: "important" },
      { id: "relapse", label: "중단하려 했으나 다시 시작한 경험이 있음", score: 2, severity: "important" },
      { id: "stress_trigger", label: "스트레스 상황에서 도박충동이 증가함", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
  "fraud-prevention": {
    question: "사기·경제범죄와 관련해 해당되는 사항을 선택해 주세요.",
    options: [
      { id: "repeated_behavior", label: "동일한 행동이 반복됨", score: 2, severity: "important" },
      { id: "financial_pressure", label: "경제적 압박이 범행과 연관됨", score: 2, severity: "important" },
      { id: "recovery_pending", label: "피해회복이 아직 완료되지 않음", score: 2, severity: "important" },
      { id: "judgment_review", label: "자신의 판단과 행동과정에 대한 점검이 필요함", score: 1, severity: "minor" },
      { id: "no_plan", label: "향후 동일 상황에 대한 행동계획이 없음", score: 2, severity: "important" },
      { id: "none", label: "특별히 해당 없음", score: 0, exclusive: true },
      { id: "unknown", label: "정확히 모르겠음", score: 1, exclusive: true },
    ],
  },
};

export const effortOptions: AssessmentOption[] = [
  { id: "education_started", label: "재범방지교육을 이미 일부 이수함", score: -1 },
  { id: "reflection_written", label: "반성문을 작성함", score: 0 },
  { id: "prevention_plan", label: "재발방지계획을 세움", score: -1 },
  { id: "lifestyle_change", label: "생활습관 또는 환경을 변경함", score: -1 },
  { id: "support_requested", label: "가족 등 주변 사람에게 도움을 요청함", score: -1 },
  { id: "counseling_treatment", label: "상담 또는 치료를 받고 있음", score: -1 },
  { id: "victim_recovery", label: "피해회복을 위해 노력하고 있음", score: 0 },
  { id: "not_started", label: "아직 특별한 조치를 시작하지 않음", score: 2, exclusive: true },
];

function findOption(options: AssessmentOption[], id: string | undefined) {
  return options.find((option) => option.id === id) || null;
}

export function getAssessmentCategory(categoryId: string): ApplicationCourseCategory {
  return applicationCourseCategories.find((category) => category.id === categoryId) || applicationCourseCategories[0];
}

export function getAssessmentCategoryRiskConfig(categoryId: string) {
  return categoryRiskConfigs[categoryId] || { question: categoryRiskQuestionFallback, options: [] };
}

export function getAssessmentProduct(category: ApplicationCourseCategory, plan: RecommendedPlan): ApplicationProduct {
  const product = plan === "counseling"
    ? category.products.find((item) => item.planId === "counseling" || item.id.endsWith("-counseling"))
    : plan === "advanced"
      ? category.products.find((item) => item.planId === "advanced" || item.planId === "premium" || item.id.endsWith("-advanced") || item.id.endsWith("-premium"))
      : category.products.find((item) => item.planId === "basic" || item.id.endsWith("-basic") || item.id === category.defaultProductId);
  return product || category.products[0];
}

function riskLevelToPlan(riskLevel: RiskLevel): RecommendedPlan {
  if (riskLevel === "high") return "counseling";
  if (riskLevel === "moderate") return "advanced";
  return "basic";
}

function applyMinimumPlan(plan: RecommendedPlan, minimum: RecommendedPlan): RecommendedPlan {
  const order: RecommendedPlan[] = ["basic", "advanced", "counseling"];
  return order.indexOf(plan) < order.indexOf(minimum) ? minimum : plan;
}

function stageContext(stageId: ProcedureStageId) {
  if (stageId === "police_before" || stageId === "police_investigation") return "지금부터 재발방지 원인과 구체적인 행동계획을 준비할 수 있는 시기입니다.";
  if (stageId === "prosecution_investigation") return "사건 이후의 변화와 재발방지 노력을 보다 구체적으로 정리할 필요가 있습니다.";
  if (stageId === "trial_preparation" || stageId === "trial_in_progress") return "현재까지 실시한 교육, 상담 및 재발방지 노력을 체계적으로 정리하는 것이 중요합니다.";
  if (stageId === "before_sentencing") return "단기간에 형식적인 자료를 늘리기보다 실제로 수행한 교육 및 행동변화 내용을 명확히 정리하는 것이 중요합니다.";
  if (stageId === "after_judgment") return "판결 또는 처분 이후에도 재범예방과 자기관리를 지속적으로 점검하는 데 교육을 활용할 수 있습니다.";
  return "진행단계가 명확하지 않은 경우에도 현재 준비상황과 위험요인을 기준으로 교육 수준을 선택할 수 있습니다.";
}

export function toggleExclusiveSelection(current: string[], option: AssessmentOption) {
  if (option.exclusive) return current.includes(option.id) ? [] : [option.id];
  const exclusiveIds = ["none", "unknown", "not_started"];
  const withoutExclusive = current.filter((id) => !exclusiveIds.includes(id));
  return withoutExclusive.includes(option.id) ? withoutExclusive.filter((id) => id !== option.id) : [...withoutExclusive, option.id];
}

export function calculateAssessment(input: AssessmentInput) {
  const category = getAssessmentCategory(input.categoryId);
  const stage = findOption(procedureStageOptions, input.procedureStageId) || procedureStageOptions[0];
  const history = findOption(priorHistoryOptions, input.priorHistoryId) || priorHistoryOptions[0];
  const categoryRiskConfig = getAssessmentCategoryRiskConfig(category.id);
  const commonRisks = input.commonRiskIds.map((id) => findOption(commonRiskOptions, id)).filter(Boolean) as AssessmentOption[];
  const categoryRisks = input.categoryRiskIds.map((id) => findOption(categoryRiskConfig.options, id)).filter(Boolean) as AssessmentOption[];
  const efforts = input.effortIds.map((id) => findOption(effortOptions, id)).filter(Boolean) as AssessmentOption[];
  const riskOptions = [...commonRisks, ...categoryRisks].filter((item) => !item.exclusive);
  const riskScore = riskOptions.reduce((sum, item) => sum + item.score, 0);
  const effortScore = efforts.reduce((sum, item) => sum + item.score, 0);
  const totalScore = stage.score + history.score + riskScore + effortScore;
  const importantRiskCount = riskOptions.filter((item) => item.score >= 2 || item.severity === "important").length;
  const hasAnyRisk = riskOptions.length > 0 || commonRisks.some((item) => item.id === "unknown") || categoryRisks.some((item) => item.id === "unknown");
  const hasLowPreparation = efforts.length === 0 || efforts.some((item) => item.id === "not_started");

  let riskLevel: RiskLevel = totalScore >= 9 ? "high" : totalScore >= 4 ? "moderate" : "low";
  let recommendedPlan = riskLevelToPlan(riskLevel);
  const overrideReasons: string[] = [];

  if (history.id === "three_plus") {
    recommendedPlan = "counseling";
    riskLevel = "high";
    overrideReasons.push("동종·유사 문제가 반복된 경우에는 단순 교육 이수보다 반복행동의 원인과 위험상황을 개별적으로 점검하는 과정이 중요합니다.");
  } else if (history.id === "two" && hasAnyRisk) {
    recommendedPlan = "counseling";
    riskLevel = "high";
    overrideReasons.push("동종·유사 전력 2회와 추가 위험요인이 함께 확인되어 개별 상담을 포함한 집중 개입을 우선 권장합니다.");
  } else if (history.id === "one") {
    recommendedPlan = applyMinimumPlan(recommendedPlan, "advanced");
    if (recommendedPlan === "advanced" && riskLevel === "low") riskLevel = "moderate";
    overrideReasons.push("동종·유사 전력이 1회 이상 있는 경우에는 기본교육보다 원인과 위험상황을 구조적으로 점검하는 심화교육을 우선 권장합니다.");
  }

  if (history.id === "none" && importantRiskCount > 0) {
    recommendedPlan = applyMinimumPlan(recommendedPlan, "advanced");
    if (recommendedPlan === "advanced" && riskLevel === "low") riskLevel = "moderate";
    overrideReasons.push("현재 사건이 최초로 입력되었더라도 피해, 반복 정황, 충동조절 또는 재발 우려 등 중요 위험요인이 확인되면 기본 수료과정 자동추천은 적절하지 않습니다.");
  }

  const product = getAssessmentProduct(category, recommendedPlan);
  const secondaryPlans = (["basic", "advanced", "counseling"] as RecommendedPlan[]).filter((plan) => plan !== recommendedPlan);
  const secondaryRecommendations = secondaryPlans.map((plan) => ({ plan, product: getAssessmentProduct(category, plan) })).filter((item, index, arr) => item.product && arr.findIndex((other) => other.product.id === item.product.id) === index);

  const factors = [
    "현재 " + stage.label,
    history.id === "none" ? "현재 입력 내용상 동종·유사 사건 전력은 없음" : history.id === "unknown" ? "동종·유사 전력 여부를 명확히 알기 어려움" : "동종·유사 사건 전력 " + history.label,
    ...riskOptions.slice(0, 5).map((item) => item.label),
    hasLowPreparation ? "현재 재범방지 대책이 충분히 구체화되지 않음" : "사건 이후 일부 재범방지 노력을 진행 중",
  ];

  const levelTitle = recommendedPlan === "counseling" ? "집중적 재범방지 개입 권장" : recommendedPlan === "advanced" ? "심화 재범방지교육 권장" : "기본 재범방지교육 권장";
  const recommendationTitle = category.title.replace(" 재범방지교육", "") + " " + product.title;
  const mainReasoning = recommendedPlan === "counseling"
    ? [
        "입력하신 내용을 종합하면 단순한 온라인 교육만으로 끝내기보다 반복 위험요인과 행동패턴을 개별적으로 점검하는 상담과 보다 집중적인 재범방지 개입을 함께 진행하는 것을 권장합니다.",
        "개별 상담을 통해 사건에 영향을 미친 개인적 위험요인과 행동패턴을 확인하고, 온라인 심화교육과 함께 구체적인 재범방지계획을 수립하는 방식을 권장합니다.",
      ]
    : recommendedPlan === "advanced"
      ? [
          "단순 교육 이수보다 사건의 원인과 재발 위험요인을 구조적으로 점검하고, 구체적인 재발방지계획을 마련할 필요성이 높은 상태로 판단됩니다.",
          "따라서 기본교육보다 CBT 기반 심화교육을 통해 재발위험 요인을 구조적으로 점검하는 과정을 권장합니다.",
        ]
      : [
          "현재 입력하신 내용상 동종·유사 사건 전력이 없고 중대한 반복위험 요인이 다수 확인되지는 않았습니다.",
          "우선 기본적인 재범방지교육을 통해 사건의 원인을 점검하고 구체적인 재발방지계획을 마련하는 과정부터 시작할 수 있습니다.",
        ];

  const recommendedContents = recommendedPlan === "counseling"
    ? ["개별 상담을 통한 위험요인 점검", "상담내용을 반영한 재범방지계획", "심화이수과정 전체 교육", "심리상담 의견서", "상담기관 탄원서 등 상담 종합평가 후 관련 자료"]
    : recommendedPlan === "advanced"
      ? ["사건 원인 및 행동패턴 점검", "재범 위험상황 확인", "인지·행동적 대처전략", "구체적인 재발방지계획", "교육이수 상세내역"]
      : ["온라인 재범방지교육", "사건 원인 자기점검", "기본 재발방지계획", "수료증", "PC·모바일 수강"];

  return {
    totalScore,
    riskLevel,
    recommendedPlan,
    recommendedProductId: product.id,
    product,
    category,
    stage,
    history,
    factors,
    reasoning: [...overrideReasons, stageContext(stage.id as ProcedureStageId), ...mainReasoning],
    levelTitle,
    recommendationTitle,
    recommendedContents,
    secondaryRecommendations,
    formattedPrice: formatApplicationKrw(product.price),
  };
}
