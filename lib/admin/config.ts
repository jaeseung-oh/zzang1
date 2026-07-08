export const defaultAdminEmails = ["cfv47@naver.com"];

export function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || defaultAdminEmails.join(",");
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export const adminSettings = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "ResetEdu 재발방지교육센터",
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME || "ResetEdu 재발방지교육센터",
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "ResetEdu 재발방지교육센터",
  representativeName: process.env.NEXT_PUBLIC_REPRESENTATIVE_NAME || "미설정",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "미설정",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "미설정",
  businessNumber: process.env.NEXT_PUBLIC_BUSINESS_NUMBER || "미설정",
  commerceRegistrationNumber: process.env.NEXT_PUBLIC_COMMERCE_REGISTRATION_NUMBER || "미설정",
  certificateIssuerName: process.env.NEXT_PUBLIC_CERTIFICATE_ISSUER_NAME || "리셋에듀센터",
  paymentProviderName: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_NAME || "운영 결제사",
  paymentEnvironment: process.env.NEXT_PUBLIC_PAYMENT_ENV || "test",
};
