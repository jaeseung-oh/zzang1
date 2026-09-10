export const attributionParamKeys = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "n_keyword",
  "n_query",
  "n_rank",
  "n_ad_group",
  "n_ad",
  "n_campaign",
  "n_campaign_type",
  "n_media",
  "n_keyword_id",
] as const;

export const attributionStorageKey = "resetedu:attribution";

export type AttributionParams = Partial<Record<(typeof attributionParamKeys)[number], string>>;
export type TrafficSource = "Google" | "Naver" | "Direct" | "Referral" | "Other";

export type StoredAttribution = {
  capturedAt: string;
  landingPage: string;
  referrer: string | null;
  trafficSource: TrafficSource;
  trafficMedium?: string | null;
  trafficCampaign?: string | null;
  trafficKeyword?: string | null;
  trafficContent?: string | null;
  googleGclid?: string | null;
  googleGbraid?: string | null;
  googleWbraid?: string | null;
  naverKeyword?: string | null;
  naverQuery?: string | null;
  naverCampaign?: string | null;
  naverAdGroup?: string | null;
  naverAd?: string | null;
  naverMedia?: string | null;
  params: AttributionParams;
};

const naverParamKeys = ["n_keyword", "n_query", "n_rank", "n_ad_group", "n_ad", "n_campaign", "n_campaign_type", "n_media", "n_keyword_id"] as const;

function cleanValue(value: string | null | undefined, maxLength = 180) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function isExternalReferrer(referrer: string | null | undefined, origin: string) {
  const text = cleanValue(referrer, 500);
  if (!text) return false;
  try {
    return new URL(text).origin !== origin;
  } catch {
    return false;
  }
}

function getAttributionParams(searchParams: URLSearchParams) {
  const params: AttributionParams = {};
  attributionParamKeys.forEach((key) => {
    const value = cleanValue(searchParams.get(key));
    if (value) params[key] = value;
  });
  return params;
}

function determineTrafficSource(params: AttributionParams, referrer: string | null, origin: string): TrafficSource {
  const utmSource = String(params.utm_source || "").toLowerCase();
  const hasNaverParam = naverParamKeys.some((key) => Boolean(params[key]));
  if (params.gclid || utmSource === "google") return "Google";
  if (hasNaverParam || utmSource === "naver") return "Naver";
  if (Object.keys(params).length > 0) return "Other";
  if (isExternalReferrer(referrer, origin)) return "Referral";
  return "Direct";
}

function getTrafficKeyword(source: TrafficSource, params: AttributionParams) {
  if (source === "Google") return cleanValue(params.utm_term) || null;
  if (source === "Naver") return cleanValue(params.n_keyword) || cleanValue(params.n_query) || cleanValue(params.utm_term) || null;
  return cleanValue(params.utm_term) || null;
}

export function buildAttributionSnapshot(args: { href: string; origin: string; search: string; referrer?: string | null; now?: string }): StoredAttribution {
  const searchParams = new URLSearchParams(args.search || "");
  const params = getAttributionParams(searchParams);
  const referrer = cleanValue(args.referrer, 500);
  const trafficSource = determineTrafficSource(params, referrer, args.origin);
  return {
    capturedAt: args.now || new Date().toISOString(),
    landingPage: cleanValue(args.href, 700) || "",
    referrer,
    trafficSource,
    trafficMedium: cleanValue(params.utm_medium),
    trafficCampaign: cleanValue(params.utm_campaign) || cleanValue(params.n_campaign),
    trafficKeyword: getTrafficKeyword(trafficSource, params),
    trafficContent: cleanValue(params.utm_content),
    googleGclid: cleanValue(params.gclid),
    googleGbraid: cleanValue(params.gbraid),
    googleWbraid: cleanValue(params.wbraid),
    naverKeyword: cleanValue(params.n_keyword),
    naverQuery: cleanValue(params.n_query),
    naverCampaign: cleanValue(params.n_campaign) || cleanValue(params.utm_campaign),
    naverAdGroup: cleanValue(params.n_ad_group),
    naverAd: cleanValue(params.n_ad),
    naverMedia: cleanValue(params.n_media),
    params,
  };
}

export function readStoredAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(attributionStorageKey) || window.sessionStorage.getItem(attributionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    return parsed && typeof parsed === "object" && parsed.trafficSource ? parsed : null;
  } catch {
    return null;
  }
}

export function captureCurrentAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const next = buildAttributionSnapshot({ href: window.location.href, origin: window.location.origin, search: window.location.search, referrer: document.referrer });
    const existing = readStoredAttribution();
    const hasIncomingAdParams = next.trafficSource === "Google" || next.trafficSource === "Naver" || Object.keys(next.params).length > 0;
    if (existing && !hasIncomingAdParams) return existing;
    if (existing && (existing.trafficSource === "Google" || existing.trafficSource === "Naver") && !hasIncomingAdParams) return existing;
    if (!existing || hasIncomingAdParams) {
      window.localStorage.setItem(attributionStorageKey, JSON.stringify(next));
      window.sessionStorage.removeItem(attributionStorageKey);
      return next;
    }
    return existing;
  } catch {
    return null;
  }
}

export function getStoredAttributionParams(): AttributionParams {
  const stored = readStoredAttribution();
  return stored?.params || {};
}
