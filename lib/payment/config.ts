const authApiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "") || "";

export const paymentConfig = {
  provider: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || process.env.NEXT_PUBLIC_TOSS_PROVIDER || "toss-payments",
  clientKey: process.env.NEXT_PUBLIC_PAYMENT_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000",
  confirmUrl: process.env.NEXT_PUBLIC_PAYMENT_CONFIRM_URL || (authApiBaseUrl ? `${authApiBaseUrl}/api/payments/confirm` : process.env.NEXT_PUBLIC_TOSS_CONFIRM_URL || ""),
  paymentMethodVariantKey: process.env.NEXT_PUBLIC_TOSS_PAYMENT_METHOD_VARIANT_KEY || "DEFAULT",
  agreementVariantKey: process.env.NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY || "DEFAULT",
} as const;
