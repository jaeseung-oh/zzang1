const authApiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "") || "";

export const paymentConfig = {
  provider: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || "portone-kcp-v2",
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "",
  kcpChannelKey: process.env.NEXT_PUBLIC_PORTONE_KCP_CHANNEL_KEY || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000",
  confirmUrl: process.env.NEXT_PUBLIC_PAYMENT_CONFIRM_URL || (authApiBaseUrl ? `${authApiBaseUrl}/api/payments/confirm` : process.env.NEXT_PUBLIC_TOSS_CONFIRM_URL || ""),
} as const;
