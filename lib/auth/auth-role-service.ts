import type { User } from "firebase/auth";
import { defaultAdminEmails, isAdminEmail as isConfiguredAdminEmail } from "@/lib/admin/config";

export const ADMIN_EMAILS = defaultAdminEmails;

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return isConfiguredAdminEmail(email);
}

export function isSuperAdmin(user: Pick<User, "email"> | null | undefined) {
  // TODO: 운영 환경에서는 이메일 하드코딩 대신 Firebase Admin SDK custom claims 또는 users/{uid}.role === "admin" 방식으로 관리자 권한을 검증해야 함.
  return isAdminEmail(user?.email);
}
