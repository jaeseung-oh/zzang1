"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { DUI_CBT_ADVANCED_COURSE_ID, allCourseCatalog, duiBasicModules, duiCbtAdvancedModules, getCourseModules, managedCourseCatalog } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { applicationCourseCategories, isCounselingProductId } from "@/lib/course/application-products";
import { calculateRefundAmount } from "@/lib/payment/refund";
import { paymentConfig } from "@/lib/payment/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { adminSettings, getAdminEmails, isAdminEmail } from "@/lib/admin/config";
import SealStamp, { sealStampPath } from "@/app/components/SealStamp";
import { getPreventionDocumentsForCourse, getPreventionDocumentsForEnrollment, preventionDocumentCategoryLabels, preventionDocuments } from "@/lib/course/prevention-documents";
import { chooseCanonicalPaymentRecord, getMemberPaymentState, getPaymentAttemptStats, getPaymentRecordKey, getPaymentState, getPaymentStatusText, getPaymentSuccessState, getPaymentTime, isFailedPayment, isPaidRecord, isRefundRecord } from "@/lib/admin/payment-state";
import { firstNonEmptyIdentityText, getUserBirthDate, getUserDisplayName } from "@/lib/user-identity";
import { normalizeCourseDisplayText } from "@/lib/course/display-names";
import { MemberStatusAdminView } from "@/app/admin/_components/member-status-admin-view";
import { SupabaseLedgerAdminView } from "@/app/admin/_components/supabase-ledger-admin-view";

type AdminView = "dashboard" | "memberStatus" | "supabaseLedger" | "users" | "payments" | "enrollments" | "revocations" | "certificates" | "refunds" | "courses" | "integrity" | "settings";
type AdminMenuView = AdminView | "lectures";
type AnyRecord = Record<string, any> & { id: string };

type AdminDataset = {
  authUsers: AnyRecord[];
  users: AnyRecord[];
  payments: AnyRecord[];
  purchases: AnyRecord[];
  orders: AnyRecord[];
  enrollments: AnyRecord[];
  certificates: AnyRecord[];
  progress: AnyRecord[];
  refundPolicies: AnyRecord[];
  adminLogs: AnyRecord[];
  paymentLogs: AnyRecord[];
  documentOutputLogs: AnyRecord[];
};

const menu: Array<{ view: AdminMenuView; label: string; href: string; group: string }> = [
  { view: "dashboard", label: "대시보드", href: "/admin/dashboard", group: "대시보드" },
  { view: "memberStatus", label: "전체 회원 현황", href: "/admin/member-status", group: "회원관리" },
  { view: "supabaseLedger", label: "회원 전체 원장", href: "/admin/supabase-ledger", group: "회원관리" },
  { view: "users", label: "회원관리 CRM", href: "/admin/users", group: "회원관리" },
  { view: "payments", label: "결제관리", href: "/admin/payments", group: "결제관리" },
  { view: "enrollments", label: "수강권관리", href: "/admin/enrollments", group: "수강권관리" },
  { view: "revocations", label: "수강권 회수", href: "/admin/revocations", group: "수강권관리" },
  { view: "certificates", label: "문서관리", href: "/admin/certificates", group: "문서관리" },
  { view: "refunds", label: "환불·고객관리", href: "/admin/refunds", group: "고객관리" },
  { view: "courses", label: "교육관리", href: "/admin/courses", group: "교육관리" },
  { view: "integrity", label: "데이터 불일치", href: "/admin/integrity", group: "점검" },
  { view: "lectures", label: "강의 영상 확인", href: "/admin/lectures", group: "교육관리" },
  { view: "settings", label: "설정", href: "/admin/settings", group: "설정" },
];

const emptyData: AdminDataset = { authUsers: [], users: [], payments: [], purchases: [], orders: [], enrollments: [], certificates: [], progress: [], refundPolicies: [], adminLogs: [], paymentLogs: [], documentOutputLogs: [] };
const adminDatasetCacheKey = "resetedu:admin-dataset:v15";
const adminDatasetCacheTtlMs = 5 * 60_000;
function warnAdminDataLoad(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "unknown");
  console.warn("[admin:data-load]", scope, message);
}

function mergeAdminRows(rows: AnyRecord[]) {
  return Array.from(new Map(rows.filter(Boolean).map((row) => [row.id, row])).values());
}

function mergeAuthUsersWithProfiles(authUsers: AnyRecord[], users: AnyRecord[]) {
  const byUid = new Map<string, AnyRecord>();
  users.forEach((user) => {
    const uid = getUid(user);
    if (uid) byUid.set(uid, { uid, userId: uid, ...user });
  });
  authUsers.forEach((authUser) => {
    const uid = getUid(authUser);
    if (!uid) return;
    const profile = byUid.get(uid) || { id: uid, uid, userId: uid };
    byUid.set(uid, {
      ...authUser,
      ...profile,
      id: profile.id || uid,
      uid,
      userId: uid,
      email: profile.email || authUser.email || "",
      realName: profile.realName || profile.fullName || profile.name || authUser.realName || authUser.displayName || "",
      fullName: profile.fullName || profile.realName || profile.name || authUser.fullName || authUser.displayName || "",
      createdAt: profile.createdAt || profile.joinedAt || profile.crmJoinedAt || authUser.createdAt || authUser.creationTime || null,
      joinedAt: profile.joinedAt || authUser.joinedAt || null,
      crmJoinedAt: profile.crmJoinedAt || profile.joinedAt || profile.createdAt || authUser.createdAt || authUser.creationTime || null,
      creationTime: authUser.creationTime || null,
      lastLoginAt: profile.lastLoginAt || authUser.lastLoginAt || null,
      emailVerified: profile.emailVerified ?? authUser.emailVerified ?? authUser.isEmailVerified ?? null,
      adminProfileMissing: !(profile.realName || profile.fullName || profile.email || profile.dateOfBirth || profile.birthDate || profile.phoneNumber),
      authSource: authUser.authSource || "firebaseAuth",
    });
  });
  return Array.from(byUid.values());
}

async function loadAdminDatasetFromWorker(view: AdminView, options?: { offset?: number; limit?: number }) {
  const user = await requireAuthenticatedUser();
  const idToken = await user.getIdToken();
  const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
  if (!baseUrl) throw new Error("관리자 API URL이 설정되지 않았습니다.");
  const params = new URLSearchParams({ view, limit: String(options?.limit || 30) });
  if (options?.offset) params.set("offset", String(options.offset));
  const response = await fetch(baseUrl + "/api/admin/member-dataset?" + params.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer " + idToken, "Cache-Control": "no-store" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.message || "관리자 데이터 API 조회에 실패했습니다.");
  const dataset = { ...emptyData, ...(payload.dataset || {}) } as AdminDataset;
  dataset.authUsers = mergeAdminRows(dataset.authUsers || []);
  dataset.users = mergeAuthUsersWithProfiles(dataset.authUsers, dataset.users || []);
  if (payload.warnings?.length) warnAdminDataLoad("worker:member-dataset", payload.warnings.join(" / "));
  return dataset;
}


function getAdminDatasetCacheKey(view: AdminView) {
  return adminDatasetCacheKey + ":" + view;
}

function readAdminDatasetCache(view: AdminView) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(getAdminDatasetCacheKey(view));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: AdminDataset };
    if (!parsed.savedAt || !parsed.data || Date.now() - parsed.savedAt > adminDatasetCacheTtlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeAdminDatasetCache(view: AdminView, data: AdminDataset) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(getAdminDatasetCacheKey(view), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // 관리자 캐시는 비용 절감용 보조 기능입니다.
  }
}

function hasAdminDatasetRows(data: AdminDataset) {
  return Object.values(data).some((rows) => Array.isArray(rows) && rows.length > 0);
}

function formatAdminDataError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message.includes("429") || message.includes("Quota exceeded") || message.includes("RESOURCE_EXHAUSTED")) {
    return "Firestore 읽기 한도가 초과되어 일부 최신 데이터를 불러오지 못했습니다. 잠시 후 다시 접속해 주세요. 반복 새로고침은 권장되지 않습니다.";
  }
  return message || "데이터를 불러오는 중 오류가 발생했습니다.";
}


function formatCertificateNoForDisplay(value: string) {
  return value.replace(/(^|-)SEX(?=-|$)/gi, "$1PREV");
}

type AdminGrantProduct = {
  id: string;
  title: string;
  price: number;
  description: string;
  categoryId: string;
  categoryTitle: string;
  courseId: string;
};

const adminGrantProducts: AdminGrantProduct[] = applicationCourseCategories
  .filter((category) => category.status === "available")
  .flatMap((category) => category.products.map((product) => ({
    ...product,
    categoryId: category.id,
    categoryTitle: category.title,
    courseId: product.courseId || duiPreventionCourseProduct.courseId,
  })));
const defaultAdminGrantProduct = adminGrantProducts[0];
const availableAdminGrantCategories = applicationCourseCategories.filter((category) => category.status === "available");
const getAdminGrantProduct = (productId: string) => adminGrantProducts.find((product) => product.id === productId) || defaultAdminGrantProduct;
const getAdminGrantProductsByCategory = (categoryId: string) => adminGrantProducts.filter((product) => product.categoryId === categoryId);
const getDefaultAdminGrantProductIdForCategory = (categoryId: string) => {
  const category = availableAdminGrantCategories.find((item) => item.id === categoryId);
  const products = getAdminGrantProductsByCategory(categoryId);
  return products.find((product) => product.id === category?.defaultProductId)?.id || products[0]?.id || defaultAdminGrantProduct?.id || "dui-cbt-basic";
};
const getAdminGrantProductAmount = (productId: string) => String(getAdminGrantProduct(productId)?.price || 49000);
const renderAdminGrantCategoryOptions = () => availableAdminGrantCategories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>);
const renderAdminGrantProductOptions = (categoryId?: string) => adminGrantProducts.filter((product) => !categoryId || product.categoryId === categoryId).map((product) => <option key={product.id} value={product.id}>{product.title} ({product.id})</option>);

function toDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate();
  return null;
}

function formatDate(value: any) {
  const date = toDate(value);
  if (!date) return "-";
  const formatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  return formatter.format(date).replace(/\. /g, "-").replace(/\./g, "").replace(/ (\d{2}):(\d{2})$/, " $1:$2");
}

function formatDateOnly(value: any) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = getKstParts(value);
  return parts ? parts.year + ". " + Number(parts.month) + ". " + Number(parts.day) + "." : "-";
}

function formatAdminDateLabel(value: any, emptyText = "확인 필요") {
  const formatted = formatDateOnly(value);
  return formatted === "-" ? emptyText : formatted;
}

function getKstParts(value: any) {
  const date = toDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function getDateInputValue(value: any) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function daysLeft(expiresAt: any) {
  const date = toDate(expiresAt);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function isToday(value: any) {
  const date = getKstParts(value);
  const now = getKstParts(new Date());
  return Boolean(date && now && date.year === now.year && date.month === now.month && date.day === now.day);
}

function isThisMonth(value: any) {
  const date = getKstParts(value);
  const now = getKstParts(new Date());
  return Boolean(date && now && date.year === now.year && date.month === now.month);
}

function inLastDays(value: any, days: number) {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function textIncludes(row: AnyRecord, keys: string[], keyword: string) {
  const query = keyword.trim().toLowerCase();
  if (!query) return true;
  return keys.some((key) => String(row[key] ?? "").toLowerCase().includes(query));
}

function getGrantTargetUid(user?: AnyRecord | null) {
  return String(user?.uid || user?.userId || user?.firebaseUid || user?.id || "").trim();
}

function getUserName(user?: AnyRecord) {
  return getUserDisplayName(user) || "미입력";
}

function firstNonEmptyText(...values: any[]) {
  return firstNonEmptyIdentityText(...values);
}

function getBirthDate(user?: AnyRecord) {
  return getUserBirthDate(user) || "미입력";
}

function getUserPhone(user?: AnyRecord) {
  return firstNonEmptyText(user?.phoneNumber, user?.phone_number, user?.phone, user?.mobile, user?.tel, user?.telephone, user?.contactPhone, user?.contactNumber, user?.customerPhone, user?.buyerPhone, user?.certificateIdentity?.phoneNumber, user?.profile?.phoneNumber, user?.profile?.phone, user?.metadata?.phoneNumber);
}

function getCrmBirthDate(user: AnyRecord, bundle: ReturnType<typeof getUserCrmBundle>) {
  return firstNonEmptyText(
    getBirthDate(user) !== "미입력" ? getBirthDate(user) : "",
    bundle.enrollments.map((row: AnyRecord) => getUserBirthDate(row)),
    bundle.payments.map((row: AnyRecord) => getUserBirthDate(row)),
    bundle.certificates.map((row: AnyRecord) => getUserBirthDate(row)),
  ) || "미입력";
}

function getCrmPhoneNumber(user: AnyRecord, bundle: ReturnType<typeof getUserCrmBundle>) {
  return firstNonEmptyText(
    getUserPhone(user),
    bundle.enrollments.map((row: AnyRecord) => [row.phoneNumber, row.phone_number, row.phone, row.mobile, row.tel, row.telephone, row.contactPhone, row.contactNumber, row.customerPhone, row.buyerPhone, row.certificatePhoneNumber]),
    bundle.payments.map((row: AnyRecord) => [row.phoneNumber, row.phone_number, row.phone, row.mobile, row.tel, row.telephone, row.contactPhone, row.contactNumber, row.customerPhone, row.buyerPhone, row.rawResponse?.customer?.phoneNumber, row.rawResponse?.customer?.phone_number, row.rawResponse?.customer?.phone]),
    bundle.certificates.map((row: AnyRecord) => [row.phoneNumber, row.phone]),
  );
}

function getSignupMethod(user?: AnyRecord) {
  const raw = String(user?.provider || user?.providerId || user?.authProvider || user?.signupProvider || user?.loginProvider || user?.lastAuthMode || "").toLowerCase();
  if (raw.includes("kakao")) return "카카오";
  if (raw.includes("naver")) return "네이버";
  if (raw.includes("google")) return "구글";
  if (raw.includes("password") || raw.includes("email")) return "이메일";
  return "정보 없음";
}

function getUid(row?: AnyRecord | null) {
  return String(row?.uid || row?.userId || row?.firebaseUid || row?.customerUid || row?.id || "");
}

function getIdentityUids(row?: AnyRecord | null) {
  return [row?.uid, row?.userId, row?.firebaseUid, row?.customerUid, row?.buyerUid, row?.id].map((value) => String(value || "").trim()).filter(Boolean);
}

function getIdentityEmails(row?: AnyRecord | null) {
  return [row?.email, row?.userEmail, row?.customerEmail, row?.buyerEmail].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function getCrmIdentity(userOrUid: AnyRecord | string, data: AdminDataset) {
  const seedUid = typeof userOrUid === "string" ? userOrUid : getUid(userOrUid);
  const sourceUser = typeof userOrUid === "string"
    ? data.users.find((user) => getIdentityUids(user).includes(seedUid))
    : userOrUid;
  const uids = new Set<string>([seedUid, ...getIdentityUids(sourceUser)].filter(Boolean));
  const emails = new Set<string>(getIdentityEmails(sourceUser));
  return { uids, emails };
}

function matchesCrmIdentity(row: AnyRecord, identity: { uids: Set<string>; emails: Set<string> }) {
  const rowUids = getIdentityUids(row);
  if (rowUids.some((value) => identity.uids.has(value))) return true;
  const rowEmails = getIdentityEmails(row);
  return rowEmails.some((value) => identity.emails.has(value));
}

function verifiedValue(value: any, empty = "기록 없음") {
  if (value === undefined || value === null || value === "") return empty;
  return value;
}


function getUserPaymentSummaryRecord(user: AnyRecord): AnyRecord | null {
  const summary = user.adminPaymentSummary || user.paymentSummary || null;
  if (!summary || typeof summary !== "object") return null;
  return {
    ...summary,
    id: "userSummary_" + getUid(user),
    uid: getUid(user),
    userId: getUid(user),
    paymentStatus: summary.paymentStatus || summary.status || (summary.paymentState === "결제완료" ? "paid" : null),
    status: summary.status || summary.paymentStatus || null,
    recordSource: "userSummary",
  };
}

function getAllPaymentRecords(data: AdminDataset): AnyRecord[] {
  const rows: AnyRecord[] = [
    ...data.payments.map((row) => ({ ...row, recordSource: row.recordSource || "payments" })),
    ...data.purchases.map((row) => ({ ...row, recordSource: row.recordSource || "purchases" })),
    ...data.orders.map((row) => ({ ...row, recordSource: row.recordSource || "orders" })),
    ...data.users.map(getUserPaymentSummaryRecord).filter((row): row is AnyRecord => Boolean(row)),
  ];
  const byKey = new Map<string, AnyRecord>();
  rows.forEach((row) => {
    const key = getPaymentRecordKey(row) || String(row.recordSource || "record") + ":" + String(row.id || "");
    const current = byKey.get(key);
    byKey.set(key, (current ? chooseCanonicalPaymentRecord(current, row) : row) as AnyRecord);
  });
  return Array.from(byKey.values()).sort((a, b) => (toDate(getPaymentTime(b))?.getTime() || 0) - (toDate(getPaymentTime(a))?.getTime() || 0));
}

function getPaymentLogsForUid(uid: string, data: AdminDataset, payments: AnyRecord[] = []) {
  const keys = new Set(payments.flatMap((row) => [row.paymentId, row.orderId, row.paymentKey, row.id]).map((value) => String(value || "").trim()).filter(Boolean));
  return data.paymentLogs.filter((row) => getUid(row) === uid || keys.has(String(row.paymentId || row.orderId || row.paymentKey || row.id || "").trim()));
}

function getLatestPayment(payments: AnyRecord[]) {
  return [...payments].sort((a, b) => (toDate(getPaymentTime(b))?.getTime() || 0) - (toDate(getPaymentTime(a))?.getTime() || 0))[0] || null;
}

function getLatestPaymentAttemptState(payments: AnyRecord[]) {
  const latest = getLatestPayment(payments);
  return latest ? getPaymentStatusText(latest) : "미결제";
}

function getSignupDateValue(user: AnyRecord) {
  return getRecordDateCandidate(user, ["crmJoinedAt", "joinedAt", "joined_at", "signupAt", "createdAt", "created_at", "signupDate", "signup_completed_at", "signupCompletedAt", "registeredAt", "registrationDate", "createdTime", "creationTime"]);
}

function getSignupDateTime(user: AnyRecord) {
  return toDate(getSignupDateValue(user))?.getTime() || 0;
}

function getLatestTimeValue(...values: any[]) {
  const timestamp = Math.max(0, ...values.flat().map((value) => toDate(value)?.getTime() || 0));
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function getEarliestTimeValue(...values: any[]) {
  const timestamps = values.flat().map((value) => toDate(value)?.getTime() || 0).filter(Boolean);
  const timestamp = timestamps.length ? Math.min(...timestamps) : 0;
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function getPaymentStatusTone(label: string) {
  if (["결제완료", "수강권 활성", "활성"].includes(label)) return "emerald";
  if (["결제실패", "수강권 미발급"].includes(label)) return "rose";
  if (["입금대기", "결제시도", "결제대기"].includes(label)) return "amber";
  if (["결제취소", "환불완료", "환불요청/완료"].includes(label)) return "slate";
  return "blue";
}

function StatusBadge({ label, tone }: { label: string; tone?: string }) {
  const resolvedTone = tone || getPaymentStatusTone(label);
  const classes: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return <span className={"inline-flex rounded-full border px-2.5 py-1 text-xs font-bold " + (classes[resolvedTone] || classes.blue)}>{label}</span>;
}

function getEducationCategoryText(row?: AnyRecord | null) {
  if (!row) return "정보 없음";
  const ids = [row.categoryId, row.category, row.productId, row.courseId, row.canonicalCourseId].map((value) => String(value || "").toLowerCase()).filter(Boolean);
  const category = applicationCourseCategories.find((item) => ids.includes(item.id.toLowerCase()) || item.products.some((product) => ids.includes(product.id.toLowerCase()) || ids.includes(String(product.courseId || "").toLowerCase())));
  if (category) return category.title.replace(/ 재범방지교육$/, "").replace("디지털범죄", "디지털성범죄");
  const title = String(row.productTitle || row.productName || row.courseTitle || row.orderName || "");
  const titleMatches = [["음주", "음주운전"], ["숙취", "숙취운전"], ["무면허", "무면허운전"], ["성매매", "성매매"], ["성범죄", "성범죄"], ["디지털", "디지털성범죄"], ["폭력", "폭력범죄"], ["도박", "도박"], ["마약", "마약"], ["사기", "사기"], ["보복", "보복운전"], ["난폭", "난폭운전"], ["스토킹", "스토킹"], ["명예훼손", "명예훼손"], ["준법", "준법의식"]];
  return titleMatches.find(([needle]) => title.includes(needle))?.[1] || "정보 없음";
}

function isSamePaymentLink(row?: AnyRecord | null, payment?: AnyRecord | null) {
  if (!row || !payment) return false;
  const ids = [payment.paymentId, payment.orderId, payment.paymentKey, payment.id].map((value) => String(value || "").trim()).filter(Boolean);
  if (!ids.length) return false;
  return ids.some((id) => row.paymentId === id || row.orderId === id || row.paymentKey === id || row.id === id);
}

function getDirectPaymentCertificate(certificates: AnyRecord[] = [], payment?: AnyRecord | null) {
  return certificates.find((certificate) => isSamePaymentLink(certificate, payment));
}

function isActiveEnrollment(row?: AnyRecord | null) {
  if (!row) return false;
  const paymentStatus = String(row.paymentStatus || row.paymentState || "").toLowerCase();
  const paidLike = ["paid", "done", "completed", "complete", "approved", "success"].includes(paymentStatus);
  const sourceType = String(row.sourceType || row.grantType || row.issueType || row.source || "").toUpperCase();
  const manualLike = Boolean(row.manualGrant || row.adminGranted || sourceType === "MANUAL" || sourceType === "MIGRATION" || sourceType === "PROMOTION" || sourceType === "ADMIN_TEST" || sourceType === "EXTENSION");
  const accessStatus = String(row.accessStatus || row.enrollmentStatus || row.status || (row.isActive === true || paidLike || manualLike ? "active" : "")).toLowerCase();
  const blocked = ["cancelled", "canceled", "revoked", "suspended", "expired", "refunded", "failed", "pending", "ready", "deleted", "inactive", "disabled"];
  if (blocked.includes(paymentStatus) || blocked.includes(accessStatus) || row.isActive === false || row.deletedAt || row.isDeleted === true) return false;
  if (!["active", "paid", "done", "completed", "complete", "approved", "success", "manual", "granted"].includes(accessStatus)) return false;
  const startsAt = toDate(row.startsAt || row.accessStartsAt || row.purchasedAt || row.grantedAt || row.createdAt);
  if (startsAt && startsAt.getTime() > Date.now()) return false;
  const left = daysLeft(row.expiresAt || row.accessEndsAt);
  return left === null || left >= 0;
}

const basicEnrollmentProductIds = new Set(["basic", "dui-cbt-basic", "dui-documents", "dui-prevention-basic", "violence-basic", "gambling-basic", "sexual-offense-basic", "prostitution-basic", "drug-basic", "drug-addiction-basic", "digital-crime-basic", "fraud-basic", "unlicensed-driving-basic", "hangover-driving-basic", "legal-compliance-awareness-basic"]);
const advancedEnrollmentProductIds = new Set(["dui-cbt-advanced", "violence-advanced", "gambling-advanced", "sexual-offense-advanced", "prostitution-advanced", "drug-advanced", "drug-addiction-premium", "digital-crime-advanced", "fraud-advanced", "unlicensed-driving-advanced", "hangover-driving-advanced", "legal-compliance-awareness-advanced"]);

function isCounselingRecord(row?: AnyRecord | null) {
  const ids = [row?.productId, row?.courseId, row?.canonicalCourseId].map((value) => String(value || "").trim()).filter(Boolean);
  const title = String(row?.productTitle || row?.courseTitle || "");
  return ids.some((id) => isCounselingProductId(id)) || String(row?.planId || "").toLowerCase() === "counseling" || title.includes("심리상담 종합과정");
}

function getCourseLevelText(row?: AnyRecord | null) {
  if (!row) return "확인되지 않음";
  if (row.includedWithProductId || row.includedWithEnrollmentId || row.includedWithOrderId) return "기본 수료과정";
  if (isCounselingRecord(row)) return "심리상담 종합과정";
  const planId = String(row.planId || row.courseLevel || row.level || "").trim().toLowerCase();
  if (planId === "premium" || planId === "advanced") return "심화이수과정";
  if (planId === "basic") return "기본 수료과정";
  const ids = [row.productId, row.courseId, row.canonicalCourseId].map((value) => String(value || "").trim()).filter(Boolean);
  if (ids.some((id) => advancedEnrollmentProductIds.has(id))) return "심화이수과정";
  if (ids.some((id) => basicEnrollmentProductIds.has(id))) return "기본 수료과정";
  const title = String(row.productTitle || row.courseTitle || "");
  if (title.includes("심화")) return "심화이수과정";
  if (title.includes("기본")) return "기본 수료과정";
  return "확인되지 않음";
}

function isAdvancedEnrollment(row?: AnyRecord | null) {
  const level = getCourseLevelText(row);
  return level === "심화이수과정" || level === "심리상담 종합과정";
}

function getPrimaryEnrollment(enrollments: AnyRecord[]) {
  const activeEnrollments = enrollments.filter(isActiveEnrollment);
  return activeEnrollments.find(isAdvancedEnrollment) || activeEnrollments[0] || enrollments.find(isAdvancedEnrollment) || enrollments[0] || null;
}

function getEnrollmentDisplayPriority(row?: AnyRecord | null) {
  if (!row) return 3;
  if (isAdvancedEnrollment(row)) return 0;
  if (row.includedWithProductId || row.includedWithEnrollmentId || row.includedWithOrderId) return 2;
  return 1;
}

function sortEnrollmentsForAdminDisplay(rows: AnyRecord[]) {
  return [...rows].sort((a, b) => {
    const priority = getEnrollmentDisplayPriority(a) - getEnrollmentDisplayPriority(b);
    if (priority !== 0) return priority;
    return (toDate(b.purchasedAt || b.grantedAt || b.createdAt)?.getTime() || 0) - (toDate(a.purchasedAt || a.grantedAt || a.createdAt)?.getTime() || 0);
  });
}

function getEnrollmentCourseDisplayTitle(row?: AnyRecord | null) {
  const title = String(normalizeCourseDisplayText(row?.courseTitle || getAdminCourseProduct(row?.courseId)?.title || row?.courseId || "-"));
  if (isCounselingRecord(row)) return title + " (심리상담 종합과정 / 상담 연락 필요)";
  if (isAdvancedEnrollment(row)) return title + " (기본 수료과정 + 인지행동기반 재범방지교육)";
  if (row?.includedWithProductId || row?.includedWithEnrollmentId || row?.includedWithOrderId) return title + " (심화이수과정에 포함된 기본 수강권)";
  return title;
}


function getRecordDateCandidate(record: AnyRecord | null | undefined, fields: string[]) {
  if (!record) return null;
  for (const field of fields) {
    const value = record[field];
    if (toDate(value) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))) return value;
  }
  return null;
}

function getOfficialCompletionDateForAdmin(certificate?: AnyRecord | null, _progress?: AnyRecord | null, _enrollment?: AnyRecord | null) {
  return getRecordDateCandidate(certificate, ["firstDocumentOutputAt", "documentFirstOutputAt", "issuedAt", "certificateIssuedAt", "createdAt"]);
}

function getCertificateFirstIssuedAt(certificate?: AnyRecord | null) {
  return getRecordDateCandidate(certificate, ["firstDocumentOutputAt", "documentFirstOutputAt", "issuedAt", "certificateIssuedAt", "createdAt"]);
}

function getLatestDocumentOutputAt(logs: AnyRecord[], match?: { certificateId?: string; courseId?: string; documentType?: string }) {
  const matched = logs.filter((log) => {
    if (match?.certificateId && String(log.certificateId || "") !== String(match.certificateId)) return false;
    if (!match?.certificateId && match?.courseId && String(log.courseId || "") && String(log.courseId || "") !== String(match.courseId)) return false;
    if (!match?.certificateId && match?.documentType && String(log.documentType || "") && String(log.documentType || "") !== String(match.documentType)) return false;
    return toDate(log.createdAt || log.updatedAt);
  });
  return matched.sort((a, b) => (toDate(b.createdAt || b.updatedAt)?.getTime() || 0) - (toDate(a.createdAt || a.updatedAt)?.getTime() || 0))[0]?.createdAt || null;
}

function getMemberStatus(user: AnyRecord) {
  const status = String(user.status || user.memberStatus || "").toLowerCase();
  if (status.includes("withdraw") || status.includes("deleted") || status.includes("탈퇴")) return "탈퇴";
  if (status.includes("dormant") || status.includes("휴면")) return "휴면";
  if (status.includes("suspend") || status.includes("ban") || status.includes("정지")) return "이용정지";
  if (user.emailVerified === false || user.emailVerifiedAt === null) return "이메일 미인증";
  return "정상";
}

function isManualEnrollment(row: AnyRecord) {
  const sourceType = String(row.sourceType || row.grantType || row.issueType || row.source || "").toUpperCase();
  const grantReason = String(row.grantReason || row.adminGrantReason || row.recoveredFrom || "").toUpperCase();
  return Boolean(row.manualGrant || row.adminGranted || sourceType === "MANUAL" || grantReason === "ADMIN_MANUAL");
}

function getEntitlementState(enrollments: AnyRecord[]) {
  if (!enrollments.length) return "미발급";
  if (enrollments.some(isActiveEnrollment)) return "활성";
  if (enrollments.some((row) => { const left = daysLeft(row.expiresAt); return left !== null && left >= 0 && left <= 14; })) return "만료예정";
  if (enrollments.some((row) => { const left = daysLeft(row.expiresAt); return left !== null && left < 0; })) return "만료";
  return "관리자 확인 필요";
}

function getPaymentProductText(payment?: AnyRecord | null) {
  if (!payment) return "기록 없음";
  return payment.productTitle || payment.productName || payment.courseTitle || payment.orderName || payment.productId || payment.courseId || "정보 없음";
}

function getEnrollmentProductText(enrollments: AnyRecord[]) {
  const active = sortEnrollmentsForAdminDisplay(enrollments.filter(isActiveEnrollment));
  const rows = active.length ? active : sortEnrollmentsForAdminDisplay(enrollments);
  if (!rows.length) return "없음";
  return rows.map((row) => row.productTitle || row.productName || row.courseTitle || row.productId || row.courseId || row.id).join(", " );
}

function paymentMatchesEnrollment(payment?: AnyRecord | null, enrollment?: AnyRecord | null) {
  if (!payment || !enrollment) return false;
  if (isSamePaymentLink(enrollment, payment)) return true;
  const paymentProductId = String(payment.productId || "").trim();
  const enrollmentProductId = String(enrollment.productId || "").trim();
  if (paymentProductId && enrollmentProductId && paymentProductId === enrollmentProductId) return true;
  const paymentCourseId = String(payment.courseId || payment.canonicalCourseId || "").trim();
  const enrollmentCourseId = String(enrollment.courseId || enrollment.canonicalCourseId || "").trim();
  return Boolean(paymentCourseId && enrollmentCourseId && paymentCourseId === enrollmentCourseId);
}

function getEnrollmentForPayment(enrollments: AnyRecord[], payment?: AnyRecord | null) {
  const exact = enrollments.find((row) => isSamePaymentLink(row, payment));
  if (exact) return exact;
  return enrollments.find((row) => isActiveEnrollment(row) && paymentMatchesEnrollment(payment, row));
}

function getEntitlementNormalState(payment?: AnyRecord | null, enrollments: AnyRecord[] = []) {
  if (!payment || !isPaidRecord(payment)) return enrollments.some(isActiveEnrollment) ? "결제 확인 필요" : "해당없음";
  const active = enrollments.filter(isActiveEnrollment);
  if (!active.length) return "수강권 없음";
  return active.some((row) => paymentMatchesEnrollment(payment, row)) ? "정상" : "상품 불일치";
}

function getLearningState(enrollments: AnyRecord[], progressRows: AnyRecord[]) {
  const progressRate = Math.max(0, ...enrollments.map((row) => Number(row.progress || 0)), ...progressRows.map((row) => Number(row.completionRate || 0)));
  const last = Math.max(0, ...progressRows.map((row) => toDate(row.updatedAt || row.lastWatchedAt)?.getTime() || 0), ...enrollments.map((row) => toDate(row.updatedAt || row.lastWatchedAt)?.getTime() || 0));
  if (progressRate >= 100 || enrollments.some((row) => row.completedAt)) return "교육완료";
  if (progressRate > 0) return last && last < Date.now() - 14 * 24 * 60 * 60 * 1000 ? "진도정체" : "수강중";
  return "미수강";
}

function getCompletionState(enrollments: AnyRecord[], certificates: AnyRecord[]) {
  const activeEnrollments = enrollments.filter(isActiveEnrollment);
  if (certificates.length && !activeEnrollments.length) return "확인필요";
  if (certificates.length || activeEnrollments.some((row) => row.certificateIssued || row.certificateNo)) return "수료완료";
  if (activeEnrollments.some((row) => row.completedAt || Number(row.progress || 0) >= 100)) return "수료조건충족";
  return "미수료";
}

function hasIssuedDocumentRecord(certificates: AnyRecord[], enrollments: AnyRecord[]) {
  return certificates.some((row) => row.certificateNo || row.issueNumber || row.certificateId || row.id)
    || enrollments.some((row) => row.certificateIssued === true || row.certificateNo || row.issueNumber || row.certificateId);
}

function getDocumentIssueState(certificates: AnyRecord[], enrollments: AnyRecord[]) {
  return hasIssuedDocumentRecord(certificates, enrollments) ? "발급완료" : "미발급";
}

function getDocumentOutputState(logs: AnyRecord[]) {
  const printed = logs.some((row) => String(row.action || row.method || row.outputMethod || "").toLowerCase() === "print");
  const pdf = logs.some((row) => String(row.action || row.method || row.outputMethod || "").toLowerCase() === "pdf");
  if (printed && pdf) return "인쇄/PDF 완료";
  if (printed) return "인쇄완료";
  if (pdf) return "PDF저장완료";
  return "기록 없음";
}

function getDocumentState(certificates: AnyRecord[], enrollments: AnyRecord[], outputLogs: AnyRecord[] = []) {
  const issueState = getDocumentIssueState(certificates, enrollments);
  const outputState = getDocumentOutputState(outputLogs);
  if (issueState === "발급완료") return outputState === "기록 없음" ? "발급완료" : outputState;
  return issueState;
}

function getUserCrmBundle(userOrUid: AnyRecord | string, data: AdminDataset) {
  const identity = getCrmIdentity(userOrUid, data);
  const uid = Array.from(identity.uids)[0] || (typeof userOrUid === "string" ? userOrUid : getUid(userOrUid));
  const payments = getAllPaymentRecords(data).filter((row) => matchesCrmIdentity(row, identity));
  const paymentLogs = getPaymentLogsForUid(uid, data, payments).filter((row) => matchesCrmIdentity(row, identity) || payments.some((payment) => isSamePaymentLink(row, payment)));
  const enrollments = sortEnrollmentsForAdminDisplay(data.enrollments.filter((row) => matchesCrmIdentity(row, identity)));
  const progressRows = data.progress.filter((row) => matchesCrmIdentity(row, identity));
  const certificates = data.certificates.filter((row) => matchesCrmIdentity(row, identity));
  const logs = data.adminLogs.filter((row) => row.targetId === uid || matchesCrmIdentity(row, identity));
  const documentOutputLogs = data.documentOutputLogs.filter((row) => matchesCrmIdentity(row, identity) || identity.uids.has(String(row.targetUid || "").trim()));
  const primaryEnrollment = getPrimaryEnrollment(enrollments);
  const primaryPayment = payments.find((row) => isPaidRecord(row) && isAdvancedEnrollment(row)) || payments.find(isPaidRecord) || getLatestPayment(payments);
  const courseTitle = primaryEnrollment?.courseTitle || primaryPayment?.courseTitle || primaryPayment?.productTitle || primaryPayment?.productName || primaryPayment?.orderName || "정보 없음";
  const primaryAccess = primaryEnrollment || primaryPayment || {};
  const issues: string[] = [];
  if (payments.some(isPaidRecord) && !enrollments.some(isActiveEnrollment)) issues.push("결제완료 + 정상 수강권 없음");
  if (enrollments.some(isActiveEnrollment) && !payments.some(isPaidRecord) && !enrollments.some((row) => isManualEnrollment(row) || row.grantReason === "RESTORE")) issues.push("결제 없는 수강권");
  if (payments.some(isFailedPayment) && enrollments.some(isActiveEnrollment)) issues.push("결제 실패 + 수강권 활성");
  if (payments.some(isRefundRecord) && enrollments.some(isActiveEnrollment)) issues.push("환불/취소 + 수강권 활성");
  if (certificates.length && !enrollments.some(isActiveEnrollment)) issues.push("정상 수강권 없음 + 서류 발급 기록");
  const activeKeys = new Set(enrollments.filter(isActiveEnrollment).map((row) => String(row.courseId || "") + ":" + String(row.productId || "") + ":" + String(row.planId || "")));
  if (activeKeys.size < enrollments.filter(isActiveEnrollment).length) issues.push("동일 UID 중복 활성 수강권");
  const primaryProgress = progressRows.find((row) => row.courseId === primaryEnrollment?.courseId) || progressRows[0] || null;
  const primaryCertificate = certificates.find((row) => row.courseId === primaryEnrollment?.courseId) || certificates[0] || null;
  const officialCompletionAt = getOfficialCompletionDateForAdmin(primaryCertificate, primaryProgress, primaryEnrollment);
  const certificateFirstIssuedAt = getCertificateFirstIssuedAt(primaryCertificate);
  const latestDocumentOutputAt = getLatestDocumentOutputAt(documentOutputLogs);
  return { payments, paymentLogs, enrollments, progressRows, certificates, logs, documentOutputLogs, courseTitle, courseLevel: getCourseLevelText(primaryAccess), educationCategory: getEducationCategoryText(primaryAccess), officialCompletionAt, certificateFirstIssuedAt, latestDocumentOutputAt, issues };
}

function buildMemberTimeline(selected: AnyRecord, bundle: ReturnType<typeof getUserCrmBundle>) {
  const items: Array<{ id: string; at: any; label: string; detail: string }> = [];
  const push = (id: string, at: any, label: string, detail: string) => { if (toDate(at)) items.push({ id, at, label, detail }); };
  push("user-created", selected.createdAt, "회원가입", selected.email || selected.id);
  push("email-verified", selected.emailVerifiedAt, "이메일 인증", "실제 인증시각 기록 기준");
  push("last-login", selected.lastLoginAt, "로그인", "최근 로그인 기록");
  bundle.payments.forEach((row) => {
    push("payment-created-" + row.recordSource + "-" + row.id, row.createdAt || row.orderedAt || row.attemptedAt, "결제 시도", row.orderId || row.paymentId || row.id);
    if (isPaidRecord(row)) push("payment-paid-" + row.recordSource + "-" + row.id, row.approvedAt || row.paidAt || row.updatedAt, "결제 성공", formatKrw(Number(row.amount || row.paidAmount || 0)));
    if (isFailedPayment(row)) push("payment-failed-" + row.recordSource + "-" + row.id, row.failedAt || row.updatedAt || row.createdAt, "결제 실패", row.failureMessage || row.errorMessage || row.failureCode || row.errorCode || row.id);
    if (isRefundRecord(row)) push("payment-refund-" + row.recordSource + "-" + row.id, row.refundedAt || row.refundRequestedAt || row.updatedAt, "환불/취소", row.refundStatus || row.status || "환불 관련 기록");
  });
  bundle.paymentLogs.forEach((row) => {
    const type = String(row.type || row.action || row.status || "").toLowerCase();
    const label = type.includes("failed") || type.includes("fail") || type.includes("error") ? "결제 실패 로그" : type.includes("completed") || type.includes("paid") || type.includes("success") ? "결제 성공 로그" : type.includes("webhook") ? "Webhook 기록" : "결제 시도 로그";
    push("payment-log-" + row.id, row.createdAt || row.failedAt || row.attemptedAt || row.updatedAt, label, row.failureMessage || row.errorMessage || row.message || row.paymentId || row.orderId || row.type || row.id);
  });
  bundle.enrollments.forEach((row) => {
    push("enrollment-" + row.id, row.createdAt || row.purchasedAt || row.grantedAt, "수강권 생성", getEnrollmentCourseDisplayTitle(row));
    push("enrollment-completed-" + row.id, row.completedAt, "수료 처리", row.courseTitle || row.courseId || row.id);
  });
  bundle.progressRows.forEach((row) => push("progress-" + row.id, row.updatedAt || row.lastWatchedAt, "강의 진도 저장", row.courseTitle || row.courseId || row.id));
  bundle.certificates.forEach((row) => push("certificate-" + row.id, row.issuedAt || row.createdAt, "문서 발급", row.certificateNo || row.documentType || row.id));
  bundle.documentOutputLogs.forEach((row) => push("document-output-" + row.id, row.createdAt, "서류 출력", (row.documentTitle || row.documentType || row.materialTitle || row.certificateId || row.id) + " / " + (row.action === "pdf" ? "PDF 저장" : row.action === "print" ? "인쇄" : verifiedValue(row.action))));
  bundle.logs.forEach((row) => push("admin-log-" + row.id, row.createdAt, "관리자 활동", row.description || row.action || row.id));
  return items.sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
}

function getCompletedLessons(enrollment?: AnyRecord, progress?: AnyRecord) {
  return Math.max(Number(enrollment?.completedLessons || 0), Number(progress?.completedModuleCount || 0));
}

function getProgressRate(enrollment?: AnyRecord, progress?: AnyRecord) {
  return Math.max(Number(enrollment?.progress || 0), Number(progress?.completionRate || 0));
}

function getAdminCourseProduct(courseId?: string) {
  const id = courseId || duiPreventionCourseProduct.courseId;
  return adminGrantProducts.find((product) => product.courseId === id) || adminGrantProducts[0];
}

function getAdminCourseModules(courseId?: string) {
  const modules = getCourseModules(courseId);
  return modules.length ? modules : duiBasicModules;
}

function getAdminCourseTotalLessons(courseId?: string) {
  return getAdminCourseModules(courseId).length || duiPreventionCourseProduct.totalLessons;
}

function getAdminCertificateDocumentOptions(courseId?: string) {
  const course = allCourseCatalog.find((item) => item.id === courseId);
  const docs = course?.documents?.length ? course.documents : [{ type: "course-certificate" as const, title: (course?.certificateTitle || course?.title || "교육") + " 수료증" }];
  return docs.map((doc) => ({ type: doc.type === "course-certificate" ? "completion" : doc.type, title: doc.title, courseId: doc.courseId || courseId || duiPreventionCourseProduct.courseId }));
}

function getAdminCertificateDocumentType(courseId?: string, documentType?: string) {
  const normalized = documentType === "course-certificate" ? "completion" : documentType;
  const option = getAdminCertificateDocumentOptions(courseId).find((item) => item.type === normalized);
  if (option) return option.title;
  return courseId === DUI_CBT_ADVANCED_COURSE_ID || normalized === "cbt-completion" ? "인지행동기반 재발방지교육 이수증" : normalized === "cbt-detail" ? "재범방지 교육 이수 상세 내역서" : "수료증";
}

function getCertificateViewHref(certificateId: string, mode?: "pdf" | "print") {
  const params = new URLSearchParams({ certificateId });
  if (mode) params.set(mode, "1");
  return "/certificate?" + params.toString();
}

function normalizeAdminDocumentKey(value: unknown) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120);
}

function getCertificateAdminDocumentKey(courseId?: string, documentType?: string) {
  return normalizeAdminDocumentKey(`certificate:${courseId || ""}:${documentType || "completion"}`);
}

function getMaterialAdminDocumentKey(materialId?: string) {
  return normalizeAdminDocumentKey(`material:${materialId || "document"}`);
}

function getOutputLogDocumentKey(row: AnyRecord) {
  if (row.documentKey) return normalizeAdminDocumentKey(row.documentKey);
  if (row.rawDocumentKey) return normalizeAdminDocumentKey(row.rawDocumentKey);
  if (row.documentKind === "material" || row.materialId) return getMaterialAdminDocumentKey(row.materialId || row.documentType);
  return getCertificateAdminDocumentKey(row.courseId, row.documentType || "completion");
}

function getDocumentIssueSummary(logs: AnyRecord[], key: string) {
  const normalized = normalizeAdminDocumentKey(key);
  const matched = logs.filter((row) => getOutputLogDocumentKey(row) === normalized || normalizeAdminDocumentKey(row.certificateId) === normalized || normalizeAdminDocumentKey(row.materialId) === normalized);
  if (!matched.length) return { status: "미발급", firstIssuedAt: null, lastIssuedAt: null, issueCount: 0 };
  const firstIssuedAt = getEarliestTimeValue(...matched.map((row) => row.firstIssuedAt || row.firstDocumentOutputAt || row.createdAt || row.updatedAt));
  const latest = [...matched].sort((a, b) => (toDate(b.lastIssuedAt || b.updatedAt || b.createdAt)?.getTime() || 0) - (toDate(a.lastIssuedAt || a.updatedAt || a.createdAt)?.getTime() || 0))[0];
  const issueCount = matched.reduce((sum, row) => sum + Math.max(1, Number(row.issueCount || 0)), 0);
  return { status: "발급완료", firstIssuedAt: firstIssuedAt || latest?.createdAt || null, lastIssuedAt: latest?.lastIssuedAt || latest?.updatedAt || latest?.createdAt || null, issueCount };
}

function getAvailableDocumentIssueRows(bundle: ReturnType<typeof getUserCrmBundle>) {
  const byKey = new Map<string, AnyRecord>();
  const addRow = (row: Record<string, any>) => {
    const key = normalizeAdminDocumentKey(row.documentKey);
    if (!key || byKey.has(key)) return;
    byKey.set(key, { id: key, ...row, documentKey: key, ...getDocumentIssueSummary(bundle.documentOutputLogs, key) } as AnyRecord);
  };
  bundle.enrollments.filter(isActiveEnrollment).forEach((enrollment) => {
    getAdminCertificateDocumentOptions(enrollment.courseId).forEach((option) => addRow({ documentKey: getCertificateAdminDocumentKey(option.courseId, option.type), documentName: option.title, courseId: option.courseId, documentKind: "certificate" }));
    getPreventionDocumentsForEnrollment(enrollment as any).forEach((document) => addRow({ documentKey: getMaterialAdminDocumentKey(document.id), documentName: document.title, courseId: enrollment.courseId, documentKind: "material" }));
  });
  bundle.certificates.forEach((certificate) => addRow({ documentKey: getCertificateAdminDocumentKey(certificate.courseId, certificate.documentType || "completion"), documentName: getAdminCertificateDocumentType(certificate.courseId, certificate.documentType), courseId: certificate.courseId, documentKind: "certificate" }));
  return Array.from(byKey.values());
}

function getRefundInfo(row: { payment?: AnyRecord; enrollment?: AnyRecord; progress?: AnyRecord; certificate?: AnyRecord }) {
  const completedLessons = getCompletedLessons(row.enrollment, row.progress);
  return calculateRefundAmount({
    totalAmount: Number(row.payment?.amount || duiPreventionCourseProduct.price),
    totalLessons: Number(row.enrollment?.totalLessons || duiPreventionCourseProduct.totalLessons),
    completedLessons,
    expiresAt: row.enrollment?.expiresAt || row.payment?.expiresAt,
    certificateIssued: Boolean(row.enrollment?.certificateIssued || row.payment?.certificateIssued || row.certificate?.certificateNo),
    paymentStatus: row.payment?.paymentStatus || row.payment?.status || row.enrollment?.paymentStatus || "paid",
  });
}

function downloadCsv(filename: string, rows: AnyRecord[]) {
  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSealStampPng() {
  const a = document.createElement("a");
  a.href = sealStampPath;
  a.download = "reset-edu-center-seal.png";
  a.click();
}

function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, maxPage);
  const paged = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { page: safePage, maxPage, setPage, paged };
}

function AdminGuard({ children, view }: { children: React.ReactNode; view: AdminView }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const resolvedEmail = user.email || "";
        if (cancelled) return;
        setEmail(resolvedEmail);
        const { db } = getFirebaseServices();
        const profileSnapshot = await getDoc(doc(db, "users", user.uid)).catch(() => null);
        const role = String(profileSnapshot?.data()?.role || profileSnapshot?.data()?.adminRole || "").toLowerCase();
        setAllowed(isAdminEmail(resolvedEmail) || ["admin", "superadmin", "operator", "viewer"].includes(role));
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        if (message === "AUTH_LOGIN_REQUIRED") router.replace(`/login?next=/admin/${view === "dashboard" ? "dashboard" : view}`);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router, view]);

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-4 text-[#0f172a]"><p className="rounded-xl border border-[#d7deea] bg-white px-5 py-4 text-sm font-semibold shadow-[0_18px_48px_rgba(15,23,42,0.08)]">관리자 권한을 확인하고 있습니다.</p></main>;
  if (!allowed) {
    return <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-4 text-[#0f172a]"><section className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]"><h1 className="text-2xl font-black text-rose-800">관리자 권한이 없습니다.</h1><p className="mt-3 text-sm leading-6 text-slate-600">관리자 계정으로 로그인한 경우에만 접근할 수 있습니다.</p><Link href="/" className="mt-5 inline-flex rounded-full bg-[#10213f] px-4 py-2 text-sm font-bold text-white">사이트로 이동</Link></section></main>;
  }
  return <>{children}</>;
}

function AdminFrame({ children, email, view }: { children: React.ReactNode; email: string; view: AdminView }) {
  const { auth } = getFirebaseServices();
  return (
    <main className="min-h-screen bg-[#eef3f8] text-[#0f172a]">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-3 sm:px-4 sm:py-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 lg:px-6">
        <aside className="rounded-2xl border border-[#d7deea] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-4 lg:sticky lg:top-5 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Admin</p>
          <h1 className="mt-2 text-xl font-semibold sm:text-2xl">관리자 페이지</h1>
          <p className="mt-2 hidden text-xs leading-6 text-slate-500 sm:block">사이트 운영에 필요한 회원, 결제, 수강권, 수료증 정보를 관리할 수 있습니다.</p>
          <nav className="mt-4 grid max-h-[58vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:max-h-none lg:grid-cols-1 lg:overflow-visible lg:pr-0">
            {menu.map((item) => (
              <Link key={item.view} href={item.href} className={`min-w-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:px-4 lg:py-3 ${view === item.view ? "bg-[#173968] text-white" : "bg-[#f8fafc] text-slate-700 hover:bg-[#eef4ff]"}`}><span className="block text-[11px] font-bold text-current opacity-70">{item.group}</span><span className="mt-0.5 block leading-5">{item.label}</span></Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <header className="mb-4 rounded-2xl border border-[#d7deea] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:mb-5 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{new Date().toLocaleDateString("ko-KR")}</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-800">관리자 로그인 이메일: {email}</p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <Link href="/" className="rounded-full border border-[#d7deea] bg-white px-3 py-2 text-center text-sm font-semibold text-[#10213f] sm:px-4">사이트로 돌아가기</Link>
                <button type="button" onClick={() => void signOut(auth)} className="rounded-full bg-[#173968] px-3 py-2 text-sm font-bold text-white sm:px-4">로그아웃</button>
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function AdminToolbar({ search, setSearch, filter, setFilter, filters, onRefresh, onCsv, onLoadMore }: { search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; filters: string[]; onRefresh: () => void; onCsv: () => void; onLoadMore?: () => void }) {
  return (
    <div className="mb-4 grid gap-3 rounded-[1.25rem] border border-[#d7deea] bg-white p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_180px_auto_auto_auto] md:items-center">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="검색어를 입력하세요" className="min-h-11 min-w-0 rounded-full border border-[#d7deea] px-4 text-sm outline-none focus:border-[#173968]" />
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 rounded-full border border-[#d7deea] px-4 text-sm outline-none focus:border-[#173968]">
        {filters.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button type="button" onClick={onRefresh} className="min-h-11 rounded-full border border-[#d7deea] bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">새로고침</button>
      {onLoadMore ? <button type="button" onClick={onLoadMore} className="min-h-11 rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-[#173968] hover:bg-[#f8fafc]">다음 목록 불러오기</button> : null}
      <button type="button" onClick={onCsv} className="min-h-11 rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">CSV 다운로드</button>
    </div>
  );
}

function DataTable({ columns, rows, emptyText = "표시할 데이터가 없습니다." }: { columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => React.ReactNode; align?: "right" }>; rows: AnyRecord[]; emptyText?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d7deea] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="grid gap-3 p-3 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-[#e5ebf3] bg-[#f8fafc] p-4">
            <div className="grid gap-3">
              {columns.slice(0, 6).map((col) => (
                <div key={col.key} className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500">{col.label}</p>
                  <div className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">{col.render ? col.render(row) : String(row[col.key] ?? "-")}</div>
                </div>
              ))}
            </div>
            {columns.length > 6 ? <details className="mt-3 rounded-lg border border-[#e5ebf3] bg-white px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-[#173968]">더보기</summary><div className="mt-3 grid gap-3">{columns.slice(6).map((col) => <div key={col.key}><p className="text-[11px] font-bold text-slate-500">{col.label}</p><div className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">{col.render ? col.render(row) : String(row[col.key] ?? "-")}</div></div>)}</div></details> : null}
          </article>
        ))}
        {!rows.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyText}</p> : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.14em] text-slate-500"><tr>{columns.map((col) => <th key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : ""}`}>{col.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e5ebf3]">
            {rows.map((row) => <tr key={row.id}>{columns.map((col) => <td key={col.key} className={`px-4 py-3 align-top text-slate-700 ${col.align === "right" ? "text-right" : ""}`}>{col.render ? col.render(row) : String(row[col.key] ?? "-")}</td>)}</tr>)}
            {!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">{emptyText}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailPanel({ title, rows, memoTarget, memo, setMemo, onSaveMemo }: { title: string; rows: Array<[string, React.ReactNode]>; memoTarget?: string; memo?: string; setMemo?: (v: string) => void; onSaveMemo?: () => void }) {
  return (
    <section className="mt-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => <div key={label} className="rounded-xl border border-[#e5ebf3] bg-[#f8fafc] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p><div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div></div>)}
      </div>
      {memoTarget ? <div className="mt-5"><label className="text-sm font-semibold text-slate-800">관리자 메모</label><textarea value={memo || ""} onChange={(event) => setMemo?.(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[#d7deea] p-3 text-sm outline-none focus:border-[#173968]" /><button type="button" onClick={onSaveMemo} className="mt-3 rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">관리자 메모 저장</button></div> : null}
    </section>
  );
}

export function AdminPage({ view }: { view: AdminView }) {
  return <AdminGuard view={view}><AdminContent view={view} /></AdminGuard>;
}

function mergeAdminDataset(base: AdminDataset, patch: Partial<AdminDataset>): AdminDataset {
  return {
    authUsers: mergeAdminRows([...base.authUsers, ...(patch.authUsers || [])]),
    users: mergeAuthUsersWithProfiles(mergeAdminRows([...base.authUsers, ...(patch.authUsers || [])]), mergeAdminRows([...base.users, ...(patch.users || [])])),
    payments: mergeAdminRows([...base.payments, ...(patch.payments || [])]),
    purchases: mergeAdminRows([...base.purchases, ...(patch.purchases || [])]),
    orders: mergeAdminRows([...base.orders, ...(patch.orders || [])]),
    enrollments: mergeAdminRows([...base.enrollments, ...(patch.enrollments || [])]),
    certificates: mergeAdminRows([...base.certificates, ...(patch.certificates || [])]),
    progress: mergeAdminRows([...base.progress, ...(patch.progress || [])]),
    refundPolicies: mergeAdminRows([...base.refundPolicies, ...(patch.refundPolicies || [])]),
    adminLogs: mergeAdminRows([...base.adminLogs, ...(patch.adminLogs || [])]),
    paymentLogs: mergeAdminRows([...base.paymentLogs, ...(patch.paymentLogs || [])]),
    documentOutputLogs: mergeAdminRows([...base.documentOutputLogs, ...(patch.documentOutputLogs || [])]),
  };
}

function AdminContent({ view }: { view: AdminView }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [data, setData] = useState<AdminDataset>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("전체");
  const [selectedId, setSelectedId] = useState(searchParams.get("id") || "");
  const [memo, setMemo] = useState("");
  const [loadedDetailUids, setLoadedDetailUids] = useState<string[]>([]);

  const load = async (options?: { force?: boolean }) => {
    setLoading(true);
    setError("");
    try {
      if (!options?.force) {
        const cached = readAdminDatasetCache(view);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }
      const user = await requireAuthenticatedUser();
      if (!isAdminEmail(user.email)) throw new Error("관리자 권한이 없습니다.");
      setEmail(user.email || "");
      setUid(user.uid);
      if (view === "memberStatus" || view === "supabaseLedger") {
        setData(emptyData);
        setLoadedDetailUids([]);
        return;
      }
      const next = await loadAdminDatasetFromWorker(view);
      setData(next);
      setLoadedDetailUids([]);
      writeAdminDatasetCache(view, next);
    } catch (loadError) {
      console.error(loadError);
      setError(formatAdminDataError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedId(searchParams.get("id") || "");
    setSearch("");
    setFilter("전체");
    void load();
  }, [view]);

  useEffect(() => {
    setLoadedDetailUids((current) => current);
  }, [selectedId]);


  const maps = useMemo(() => {
    const userById = new Map<string, AnyRecord>();
    data.users.forEach((user) => [user.id, user.uid, user.userId, user.firebaseUid].map((value) => String(value || "").trim()).filter(Boolean).forEach((key) => userById.set(key, user)));
    const progressByUserCourse = new Map(data.progress.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const enrollmentByUserCourse = new Map(data.enrollments.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const certificateByUserCourse = new Map(data.certificates.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const paymentByOrder = new Map(getAllPaymentRecords(data).map((item) => [item.orderId || item.paymentId || item.id, item]));
    return { userById, progressByUserCourse, enrollmentByUserCourse, certificateByUserCourse, paymentByOrder };
  }, [data]);


  const saveMemo = async (collectionName: string, targetId: string, value: string) => {
    if (!targetId) return;
    const ok = window.confirm("관리자 메모를 저장하시겠습니까?");
    if (!ok) return;
    const { db } = getFirebaseServices();
    await setDoc(doc(db, collectionName, targetId), { adminMemo: value, adminMemoUpdatedAt: serverTimestamp(), adminMemoUpdatedBy: email }, { merge: true });
    await addDoc(collection(db, "adminLogs"), { adminUserId: uid, adminEmail: email, action: "adminMemo.update", targetType: collectionName, targetId, description: "관리자 메모 작성", createdAt: serverTimestamp() });
    await load();
  };

  return (
    <AdminFrame email={email} view={view}>
      {loading ? <p className="rounded-[1.25rem] border border-[#d7deea] bg-white p-6 text-sm text-slate-600">관리자 데이터를 불러오는 중입니다.</p> : null}
      {error ? <p className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">데이터를 불러오는 중 오류가 발생했습니다. {error}</p> : null}
      {!loading && (!error || hasAdminDatasetRows(data)) ? renderView({ view, data, maps, search, setSearch, filter, setFilter, selectedId, setSelectedId, memo, setMemo, saveMemo, refresh: () => load({ force: true }) }) : null}
    </AdminFrame>
  );
}

function renderView(ctx: { view: AdminView; data: AdminDataset; maps: any; search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; selectedId: string; setSelectedId: (v: string) => void; memo: string; setMemo: (v: string) => void; saveMemo: (collectionName: string, id: string, memo: string) => Promise<void>; refresh: () => void }) {
  if (ctx.view === "dashboard") return <DashboardView {...ctx} />;
  if (ctx.view === "memberStatus") return <MemberStatusAdminView />;
  if (ctx.view === "supabaseLedger") return <SupabaseLedgerAdminView />;
  if (ctx.view === "users") return <UsersView {...ctx} />;
  if (ctx.view === "payments") return <PaymentsView {...ctx} />;
  if (ctx.view === "enrollments") return <EnrollmentsView {...ctx} />;
  if (ctx.view === "revocations") return <EnrollmentRevocationsView {...ctx} />;
  if (ctx.view === "certificates") return <CertificatesView {...ctx} />;
  if (ctx.view === "refunds") return <RefundsView {...ctx} />;
  if (ctx.view === "courses") return <CoursesView />;
  if (ctx.view === "integrity") return <IntegrityView />;
  return <SettingsView />;
}

function DashboardView({ data, maps, refresh }: any) {
  const now = Date.now();
  const allPaymentRecords = getAllPaymentRecords(data);
  const payments = allPaymentRecords.filter(isPaidRecord);
  const todayUsers = data.users.filter((user: AnyRecord) => isToday(user.createdAt) || getUserCrmBundle(user, data).payments.some((p: AnyRecord) => isToday(getPaymentTime(p))));
  const todayMemberStates = todayUsers.map((user: AnyRecord) => {
    const uid = getUid(user);
    const bundle = getUserCrmBundle(user, data);
    const todayPayments = bundle.payments.filter((p: AnyRecord) => isToday(getPaymentTime(p)));
    const state = todayPayments.length ? getMemberPaymentState(todayPayments, getPaymentLogsForUid(uid, data, todayPayments)) : getMemberPaymentState([], []);
    return { uid, state };
  });
  const todayAttempts = todayMemberStates.filter((row: AnyRecord) => row.state === "결제시도");
  const todaySuccess = todayMemberStates.filter((row: AnyRecord) => row.state === "결제완료");
  const todayFailed = todayMemberStates.filter((row: AnyRecord) => row.state === "결제실패");
  const todayUnpaid = todayMemberStates.filter((row: AnyRecord) => row.state === "미결제");
  const todaySignupCount = data.users.filter((user: AnyRecord) => isToday(user.createdAt)).length;
  const totalAmount = payments.reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || item.paidAmount || 0), 0);
  const todayAmount = allPaymentRecords.filter((p: AnyRecord) => isToday(getPaymentTime(p)) && isPaidRecord(p)).reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || item.paidAmount || 0), 0);
  const monthAmount = payments.filter((p: AnyRecord) => isThisMonth(p.approvedAt || p.paidAt || p.createdAt)).reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || item.paidAmount || 0), 0);
  const completed = data.enrollments.filter((e: AnyRecord) => Number(e.completedLessons || 0) >= duiPreventionCourseProduct.totalLessons || Number(e.progress || 0) >= 100);
  const expired = data.enrollments.filter((e: AnyRecord) => { const expires = toDate(e.expiresAt); return expires && expires.getTime() < now; });
  const refundable = data.enrollments.filter((e: AnyRecord) => getRefundInfo({ enrollment: e, payment: maps.paymentByOrder.get(e.orderId || e.paymentId), progress: maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`), certificate: maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`) }).refundable);
  const cards = [
    ["오늘 회원가입", todaySignupCount + "명", "/admin/users"], ["오늘 결제 완료", todaySuccess.length + "명", "/admin/payments"], ["오늘 결제 실패", todayFailed.length + "명", "/admin/payments"], ["오늘 결제 시도", todayAttempts.length + "명", "/admin/payments"], ["오늘 미결제", todayUnpaid.length + "명", "/admin/users"], ["오늘 매출", formatKrw(todayAmount), "/admin/payments"], ["결제 성공률", (todayMemberStates.length ? Math.round((todaySuccess.length / todayMemberStates.length) * 100) : 0) + "%", "/admin/payments"], ["전체 회원 수", data.users.length, "/admin/users"], ["전체 결제 건수", allPaymentRecords.length, "/admin/payments"], ["총 결제금액", formatKrw(totalAmount), "/admin/payments"], ["이번 달 결제금액", formatKrw(monthAmount), "/admin/payments"], ["음주운전 재범방지교육 구매자 수", new Set(payments.filter((p: AnyRecord) => getEducationCategoryText(p) === "음주운전").map((p: AnyRecord) => p.uid || p.userId)).size, "/admin/enrollments"], ["수강 중인 회원 수", data.enrollments.filter((e: AnyRecord) => e.accessStatus === "active").length, "/admin/enrollments"], ["수강 완료 회원 수", completed.length, "/admin/enrollments"], ["수료증 발급 건수", data.certificates.length, "/admin/certificates"], ["수강기간 만료 건수", expired.length, "/admin/enrollments"], ["환불 가능 대상 건수", refundable.length, "/admin/refunds"],
  ];
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">운영 대시보드</h2><div className="flex flex-wrap gap-2"><Link href="/admin/users" className="rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">회원 검색</Link><Link href="/admin/enrollments" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-bold text-[#173968]">수강권 부여</Link><Link href="/admin/payments" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-bold text-[#173968]">결제내역 확인</Link><Link href="/admin/integrity" className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">확인 필요</Link></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, href]) => <Link key={String(label)} href={String(href)} className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-slate-950">{String(value)}</p></Link>)}</div><div className="mt-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#274690]">Document Preview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">작성자료 미리보기</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">기본 수료과정 구매자에게 제공되는 작성자료의 인쇄 및 PDF 저장 화면을 관리자 권한으로 확인합니다.</p>
        </div>
        <Link href="/course-room/?v=202607161010" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-[#173968]">수강실 작성자료 영역 확인</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {preventionDocuments.map((document) => (
          <Link key={document.id} href={`/prevention-documents?type=${document.id}`} className="rounded-[1.15rem] border border-[#d7deea] bg-[#f8fafc] p-4 transition hover:border-[#173968] hover:bg-[#eef4ff]">
            <p className="text-xs font-bold text-[#274690]">{preventionDocumentCategoryLabels[document.category]}</p>
            <p className="mt-1 text-base font-bold text-slate-950">{document.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
            <p className="mt-4 text-sm font-semibold text-[#173968]">작성자료 보기 · 인쇄/PDF 확인</p>
          </Link>
        ))}
      </div>
    </div></section>;
}

function UsersView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.users.map((user: AnyRecord) => {
    const uid = getUid(user);
    const bundle = getUserCrmBundle(user, ctx.data);
    const latestPayment = getLatestPayment(bundle.payments);
    const primaryPaidPayment = bundle.payments.find(isPaidRecord) || null;
    const paymentStats = getPaymentAttemptStats(bundle.payments, bundle.paymentLogs);
    const entitlementNormalState = getEntitlementNormalState(primaryPaidPayment, bundle.enrollments);
    const progressRate = Math.max(0, ...bundle.enrollments.map((row: AnyRecord) => Number(row.progress || 0)), ...bundle.progressRows.map((row: AnyRecord) => Number(row.completionRate || 0)));
    const tags = [normalizeCourseDisplayText(bundle.courseTitle), bundle.courseLevel, bundle.educationCategory, ...bundle.issues.length ? ["데이터확인필요"] : []].filter((item) => item && item !== "확인되지 않음" && item !== "정보 없음");
    const phoneNumber = getCrmPhoneNumber(user, bundle);
    const birthDateText = getCrmBirthDate(user, bundle);
    return {
      ...user,
      userId: uid,
      userName: getUserName(user),
      birthDateText,
      phoneNumber,
      signupAt: getSignupDateValue(user),
      phoneLast4: String(phoneNumber || "").replace(/\D/g, "").slice(-4),
      signupMethod: getSignupMethod(user),
      memberStatus: getMemberStatus(user),
      paymentState: getMemberPaymentState(bundle.payments, bundle.paymentLogs, { loaded: true }),
      latestPaymentAttemptState: getLatestPaymentAttemptState(bundle.payments),
      paymentSuccessState: getPaymentSuccessState(bundle.payments),
      entitlementState: bundle.enrollments.length ? getEntitlementState(bundle.enrollments) : "-",
      entitlementNormalState: bundle.enrollments.length || bundle.payments.some(isPaidRecord) ? entitlementNormalState : "-",
      learningState: getLearningState(bundle.enrollments, bundle.progressRows),
      completionState: getCompletionState(bundle.enrollments, bundle.certificates),
      documentState: getDocumentState(bundle.certificates, bundle.enrollments, bundle.documentOutputLogs),
      documentIssueState: getDocumentIssueState(bundle.certificates, bundle.enrollments),
      documentOutputState: getDocumentOutputState(bundle.documentOutputLogs),
      officialCompletionAt: bundle.officialCompletionAt,
      certificateFirstIssuedAt: bundle.certificateFirstIssuedAt,
      latestDocumentOutputAt: bundle.latestDocumentOutputAt,
      latestActivityAt: getLatestTimeValue(
        user.createdAt,
        user.updatedAt,
        user.lastLoginAt,
        latestPayment ? getPaymentTime(latestPayment) : null,
        bundle.latestDocumentOutputAt,
        bundle.certificateFirstIssuedAt,
        bundle.officialCompletionAt,
        bundle.enrollments.flatMap((row: AnyRecord) => [row.updatedAt, row.createdAt, row.purchasedAt, row.grantedAt, row.completedAt]),
        bundle.progressRows.flatMap((row: AnyRecord) => [row.updatedAt, row.completedAt, row.lastWatchedAt]),
      ),
      refundState: bundle.payments.some(isRefundRecord) ? "환불요청/완료" : "해당없음",
      educationCategory: bundle.enrollments.length || bundle.payments.length ? bundle.educationCategory : "-",
      courseTitle: bundle.enrollments.length || bundle.payments.length ? normalizeCourseDisplayText(bundle.courseTitle) : "-",
      courseLevel: bundle.enrollments.length || bundle.payments.length ? bundle.courseLevel : "-",
      paymentAmount: latestPayment ? Number(latestPayment.amount || latestPayment.paidAmount || 0) : 0,
      paymentAt: latestPayment ? getPaymentTime(latestPayment) : null,
      latestPaymentAttemptAt: latestPayment ? getPaymentTime(latestPayment) : null,
      paymentCompletedAt: primaryPaidPayment ? primaryPaidPayment.approvedAt || primaryPaidPayment.paidAt || primaryPaidPayment.updatedAt : null,
      paymentId: latestPayment?.paymentId || latestPayment?.paymentKey || "",
      orderId: latestPayment?.orderId || "",
      productTitle: bundle.payments.length ? getPaymentProductText(primaryPaidPayment || latestPayment) : "-",
      enrollmentProductTitle: bundle.enrollments.length ? getEnrollmentProductText(bundle.enrollments) : "-",
      paymentCountText: "시도 " + paymentStats.attempts + "회 / 성공 " + paymentStats.success + "회 / 실패 " + paymentStats.failed + "회",
      totalPaidAmount: paymentStats.totalPaidAmount,
      progressRate,
      enrollmentCount: bundle.enrollments.length,
      certificateIssued: hasIssuedDocumentRecord(bundle.certificates, bundle.enrollments),
      issueCount: bundle.issues.length,
      tags: tags.join(", "),
      admin: isAdminEmail(user.email),
    };
  }).filter((row: AnyRecord) => textIncludes(row, ["userId", "userName", "email", "phoneNumber", "phoneLast4", "courseTitle", "educationCategory", "courseLevel", "paymentId", "orderId", "productTitle", "tags"], ctx.search)).filter((row: AnyRecord) => filterUserCrm(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.signupAt)?.getTime() || getSignupDateTime(b)) - (toDate(a.signupAt)?.getTime() || getSignupDateTime(a)) || (toDate(b.latestActivityAt)?.getTime() || 0) - (toDate(a.latestActivityAt)?.getTime() || 0));
  const pager = usePagination(sorted, 50);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 회원", "교육: 음주운전", "교육: 성범죄", "교육: 폭력범죄", "교육: 마약", "교육: 도박", "교육: 사기", "교육: 스토킹", "과정: 기본 수료과정", "과정: 심화이수과정", "과정: 심리상담 종합과정", "결제: 결제완료", "결제: 결제실패", "결제: 결제시도", "결제: 미결제", "결제: 취소/환불", "수강권: 정상", "수강권: 수강권 없음", "수강권: 상품 불일치", "기간: 오늘", "기간: 최근 7일", "기간: 최근 30일", "신규 가입", "데이터확인필요"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-users-crm.csv", sorted.map((row: AnyRecord) => ({ id: row.id, 이름: row.userName, 생년월일: row.birthDateText, 연락처: row.phoneNumber || "정보 없음", 이메일: row.email || "정보 없음", 회원가입일시: formatDate(row.signupAt || getSignupDateValue(row) || row.createdAt), 최종결제현황: row.paymentState, 최종결제일시: formatDate(row.latestPaymentAttemptAt), 결제상품: row.productTitle, 결제금액: row.paymentAmount ? formatKrw(row.paymentAmount) : "-", 결제완료일시: formatDate(row.paymentCompletedAt), 현재보유수강권: row.enrollmentProductTitle, 수강권정상여부: row.entitlementNormalState, 구매과정: row.courseLevel, 교육종류: row.educationCategory })))} /><DataTable rows={pager.paged} columns={[{ key: "userId", label: "회원 ID" }, { key: "userName", label: "이름", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">{r.userName}</button> }, { key: "birthDateText", label: "생년월일", render: (r) => verifiedValue(r.birthDateText, "정보 없음") }, { key: "phoneNumber", label: "연락처", render: (r) => verifiedValue(r.phoneNumber, "정보 없음") }, { key: "email", label: "이메일", render: (r) => verifiedValue(r.email, "정보 없음") }, { key: "signupAt", label: "가입일시", render: (r) => formatDate(r.signupAt || getSignupDateValue(r) || r.createdAt) }, { key: "paymentState", label: "최종 결제현황", render: (r) => <StatusBadge label={r.paymentState} /> }, { key: "latestPaymentAttemptAt", label: "최종 결제일시", render: (r) => formatDate(r.latestPaymentAttemptAt) }, { key: "productTitle", label: "결제 상품" }, { key: "paymentAmount", label: "결제금액", align: "right", render: (r) => r.paymentAmount ? formatKrw(r.paymentAmount) : "-" }, { key: "paymentCompletedAt", label: "결제 완료시간", render: (r) => formatDate(r.paymentCompletedAt) }, { key: "enrollmentProductTitle", label: "현재 보유 수강권" }, { key: "entitlementNormalState", label: "수강권 정상 여부", render: (r) => <StatusBadge label={r.entitlementNormalState} /> }, { key: "courseLevel", label: "구매 과정" }, { key: "educationCategory", label: "교육 종류" }, { key: "detail", label: "상세보기", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="rounded-full bg-[#173968] px-3 py-1.5 text-xs font-bold text-white">상세보기</button> }]} /><Pagination {...pager} />{selected ? <UserDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function filterUserCrm(row: AnyRecord, filter: string) {
  if (filter === "신규 가입") return inLastDays(getSignupDateValue(row) || row.createdAt, 7);
  if (filter.startsWith("교육: ")) return row.educationCategory === filter.replace("교육: ", "");
  if (filter.startsWith("과정: ")) return row.courseLevel === filter.replace("과정: ", "");
  if (filter === "결제: 결제완료") return row.paymentState === "결제완료";
  if (filter === "결제: 결제실패") return row.paymentState === "결제실패";
  if (filter === "결제: 결제시도") return row.paymentState === "결제시도" || row.paymentState === "입금대기";
  if (filter === "결제: 미결제") return row.paymentState === "미결제";
  if (filter.startsWith("수강권: ")) return row.entitlementNormalState === filter.replace("수강권: ", "");
  if (filter === "결제: 취소/환불") return ["결제취소", "환불완료", "환불요청/완료"].includes(row.paymentState) || row.refundState !== "해당없음";
  if (filter === "기간: 오늘") return isToday(row.latestPaymentAttemptAt || getSignupDateValue(row) || row.createdAt);
  if (filter === "기간: 최근 7일") return inLastDays(row.latestPaymentAttemptAt || getSignupDateValue(row) || row.createdAt, 7);
  if (filter === "기간: 최근 30일") return inLastDays(row.latestPaymentAttemptAt || getSignupDateValue(row) || row.createdAt, 30);
  if (filter === "이메일 미인증") return row.memberStatus === "이메일 미인증";
  if (filter === "결제 대기") return row.paymentState === "결제대기" || row.paymentState === "결제시도" || row.paymentState === "입금대기";
  if (filter === "결제 완료") return row.paymentState === "결제완료";
  if (filter === "수강 중") return row.learningState === "수강중";
  if (filter === "진도 정체") return row.learningState === "진도정체";
  if (filter === "수료 대기") return row.completionState === "수료조건충족";
  if (filter === "문서 발급 대기") return row.documentState === "발급대기";
  if (filter === "환불 회원") return row.refundState !== "해당없음";
  if (filter === "탈퇴·휴면 회원") return ["탈퇴", "휴면"].includes(row.memberStatus);
  if (filter === "데이터확인필요") return row.issueCount > 0;
  return true;
}

function AdminDocumentLinks({ uid, certificateId, courseId }: { uid: string; certificateId?: string; courseId?: string }) {
  const documents = courseId ? getPreventionDocumentsForCourse(courseId) : preventionDocuments;
  const documentLinks = documents.map((document) => <Link key={document.id} href={`/prevention-documents?type=${document.id}&courseId=${encodeURIComponent(courseId || "")}&adminUserId=${encodeURIComponent(uid)}`} className="font-semibold text-[#173968] underline">{document.title}</Link>);
  return <div className="flex flex-wrap gap-x-3 gap-y-2">{certificateId ? <Link href={`/certificate?certificateId=${encodeURIComponent(certificateId)}`} className="font-semibold text-[#173968] underline">수료증</Link> : <span className="text-slate-500">수료증 발급 전</span>}{documentLinks}</div>;
}

function CrmMiniTable({ title, rows, columns, emptyText = "기록 없음" }: { title: string; rows: AnyRecord[]; columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => React.ReactNode }>; emptyText?: string }) {
  return <section className="rounded-[1.25rem] border border-[#d7deea] bg-white p-4"><h4 className="text-lg font-bold text-slate-950">{title}</h4><div className="mt-3"><DataTable rows={rows} columns={columns} emptyText={emptyText} /></div></section>;
}

function UserDetail({ selected, ctx }: any) {
  const [activeTab, setActiveTab] = useState("basic");
  const bundle = getUserCrmBundle(selected, ctx.data);
  const timeline = buildMemberTimeline(selected, bundle);
  const progressRate = Math.max(0, ...bundle.enrollments.map((row: AnyRecord) => Number(row.progress || 0)), ...bundle.progressRows.map((row: AnyRecord) => Number(row.completionRate || 0)));
  const tabs = [
    ["basic", "기본정보"], ["payments", "결제내역"], ["entitlements", "수강권"], ["progress", "수강진도"], ["submissions", "제출자료"], ["documents", "발급문서"], ["support", "문의·고객응대"], ["memo", "관리자 메모"], ["timeline", "활동 타임라인"], ["privacy", "개인정보 처리이력"],
  ];
  return <section className="mt-5 space-y-4 rounded-[1.5rem] border border-[#d7deea] bg-[#f8fafc] p-4">
    <div className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#274690]">UID 기준 통합 회원 상세</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{selected.userName}</h3><p className="mt-2 text-sm leading-6 text-slate-600">확인 가능한 운영 데이터만 표시합니다. 기록이 없거나 충돌하는 항목은 자동 보정하지 않고 관리자 확인 대상으로 남깁니다.</p></div>
        {bundle.issues.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">관리자 확인 필요: {bundle.issues.join(", ")}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-950">탐지된 불일치 없음</div>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[ ["회원번호", verifiedValue(selected.memberNo || selected.memberNumber)], ["UID", selected.id], ["이메일", verifiedValue(selected.email, "정보 없음")], ["휴대전화", verifiedValue(selected.phoneNumber, "정보 없음")], ["생년월일", selected.birthDateText || "정보 없음"], ["가입일", formatDate(selected.createdAt)], ["가입 방식", selected.signupMethod || getSignupMethod(selected)], ["최근 로그인", formatDate(selected.lastLoginAt)], ["회원상태", getMemberStatus(selected)], ["교육 종류", bundle.educationCategory], ["현재 과정", normalizeCourseDisplayText(bundle.courseTitle)], ["과정", bundle.courseLevel], ["결제상태", getPaymentState(bundle.payments)], ["결제성공여부", getPaymentSuccessState(bundle.payments)], ["수강권상태", getEntitlementState(bundle.enrollments)], ["전체 진도율", progressRate + "%"], ["수료상태", getCompletionState(bundle.enrollments, bundle.certificates)], ["실제 수료일자", formatAdminDateLabel(bundle.officialCompletionAt)], ["수료증 최초 발급일자", formatAdminDateLabel(bundle.certificateFirstIssuedAt, "미발급")], ["서류발급여부", getDocumentIssueState(bundle.certificates, bundle.enrollments)], ["서류출력여부", bundle.documentOutputLogs.length ? getDocumentOutputState(bundle.documentOutputLogs) : "기록 없음"], ["담당 관리자", verifiedValue(selected.managerEmail || selected.managerName, "관리자 확인 필요")], ["태그", typeof selected.tags === "string" ? selected.tags : selected.tags?.length ? selected.tags.join(", ") : "기록 없음"] ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e5ebf3] bg-[#f8fafc] p-3"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p></div>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === id ? "bg-[#173968] text-white" : "border border-[#d7deea] bg-white text-slate-700"}`}>{label}</button>)}</div>
    {activeTab === "basic" ? <DetailPanel title="회원 기본정보" rows={[["회원 ID", selected.id], ["이름", selected.userName], ["이메일", verifiedValue(selected.email, "정보 없음")], ["연락처", verifiedValue(selected.phoneNumber, "정보 없음")], ["생년월일", selected.birthDateText || "정보 없음"], ["회원가입일시", formatDate(selected.createdAt)], ["가입 방식", selected.signupMethod || getSignupMethod(selected)], ["최근 로그인", formatDate(selected.lastLoginAt)], ["이메일 인증 여부", selected.emailVerified === true || selected.emailVerifiedAt ? "인증" : selected.emailVerified === false ? "미인증" : "확인되지 않음"], ["회원상태", getMemberStatus(selected)]]} /> : null}
    {activeTab === "payments" ? <div className="space-y-4"><CrmMiniTable title="결제 이력 타임라인" rows={timeline.filter((item) => String(item.label).includes("결제") || String(item.label).includes("Webhook")).map((item) => ({ ...item, id: item.id }))} columns={[{ key: "at", label: "일시", render: (r) => formatDate(r.at) }, { key: "label", label: "구분", render: (r) => <StatusBadge label={r.label} /> }, { key: "detail", label: "내용" }]} emptyText="결제 시도/실패/성공 기록 없음" /><CrmMiniTable title="결제 원본 기록" rows={bundle.payments} columns={[{ key: "recordSource", label: "원본" }, { key: "orderId", label: "주문번호", render: (r) => verifiedValue(r.orderId) }, { key: "paymentId", label: "paymentId", render: (r) => verifiedValue(r.paymentId || r.paymentKey) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "category", label: "교육 종류", render: (r) => getEducationCategoryText(r) }, { key: "planId", label: "과정", render: (r) => getCourseLevelText(r) }, { key: "amount", label: "결제금액", render: (r) => formatKrw(Number(r.amount || r.paidAmount || 0)) }, { key: "method", label: "결제수단", render: (r) => verifiedValue(r.method || r.payMethod || r.paymentMethod, "정보 없음") }, { key: "status", label: "결제상태", render: (r) => <StatusBadge label={getPaymentStatusText(r)} /> }, { key: "createdAt", label: "시도일", render: (r) => formatDate(r.attemptedAt || r.createdAt || r.orderedAt) }, { key: "approvedAt", label: "완료/실패일", render: (r) => formatDate(r.approvedAt || r.paidAt || r.failedAt || r.updatedAt) }]} /></div> : null}
    {activeTab === "entitlements" ? <CrmMiniTable title="수강권" rows={bundle.enrollments} columns={[{ key: "id", label: "entitlementId" }, { key: "courseTitle", label: "과정명", render: (r) => getEnrollmentCourseDisplayTitle(r) }, { key: "courseId", label: "canonicalCourseId", render: (r) => verifiedValue(r.canonicalCourseId || r.courseId) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "planId", label: "planId", render: (r) => getCourseLevelText(r) }, { key: "createdAt", label: "부여일", render: (r) => formatDate(r.grantedAt || r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "종료일", render: (r) => formatDate(r.expiresAt) }, { key: "accessStatus", label: "활성 여부", render: (r) => isActiveEnrollment(r) ? "활성" : (r.accessStatus || r.status || "확인되지 않음") }, { key: "grantReason", label: "부여 사유", render: (r) => verifiedValue(r.grantReason || r.reason, "원본 데이터 누락") }]} /> : null}
    {activeTab === "progress" ? <CrmMiniTable title="수강진도" rows={bundle.progressRows} columns={[{ key: "courseId", label: "과정" }, { key: "completionRate", label: "전체 진도율", render: (r) => Number(r.completionRate || 0) + "%" }, { key: "completedModuleCount", label: "완료 강의" }, { key: "lastPosition", label: "최근 재생 위치", render: (r) => verifiedValue(r.lastPosition || r.lastPlaybackPosition) }, { key: "updatedAt", label: "최근 수강일", render: (r) => formatDate(r.updatedAt || r.lastWatchedAt) }]} /> : null}
    {activeTab === "submissions" ? <section className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5"><h4 className="text-lg font-bold">제출자료</h4><p className="mt-2 text-sm font-semibold text-slate-700">기록 없음</p><p className="mt-1 text-sm leading-6 text-slate-500">현재 연결된 운영 컬렉션에서 제출자료 원본을 확인할 수 없습니다. 확인되지 않은 자료를 임의 생성하거나 완료 처리하지 않습니다.</p></section> : null}
    {activeTab === "documents" ? <><CrmMiniTable title="문서별 실제 발급상태" rows={getAvailableDocumentIssueRows(bundle)} columns={[{ key: "documentName", label: "문서명" }, { key: "status", label: "발급상태", render: (r) => <StatusBadge label={r.status} /> }, { key: "firstIssuedAt", label: "최초 발급일", render: (r) => formatAdminDateLabel(r.firstIssuedAt, "-") }, { key: "lastIssuedAt", label: "최근 발급일", render: (r) => formatAdminDateLabel(r.lastIssuedAt, "-") }, { key: "issueCount", label: "발급횟수", render: (r) => r.issueCount ? `${r.issueCount}회` : "-" }]} emptyText="이 회원의 활성 수강권에서 확인되는 발급 가능 문서가 없습니다." /><div className="mt-4"><CrmMiniTable title="수료증/이수증 생성 기록" rows={bundle.certificates} columns={[{ key: "certificateNo", label: "발급번호", render: (r) => verifiedValue(r.certificateNo || r.issueNumber) }, { key: "documentType", label: "문서종류", render: (r) => getAdminCertificateDocumentType(r.courseId, r.documentType) }, { key: "courseId", label: "과정명", render: (r) => verifiedValue(r.courseTitle || r.courseId) }, { key: "issuedAt", label: "생성일", render: (r) => formatAdminDateLabel(getCertificateFirstIssuedAt(r), "미생성") }, { key: "view", label: "문서", render: (r) => <Link href={getCertificateViewHref(r.id)} className="font-semibold text-[#173968] underline">보기/인쇄</Link> }]} /></div></> : null}
    {activeTab === "support" ? <section className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5"><h4 className="text-lg font-bold">문의·고객응대</h4><p className="mt-2 text-sm font-semibold text-slate-700">기록 없음</p><p className="mt-1 text-sm leading-6 text-slate-500">현재 관리자 화면에 연결된 고객문의 원본 컬렉션이 없습니다. 이번 운영 범위 밖의 기능은 추가하지 않았습니다.</p></section> : null}
    {activeTab === "memo" ? <DetailPanel title="관리자 메모" memoTarget="users" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("users", selected.id, ctx.memo)} rows={[["구분", "내부 운영메모"], ["주의", "관리자 메모는 사실확인 자료가 아니라 내부 업무기록입니다."], ["현재 메모", ctx.memo || "기록 없음"]]} /> : null}
    {activeTab === "timeline" ? <CrmMiniTable title="활동 타임라인" rows={timeline.map((item) => ({ ...item, id: item.id }))} columns={[{ key: "at", label: "일시", render: (r) => formatDate(r.at) }, { key: "label", label: "활동" }, { key: "detail", label: "확인된 원본" }]} /> : null}
    {activeTab === "privacy" ? <CrmMiniTable title="개인정보 처리이력" rows={bundle.logs.filter((row: AnyRecord) => String(row.action || "").includes("privacy") || String(row.action || "").includes("profile") || String(row.action || "").includes("download"))} columns={[{ key: "createdAt", label: "일시", render: (r) => formatDate(r.createdAt) }, { key: "adminEmail", label: "처리 관리자", render: (r) => verifiedValue(r.adminEmail) }, { key: "action", label: "처리 종류" }, { key: "description", label: "내용", render: (r) => verifiedValue(r.description) }]} /> : null}
  </section>;
}

function PaymentsView(ctx: any) {
  const rows: AnyRecord[] = getAllPaymentRecords(ctx.data).map((p: AnyRecord) => {
    const user = ctx.maps.userById.get(getUid(p));
    const enrollment = getEnrollmentForPayment(ctx.data.enrollments, p);
    const certificate = getDirectPaymentCertificate(ctx.data.certificates, p);
    const activeEnrollment = enrollment && isActiveEnrollment(enrollment);
    const paymentEnrollmentMismatch = (Boolean(enrollment) && !isPaidRecord(p)) || (isPaidRecord(p) && !activeEnrollment);
    return { ...p, userName: getUserName(user), email: p.customerEmail || user?.email || "", educationCategory: getEducationCategoryText(p), courseLevelText: getCourseLevelText(p), paymentStatusText: getPaymentStatusText(p), counselingContactRequired: isCounselingRecord(p), enrollmentGranted: Boolean(activeEnrollment), certificateIssued: Boolean(certificate?.certificateNo || (activeEnrollment && enrollment?.certificateIssued)), paymentEnrollmentMismatch };
  }).filter((row: AnyRecord) => textIncludes(row, ["id", "uid", "userId", "orderId", "paymentId", "paymentKey", "userName", "email", "customerEmail", "courseTitle", "productTitle", "productId"], ctx.search)).filter((row: AnyRecord) => filterPayment(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(getPaymentTime(b))?.getTime() || 0) - (toDate(getPaymentTime(a))?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><PaymentResyncPanel onRefresh={ctx.refresh} /><ManualEnrollmentGrantPanel users={ctx.data.users} onRefresh={ctx.refresh} /><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 결제", "결제 성공", "결제 실패", "입금대기", "결제 취소", "환불 요청", "환불 완료", "결제 검증 오류", "결제·수강권 불일치", "오늘 결제", "이번 달 결제"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-payments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "recordSource", label: "원본" }, { key: "orderId", label: "주문번호" }, { key: "paymentId", label: "결제번호" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명", render: (r) => normalizeCourseDisplayText(r.courseTitle || r.productTitle || r.orderName || "-") }, { key: "educationCategory", label: "교육 종류" }, { key: "courseLevelText", label: "과정구분", render: (r) => r.courseLevelText || getCourseLevelText(r) }, { key: "amount", label: "결제금액", align: "right", render: (r) => formatKrw(Number(r.amount || r.paidAmount || 0)) }, { key: "method", label: "결제수단", render: (r) => verifiedValue(r.method || r.payMethod || r.paymentMethod, "정보 없음") }, { key: "paymentStatusText", label: "상태", render: (r) => <StatusBadge label={r.paymentStatusText || getPaymentStatusText(r)} /> }, { key: "createdAt", label: "시도일시", render: (r) => formatDate(r.attemptedAt || r.createdAt || r.orderedAt) }, { key: "approvedAt", label: "완료/실패일시", render: (r) => formatDate(r.approvedAt || r.paidAt || r.failedAt || r.updatedAt) }, { key: "enrollmentGranted", label: "수강권", render: (r) => r.enrollmentGranted ? (r.paymentEnrollmentMismatch ? "확인필요" : "부여") : "없음" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? (r.paymentEnrollmentMismatch ? "확인필요" : "발급") : "미발급" }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <PaymentDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function filterPayment(row: AnyRecord, filter: string) { const status = String(row.paymentStatus || row.status || "").toLowerCase(); if (filter === "결제 성공") return isPaidRecord(row); if (filter === "결제 실패") return isFailedPayment(row); if (filter === "입금대기") return getPaymentStatusText(row) === "입금대기"; if (filter === "결제 취소") return status === "canceled" || status === "cancelled"; if (filter === "환불 요청") return Boolean(row.refundRequestedAt) || String(row.refundStatus || "").includes("request"); if (filter === "환불 완료") return status === "refunded" || String(row.refundStatus || "").includes("complete"); if (filter === "결제 검증 오류") return Boolean(row.verificationError || row.errorCode || row.errorMessage || row.failureCode || row.failureMessage); if (filter === "결제·수강권 불일치") return row.paymentEnrollmentMismatch || (isPaidRecord(row) && !row.enrollmentGranted); if (filter === "오늘 결제") return isToday(getPaymentTime(row)); if (filter === "이번 달 결제") return isThisMonth(getPaymentTime(row)); return true; }
function PaymentResyncPanel({ onRefresh }: { onRefresh: () => void }) {
  const [paymentId, setPaymentId] = useState("");
  const [uid, setUid] = useState("");
  const [productId, setProductId] = useState(defaultAdminGrantProduct?.id || "dui-cbt-basic");
  const [amount, setAmount] = useState(String(defaultAdminGrantProduct?.price || 49000));
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleResync = async () => {
    setStatus("");
    if (!paymentId.trim() || !uid.trim()) {
      setStatus("결제번호와 사용자 ID를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      if (!baseUrl) throw new Error("결제 확인 Worker URL이 설정되지 않았습니다.");
      const selectedProduct = getAdminGrantProduct(productId);
      const response = await fetch(baseUrl + "/api/admin/payments/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ paymentId: paymentId.trim(), uid: uid.trim(), productId, courseId: selectedProduct?.courseId, categoryId: selectedProduct?.categoryId, amount: Number(amount) || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "결제 재조회에 실패했습니다.");
      setStatus("결제 재조회 및 수강권 반영이 완료되었습니다.");
      onRefresh();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "결제 재조회 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="mb-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">결제 상태 재조회 / 수강권 수동지급</p><p className="mt-1 text-xs leading-5">카드 승인 후 수강권 반영이 누락된 경우 포트원 결제번호와 사용자 ID로 재조회합니다. 이미 지급된 거래는 중복 지급되지 않습니다.</p><div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_220px_130px_auto]"><input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="paymentId / 주문번호" className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-500" /><input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="사용자 ID(uid)" className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-500" /><select value={productId} onChange={(e) => { setProductId(e.target.value); setAmount(getAdminGrantProductAmount(e.target.value)); }} className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-500">{renderAdminGrantProductOptions()}</select><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-500" /><button type="button" onClick={handleResync} disabled={submitting} className="rounded-xl bg-[#173968] px-4 py-2 font-bold text-white disabled:bg-gray-300">{submitting ? "처리 중" : "재조회"}</button></div>{status ? <p className="mt-3 font-semibold">{status}</p> : null}</section>;
}

function ManualEnrollmentGrantPanel({ users = [], onRefresh }: { users?: AnyRecord[]; onRefresh: () => void }) {
  const [uid, setUid] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [categoryId, setCategoryId] = useState(defaultAdminGrantProduct?.categoryId || "dui");
  const [productId, setProductId] = useState(defaultAdminGrantProduct?.id || "dui-cbt-basic");
  const [amount, setAmount] = useState(String(defaultAdminGrantProduct?.price || 49000));
  const [note, setNote] = useState("카드 승인 후 수강권 반영 지연으로 인한 관리자 수동 지급");
  const [duplicateResolution, setDuplicateResolution] = useState("keep");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 90); return date.toISOString().slice(0, 10); });
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedProduct = getAdminGrantProduct(productId);
  const selectedMember = users.find((user) => getGrantTargetUid(user) === uid || user.id === uid || user.email === uid);
  const isAdvancedGrant = productId === "dui-cbt-advanced" || productId.endsWith("-advanced") || productId.endsWith("-premium") || isCounselingProductId(productId);
  const isCounselingGrant = isCounselingProductId(productId);

  const selectProduct = (nextProductId: string) => {
    const nextProduct = getAdminGrantProduct(nextProductId);
    setProductId(nextProduct.id);
    setCategoryId(nextProduct.categoryId);
    setAmount(getAdminGrantProductAmount(nextProduct.id));
  };

  const selectCategory = (nextCategoryId: string) => {
    const nextProductId = getDefaultAdminGrantProductIdForCategory(nextCategoryId);
    setCategoryId(nextCategoryId);
    setProductId(nextProductId);
    setAmount(getAdminGrantProductAmount(nextProductId));
  };

  const handleGrant = async () => {
    setStatus("");
    if (!uid.trim()) {
      setStatus("사용자 ID(uid)를 입력해 주세요.");
      return;
    }
    if (!selectedProduct || selectedProduct.categoryId !== categoryId || selectedProduct.id !== productId) {
      setStatus("교육 종류와 상품 선택값이 일치하지 않습니다. 다시 선택해 주세요.");
      return;
    }
    const confirmText = [
      "수강권을 직접 부여하시겠습니까?",
      "회원명: " + getUserName(selectedMember),
      "생년월일: " + getBirthDate(selectedMember),
      "이메일: " + (selectedMember?.email || "미입력"),
      "교육종류: " + selectedProduct.categoryTitle,
      "상품: " + selectedProduct.title,
      "categoryId: " + selectedProduct.categoryId,
      "productId: " + selectedProduct.id,
      "courseId: " + selectedProduct.courseId,
      "지급 결과: " + (isCounselingGrant ? "심리상담 종합과정 / 상담 연락 필요" : isAdvancedGrant ? "기본 수료과정 + 심화이수과정" : "기본 수료과정만"),
      "수강 시작일: " + startsAt,
      "수강 종료일: " + expiresAt,
    ].join("\n");
    if (!window.confirm(confirmText)) return;
    setSubmitting(true);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      if (!baseUrl) throw new Error("결제 확인 Worker URL이 설정되지 않았습니다.");
      const response = await fetch(baseUrl + "/api/admin/enrollments/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid: uid.trim(), userEmail: selectedMember?.email || undefined, email: selectedMember?.email || undefined, productId: selectedProduct.id, courseId: selectedProduct.courseId, categoryId: selectedProduct.categoryId, amount: Number(amount) || undefined, note: note.trim() || undefined, adminMemo: note.trim() || undefined, duplicateResolution, startsAt, expiresAt, active }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수강권 수동 지급에 실패했습니다.");
      const savedProductId = payload?.productId || payload?.enrollment?.productId || selectedProduct.id;
      const savedCourseId = payload?.courseId || payload?.enrollment?.courseId || selectedProduct.courseId;
      const savedCourseTitle = payload?.enrollment?.courseTitle || selectedProduct.categoryTitle;
      setStatus((payload?.message || "수강권이 수동 지급되었습니다.") + (payload?.enrollmentId ? " (" + payload.enrollmentId + ")" : "") + (payload?.uid ? " / UID " + payload.uid : "") + " / 저장: " + savedCourseTitle + " / productId " + savedProductId + " / courseId " + savedCourseId);
      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수강권 수동 지급 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="mb-4 rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-bold">수강권 직접 부여</p><p className="mt-1 text-xs leading-5">회원과 교육 종류, 상품 등급, 수강기간을 확인한 뒤 관리자 권한으로 수강권을 직접 지급합니다.</p><p className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-blue-950">현재 선택: {selectedProduct?.categoryTitle} - {selectedProduct?.title} / categoryId {selectedProduct?.categoryId} / productId {selectedProduct?.id} / courseId {selectedProduct?.courseId} / 지급 결과: {isCounselingGrant ? "심리상담 종합과정 / 상담 연락 필요" : isAdvancedGrant ? "기본 수료과정 + 심화이수과정" : "기본 수료과정만"}</p><div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_210px_210px_120px_150px_150px_140px_auto]"><input value={memberSearch} onChange={(e) => { const value = e.target.value; setMemberSearch(value); const found = users.find((user) => [user.id, user.uid, user.userId, user.email, getUserName(user)].some((item) => String(item || "").includes(value))); if (found) setUid(getGrantTargetUid(found)); }} placeholder="회원 검색(이름/이메일/UID)" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="사용자 ID(uid)" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><select value={categoryId} onChange={(e) => selectCategory(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500">{renderAdminGrantCategoryOptions()}</select><select value={productId} onChange={(e) => selectProduct(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500">{renderAdminGrantProductOptions(categoryId)}</select><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><select value={active ? "active" : "pending"} onChange={(e) => setActive(e.target.value === "active")} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500"><option value="active">활성</option><option value="pending">비활성</option></select><button type="button" onClick={handleGrant} disabled={submitting} className="rounded-xl bg-[#173968] px-4 py-2 font-bold text-white disabled:bg-gray-300">{submitting ? "처리 중" : "확인 후 지급"}</button></div><div className="mt-2 grid gap-2 md:grid-cols-[170px_1fr]"><select value={duplicateResolution} onChange={(e) => setDuplicateResolution(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500"><option value="keep">중복 시 유지</option><option value="extend">중복 시 연장</option></select><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="지급 사유 또는 관리자 메모" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /></div>{selectedMember ? <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold">선택 회원: {getUserName(selectedMember)} / {getBirthDate(selectedMember)} / {selectedMember.email || "이메일 미입력"} / 지급 UID: {getGrantTargetUid(selectedMember)}</p> : null}{status ? <p className="mt-3 font-semibold">{status}</p> : null}</section>;
}

function PaymentDetail({ selected, ctx }: any) { const enrollment = getEnrollmentForPayment(ctx.data.enrollments, selected); const certificate = getDirectPaymentCertificate(ctx.data.certificates, selected); const sameUserCourseCertificate = ctx.maps.certificateByUserCourse.get(`${selected.uid || selected.userId}_${selected.courseId}`); const certificateDisplay = certificate ? <Link href={`/certificate?certificateId=${encodeURIComponent(certificate.id)}`} className="text-[#173968] underline">{certificate.certificateNo || "보기"}</Link> : sameUserCourseCertificate ? "동일 사용자/과정 기존 수료증(현재 결제 직접 연결 아님)" : "미발급"; const refund = getRefundInfo({ payment: selected, enrollment, certificate }); return <DetailPanel title="결제 상세" memoTarget="payments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("payments", selected.id, ctx.memo)} rows={[["주문번호", selected.orderId], ["결제번호", selected.paymentId || selected.paymentKey || "-"], ["PG 원본 응답", <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selected.rawResponse || {}, null, 2)}</pre>], ["연결 수강권", enrollment?.id ? (isPaidRecord(selected) ? enrollment.id : `${enrollment.id} / 결제상태 확인필요`) : "수강권 없음"], ["연결 수료증", certificateDisplay], ["예상 환불", `${formatKrw(refund.refundAmount)} / ${refund.reason}`]]} />; }

function EnrollmentsView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(getUid(e)); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, progress, certificate, payment: ctx.maps.paymentByOrder.get(e.orderId || e.paymentId) }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", courseTitleText: getEnrollmentCourseDisplayTitle(e), courseLevelText: getCourseLevelText(e), progressRate: getProgressRate(e, progress), completedLessons: getCompletedLessons(e, progress), leftDays: left, expired: left !== null && left < 0, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), refundAmount: refund.refundAmount, refundable: refund.refundable, refundReason: refund.reason }; }).filter((row: AnyRecord) => textIncludes(row, ["id", "uid", "userId", "orderId", "paymentId", "userName", "email", "courseTitle", "courseTitleText", "productId", "courseId"], ctx.search)).filter((row: AnyRecord) => filterEnrollment(row, ctx.filter));
  const sorted = sortEnrollmentsForAdminDisplay(rows); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><ManualEnrollmentGrantPanel users={ctx.data.users} onRefresh={ctx.refresh} /><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 수강권", "활성 수강권", "만료 예정", "수동 부여", "수강권 복구", "결제 없는 수강권", "결제 후 미발급 수강권", "수료증 발급 완료", "수료증 미발급", "환불 가능", "환불 불가"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-enrollments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "id", label: "수강권 ID" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "과정명", render: (r) => normalizeCourseDisplayText(r.courseTitleText || getEnrollmentCourseDisplayTitle(r)) }, { key: "courseLevel", label: "과정등급", render: (r) => r.courseLevelText || getCourseLevelText(r) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "courseId", label: "courseId", render: (r) => verifiedValue(r.courseId) }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "createdAt", label: "시작일", render: (r) => formatDate(r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "leftDays", label: "남은 수강일", render: (r) => r.leftDays === null ? "-" : `${r.leftDays}일` }, { key: "accessStatus", label: "상태" }, { key: "progressRate", label: "진행률", render: (r) => `${r.progressRate}%` }, { key: "completedLessons", label: "완료/전체", render: (r) => `${r.completedLessons}/${r.totalLessons || 5}` }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "refundAmount", label: "환불예상", align: "right", render: (r) => formatKrw(r.refundAmount) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <EnrollmentDetail selected={selected} ctx={ctx} /> : null}</section>;
}
function filterEnrollment(row: AnyRecord, filter: string) { if (filter === "활성 수강권") return isActiveEnrollment(row) && !row.expired; if (filter === "만료 예정") return row.leftDays !== null && row.leftDays >= 0 && row.leftDays <= 14; if (filter === "수동 부여") return isManualEnrollment(row); if (filter === "수강권 복구") return row.grantReason === "RESTORE" || row.restoredAt; if (filter === "결제 없는 수강권") return isActiveEnrollment(row) && !(row.orderId || row.paymentId); if (filter === "결제 후 미발급 수강권") return false; if (filter === "수료증 발급 완료") return row.certificateIssued; if (filter === "수료증 미발급") return !row.certificateIssued; if (filter === "환불 가능") return row.refundable; if (filter === "환불 불가") return !row.refundable; return true; }
function isRevocableEnrollment(row?: AnyRecord | null) { if (!row) return false; const status = String(row.accessStatus || row.enrollmentStatus || row.status || "").toLowerCase(); const paymentStatus = String(row.paymentStatus || row.paymentState || "").toLowerCase(); const blocked = ["cancelled", "canceled", "revoked", "refunded", "deleted"]; if (blocked.includes(status) || blocked.includes(paymentStatus) || row.deletedAt || row.isDeleted === true) return false; return Boolean(row.courseId && (row.uid || row.userId) && (isActiveEnrollment(row) || isManualEnrollment(row) || row.adminGranted || row.manualGrant)); }
function filterRevocationCandidate(row: AnyRecord, filter: string) { if (filter === "수동 부여") return isManualEnrollment(row); if (filter === "심화이수과정") return isAdvancedEnrollment(row); if (filter === "포함 기본 수료과정") return Boolean(row.includedWithProductId || row.includedWithEnrollmentId || row.includedWithOrderId); return true; }
function EnrollmentRevocationsView(ctx: any) {
  const [reason, setReason] = useState("잘못 부여된 수강권 회수");
  const [includeBase, setIncludeBase] = useState(true);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState("");
  const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(getUid(e)); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || e.email || e.userEmail || "", courseTitleText: getEnrollmentCourseDisplayTitle(e), courseLevelText: getCourseLevelText(e), leftDays: left, expired: left !== null && left < 0 }; }).filter(isRevocableEnrollment).filter((row: AnyRecord) => textIncludes(row, ["id", "uid", "userId", "orderId", "paymentId", "userName", "email", "courseTitle", "courseTitleText", "productId", "courseId"], ctx.search)).filter((row: AnyRecord) => filterRevocationCandidate(row, ctx.filter));
  const sorted = sortEnrollmentsForAdminDisplay(rows);
  const pager = usePagination(sorted);
  const revokeEnrollment = async (row: AnyRecord) => {
    setStatus("");
    const uid = String(row.uid || row.userId || "").trim();
    const courseId = String(row.courseId || "").trim();
    if (!uid || !courseId) { setStatus("회수할 수강권의 UID 또는 courseId가 없습니다."); return; }
    if (!reason.trim()) { setStatus("회수 사유를 입력해 주세요."); return; }
    const ok = window.confirm([
      "이 수강권을 회수하시겠습니까?",
      "회원: " + (row.userName || "-") + " / " + (row.email || "-"),
      "수강권 ID: " + (row.id || row.enrollmentId || "-"),
      "과정: " + (row.courseTitleText || row.courseTitle || "-"),
      "productId: " + (row.productId || "-"),
      "courseId: " + courseId,
      "포함 기본 수료과정 함께 회수: " + (includeBase ? "예" : "아니오"),
      "사유: " + reason.trim(),
      "",
      "기록은 삭제하지 않고 접근권만 취소 상태로 변경합니다."
    ].join("\n"));
    if (!ok) return;
    setSubmitting(row.id || row.enrollmentId || courseId);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      const response = await fetch(baseUrl + "/api/admin/enrollments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid, courseId, enrollmentId: row.enrollmentId || row.id, action: "revoke", reason: reason.trim(), revokeIncludedBase: includeBase }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수강권 회수에 실패했습니다.");
      setStatus((payload?.message || "수강권을 회수했습니다.") + (payload?.enrollmentId ? " / " + payload.enrollmentId : "") + (payload?.includedBaseEnrollmentId ? " / 포함 기본 수료과정 " + payload.includedBaseEnrollmentId + " 함께 회수" : ""));
      await Promise.resolve(ctx.refresh());
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수강권 회수 중 오류가 발생했습니다.");
    } finally {
      setSubmitting("");
    }
  };
  return <section><div className="mb-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"><p className="font-bold">잘못 부여된 수강권 회수</p><p className="mt-1 text-xs leading-5">수강권 기록은 삭제하지 않고 취소 상태로 변경합니다. 심화이수과정 회수 시 해당 심화이수과정에 포함되어 생성된 기본 수료과정 수강권도 함께 회수할 수 있습니다.</p><div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px]"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="회수 사유" className="min-h-11 rounded-xl border border-rose-200 bg-white px-3 outline-none focus:border-rose-500" /><label className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold"><input type="checkbox" checked={includeBase} onChange={(event) => setIncludeBase(event.target.checked)} />포함 기본 수료과정도 회수</label></div>{status ? <p className="mt-3 font-semibold">{status}</p> : null}</div><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 회수 가능", "수동 부여", "심화이수과정", "포함 기본 수료과정"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-enrollment-revocations.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "id", label: "수강권 ID" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "과정명", render: (r) => normalizeCourseDisplayText(r.courseTitleText || getEnrollmentCourseDisplayTitle(r)) }, { key: "courseLevel", label: "과정등급", render: (r) => r.courseLevelText || getCourseLevelText(r) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "courseId", label: "courseId", render: (r) => verifiedValue(r.courseId) }, { key: "includedWithProductId", label: "포함 출처", render: (r) => verifiedValue(r.includedWithProductId || r.includedWithEnrollmentId) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "revoke", label: "회수", render: (r) => <button type="button" onClick={() => void revokeEnrollment(r)} disabled={Boolean(submitting)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-800 disabled:bg-slate-100">{submitting === (r.id || r.enrollmentId || r.courseId) ? "회수 중" : "회수"}</button> }]} emptyText="회수 가능한 수강권이 없습니다." /><Pagination {...pager} /></section>;
}
function EnrollmentActionPanel({ selected, onRefresh }: { selected: AnyRecord; onRefresh: () => void }) {
  const [reason, setReason] = useState("운영 관리자 처리");
  const [extensionDays, setExtensionDays] = useState(30);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState("");
  const runAction = async (action: string) => {
    setStatus("");
    if (!reason.trim()) { setStatus("처리 사유를 입력해 주세요."); return; }
    if (!window.confirm("이 수강권에 관리자 작업을 적용하시겠습니까?")) return;
    setSubmitting(action);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      const response = await fetch(baseUrl + "/api/admin/enrollments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid: selected.uid || selected.userId, courseId: selected.courseId, enrollmentId: selected.enrollmentId || selected.id, action, reason: reason.trim(), extensionDays }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수강권 작업에 실패했습니다.");
      setStatus(payload?.message || "수강권 변경사항이 저장되었습니다.");
      onRefresh();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수강권 작업 중 오류가 발생했습니다.");
    } finally {
      setSubmitting("");
    }
  };
  return <section className="mt-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"><h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">수강권 작업</h3><div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px]"><label className="text-sm font-semibold text-slate-700">처리 사유<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7deea] px-3 text-base outline-none focus:border-[#173968]" /></label><label className="text-sm font-semibold text-slate-700">연장일<input type="number" min={1} value={extensionDays} onChange={(event) => setExtensionDays(Number(event.target.value) || 30)} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7deea] px-3 text-base outline-none focus:border-[#173968]" /></label></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><button type="button" onClick={() => void runAction("extend")} disabled={Boolean(submitting)} className="min-h-11 rounded-xl bg-[#173968] px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">{submitting === "extend" ? "처리 중" : "수강기간 연장"}</button><button type="button" onClick={() => void runAction("complete")} disabled={Boolean(submitting)} className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">{submitting === "complete" ? "처리 중" : "수료 처리"}</button><button type="button" onClick={() => void runAction("revoke")} disabled={Boolean(submitting)} className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-800 disabled:bg-slate-100">{submitting === "revoke" ? "처리 중" : "수강권 회수"}</button></div>{status ? <p className="mt-3 rounded-xl border border-[#d7deea] bg-[#f8fafc] p-3 text-sm font-semibold text-slate-800">{status}</p> : null}</section>;
}
function EnrollmentDetail({ selected, ctx }: any) {
  const uid = selected.uid || selected.userId;
  const progress = ctx.maps.progressByUserCourse.get(`${uid}_${selected.courseId}`);
  const certificate = ctx.maps.certificateByUserCourse.get(`${uid}_${selected.courseId}`);
  const outputLogs = ctx.data.documentOutputLogs.filter((row: AnyRecord) => row.uid === uid || row.userId === uid || row.targetUid === uid);
  const officialCompletionAt = getOfficialCompletionDateForAdmin(certificate, progress, selected);
  const certificateFirstIssuedAt = getCertificateFirstIssuedAt(certificate);
  const latestDocumentOutputAt = getLatestDocumentOutputAt(outputLogs, { certificateId: certificate?.id, courseId: selected.courseId });
  const courseModules = getAdminCourseModules(selected.courseId);
  const modules = courseModules.map((m, i) => `${i + 1}. ${m.title} ${progress?.moduleProgress?.[m.id]?.isCompleted ? "완료" : "미완료"}`).join(" / ");
  return <><DetailPanel title="수강권 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["사용자", `${selected.userName} / ${selected.email}`], ["결제", selected.orderId || selected.paymentId || "결제정보 없음"], ["교육과정", getEnrollmentCourseDisplayTitle(selected)], ["과정등급", getCourseLevelText(selected)], ["productId", selected.productId || "-"], ["courseId", selected.courseId || "-"], ["강의별 완료", modules], ["진행률", `${selected.progressRate}%`], ["실제 수료일자", formatAdminDateLabel(officialCompletionAt)], ["수료증 최초 발급일자", formatAdminDateLabel(certificateFirstIssuedAt, "미발급")], ["수강기간", `${formatDateOnly(selected.purchasedAt || selected.createdAt)} - ${formatDateOnly(selected.expiresAt)}`], ["만료 여부", selected.expired ? "만료" : "유효"], ["수료증", selected.certificateIssued ? selected.certificateNo || "발급" : "미발급"], ["출력 서류", <AdminDocumentLinks uid={uid} certificateId={certificate?.id} courseId={selected.courseId} />], ["환불", `${formatKrw(selected.refundAmount)} / ${selected.refundReason}`]]} /><EnrollmentActionPanel selected={selected} onRefresh={ctx.refresh} /></>;
}

function ManualCertificateIssuePanel({ onRefresh }: { onRefresh: () => void }) {
  const [uid, setUid] = useState("");
  const [courseId, setCourseId] = useState<string>(defaultAdminGrantProduct?.courseId || duiPreventionCourseProduct.courseId);
  const documentOptions = getAdminCertificateDocumentOptions(courseId);
  const [documentType, setDocumentType] = useState(documentOptions[0]?.type || "completion");
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [note, setNote] = useState("관리자 직접 수료증 발급");
  const [status, setStatus] = useState("");
  const [issued, setIssued] = useState<{ certificateId: string; certificateNo?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const nextOptions = getAdminCertificateDocumentOptions(courseId);
    if (!nextOptions.some((option) => option.type === documentType)) setDocumentType(nextOptions[0]?.type || "completion");
  }, [courseId, documentType]);

  const handleIssue = async () => {
    setStatus("");
    setIssued(null);
    if (!uid.trim()) {
      setStatus("사용자 ID(uid)를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      if (!baseUrl) throw new Error("관리자 API URL이 설정되지 않았습니다.");
      const response = await fetch(baseUrl + "/api/admin/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid: uid.trim(), courseId, documentType, userName: userName.trim() || undefined, birthDate: birthDate.trim() || undefined, note: note.trim() || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수료증 발급 및 저장에 실패했습니다.");
      setStatus(payload?.message || "수료증이 발급 및 저장되었습니다.");
      if (payload?.certificateId) setIssued({ certificateId: payload.certificateId, certificateNo: payload.certificateNo });
      onRefresh();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수료증 발급 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="mb-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">수료증 직접 발급 및 PDF 저장</p><p className="mt-1 text-xs leading-5">회원 UID와 과정을 선택해 모든 과정의 수료증, 이수증, 상세내역서를 관리자 권한으로 발급합니다. 발급 후 PDF 저장 버튼으로 파일을 내려받을 수 있습니다.</p><div className="mt-3 grid gap-2 md:grid-cols-[1fr_260px_220px_150px_150px_1.3fr_auto]"><input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="사용자 ID(uid)" className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600" /><select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600">{adminGrantProducts.map((product) => <option key={product.id} value={product.courseId}>{product.categoryTitle} - {product.title}</option>)}</select><select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600">{documentOptions.map((option) => <option key={option.type + option.courseId} value={option.type}>{option.title}</option>)}</select><input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="성명(선택)" className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600" /><input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="YYYY-MM-DD" className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600" /><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="발급 사유" className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-600" /><button type="button" onClick={handleIssue} disabled={submitting} className="rounded-xl border-2 border-emerald-900 bg-emerald-800 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-950 hover:text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{submitting ? "처리 중" : "발급 저장"}</button></div>{status ? <p className="mt-3 font-semibold">{status}</p> : null}{issued ? <div className="mt-3 flex flex-wrap gap-2"><Link href={getCertificateViewHref(issued.certificateId)} target="_blank" className="rounded-full border-2 border-emerald-900 bg-white px-4 py-2 text-xs font-bold text-emerald-950">보기/인쇄</Link><Link href={getCertificateViewHref(issued.certificateId, "pdf")} target="_blank" className="rounded-full border-2 border-emerald-900 bg-emerald-900 px-4 py-2 text-xs font-bold text-white">PDF 저장</Link></div> : null}</section>;
}

function CertificateDateEditPanel({ selected, onRefresh }: { selected: AnyRecord; onRefresh: () => void }) {
  const [displayDate, setDisplayDate] = useState(getDateInputValue(selected.displayDate || selected.completedAt || selected.issuedAt || selected.createdAt));
  const [reason, setReason] = useState("관리자 수료증 표시일자 정정");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    setDisplayDate(getDateInputValue(selected.displayDate || selected.completedAt || selected.issuedAt || selected.createdAt));
    setReason("관리자 수료증 표시일자 정정");
    setStatus("");
  }, [selected.id]);
  const handleUpdate = async () => {
    setStatus("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) { setStatus("표시일자는 YYYY-MM-DD 형식으로 입력해 주세요."); return; }
    if (!reason.trim()) { setStatus("변경 사유를 입력해 주세요."); return; }
    const ok = window.confirm(["수료증 표시일자를 변경하시겠습니까?", "발급번호: " + (selected.certificateNoText || selected.certificateNo || selected.issueNumber || selected.id), "변경일자: " + displayDate, "사유: " + reason.trim(), "", "결제·수강권 기록은 변경하지 않고 수료증 표시 날짜만 변경합니다."].join("\n"));
    if (!ok) return;
    setSubmitting(true);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      const response = await fetch(baseUrl + "/api/admin/certificates/update-date", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ certificateId: selected.id, displayDate, reason: reason.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수료증 표시일자 변경에 실패했습니다.");
      setStatus(payload?.message || "수료증 표시일자를 변경했습니다.");
      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수료증 표시일자 변경 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };
  return <section className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h3 className="text-lg font-black">수료증 표시일자 변경</h3><div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]"><input type="date" value={displayDate} onChange={(event) => setDisplayDate(event.target.value)} className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-600" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="변경 사유" className="min-h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-600" /><button type="button" onClick={handleUpdate} disabled={submitting} className="rounded-xl border-2 border-amber-900 bg-amber-800 px-4 py-2 font-bold text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{submitting ? "저장 중" : "날짜 저장"}</button></div>{status ? <p className="mt-3 font-semibold">{status}</p> : null}</section>;
}

function CertificatesView(ctx: any) {
  const [issueStatus, setIssueStatus] = useState("");
  const [issuingId, setIssuingId] = useState("");

  const issueFromRow = async (row: AnyRecord) => {
    setIssueStatus("");
    setIssuingId(row.id);
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
      if (!baseUrl) throw new Error("관리자 API URL이 설정되지 않았습니다.");
      const response = await fetch(baseUrl + "/api/admin/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid: row.uid || row.userId, courseId: row.courseId, documentType: row.documentType || "completion", userName: row.userName !== "미입력" ? row.userName : undefined, birthDate: row.birthDateText !== "미입력" ? row.birthDateText : undefined, note: "관리자 수료증 관리 화면에서 직접 발급" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수료증 발급 및 저장에 실패했습니다.");
      setIssueStatus(payload?.message || "수료증이 발급 및 저장되었습니다.");
      ctx.refresh();
    } catch (error) {
      console.error(error);
      setIssueStatus(error instanceof Error ? error.message : "수료증 발급 중 오류가 발생했습니다.");
    } finally {
      setIssuingId("");
    }
  };

  const issuedRows: AnyRecord[] = ctx.data.certificates.map((c: AnyRecord) => {
    const uid = c.uid || c.userId;
    const progress = ctx.maps.progressByUserCourse.get(`${uid}_${c.courseId}`);
    const enrollment = ctx.maps.enrollmentByUserCourse.get(`${uid}_${c.courseId}`);
    const outputLogs = ctx.data.documentOutputLogs.filter((row: AnyRecord) => row.uid === uid || row.userId === uid || row.targetUid === uid);
    const documentType = c.documentType || "completion";
    const outputSummary = getDocumentIssueSummary(outputLogs, getCertificateAdminDocumentKey(c.courseId, documentType));
    return {
    ...c,
    id: c.id,
    source: "certificate",
    userName: c.userName || getUserName(ctx.maps.userById.get(getUid(c))),
    birthDateText: getBirthDate(c),
    certificateNoText: formatCertificateNoForDisplay(c.certificateNo || c.issueNumber || "-"),
    documentType,
    documentTypeText: c.documentType === "attendance" ? "수강확인증" : getAdminCertificateDocumentType(c.courseId, c.documentType),
    issueStatusText: "생성완료",
    outputIssueStatusText: outputSummary.status,
    outputFirstIssuedAt: outputSummary.firstIssuedAt,
    outputLastIssuedAt: outputSummary.lastIssuedAt,
    outputIssueCount: outputSummary.issueCount,
    officialCompletionAt: getOfficialCompletionDateForAdmin(c, progress, enrollment),
    certificateFirstIssuedAt: getCertificateFirstIssuedAt(c),
    latestDocumentOutputAt: outputSummary.lastIssuedAt,
  };
  });
  const issuedIds = new Set(issuedRows.map((row) => row.id));
  const pendingRows: AnyRecord[] = ctx.data.enrollments
    .flatMap((e: AnyRecord) => {
      const user = ctx.maps.userById.get(getUid(e));
      const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`);
      return getAdminCertificateDocumentOptions(e.courseId).map((option) => {
        const certificateId = option.type && option.type !== "completion" ? `${e.uid || e.userId}_${e.courseId}_${option.type}` : `${e.uid || e.userId}_${e.courseId}`;
        const enrollmentIssued = Boolean(e.certificateIssued === true || e.certificateNo || e.issueNumber || e.certificateId);
        if (issuedIds.has(certificateId)) return null;
        const outputLogs = ctx.data.documentOutputLogs.filter((row: AnyRecord) => row.uid === (e.uid || e.userId) || row.userId === (e.uid || e.userId) || row.targetUid === (e.uid || e.userId));
        const outputSummary = getDocumentIssueSummary(outputLogs, getCertificateAdminDocumentKey(option.courseId, option.type));
        return {
          ...e,
          id: e.certificateId || certificateId,
          source: enrollmentIssued ? "certificate" : "enrollment",
          documentType: option.type,
          userName: getUserName(user),
          birthDateText: getBirthDate(user),
          email: user?.email || e.email || e.userEmail || "",
          certificateNoText: enrollmentIssued ? formatCertificateNoForDisplay(e.certificateNo || e.issueNumber || "발급번호 확인 필요") : "미생성",
          documentTypeText: enrollmentIssued ? getAdminCertificateDocumentType(e.courseId, option.type) : option.title + " 생성 가능",
          issueStatusText: enrollmentIssued ? "생성완료" : "미생성",
          outputIssueStatusText: outputSummary.status,
          outputFirstIssuedAt: outputSummary.firstIssuedAt,
          outputLastIssuedAt: outputSummary.lastIssuedAt,
          outputIssueCount: outputSummary.issueCount,
          issuedAt: e.certificateIssuedAt || e.issuedAt || null,
          completedAt: progress?.completedAt || e.completedAt || null,
          officialCompletionAt: getOfficialCompletionDateForAdmin(null, progress, e),
          certificateFirstIssuedAt: enrollmentIssued ? e.certificateIssuedAt || e.issuedAt || e.createdAt || null : null,
          latestDocumentOutputAt: outputSummary.lastIssuedAt,
        };
      }).filter(Boolean) as AnyRecord[];
    });
  const rows = [...issuedRows, ...pendingRows].filter((row: AnyRecord) => textIncludes(row, ["id", "uid", "userId", "certificateNoText", "certificateId", "userName", "email", "birthDateText", "courseTitle", "courseId"], ctx.search));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.issuedAt || b.createdAt || b.purchasedAt)?.getTime() || 0) - (toDate(a.issuedAt || a.createdAt || a.purchasedAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><ManualCertificateIssuePanel onRefresh={ctx.refresh} /><div className="mb-4 flex flex-wrap gap-2"><Link href="/certificate?adminPreview=attendance" className="rounded-full border-2 border-[#173968] bg-[#173968] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10213f] hover:text-white">수강확인증 샘플 보기</Link><Link href="/certificate?adminPreview=completion" className="rounded-full border-2 border-[#173968] bg-white px-4 py-2 text-sm font-semibold text-[#173968] transition hover:bg-slate-100 hover:text-[#10213f]">수료증 샘플 보기</Link><Link href="/certificate?courseId=dui-cbt-advanced&documentType=cbt-completion&adminPreview=completion" className="rounded-full border-2 border-emerald-800 bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950 hover:text-white">심화이수과정 이수증 샘플 보기</Link></div>{issueStatus ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">{issueStatus}</p> : null}<AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-certificates.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "certificateNoText", label: "발급번호" }, { key: "documentTypeText", label: "서류 종류" }, { key: "userName", label: "사용자명" }, { key: "birthDateText", label: "생년월일" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "교육과정명" }, { key: "officialCompletionAt", label: "실제 수료일자", render: (r) => formatAdminDateLabel(r.officialCompletionAt) }, { key: "certificateFirstIssuedAt", label: "최초 발급일자", render: (r) => formatAdminDateLabel(r.certificateFirstIssuedAt, "미발급") }, { key: "issueStatusText", label: "생성상태" }, { key: "outputIssueStatusText", label: "실제 발급상태", render: (r) => <StatusBadge label={r.outputIssueStatusText || "미발급"} /> }, { key: "outputLastIssuedAt", label: "최근 발급일", render: (r) => formatAdminDateLabel(r.outputLastIssuedAt, "-") }, { key: "view", label: "서류", render: (r) => r.source === "certificate" ? <div className="flex flex-wrap gap-2"><Link href={getCertificateViewHref(r.id)} target="_blank" className="font-semibold text-[#173968] underline">보기/인쇄</Link><Link href={getCertificateViewHref(r.id, "pdf")} target="_blank" className="font-semibold text-emerald-700 underline">PDF 저장</Link></div> : <button type="button" onClick={() => void issueFromRow(r)} disabled={issuingId === r.id} className="rounded-full border-2 border-[#173968] bg-[#173968] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#10213f] hover:text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{issuingId === r.id ? "발급 중" : "관리자 발급"}</button> }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">상세</button> }]} /><Pagination {...pager} />{selected ? <><DetailPanel title="수강증/수료증 상세" memoTarget={selected.source === "certificate" ? "certificates" : "enrollments"} memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo(selected.source === "certificate" ? "certificates" : "enrollments", selected.id, ctx.memo)} rows={[["발급번호", selected.certificateNoText], ["서류 종류", normalizeCourseDisplayText(selected.documentTypeText)], ["수강자", `${selected.userName} / ${selected.birthDateText}`], ["이메일", selected.email || "-"], ["실제 수료일자", formatAdminDateLabel(selected.officialCompletionAt)], ["생성일자", formatAdminDateLabel(selected.certificateFirstIssuedAt, "미생성")], ["실제 발급상태", selected.outputIssueStatusText || "미발급"], ["최근 발급일", formatAdminDateLabel(selected.outputLastIssuedAt, "-")], ["발급횟수", selected.outputIssueCount ? `${selected.outputIssueCount}회` : "-"], ["미리보기", selected.source === "certificate" ? <div className="flex flex-wrap gap-2"><Link href={getCertificateViewHref(selected.id)} target="_blank" className="text-[#173968] underline">서류 보기 및 인쇄</Link><Link href={getCertificateViewHref(selected.id, "pdf")} target="_blank" className="text-emerald-700 underline">PDF 저장</Link></div> : <button type="button" onClick={() => void issueFromRow(selected)} disabled={issuingId === selected.id} className="rounded-full border-2 border-[#173968] bg-[#173968] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#10213f] hover:text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{issuingId === selected.id ? "발급 중" : "관리자 발급 및 저장"}</button>], ["결제정보", selected.orderId || "결제정보 없음"], ["환불", selected.source === "certificate" ? "교육 이수 관련 서류가 발급되어 환불이 불가합니다." : "서류 발급 전 환불규정에 따라 계산됩니다."]]} /></> : null}</section>;
}

function RefundsView(ctx: any) { const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(getUid(e)); const payment = ctx.maps.paymentByOrder.get(e.orderId || e.paymentId); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, payment, progress, certificate }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", amount: Number(payment?.amount || duiPreventionCourseProduct.price), completedLessons: getCompletedLessons(e, progress), unusedLessons: refund.unusedLessons, refundAmount: refund.refundAmount, refundable: refund.refundable, reason: refund.reason, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), expired: left !== null && left < 0, paymentStatus: payment?.paymentStatus || e.paymentStatus }; }).filter((row: AnyRecord) => textIncludes(row, ["id", "uid", "userId", "orderId", "paymentId", "userName", "email", "courseTitle", "courseId", "productId"], ctx.search)); const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => b.refundAmount - a.refundAmount); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]); return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-refunds.csv", sorted)} /><p className="mb-4 rounded-[1.25rem] border border-[#d7deea] bg-white p-4 text-sm text-slate-600">실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다.</p><DataTable rows={pager.paged} columns={[{ key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount) }, { key: "completedLessons", label: "수강 강의" }, { key: "unusedLessons", label: "미수강 강의" }, { key: "refundAmount", label: "예상 환불", render: (r) => formatKrw(r.refundAmount) }, { key: "refundable", label: "가능 여부", render: (r) => r.refundable ? "가능" : "불가" }, { key: "reason", label: "사유" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "expired", label: "만료", render: (r) => r.expired ? "만료" : "유효" }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <DetailPanel title="환불 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["refundable", String(selected.refundable)], ["refundAmount", formatKrw(selected.refundAmount)], ["unusedLessons", selected.unusedLessons], ["reason", selected.reason], ["안내", "실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다."]]} /> : null}</section>; }

function IntegrityView() {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [payload, setPayload] = useState<any>(null);
  const getBaseUrl = () => paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
  const runCheck = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const baseUrl = getBaseUrl();
      const response = await fetch(baseUrl + "/api/admin/integrity", { headers: { Authorization: "Bearer " + idToken } });
      const nextPayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(nextPayload?.message || "데이터 점검에 실패했습니다.");
      setPayload(nextPayload);
    } catch (checkError) {
      console.error(checkError);
      setError(checkError instanceof Error ? checkError.message : "데이터 점검 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const runHealth = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const response = await fetch(getBaseUrl() + "/api/admin/data-health", { headers: { Authorization: "Bearer " + idToken } });
      const nextPayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(nextPayload?.message || "데이터 health check에 실패했습니다.");
      setPayload((current: any) => ({ ...(current || {}), health: nextPayload, counts: nextPayload.counts || current?.counts, metadata: nextPayload.metadata || current?.metadata }));
      setStatus("운영 데이터 health check 스냅샷을 남겼습니다.");
    } catch (healthError) {
      console.error(healthError);
      setError(healthError instanceof Error ? healthError.message : "데이터 health check 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const repairAllPaidEnrollments = async () => {
    setRepairing("all");
    setStatus("dry-run을 실행하는 중입니다.");
    setError("");
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const dryRunResponse = await fetch(getBaseUrl() + "/api/admin/integrity/repair-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ dryRun: true }),
      });
      const dryRun = await dryRunResponse.json().catch(() => ({}));
      if (!dryRunResponse.ok) throw new Error(dryRun?.message || "복구 dry-run에 실패했습니다.");
      const summary = dryRun.summary || {};
      const ok = window.confirm([
        "결제내역 기준 수강권 전체 복구 dry-run 결과입니다.",
        "전체 결제 문서: " + (summary.totalPaymentRecords || 0),
        "정상 결제: " + (summary.paidPaymentRecords || 0),
        "취소·환불 제외: " + (summary.cancelledOrRefundedRecords || 0),
        "이미 정상 수강권: " + (summary.alreadyValidEnrollments || 0),
        "복구 대상 회원: " + (summary.recoveryTargetUsers || 0),
        "복구 대상 수강권: " + (summary.recoveryTargetEnrollments || 0),
        "UID 확인 불가: " + (summary.uidMissingCount || 0),
        "과정 ID 확인 불가: " + (summary.courseMappingMissingCount || 0),
        "중복 방지: " + (summary.duplicatePreventedCount || 0),
        "",
        "기존 결제내역과 금액은 변경하지 않고 누락 수강권만 생성합니다. 실행하시겠습니까?"
      ].join("\n"));
      if (!ok) {
        setStatus("복구 실행을 취소했습니다. dry-run 대상 " + (summary.recoveryTargetEnrollments || 0) + "건.");
        return;
      }
      const response = await fetch(getBaseUrl() + "/api/admin/integrity/repair-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ confirm: "RESTORE_PAID_ENROLLMENTS" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) throw new Error(result?.message || "일괄 복구에 실패했습니다.");
      setStatus("결제 수강권 복구 완료: 복구 " + (result.restoredCount || 0) + "건, 실패 " + (result.failedCount || 0) + "건, 보류 " + (result.skippedCount || 0) + "건");
      await runCheck();
    } catch (repairError) {
      console.error(repairError);
      setError(repairError instanceof Error ? repairError.message : "일괄 복구 중 오류가 발생했습니다.");
    } finally {
      setRepairing("");
    }
  };
  const repairIssue = async (issue: AnyRecord) => {
    const ok = window.confirm([
      "이 항목을 서버 복구 API로 처리하시겠습니까?",
      "회원: " + (issue.uid || "-"),
      "과정: " + (issue.courseId || "-"),
      "결제/수강권: " + (issue.paymentId || issue.enrollmentId || "-"),
      "데이터는 삭제하지 않고 누락된 수강권 또는 수동 수강권 상태만 복구합니다."
    ].join("\n"));
    if (!ok) return;
    setRepairing(issue.id);
    setStatus("");
    setError("");
    try {
      const user = await requireAuthenticatedUser();
      const idToken = await user.getIdToken();
      const response = await fetch(getBaseUrl() + "/api/admin/integrity/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ issue, confirm: "REPAIR" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "복구에 실패했습니다.");
      setStatus("복구가 완료되었습니다. 다시 점검합니다.");
      await runCheck();
    } catch (repairError) {
      console.error(repairError);
      setError(repairError instanceof Error ? repairError.message : "복구 중 오류가 발생했습니다.");
    } finally {
      setRepairing("");
    }
  };
  const issues = (payload?.issues || []).map((issue: AnyRecord, index: number) => ({ ...issue, id: issue.type + index }));
  const counts = payload?.counts || payload?.health?.counts || {};
  const metadata = payload?.metadata || payload?.health?.metadata || {};
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">수강권·결제 데이터 점검</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void repairAllPaidEnrollments()} disabled={loading || repairing === "all"} className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-900 disabled:bg-slate-100">{repairing === "all" ? "복구 중" : "결제내역 기준 수강권 전체 복구"}</button><button type="button" onClick={() => void runHealth()} disabled={loading} className="rounded-full border border-[#d7deea] bg-white px-5 py-3 text-sm font-bold text-[#173968] disabled:bg-slate-100">Health check</button><button type="button" onClick={() => void runCheck()} disabled={loading} className="rounded-full bg-[#173968] px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300">{loading ? "점검 중" : "다시 점검"}</button></div></div><p className="mb-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">결제·수강권·진도·수료증 연결 상태를 서버 기준으로 확인합니다. Firestore 읽기 한도 보호를 위해 점검은 버튼을 눌렀을 때만 실행됩니다.</p>{error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p> : null}{status ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{status}</p> : null}<div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-xl border border-[#d7deea] bg-white p-4"><p className="text-xs font-bold text-slate-500">Firebase project</p><p className="mt-1 break-all text-sm font-black">{metadata.firebaseProjectId || "-"}</p></div>{[["회원", counts.users], ["결제", counts.payments], ["수강권", counts.enrollments], ["활성 수강권", counts.activeEnrollments]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#d7deea] bg-white p-4"><p className="text-xs font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black">{Number(value || 0)}</p></div>)}</div><DataTable rows={issues} columns={[{ key: "severity", label: "중요도" }, { key: "type", label: "유형" }, { key: "uid", label: "회원 ID" }, { key: "courseId", label: "과정" }, { key: "paymentId", label: "결제번호" }, { key: "enrollmentId", label: "수강권" }, { key: "reason", label: "사유" }, { key: "safeRepair", label: "복구", render: (issue) => issue.safeRepair ? <button type="button" onClick={() => void repairIssue(issue)} disabled={repairing === issue.id} className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">{repairing === issue.id ? "복구 중" : "복구"}</button> : <span className="text-slate-500">관리자 확인</span> }]} emptyText="확인 필요한 데이터가 없습니다." /></section>;
}
function CoursesView() {
  const managedCourses = [
    { title: "음주운전 재범방지교육 기본 수료과정", product: getAdminCourseProduct(duiPreventionCourseProduct.courseId), courseId: duiPreventionCourseProduct.courseId, modules: duiBasicModules },
    { title: "인지행동기반 재발방지교육 심화이수과정", product: getAdminCourseProduct(DUI_CBT_ADVANCED_COURSE_ID), courseId: DUI_CBT_ADVANCED_COURSE_ID, modules: duiCbtAdvancedModules },
    ...managedCourseCatalog.filter((course) => course.productId).map((course) => ({ title: course.title, product: { title: course.title, price: course.priceKrw, description: course.subtitle }, courseId: course.id, modules: course.modules })),
  ];
  return <section><h2 className="mb-4 text-3xl font-semibold tracking-[-0.04em]">강의 관리</h2><div className="grid gap-5">{managedCourses.map(({ title, product, courseId, modules }) => <section key={courseId} className="rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"><DetailPanel title={title} rows={[["courseId", courseId], ["상품명", product?.title || title], ["결제금액", formatKrw(Number(product?.price || 0))], ["총 교육 영상", `${modules.length}개`], ["수강기간", `${duiPreventionCourseProduct.durationDays}일`], ["수료증 발급", "가능"], ["공개 여부", "공개"], ["설명", product?.description || "온라인 재범방지교육 수강"]]} /><div className="mt-5 grid gap-3">{modules.map((m, i) => <div key={m.id} className="rounded-[1.25rem] border border-[#d7deea] bg-[#f8fafc] p-4"><p className="font-bold">{i + 1}. {m.title}</p><p className="mt-2 text-sm text-slate-600">lessonId: {m.id} / videoId: {m.cloudflareStreamUid || m.secureVideoPath || "미설정"}{m.sourceFileName ? ` / 원본 파일: ${m.sourceFileName}` : ""} / 재생시간: {m.minutes}분 / 공개 여부: 공개 / 완료 기준: 100% 시청</p></div>)}</div></section>)}</div></section>;
}

function SettingsView() {
  const settings = [["사이트명", adminSettings.siteName], ["운영자명", adminSettings.operatorName], ["사업자명", adminSettings.businessName], ["대표자명", adminSettings.representativeName], ["고객센터 이메일", adminSettings.supportEmail], ["고객센터 연락처", adminSettings.supportPhone], ["사업자등록번호", adminSettings.businessNumber], ["통신판매업 신고번호", adminSettings.commerceRegistrationNumber], ["수료증 발급기관명", adminSettings.certificateIssuerName], ["관리자 이메일 목록", getAdminEmails().join(", ")], ["결제사 이름", adminSettings.paymentProviderName], ["결제 환경", adminSettings.paymentEnvironment]];
  return (
    <section>
      <h2 className="mb-4 text-3xl font-semibold tracking-[-0.04em]">시스템 설정</h2>
      <DetailPanel title="운영 설정" rows={settings as Array<[string, React.ReactNode]>} />
      <section className="mt-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">직인 설정</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">수료증에 표시되는 리셋 재범방지교육센터 직인입니다.</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">직인은 수료증 미리보기, 인쇄, PDF 저장 화면에 동일하게 표시됩니다.</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-rose-100 bg-white p-4">
              <SealStamp size={120} withTexture />
            </div>
            <button type="button" onClick={() => void downloadSealStampPng()} className="cursor-pointer rounded-full bg-[#173968] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(23,57,104,0.18)] transition hover:bg-[#10213f]">직인 이미지 다운로드</button>
          </div>
        </div>
        {/* TODO: 추후 직인 이미지 교체 업로드 기능을 관리자 전용으로 추가할 수 있습니다. */}
      </section>
      <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">PORTONE_API_SECRET, PG Secret Key, Firebase private key, 서버 비밀키, API Secret은 관리자 화면에 표시하지 않습니다. 관리자 권한은 현재 설정된 관리자 이메일과 사용자 role 필드 기준으로 확인합니다.</p>
    </section>
  );
}

function Pagination({ page, maxPage, setPage }: { page: number; maxPage: number; setPage: (v: number) => void }) { return <div className="mt-4 flex items-center justify-end gap-2"><button onClick={() => setPage(Math.max(1, page - 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">이전</button><span className="text-sm text-slate-600">{page}/{maxPage}</span><button onClick={() => setPage(Math.min(maxPage, page + 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">다음</button></div>; }
