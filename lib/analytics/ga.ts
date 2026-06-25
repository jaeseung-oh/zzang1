export type GaItem = {
  item_id?: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

type GaParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

function isProductionAnalyticsHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "resetedu.kr" || normalized === "www.resetedu.kr";
}

export function canUseAnalytics() {
  if (!gaMeasurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  return isProductionAnalyticsHost(window.location.hostname);
}

function getDebugMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("ga_debug") === "1";
}

function sanitizeParams(params: GaParams = {}) {
  const blockedKeys = new Set(["email", "name", "phone", "phoneNumber", "uid", "firebaseUid", "userId", "customerId", "buyerName", "buyerEmail", "buyerPhone"]);
  return Object.fromEntries(Object.entries(params).filter(([key, value]) => !blockedKeys.has(key) && value !== undefined && value !== null && value !== ""));
}

export function trackEvent(eventName: string, params: GaParams = {}) {
  if (!canUseAnalytics()) return false;
  window.gtag?.("event", eventName, { ...sanitizeParams(params), debug_mode: getDebugMode() || undefined });
  return true;
}

function sanitizePagePath(path: string) {
  const [pathname, query = ""] = path.split("?");
  if (!query) return pathname;

  const params = new URLSearchParams(query);
  ["paymentId", "paymentKey", "orderId", "amount", "code", "message"].forEach((key) => params.delete(key));
  const safeQuery = params.toString();
  return safeQuery ? `${pathname}?${safeQuery}` : pathname;
}

export function trackPageView(path: string, title?: string) {
  if (!canUseAnalytics()) return false;
  const safePath = sanitizePagePath(path);
  window.gtag?.("event", "page_view", {
    page_path: safePath,
    page_location: window.location.origin + safePath,
    page_title: title || document.title,
    debug_mode: getDebugMode() || undefined,
  });
  return true;
}

function localStorageKey(prefix: string, id: string) {
  return `resetedu:ga:${prefix}:${id}`;
}

function isAlreadyTracked(prefix: string, id: string) {
  try {
    return window.localStorage.getItem(localStorageKey(prefix, id)) === "1";
  } catch {
    return false;
  }
}

function markTracked(prefix: string, id: string) {
  try {
    window.localStorage.setItem(localStorageKey(prefix, id), "1");
  } catch {
    // GA 중복 방지 저장 실패는 서비스 이용을 막지 않습니다.
  }
}

export function trackPurchaseOnce(params: { transaction_id: string; value?: number; currency?: string; items?: GaItem[] }) {
  if (!params.transaction_id || typeof window === "undefined" || isAlreadyTracked("purchase", params.transaction_id)) {
    return false;
  }

  const sent = trackEvent("purchase", {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: params.currency || "KRW",
    items: params.items,
  });

  if (sent) markTracked("purchase", params.transaction_id);
  return sent;
}

export function trackBeginCheckout(params: { value?: number; currency?: string; items?: GaItem[] }) {
  return trackEvent("begin_checkout", {
    value: params.value,
    currency: params.currency || "KRW",
    items: params.items,
  });
}

export function trackCourseStart(courseId: string, lessonId?: string) {
  if (!courseId || typeof window === "undefined" || isAlreadyTracked("course_start", courseId)) {
    return false;
  }
  const sent = trackEvent("course_start", { course_id: courseId, lesson_id: lessonId });
  if (sent) markTracked("course_start", courseId);
  return sent;
}

export function trackCourseComplete(courseId: string) {
  if (!courseId || typeof window === "undefined" || isAlreadyTracked("course_complete", courseId)) {
    return false;
  }
  const sent = trackEvent("course_complete", { course_id: courseId });
  if (sent) markTracked("course_complete", courseId);
  return sent;
}
