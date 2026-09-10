import type { User } from "firebase/auth";
import { DUI_CBT_ADVANCED_COURSE_ID, defaultCourse, getCourseDefinition } from "@/lib/course/catalog";
import { getApplicationCategory } from "@/lib/course/application-products";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";

export type EnrollmentStatus = "active" | "cancelled" | "expired" | "pending" | "awaiting_deposit" | "refunded";

const allowedEnrollmentSourceTypes = new Set(["PAYMENT", "MANUAL", "MIGRATION", "PROMOTION", "ADMIN_TEST", "EXTENSION", "TRUSTED_PAYMENT_RECORD", "PAID_RECORD", "PORTONE", "PORTONE_KCP", "KCP", "NHN_KCP", "ADMIN", "ADMIN_GRANTED", "MANUAL_GRANT", "ADMIN_MANUAL", "FREE"]);

function maskFirestoreSegment(value: string) {
  if (!value) return "";
  if (value.length <= 8) return value.slice(0, 2) + "***";
  return value.slice(0, 4) + "***" + value.slice(-4);
}

export type EnrollmentRecord = {
  userId: string;
  uid?: string;
  courseId: string;
  canonicalCourseId?: string;
  courseTitle: string;
  productId?: string;
  productTitle?: string;
  paymentId?: string;
  orderId?: string;
  paymentStatus?: "paid" | "pending" | "awaiting_deposit" | "failed" | "cancelled" | "refunded" | string | null;
  sourceType?: "PAYMENT" | "MANUAL" | "PROMOTION" | "FREE" | string;
  status?: EnrollmentStatus | string;
  isActive?: boolean;
  enrollmentStatus?: EnrollmentStatus;
  accessStatus?: EnrollmentStatus;
  purchasedAt?: string | Date | { seconds: number } | null;
  startsAt?: string | Date | { seconds: number } | null;
  accessStartsAt?: string | Date | { seconds: number } | null;
  expiresAt?: string | Date | { seconds: number } | null;
  accessEndsAt?: string | Date | { seconds: number } | null;
  certificateAvailable?: boolean;
  amount?: number;
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
  includedWithProductId?: string | null;
  includedWithEnrollmentId?: string | null;
  includedWithOrderId?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const OPERATING_COURSE_ID = defaultCourse.id;
export const APPLICATION_TO_COURSE_ID: Record<string, string> = {
  dui: defaultCourse.id,
  basic: defaultCourse.id,
  "dui-documents": defaultCourse.id,
  "dui-cbt-basic": defaultCourse.id,
  "dui-prevention": defaultCourse.id,
  "dui-prevention-basic": defaultCourse.id,
  "rapid-sentencing-prep": defaultCourse.id,
  cbt: DUI_CBT_ADVANCED_COURSE_ID,
  advanced: DUI_CBT_ADVANCED_COURSE_ID,
  "dui-cbt": DUI_CBT_ADVANCED_COURSE_ID,
  "dui-cbt-advanced": DUI_CBT_ADVANCED_COURSE_ID,
  "dui-cbt-counseling": DUI_CBT_ADVANCED_COURSE_ID,
  "violence-prevention": "violence-basic",
  violence: "violence-basic",
  "violence-basic": "violence-basic",
  "violence-advanced": "violence-advanced",
  "gambling-relapse-prevention": "gambling-basic",
  gambling: "gambling-basic",
  "gambling-basic": "gambling-basic",
  "gambling-advanced": "gambling-advanced",
  "sexual-offense-prevention": "sexual-offense-basic",
  "sexual-offense": "sexual-offense-basic",
  sexual: "sexual-offense-basic",
  "sexual-offense-basic": "sexual-offense-basic",
  "sexual-offense-advanced": "sexual-offense-advanced",
  "prostitution-prevention": "prostitution-basic",
  prostitution: "prostitution-basic",
  "prostitution-basic": "prostitution-basic",
  "prostitution-advanced": "prostitution-advanced",
  "drug-rehab-prevention": "drug-addiction-basic",
  drug: "drug-addiction-basic",
  "drug-basic": "drug-basic",
  "drug-advanced": "drug-advanced",
  "drug-addiction-relapse-prevention": "drug-addiction-relapse-prevention",
  "drug-addiction-basic": "drug-addiction-basic",
  "drug-addiction-premium": "drug-addiction-premium",
  "digital-crime": "digital-crime-basic",
  "digital-crime-basic": "digital-crime-basic",
  "digital-crime-advanced": "digital-crime-advanced",
  "fraud-prevention": "fraud-basic",
  fraud: "fraud-basic",
  "fraud-basic": "fraud-basic",
  "fraud-advanced": "fraud-advanced",
  "unlicensed-driving-prevention": "unlicensed-driving-basic",
  "unlicensed-driving-basic": "unlicensed-driving-basic",
  "unlicensed-driving-advanced": "unlicensed-driving-advanced",
  "hangover-driving-prevention": "hangover-driving-basic",
  "hangover-driving-basic": "hangover-driving-basic",
  "hangover-driving-advanced": "hangover-driving-advanced",
  "reckless-retaliatory-driving-prevention": "reckless-retaliatory-driving-basic",
  "reckless-retaliatory-driving-basic": "reckless-retaliatory-driving-basic",
  "reckless-retaliatory-driving-advanced": "reckless-retaliatory-driving-advanced",
  "defamation-insult-prevention": "defamation-insult-basic",
  "defamation-insult-basic": "defamation-insult-basic",
  "defamation-insult-advanced": "defamation-insult-advanced",
  "legal-compliance-awareness": "legal-compliance-awareness-basic",
  "legal-compliance-awareness-basic": "legal-compliance-awareness-basic",
  "legal-compliance-awareness-advanced": "legal-compliance-awareness-advanced",
};

export function resolveCourseId(courseIdOrCategory?: string | null) {
  if (!courseIdOrCategory || courseIdOrCategory === "dui") return defaultCourse.id;
  const normalized = String(courseIdOrCategory);
  if (normalized.endsWith("-counseling")) {
    const includedProductId = normalized.replace(/-counseling$/, "");
    return APPLICATION_TO_COURSE_ID[includedProductId] ?? includedProductId;
  }
  return APPLICATION_TO_COURSE_ID[normalized] ?? normalized;
}

export function getCourseAvailability(courseIdOrCategory?: string | null) {
  const resolvedCourseId = resolveCourseId(courseIdOrCategory);
  if (resolvedCourseId === DUI_CBT_ADVANCED_COURSE_ID) {
    return { exists: true, available: true, comingSoon: false, title: "인지행동기반 재발방지교육 심화이수과정" };
  }
  const course = getCourseDefinition(resolvedCourseId);
  if (course) {
    return { exists: true, available: true, comingSoon: false, title: course.title };
  }
  const categoryId = resolvedCourseId === defaultCourse.id ? "dui" : courseIdOrCategory || "dui";
  const category = getApplicationCategory(categoryId);
  if (!category) {
    return { exists: resolvedCourseId === defaultCourse.id, available: resolvedCourseId === defaultCourse.id, comingSoon: false, title: defaultCourse.title };
  }
  return { exists: true, available: category.status === "available", comingSoon: category.status !== "available", title: category.title };
}

function toMillis(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return (value as { seconds: number }).seconds * 1000;
  }
  return null;
}

function normalizeEnrollmentSourceType(enrollment: EnrollmentRecord) {
  const rawSource = (enrollment as EnrollmentRecord & { source?: string; grantType?: string; issueType?: string }).source;
  const grantType = (enrollment as EnrollmentRecord & { grantType?: string; issueType?: string }).grantType;
  const issueType = (enrollment as EnrollmentRecord & { issueType?: string }).issueType;
  const explicit = String(enrollment.sourceType || grantType || issueType || rawSource || "").trim().toUpperCase();
  if (["MANUAL_GRANT", "ADMIN_MANUAL", "ADMIN", "ADMIN_GRANTED"].includes(explicit)) return "MANUAL";
  if (["PAYMENT_AUTO_RECOVERY", "TRUSTED_PAYMENT_RECORD", "PAID_RECORD", "PORTONE", "PORTONE_KCP", "KCP", "NHN_KCP"].includes(explicit)) return "MIGRATION";
  if (explicit === "FREE") return "PROMOTION";
  if (explicit) return explicit;
  if ((enrollment as EnrollmentRecord & { adminGranted?: boolean }).adminGranted === true || (enrollment.paymentId == null && enrollment.orderId == null && enrollment.paymentStatus == null)) return "MANUAL";
  const paymentStatus = String(enrollment.paymentStatus || "").toLowerCase();
  if (["paid", "done", "completed", "approved", "success"].includes(paymentStatus) || enrollment.paymentId || enrollment.orderId) return "PAYMENT";
  return "";
}
export function isEnrollmentActive(enrollment: EnrollmentRecord | null | undefined) {
  if (!enrollment) return false;
  if (!allowedEnrollmentSourceTypes.has(normalizeEnrollmentSourceType(enrollment))) return false;
  const paymentStatus = String(enrollment.paymentStatus || "").toLowerCase();
  const paidLike = ["paid", "done", "completed", "approved", "success"].includes(paymentStatus);
  const meta = enrollment as EnrollmentRecord & { active?: boolean; enabled?: boolean; accessGranted?: boolean };
  const activeFlag = enrollment.isActive === true || meta.active === true || meta.enabled === true || meta.accessGranted === true;
  const accessStatus = String(enrollment.enrollmentStatus ?? enrollment.accessStatus ?? enrollment.status ?? (activeFlag || paidLike ? "active" : "")).toLowerCase();
  const blockedStatuses = ["cancelled", "canceled", "refunded", "expired", "failed", "awaiting_deposit", "revoked", "deleted"];
  if (blockedStatuses.includes(paymentStatus) || blockedStatuses.includes(accessStatus)) return false;
  if (enrollment.isActive === false || meta.active === false || meta.enabled === false || accessStatus === "inactive" || accessStatus === "disabled") return false;
  if (!accessStatus) return false;
  if (!["active", "paid", "done", "completed", "approved", "success", "enrolled", "granted", "valid", "available"].includes(accessStatus)) return false;
  const startsAt = toMillis(enrollment.startsAt ?? enrollment.accessStartsAt ?? enrollment.purchasedAt);
  if (startsAt !== null && startsAt > Date.now()) return false;
  const expiresAt = toMillis(enrollment.expiresAt ?? enrollment.accessEndsAt);
  return expiresAt === null || expiresAt >= Date.now();
}

function logDashboardEnrollmentEvent(event: string, details: Record<string, unknown> = {}) {
  console.info("[enrollments:frontend]", { event, ...details });
}

type EnrollmentsApiFailureKind = "auth" | "forbidden" | "not_found" | "server" | "network" | "config" | "invalid_response";

class EnrollmentsApiError extends Error {
  constructor(
    message: string,
    readonly kind: EnrollmentsApiFailureKind,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "EnrollmentsApiError";
  }
}

function getEnrollmentsApiError(status: number, code?: string) {
  if (status === 401) return new EnrollmentsApiError("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.", "auth", status, code);
  if (status === 403) return new EnrollmentsApiError("수강권 조회 권한이 없습니다.", "forbidden", status, code);
  if (status === 404) return new EnrollmentsApiError("수강권 조회 API가 배포되지 않았거나 URL이 올바르지 않습니다.", "not_found", status, code);
  if (status >= 500) return new EnrollmentsApiError("수강권 조회 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "server", status, code);
  return new EnrollmentsApiError("수강권 조회 요청을 처리하지 못했습니다.", "server", status, code);
}

const enrollmentLookupCache = new Map<string, { expiresAt: number; rows: EnrollmentRecord[] }>();
const enrollmentCacheHitTtlMs = 60_000;
const enrollmentCacheMissTtlMs = 30_000;

function getEnrollmentCacheKey(userId: string, courseId: string, lookup?: string) {
  return [userId, courseId, lookup || "default"].join(":");
}

function getSessionEnrollmentCacheKey(cacheKey: string) {
  return "resetedu:enrollments:v3:" + cacheKey;
}

function getCachedEnrollments(cacheKey: string) {
  const cached = enrollmentLookupCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  enrollmentLookupCache.delete(cacheKey);

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(getSessionEnrollmentCacheKey(cacheKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; rows?: EnrollmentRecord[] };
    if (!parsed.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      window.sessionStorage.removeItem(getSessionEnrollmentCacheKey(cacheKey));
      return null;
    }
    enrollmentLookupCache.set(cacheKey, { expiresAt: parsed.expiresAt, rows: parsed.rows });
    return parsed.rows;
  } catch {
    return null;
  }
}

function setCachedEnrollments(cacheKey: string, rows: EnrollmentRecord[]) {
  if (rows.length === 0) {
    enrollmentLookupCache.delete(cacheKey);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(getSessionEnrollmentCacheKey(cacheKey));
      } catch {
        // Session cache is a read-reduction optimization only.
      }
    }
    return;
  }

  const entry = {
    rows,
    expiresAt: Date.now() + enrollmentCacheHitTtlMs,
  };
  enrollmentLookupCache.set(cacheKey, entry);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(getSessionEnrollmentCacheKey(cacheKey), JSON.stringify(entry));
    } catch {
      // Session cache is a read-reduction optimization only.
    }
  }
}

export function invalidateEnrollmentLookupCache(userId?: string) {
  const prefix = userId ? userId + ":" : "";
  for (const key of Array.from(enrollmentLookupCache.keys())) {
    if (!prefix || key.startsWith(prefix)) enrollmentLookupCache.delete(key);
  }
  if (typeof window === "undefined") return;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (!key || !key.startsWith("resetedu:enrollments:v3:")) continue;
      if (!prefix || key.startsWith("resetedu:enrollments:v3:" + prefix)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore cache eviction failures.
  }
}

export async function getVerifiedUserEnrollments(user: User, courseIdOrCategory: string | null = defaultCourse.id, options: { lookup?: "direct" | "entitlement" } = {}) {
  const requestAllCourses = courseIdOrCategory === null;
  const courseId = requestAllCourses ? "all" : resolveCourseId(courseIdOrCategory);
  const maskedUid = maskFirestoreSegment(user.uid);
  const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
  const cacheKey = getEnrollmentCacheKey(user.uid, courseId, options.lookup);
  const cachedRows = getCachedEnrollments(cacheKey);
  if (cachedRows) {
    logDashboardEnrollmentEvent("enrollments_cache_hit", { uid: maskedUid, courseId, count: cachedRows.length });
    return cachedRows;
  }
  if (!requestAllCourses) {
    const cachedAllRows = getCachedEnrollments(getEnrollmentCacheKey(user.uid, "all", options.lookup));
    if (cachedAllRows) {
      const filteredRows = cachedAllRows.filter((row) => resolveCourseId(row.courseId) === courseId || resolveCourseId(row.canonicalCourseId || "") === courseId || row.productId === courseId);
      setCachedEnrollments(cacheKey, filteredRows);
      logDashboardEnrollmentEvent("enrollments_cache_hit_all_filtered", { uid: maskedUid, courseId, count: filteredRows.length });
      return filteredRows;
    }
  }

  logDashboardEnrollmentEvent("auth_user_ready", { uid: maskedUid, courseId });

  if (!apiBaseUrl) {
    const error = new EnrollmentsApiError("수강권 조회 API URL 설정이 없습니다.", "config");
    logDashboardEnrollmentEvent("enrollments_api_failed", { uid: maskedUid, courseId, kind: error.kind, code: "API_URL_MISSING" });
    throw error;
  } else {
    const apiUrl = requestAllCourses
      ? apiBaseUrl + "/api/enrollments/me?scope=all"
      : apiBaseUrl + "/api/enrollments/me?courseId=" + encodeURIComponent(courseId) + (options.lookup === "direct" ? "&lookup=direct" : "");
    try {
      const token = await user.getIdToken();
      logDashboardEnrollmentEvent("id_token_acquired", { uid: maskedUid, courseId, forcedRefresh: false });
      logDashboardEnrollmentEvent("enrollments_api_request_started", { uid: maskedUid, courseId, method: "GET", url: apiUrl });

      let response: Response;
      try {
        response = await fetch(apiUrl, {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
      } catch (cause) {
        throw new EnrollmentsApiError(
          "수강권 조회 서버에 연결할 수 없습니다. 네트워크 또는 CORS 상태를 확인해 주세요.",
          "network",
          undefined,
          cause instanceof Error ? cause.name : "FETCH_FAILED",
        );
      }

      const responseText = await response.text();
      let payload: { enrollments?: unknown; courseId?: unknown; access?: unknown; code?: unknown; message?: unknown } = {};
      if (responseText) {
        try {
          payload = JSON.parse(responseText) as typeof payload;
        } catch {
          if (response.ok) throw new EnrollmentsApiError("수강권 조회 API 응답 형식이 올바르지 않습니다.", "invalid_response", response.status, "INVALID_JSON");
        }
      }
      const responseCode = typeof payload.code === "string" ? payload.code : undefined;
      const count = Array.isArray(payload.enrollments) ? payload.enrollments.length : undefined;
      logDashboardEnrollmentEvent("enrollments_api_response", { uid: maskedUid, courseId, status: response.status, ok: response.ok, code: responseCode, count });

      if (!response.ok) {
        if (response.status === 429) {
          throw new EnrollmentsApiError("현재 이용정보 확인 요청이 많아 수강권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "server", response.status, responseCode || "RESOURCE_EXHAUSTED");
        }
        throw getEnrollmentsApiError(response.status, responseCode);
      }
      if (!Array.isArray(payload.enrollments)) {
        throw new EnrollmentsApiError("수강권 조회 API 응답에 enrollments 배열이 없습니다.", "invalid_response", response.status, "INVALID_PAYLOAD");
      }
      const apiRows = payload.enrollments as EnrollmentRecord[];
      const resultRows = requestAllCourses ? apiRows : apiRows.filter((row) => resolveCourseId(row.courseId) === courseId || resolveCourseId(row.canonicalCourseId || "") === courseId || row.productId === courseId);
      setCachedEnrollments(cacheKey, resultRows);
      if (requestAllCourses) {
        resultRows.forEach((row) => {
          const rowCourseId = resolveCourseId(row.courseId || row.canonicalCourseId || "");
          if (rowCourseId) setCachedEnrollments(getEnrollmentCacheKey(user.uid, rowCourseId, options.lookup), [row]);
        });
      }
      logDashboardEnrollmentEvent("enrollments_api_direct_response", { uid: maskedUid, courseId, apiCount: apiRows.length, count: resultRows.length, access: payload.access === true, code: responseCode });
      return resultRows;
    } catch (cause) {
      const error = cause instanceof EnrollmentsApiError
        ? cause
        : new EnrollmentsApiError(
            cause instanceof Error && cause.message ? cause.message : "Firebase ID 토큰을 갱신하지 못했습니다.",
            "auth",
            undefined,
            "ID_TOKEN_ACQUISITION_FAILED",
          );
      logDashboardEnrollmentEvent("enrollments_api_failed", {
        uid: maskedUid,
        courseId,
        kind: error.kind,
        status: error.status,
        code: error.code,
      });
      throw error;
    }
  }

  throw new EnrollmentsApiError("수강권 조회 API URL 설정이 없습니다.", "config");
}


export async function getVerifiedActiveUserEnrollments(user: User) {
  const enrollments = await getVerifiedUserEnrollments(user, null);
  return enrollments.filter(isEnrollmentActive);
}
export async function hasCourseAccess(user: User | null, courseIdOrCategory: string) {
  if (!user || !courseIdOrCategory) return false;
  if (isSuperAdmin(user)) return true;
  const availability = getCourseAvailability(courseIdOrCategory);
  if (availability.comingSoon) return false;
  const courseId = resolveCourseId(courseIdOrCategory);
  const enrollments = await getVerifiedUserEnrollments(user, courseId);
  return enrollments.some((enrollment) => enrollment.courseId === courseId && isEnrollmentActive(enrollment));
}
