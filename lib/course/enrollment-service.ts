import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { DUI_CBT_ADVANCED_COURSE_ID, defaultCourse, getCourseDefinition } from "@/lib/course/catalog";
import { getApplicationCategory } from "@/lib/course/application-products";
import { getFirebaseServices } from "@/lib/firebase/client";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";

export type EnrollmentStatus = "active" | "cancelled" | "expired" | "pending" | "refunded";

const allowedEnrollmentSourceTypes = new Set(["PAYMENT", "MANUAL", "MIGRATION", "PROMOTION", "ADMIN_TEST", "EXTENSION"]);

function maskFirestoreSegment(value: string) {
  if (!value) return "";
  if (value.length <= 8) return value.slice(0, 2) + "***";
  return value.slice(0, 4) + "***" + value.slice(-4);
}

function maskFirestorePath(path: string) {
  return path
    .split("/")
    .map((segment, index) => (index % 2 === 1 ? maskFirestoreSegment(segment) : segment))
    .join("/");
}

function logFirestoreFailure(operation: "getDoc" | "getDocs", path: string, error: unknown) {
  const errorLike = error as { code?: unknown; message?: unknown };
  console.error("[enrollment:firestore]", {
    operation,
    path: maskFirestorePath(path),
    code: typeof errorLike?.code === "string" ? errorLike.code : undefined,
    message: typeof errorLike?.message === "string" ? errorLike.message : "Firestore request failed",
  });
}

export type EnrollmentRecord = {
  userId: string;
  uid?: string;
  courseId: string;
  courseTitle: string;
  productId?: string;
  productTitle?: string;
  paymentId?: string;
  orderId?: string;
  paymentStatus?: "paid" | "pending" | "failed" | "cancelled" | "refunded" | string | null;
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
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const OPERATING_COURSE_ID = defaultCourse.id;
export const APPLICATION_TO_COURSE_ID: Record<string, string> = {
  dui: defaultCourse.id,
  basic: defaultCourse.id,
  "dui-documents": defaultCourse.id,
  "dui-prevention": defaultCourse.id,
  "dui-prevention-basic": defaultCourse.id,
  "rapid-sentencing-prep": defaultCourse.id,
  cbt: DUI_CBT_ADVANCED_COURSE_ID,
  advanced: DUI_CBT_ADVANCED_COURSE_ID,
  "dui-cbt": DUI_CBT_ADVANCED_COURSE_ID,
  "dui-cbt-advanced": DUI_CBT_ADVANCED_COURSE_ID,
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
  "drug-rehab-prevention": "drug-basic",
  drug: "drug-basic",
  "drug-basic": "drug-basic",
  "drug-advanced": "drug-advanced",
};

export function resolveCourseId(courseIdOrCategory?: string | null) {
  if (!courseIdOrCategory || courseIdOrCategory === "dui") return defaultCourse.id;
  return APPLICATION_TO_COURSE_ID[courseIdOrCategory] ?? courseIdOrCategory;
}

export function getCourseAvailability(courseIdOrCategory?: string | null) {
  const resolvedCourseId = resolveCourseId(courseIdOrCategory);
  if (resolvedCourseId === DUI_CBT_ADVANCED_COURSE_ID) {
    return { exists: true, available: true, comingSoon: false, title: "인지행동기반 재발방지교육 심화과정" };
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
  if (explicit === "MANUAL_GRANT" || explicit === "ADMIN_MANUAL") return "MANUAL";
  if (explicit === "PAYMENT_AUTO_RECOVERY") return "MIGRATION";
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
  const accessStatus = String(enrollment.enrollmentStatus ?? enrollment.accessStatus ?? enrollment.status ?? (enrollment.isActive === true || paidLike ? "active" : "")).toLowerCase();
  const blockedStatuses = ["cancelled", "canceled", "refunded", "expired", "failed", "revoked", "deleted"];
  if (blockedStatuses.includes(paymentStatus) || blockedStatuses.includes(accessStatus)) return false;
  if (enrollment.isActive === false || accessStatus === "inactive" || accessStatus === "disabled") return false;
  if (!accessStatus) return false;
  if (!["active", "paid", "done", "completed", "approved", "success"].includes(accessStatus)) return false;
  const startsAt = toMillis(enrollment.startsAt ?? enrollment.accessStartsAt ?? enrollment.purchasedAt);
  if (startsAt !== null && startsAt > Date.now()) return false;
  const expiresAt = toMillis(enrollment.expiresAt ?? enrollment.accessEndsAt);
  return expiresAt === null || expiresAt >= Date.now();
}

export async function getUserEnrollment(userId: string, courseIdOrCategory: string) {
  const courseId = resolveCourseId(courseIdOrCategory);
  const { db } = getFirebaseServices();
  let fallback: EnrollmentRecord | null = null;

  const choose = (rows: EnrollmentRecord[]) => {
    const active = rows.find(isEnrollmentActive);
    if (active) return active;
    if (!fallback && rows.length > 0) fallback = rows[0];
    return null;
  };

  const nestedPath = `users/${userId}/enrollments/${courseId}`;
  try {
    const nested = await getDoc(doc(db, "users", userId, "enrollments", courseId));
    if (nested.exists()) {
      const active = choose([nested.data() as EnrollmentRecord]);
      if (active) return active;
    }
  } catch (error) {
    logFirestoreFailure("getDoc", nestedPath, error);
  }

  const rootByIdPath = `enrollments/${userId}_${courseId}`;
  try {
    const rootById = await getDoc(doc(db, "enrollments", userId + "_" + courseId));
    if (rootById.exists()) {
      const active = choose([rootById.data() as EnrollmentRecord]);
      if (active) return active;
    }
  } catch (error) {
    logFirestoreFailure("getDoc", rootByIdPath, error);
  }

  try {
    const rootQuery = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId), where("userId", "==", userId)));
    const active = choose(rootQuery.docs.map((snapshot) => snapshot.data() as EnrollmentRecord));
    if (active) return active;
  } catch (error) {
    logFirestoreFailure("getDocs", "enrollments?courseId=<courseId>&userId=<uid>", error);
  }

  try {
    const legacyQuery = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId), where("uid", "==", userId)));
    const active = choose(legacyQuery.docs.map((snapshot) => snapshot.data() as EnrollmentRecord));
    if (active) return active;
  } catch (error) {
    logFirestoreFailure("getDocs", "enrollments?courseId=<courseId>&uid=<uid>", error);
  }

  return fallback;
}

export async function getUserEnrollments(userId: string) {
  const { db } = getFirebaseServices();
  const byCourse = new Map<string, EnrollmentRecord>();
  let failedReads = 0;

  const addEnrollment = (row: EnrollmentRecord | null | undefined) => {
    if (!row?.courseId) return;
    const existing = byCourse.get(row.courseId);
    if (!existing || isEnrollmentActive(row) || !isEnrollmentActive(existing)) {
      byCourse.set(row.courseId, row);
    }
  };

  try {
    const nested = await getDocs(collection(db, "users", userId, "enrollments"));
    nested.docs.forEach((snapshot) => addEnrollment(snapshot.data() as EnrollmentRecord));
  } catch (error) {
    failedReads += 1;
    logFirestoreFailure("getDocs", "users/" + userId + "/enrollments", error);
  }

  const operatingCoursePath = "enrollments/" + userId + "_" + OPERATING_COURSE_ID;
  try {
    const rootById = await getDoc(doc(db, "enrollments", userId + "_" + OPERATING_COURSE_ID));
    if (rootById.exists()) addEnrollment(rootById.data() as EnrollmentRecord);
  } catch (error) {
    failedReads += 1;
    logFirestoreFailure("getDoc", operatingCoursePath, error);
  }

  try {
    const root = await getDocs(query(collection(db, "enrollments"), where("userId", "==", userId)));
    root.docs.forEach((snapshot) => addEnrollment(snapshot.data() as EnrollmentRecord));
  } catch (error) {
    failedReads += 1;
    logFirestoreFailure("getDocs", "enrollments?userId=<uid>", error);
  }

  try {
    const legacy = await getDocs(query(collection(db, "enrollments"), where("uid", "==", userId)));
    legacy.docs.forEach((snapshot) => addEnrollment(snapshot.data() as EnrollmentRecord));
  } catch (error) {
    failedReads += 1;
    logFirestoreFailure("getDocs", "enrollments?uid=<uid>", error);
  }

  if (byCourse.size === 0 && failedReads > 0) {
    throw new Error("수강권 조회 중 Firestore 요청이 실패했습니다.");
  }

  return Array.from(byCourse.values());
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

export async function getVerifiedUserEnrollments(user: User, courseIdOrCategory: string | null = defaultCourse.id) {
  const requestAllCourses = courseIdOrCategory === null;
  const courseId = requestAllCourses ? "all" : resolveCourseId(courseIdOrCategory);
  const maskedUid = maskFirestoreSegment(user.uid);
  const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
  const allowFirestoreFallback = process.env.NODE_ENV !== "production";

  logDashboardEnrollmentEvent("auth_user_ready", { uid: maskedUid, courseId });

  if (!apiBaseUrl) {
    const error = new EnrollmentsApiError("수강권 조회 API URL 설정이 없습니다.", "config");
    logDashboardEnrollmentEvent("enrollments_api_failed", { uid: maskedUid, courseId, kind: error.kind, code: "API_URL_MISSING" });
    if (!allowFirestoreFallback) throw error;
  } else {
    const apiUrl = requestAllCourses
      ? apiBaseUrl + "/api/enrollments/me?scope=all"
      : apiBaseUrl + "/api/enrollments/me?courseId=" + encodeURIComponent(courseId);
    try {
      const token = await user.getIdToken(true);
      logDashboardEnrollmentEvent("id_token_acquired", { uid: maskedUid, courseId, forcedRefresh: true });
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

      if (!response.ok) throw getEnrollmentsApiError(response.status, responseCode);
      if (!Array.isArray(payload.enrollments)) {
        throw new EnrollmentsApiError("수강권 조회 API 응답에 enrollments 배열이 없습니다.", "invalid_response", response.status, "INVALID_PAYLOAD");
      }
      return payload.enrollments as EnrollmentRecord[];
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
      if (!allowFirestoreFallback) throw error;
    }
  }

  // Explicit development-only compatibility path. Production access decisions
  // are made exclusively by the Worker API.
  const rows = await getUserEnrollments(user.uid);
  if (requestAllCourses) {
    const activeRows = rows.filter(isEnrollmentActive);
    logDashboardEnrollmentEvent("enrollments_api_development_fallback", { uid: maskedUid, courseId, count: activeRows.length });
    return activeRows;
  }
  const operatingEnrollment = rows.find((row) => row.courseId === courseId) ?? await getUserEnrollment(user.uid, courseId);
  const merged = operatingEnrollment && !rows.some((row) => row.courseId === courseId) ? [...rows, operatingEnrollment] : rows;
  logDashboardEnrollmentEvent("enrollments_api_development_fallback", { uid: maskedUid, courseId, count: merged.length });
  return merged;
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
