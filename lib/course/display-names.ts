export const LEGACY_BASIC_COURSE_NAME = "기본과정";
export const LEGACY_ADVANCED_COURSE_NAME = "심화과정";
export const LEGACY_ADVANCED_COURSE_DISPLAY_NAME = "충실 준비과정";
export const LEGACY_ADVANCED_COURSE_COMPACT_NAME = "충실준비과정";
export const BASIC_COURSE_DISPLAY_NAME = "기본 수료과정";
export const ADVANCED_COURSE_DISPLAY_NAME = "심화이수과정";
export const COUNSELING_COURSE_DISPLAY_NAME = "심리상담 종합과정";

export function normalizeCourseDisplayText(value: unknown) {
  if (typeof value !== "string") return value;
  return value
    .replaceAll(LEGACY_BASIC_COURSE_NAME, BASIC_COURSE_DISPLAY_NAME)
    .replaceAll(LEGACY_ADVANCED_COURSE_DISPLAY_NAME, ADVANCED_COURSE_DISPLAY_NAME)
    .replaceAll(LEGACY_ADVANCED_COURSE_COMPACT_NAME, ADVANCED_COURSE_DISPLAY_NAME)
    .replaceAll(LEGACY_ADVANCED_COURSE_NAME, ADVANCED_COURSE_DISPLAY_NAME);
}

export function getCoursePlanDisplayName(plan?: string | null) {
  const normalized = String(plan || "").trim().toLowerCase();
  if (normalized === "basic") return BASIC_COURSE_DISPLAY_NAME;
  if (normalized === "advanced" || normalized === "premium") return ADVANCED_COURSE_DISPLAY_NAME;
  if (normalized === "counseling") return COUNSELING_COURSE_DISPLAY_NAME;
  return normalizeCourseDisplayText(String(plan || "")) || "확인되지 않음";
}

export function isLegacyOrCurrentAdvancedText(value?: string | null) {
  const text = String(value || "");
  return text.includes(LEGACY_ADVANCED_COURSE_NAME)
    || text.includes(LEGACY_ADVANCED_COURSE_DISPLAY_NAME)
    || text.includes(LEGACY_ADVANCED_COURSE_COMPACT_NAME)
    || text.includes(ADVANCED_COURSE_DISPLAY_NAME);
}

export function isLegacyOrCurrentBasicText(value?: string | null) {
  const text = String(value || "");
  return text.includes(LEGACY_BASIC_COURSE_NAME) || text.includes(BASIC_COURSE_DISPLAY_NAME);
}
