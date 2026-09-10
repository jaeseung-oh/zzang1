export const attributionParamKeys = [
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
  "n_media",
  "n_campaign_type",
] as const;

export const attributionStorageKey = "resetedu:attribution";

export type AttributionParams = Partial<Record<(typeof attributionParamKeys)[number], string>>;

