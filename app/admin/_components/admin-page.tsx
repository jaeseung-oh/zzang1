"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { DUI_CBT_ADVANCED_COURSE_ID, allCourseCatalog, duiBasicModules, duiCbtAdvancedModules, getCourseModules, managedCourseCatalog } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { applicationCourseCategories } from "@/lib/course/application-products";
import { calculateRefundAmount } from "@/lib/payment/refund";
import { paymentConfig } from "@/lib/payment/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { adminSettings, getAdminEmails, isAdminEmail } from "@/lib/admin/config";
import SealStamp, { sealStampPath } from "@/app/components/SealStamp";
import { getPreventionDocumentsForCourse, preventionDocumentCategoryLabels, preventionDocuments } from "@/lib/course/prevention-documents";

type AdminView = "dashboard" | "users" | "payments" | "enrollments" | "certificates" | "refunds" | "courses" | "integrity" | "settings";
type AdminMenuView = AdminView | "lectures";
type AnyRecord = Record<string, any> & { id: string };

type AdminDataset = {
  users: AnyRecord[];
  payments: AnyRecord[];
  enrollments: AnyRecord[];
  certificates: AnyRecord[];
  progress: AnyRecord[];
  refundPolicies: AnyRecord[];
  adminLogs: AnyRecord[];
};

const menu: Array<{ view: AdminMenuView; label: string; href: string; group: string }> = [
  { view: "dashboard", label: "대시보드", href: "/admin/dashboard", group: "대시보드" },
  { view: "users", label: "회원관리 CRM", href: "/admin/users", group: "회원관리" },
  { view: "payments", label: "결제관리", href: "/admin/payments", group: "결제관리" },
  { view: "enrollments", label: "수강권관리", href: "/admin/enrollments", group: "수강권관리" },
  { view: "certificates", label: "문서관리", href: "/admin/certificates", group: "문서관리" },
  { view: "refunds", label: "환불·고객관리", href: "/admin/refunds", group: "고객관리" },
  { view: "courses", label: "교육관리", href: "/admin/courses", group: "교육관리" },
  { view: "integrity", label: "데이터 불일치", href: "/admin/integrity", group: "점검" },
  { view: "lectures", label: "강의 영상 확인", href: "/admin/lectures", group: "교육관리" },
  { view: "settings", label: "설정", href: "/admin/settings", group: "설정" },
];

const emptyData: AdminDataset = { users: [], payments: [], enrollments: [], certificates: [], progress: [], refundPolicies: [], adminLogs: [] };
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
const getAdminGrantProduct = (productId: string) => adminGrantProducts.find((product) => product.id === productId) || defaultAdminGrantProduct;
const getAdminGrantProductAmount = (productId: string) => String(getAdminGrantProduct(productId)?.price || 49000);
const renderAdminGrantProductOptions = () => adminGrantProducts.map((product) => <option key={product.id} value={product.id}>{product.categoryTitle} - {product.title}</option>);

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
  return date ? date.toLocaleString("ko-KR") : "-";
}

function formatDateOnly(value: any) {
  const date = toDate(value);
  return date ? date.toLocaleDateString("ko-KR") : "-";
}

function daysLeft(expiresAt: any) {
  const date = toDate(expiresAt);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function isToday(value: any) {
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isThisMonth(value: any) {
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
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
  return user?.realName || user?.fullName || user?.name || "미입력";
}

function getBirthDate(user?: AnyRecord) {
  return user?.dateOfBirth || user?.birthDate || user?.certificateIdentity?.dateOfBirth || "미입력";
}

function getUid(row?: AnyRecord | null) {
  return String(row?.uid || row?.userId || row?.id || "");
}

function verifiedValue(value: any, empty = "기록 없음") {
  if (value === undefined || value === null || value === "") return empty;
  return value;
}

function isPaidRecord(row?: AnyRecord | null) {
  const status = String(row?.paymentStatus || row?.status || "").toLowerCase();
  return ["paid", "completed", "complete", "success", "approved"].includes(status);
}

function isFailedPayment(row?: AnyRecord | null) {
  const status = String(row?.paymentStatus || row?.status || "").toLowerCase();
  return ["failed", "fail", "error", "verification_failed", "verify_failed"].includes(status) || Boolean(row?.errorCode || row?.errorMessage);
}

function isRefundRecord(row?: AnyRecord | null) {
  const status = String(row?.refundStatus || row?.paymentStatus || row?.status || "").toLowerCase();
  return status.includes("refund") || status === "cancelled" || status === "canceled" || Boolean(row?.refundedAt || row?.refundRequestedAt);
}

function isActiveEnrollment(row?: AnyRecord | null) {
  const accessStatus = String(row?.accessStatus || row?.enrollmentStatus || row?.status || "").toLowerCase();
  if (["cancelled", "canceled", "revoked", "suspended", "expired", "refunded"].includes(accessStatus)) return false;
  const left = daysLeft(row?.expiresAt);
  return accessStatus === "active" || accessStatus === "paid" || accessStatus === "manual" || accessStatus === "granted" || Boolean(row?.active) || left === null || left >= 0;
}

function getCourseLevelText(row?: AnyRecord | null) {
  const raw = String(row?.planId || row?.courseLevel || row?.level || row?.productId || row?.courseId || "").toLowerCase();
  if (raw.includes("premium") || raw.includes("advanced") || raw.includes("cbt") || raw.includes("심화")) return "심화과정";
  if (raw.includes("basic") || raw.includes("기본")) return "기본과정";
  return "확인되지 않음";
}

function getMemberStatus(user: AnyRecord) {
  const status = String(user.status || user.memberStatus || "").toLowerCase();
  if (status.includes("withdraw") || status.includes("deleted") || status.includes("탈퇴")) return "탈퇴";
  if (status.includes("dormant") || status.includes("휴면")) return "휴면";
  if (status.includes("suspend") || status.includes("ban") || status.includes("정지")) return "이용정지";
  if (user.emailVerified === false || user.emailVerifiedAt === null) return "이메일 미인증";
  return "정상";
}

function getPaymentState(payments: AnyRecord[]) {
  if (payments.some(isRefundRecord)) return "환불요청/완료";
  if (payments.some(isPaidRecord)) return "결제완료";
  if (payments.some(isFailedPayment)) return "결제실패";
  return payments.length ? "결제대기" : "기록 없음";
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

function getLearningState(enrollments: AnyRecord[], progressRows: AnyRecord[]) {
  const progressRate = Math.max(0, ...enrollments.map((row) => Number(row.progress || 0)), ...progressRows.map((row) => Number(row.completionRate || 0)));
  const last = Math.max(0, ...progressRows.map((row) => toDate(row.updatedAt || row.lastWatchedAt)?.getTime() || 0), ...enrollments.map((row) => toDate(row.updatedAt || row.lastWatchedAt)?.getTime() || 0));
  if (progressRate >= 100 || enrollments.some((row) => row.completedAt)) return "교육완료";
  if (progressRate > 0) return last && last < Date.now() - 14 * 24 * 60 * 60 * 1000 ? "진도정체" : "수강중";
  return "미수강";
}

function getCompletionState(enrollments: AnyRecord[], certificates: AnyRecord[]) {
  if (certificates.length || enrollments.some((row) => row.certificateIssued || row.certificateNo)) return "수료완료";
  if (enrollments.some((row) => row.completedAt || Number(row.progress || 0) >= 100)) return "수료조건충족";
  return "미수료";
}

function getDocumentState(certificates: AnyRecord[], enrollments: AnyRecord[]) {
  if (certificates.length) return "발급완료";
  if (enrollments.some((row) => row.completedAt || Number(row.progress || 0) >= 100)) return "발급대기";
  return "미작성";
}

function getUserCrmBundle(uid: string, data: AdminDataset) {
  const payments = data.payments.filter((row) => getUid(row) === uid);
  const enrollments = data.enrollments.filter((row) => getUid(row) === uid);
  const progressRows = data.progress.filter((row) => getUid(row) === uid);
  const certificates = data.certificates.filter((row) => getUid(row) === uid);
  const logs = data.adminLogs.filter((row) => row.targetId === uid || row.uid === uid || row.userId === uid);
  const courseTitle = enrollments[0]?.courseTitle || payments[0]?.courseTitle || payments[0]?.productName || "확인되지 않음";
  const primaryAccess = enrollments[0] || payments[0] || {};
  const issues: string[] = [];
  if (payments.some(isPaidRecord) && !enrollments.some(isActiveEnrollment)) issues.push("결제완료 + 수강권 없음");
  if (enrollments.some(isActiveEnrollment) && !payments.some(isPaidRecord) && !enrollments.some((row) => isManualEnrollment(row) || row.grantReason === "RESTORE")) issues.push("결제 없는 수강권");
  if (payments.some(isFailedPayment) && enrollments.some(isActiveEnrollment)) issues.push("결제 실패 + 수강권 활성");
  if (payments.some(isRefundRecord) && enrollments.some(isActiveEnrollment)) issues.push("환불/취소 + 수강권 활성");
  const activeKeys = new Set(enrollments.filter(isActiveEnrollment).map((row) => String(row.courseId || "") + ":" + String(row.productId || "") + ":" + String(row.planId || "")));
  if (activeKeys.size < enrollments.filter(isActiveEnrollment).length) issues.push("동일 UID 중복 활성 수강권");
  return { payments, enrollments, progressRows, certificates, logs, courseTitle, courseLevel: getCourseLevelText(primaryAccess), issues };
}

function buildMemberTimeline(selected: AnyRecord, bundle: ReturnType<typeof getUserCrmBundle>) {
  const items: Array<{ id: string; at: any; label: string; detail: string }> = [];
  const push = (id: string, at: any, label: string, detail: string) => { if (toDate(at)) items.push({ id, at, label, detail }); };
  push("user-created", selected.createdAt, "회원가입", selected.email || selected.id);
  push("email-verified", selected.emailVerifiedAt, "이메일 인증", "실제 인증시각 기록 기준");
  push("last-login", selected.lastLoginAt, "로그인", "최근 로그인 기록");
  bundle.payments.forEach((row) => {
    push("payment-created-" + row.id, row.createdAt || row.orderedAt, "결제 시도", row.orderId || row.paymentId || row.id);
    if (isPaidRecord(row)) push("payment-paid-" + row.id, row.approvedAt || row.paidAt || row.updatedAt, "결제 성공", formatKrw(Number(row.amount || 0)));
    if (isFailedPayment(row)) push("payment-failed-" + row.id, row.failedAt || row.updatedAt || row.createdAt, "결제 실패", row.errorMessage || row.errorCode || row.id);
    if (isRefundRecord(row)) push("payment-refund-" + row.id, row.refundedAt || row.refundRequestedAt || row.updatedAt, "환불/취소", row.refundStatus || row.status || "환불 관련 기록");
  });
  bundle.enrollments.forEach((row) => {
    push("enrollment-" + row.id, row.createdAt || row.purchasedAt || row.grantedAt, "수강권 생성", row.courseTitle || row.courseId || row.id);
    push("enrollment-completed-" + row.id, row.completedAt, "수료 처리", row.courseTitle || row.courseId || row.id);
  });
  bundle.progressRows.forEach((row) => push("progress-" + row.id, row.updatedAt || row.lastWatchedAt, "강의 진도 저장", row.courseTitle || row.courseId || row.id));
  bundle.certificates.forEach((row) => push("certificate-" + row.id, row.issuedAt || row.createdAt, "문서 발급", row.certificateNo || row.documentType || row.id));
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
      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[1.5rem] border border-[#d7deea] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:sticky lg:top-5 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">관리자 페이지</h1>
          <p className="mt-2 text-xs leading-6 text-slate-500">사이트 운영에 필요한 회원, 결제, 수강권, 수료증 정보를 관리할 수 있습니다.</p>
          <nav className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {menu.map((item) => (
              <Link key={item.view} href={item.href} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${view === item.view ? "bg-[#173968] text-white" : "bg-[#f8fafc] text-slate-700 hover:bg-[#eef4ff]"}`}><span className="block text-[11px] font-bold text-current opacity-70">{item.group}</span><span className="mt-0.5 block">{item.label}</span></Link>
            ))}
          </nav>
        </aside>
        <section>
          <header className="mb-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{new Date().toLocaleDateString("ko-KR")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">관리자 로그인 이메일: {email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-[#10213f]">사이트로 돌아가기</Link>
                <button type="button" onClick={() => void signOut(auth)} className="rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">로그아웃</button>
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function AdminToolbar({ search, setSearch, filter, setFilter, filters, onRefresh, onCsv }: { search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; filters: string[]; onRefresh: () => void; onCsv: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[1.25rem] border border-[#d7deea] bg-white p-4 sm:flex-row sm:items-center">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="검색어를 입력하세요" className="min-h-11 flex-1 rounded-full border border-[#d7deea] px-4 text-sm outline-none focus:border-[#173968]" />
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 rounded-full border border-[#d7deea] px-4 text-sm outline-none focus:border-[#173968]">
        {filters.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button type="button" onClick={onRefresh} className="rounded-full border border-[#d7deea] bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">새로고침</button>
      <button type="button" onClick={onCsv} className="rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">CSV 다운로드</button>
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const user = await requireAuthenticatedUser();
      if (!isAdminEmail(user.email)) throw new Error("관리자 권한이 없습니다.");
      setEmail(user.email || "");
      setUid(user.uid);
      const { db } = getFirebaseServices();
      const profileSnapshot = await getDoc(doc(db, "users", user.uid)).catch(() => null);
      const role = String(profileSnapshot?.data()?.role || profileSnapshot?.data()?.adminRole || "").toLowerCase();
      if (!isAdminEmail(user.email) && !["admin", "superadmin", "operator", "viewer"].includes(role)) throw new Error("관리자 권한이 없습니다.");
      const names = ["users", "payments", "enrollments", "certificates", "courseProgress", "refundPolicies", "adminLogs"] as const;
      const snapshots = await Promise.all(names.map(async (name) => {
        try {
          return await getDocs(collection(db, name));
        } catch (error) {
          const errorLike = error as { code?: string; message?: string };
          throw new Error(name + " 컬렉션 조회 실패: " + (errorLike.code || errorLike.message || "unknown"));
        }
      }));
      const next = Object.fromEntries(names.map((name, index) => [name === "courseProgress" ? "progress" : name, snapshots[index].docs.map((doc) => ({ id: doc.id, ...doc.data() }))])) as AdminDataset;
      setData(next);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const maps = useMemo(() => {
    const userById = new Map(data.users.map((user) => [user.id, user]));
    const progressByUserCourse = new Map(data.progress.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const enrollmentByUserCourse = new Map(data.enrollments.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const certificateByUserCourse = new Map(data.certificates.map((item) => [`${item.uid || item.userId}_${item.courseId}`, item]));
    const paymentByOrder = new Map(data.payments.map((item) => [item.orderId || item.paymentId || item.id, item]));
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
      {!loading && !error ? renderView({ view, data, maps, search, setSearch, filter, setFilter, selectedId, setSelectedId, memo, setMemo, saveMemo, refresh: load }) : null}
    </AdminFrame>
  );
}

function renderView(ctx: { view: AdminView; data: AdminDataset; maps: any; search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; selectedId: string; setSelectedId: (v: string) => void; memo: string; setMemo: (v: string) => void; saveMemo: (collectionName: string, id: string, memo: string) => Promise<void>; refresh: () => void }) {
  if (ctx.view === "dashboard") return <DashboardView {...ctx} />;
  if (ctx.view === "users") return <UsersView {...ctx} />;
  if (ctx.view === "payments") return <PaymentsView {...ctx} />;
  if (ctx.view === "enrollments") return <EnrollmentsView {...ctx} />;
  if (ctx.view === "certificates") return <CertificatesView {...ctx} />;
  if (ctx.view === "refunds") return <RefundsView {...ctx} />;
  if (ctx.view === "courses") return <CoursesView />;
  if (ctx.view === "integrity") return <IntegrityView />;
  return <SettingsView />;
}

function DashboardView({ data, maps, refresh }: any) {
  const now = Date.now();
  const payments = data.payments.filter((p: AnyRecord) => (p.paymentStatus || p.status) === "paid");
  const totalAmount = payments.reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || 0), 0);
  const todayAmount = payments.filter((p: AnyRecord) => isToday(p.approvedAt || p.createdAt)).reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || 0), 0);
  const monthAmount = payments.filter((p: AnyRecord) => isThisMonth(p.approvedAt || p.createdAt)).reduce((sum: number, item: AnyRecord) => sum + Number(item.amount || 0), 0);
  const completed = data.enrollments.filter((e: AnyRecord) => Number(e.completedLessons || 0) >= duiPreventionCourseProduct.totalLessons || Number(e.progress || 0) >= 100);
  const expired = data.enrollments.filter((e: AnyRecord) => { const expires = toDate(e.expiresAt); return expires && expires.getTime() < now; });
  const refundable = data.enrollments.filter((e: AnyRecord) => getRefundInfo({ enrollment: e, payment: maps.paymentByOrder.get(e.orderId || e.paymentId), progress: maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`), certificate: maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`) }).refundable);
  const cards = [
    ["전체 회원 수", data.users.length, "/admin/users"], ["전체 결제 건수", data.payments.length, "/admin/payments"], ["총 결제금액", formatKrw(totalAmount), "/admin/payments"], ["오늘 결제금액", formatKrw(todayAmount), "/admin/payments"], ["이번 달 결제금액", formatKrw(monthAmount), "/admin/payments"], ["음주운전 재범방지교육 구매자 수", new Set(payments.filter((p: AnyRecord) => p.courseId === duiPreventionCourseProduct.courseId).map((p: AnyRecord) => p.uid || p.userId)).size, "/admin/enrollments"], ["수강 중인 회원 수", data.enrollments.filter((e: AnyRecord) => e.accessStatus === "active").length, "/admin/enrollments"], ["수강 완료 회원 수", completed.length, "/admin/enrollments"], ["수료증 발급 건수", data.certificates.length, "/admin/certificates"], ["수강기간 만료 건수", expired.length, "/admin/enrollments"], ["환불 가능 대상 건수", refundable.length, "/admin/refunds"],
  ];
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">운영 대시보드</h2><div className="flex flex-wrap gap-2"><Link href="/admin/users" className="rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">회원 검색</Link><Link href="/admin/enrollments" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-bold text-[#173968]">수강권 부여</Link><Link href="/admin/payments" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-bold text-[#173968]">결제내역 확인</Link><Link href="/admin/integrity" className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">확인 필요</Link></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, href]) => <Link key={String(label)} href={String(href)} className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-slate-950">{String(value)}</p></Link>)}</div><div className="mt-5 rounded-[1.5rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#274690]">Document Preview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">작성자료 미리보기</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">기본과정 구매자에게 제공되는 작성자료의 인쇄 및 PDF 저장 화면을 관리자 권한으로 확인합니다.</p>
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
    const bundle = getUserCrmBundle(uid, ctx.data);
    const progressRate = Math.max(0, ...bundle.enrollments.map((row: AnyRecord) => Number(row.progress || 0)), ...bundle.progressRows.map((row: AnyRecord) => Number(row.completionRate || 0)));
    const tags = [bundle.courseTitle, bundle.courseLevel, ...bundle.issues.length ? ["데이터확인필요"] : []].filter((item) => item && item !== "확인되지 않음");
    return {
      ...user,
      userId: uid,
      userName: getUserName(user),
      birthDateText: getBirthDate(user),
      memberStatus: getMemberStatus(user),
      paymentState: getPaymentState(bundle.payments),
      entitlementState: getEntitlementState(bundle.enrollments),
      learningState: getLearningState(bundle.enrollments, bundle.progressRows),
      completionState: getCompletionState(bundle.enrollments, bundle.certificates),
      documentState: getDocumentState(bundle.certificates, bundle.enrollments),
      refundState: bundle.payments.some(isRefundRecord) ? "환불요청/완료" : "해당없음",
      courseTitle: bundle.courseTitle,
      courseLevel: bundle.courseLevel,
      progressRate,
      enrollmentCount: bundle.enrollments.length,
      certificateIssued: bundle.certificates.length > 0,
      issueCount: bundle.issues.length,
      tags: tags.join(", "),
      admin: isAdminEmail(user.email),
    };
  }).filter((row: AnyRecord) => textIncludes(row, ["userId", "userName", "email", "phoneNumber", "courseTitle", "tags"], ctx.search)).filter((row: AnyRecord) => filterUserCrm(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 회원", "신규 가입", "이메일 미인증", "결제 대기", "결제 완료", "수강 중", "진도 정체", "수료 대기", "문서 발급 대기", "환불 회원", "탈퇴·휴면 회원", "데이터확인필요"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-users-crm.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "userId", label: "UID" }, { key: "userName", label: "성명", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">{r.userName}</button> }, { key: "email", label: "이메일", render: (r) => verifiedValue(r.email) }, { key: "phoneNumber", label: "휴대전화", render: (r) => verifiedValue(r.phoneNumber) }, { key: "createdAt", label: "가입일", render: (r) => formatDate(r.createdAt) }, { key: "memberStatus", label: "회원상태" }, { key: "paymentState", label: "결제상태" }, { key: "entitlementState", label: "수강권상태" }, { key: "learningState", label: "수강상태" }, { key: "completionState", label: "수료상태" }, { key: "documentState", label: "문서상태" }, { key: "courseTitle", label: "현재 과정" }, { key: "courseLevel", label: "과정등급" }, { key: "progressRate", label: "진도율", render: (r) => r.progressRate + "%" }, { key: "tags", label: "태그", render: (r) => r.tags || "기록 없음" }, { key: "issueCount", label: "불일치", render: (r) => r.issueCount ? "관리자 확인 필요 " + r.issueCount + "건" : "없음" }]} /><Pagination {...pager} />{selected ? <UserDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function filterUserCrm(row: AnyRecord, filter: string) {
  if (filter === "신규 가입") return inLastDays(row.createdAt, 7);
  if (filter === "이메일 미인증") return row.memberStatus === "이메일 미인증";
  if (filter === "결제 대기") return row.paymentState === "결제대기";
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
  const bundle = getUserCrmBundle(selected.id, ctx.data);
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
        {[ ["회원번호", verifiedValue(selected.memberNo || selected.memberNumber)], ["UID", selected.id], ["이메일", verifiedValue(selected.email)], ["휴대전화", verifiedValue(selected.phoneNumber)], ["생년월일", selected.birthDateText || "기록 없음"], ["가입일", formatDate(selected.createdAt)], ["최근 로그인", formatDate(selected.lastLoginAt)], ["회원상태", getMemberStatus(selected)], ["현재 과정", bundle.courseTitle], ["과정등급", bundle.courseLevel], ["결제상태", getPaymentState(bundle.payments)], ["수강권상태", getEntitlementState(bundle.enrollments)], ["전체 진도율", progressRate + "%"], ["수료상태", getCompletionState(bundle.enrollments, bundle.certificates)], ["담당 관리자", verifiedValue(selected.managerEmail || selected.managerName, "관리자 확인 필요")], ["태그", selected.tags?.length ? selected.tags.join(", ") : "기록 없음"] ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e5ebf3] bg-[#f8fafc] p-3"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p></div>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === id ? "bg-[#173968] text-white" : "border border-[#d7deea] bg-white text-slate-700"}`}>{label}</button>)}</div>
    {activeTab === "basic" ? <DetailPanel title="기본정보" rows={[["UID", selected.id], ["이름", selected.userName], ["이메일", verifiedValue(selected.email)], ["휴대전화번호", verifiedValue(selected.phoneNumber)], ["생년월일", selected.birthDateText || "기록 없음"], ["이메일 인증 여부", selected.emailVerified === true || selected.emailVerifiedAt ? "인증" : selected.emailVerified === false ? "미인증" : "확인되지 않음"], ["가입일", formatDate(selected.createdAt)], ["최근 로그인", formatDate(selected.lastLoginAt)], ["회원상태", getMemberStatus(selected)]]} /> : null}
    {activeTab === "payments" ? <CrmMiniTable title="결제내역" rows={bundle.payments} columns={[{ key: "orderId", label: "주문번호", render: (r) => verifiedValue(r.orderId) }, { key: "paymentId", label: "paymentId", render: (r) => verifiedValue(r.paymentId || r.paymentKey) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "planId", label: "planId", render: (r) => verifiedValue(r.planId) }, { key: "courseId", label: "canonicalCourseId", render: (r) => verifiedValue(r.canonicalCourseId || r.courseId) }, { key: "amount", label: "결제금액", render: (r) => formatKrw(Number(r.amount || 0)) }, { key: "method", label: "결제수단", render: (r) => verifiedValue(r.method || r.payMethod) }, { key: "status", label: "결제상태", render: (r) => r.paymentStatus || r.status || "확인되지 않음" }, { key: "approvedAt", label: "승인일", render: (r) => formatDate(r.approvedAt || r.paidAt) }]} /> : null}
    {activeTab === "entitlements" ? <CrmMiniTable title="수강권" rows={bundle.enrollments} columns={[{ key: "id", label: "entitlementId" }, { key: "courseId", label: "canonicalCourseId", render: (r) => verifiedValue(r.canonicalCourseId || r.courseId) }, { key: "productId", label: "productId", render: (r) => verifiedValue(r.productId) }, { key: "planId", label: "planId", render: (r) => getCourseLevelText(r) }, { key: "createdAt", label: "부여일", render: (r) => formatDate(r.grantedAt || r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "종료일", render: (r) => formatDate(r.expiresAt) }, { key: "accessStatus", label: "활성 여부", render: (r) => isActiveEnrollment(r) ? "활성" : (r.accessStatus || r.status || "확인되지 않음") }, { key: "grantReason", label: "부여 사유", render: (r) => verifiedValue(r.grantReason || r.reason, "원본 데이터 누락") }]} /> : null}
    {activeTab === "progress" ? <CrmMiniTable title="수강진도" rows={bundle.progressRows} columns={[{ key: "courseId", label: "과정" }, { key: "completionRate", label: "전체 진도율", render: (r) => Number(r.completionRate || 0) + "%" }, { key: "completedModuleCount", label: "완료 강의" }, { key: "lastPosition", label: "최근 재생 위치", render: (r) => verifiedValue(r.lastPosition || r.lastPlaybackPosition) }, { key: "updatedAt", label: "최근 수강일", render: (r) => formatDate(r.updatedAt || r.lastWatchedAt) }]} /> : null}
    {activeTab === "submissions" ? <section className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5"><h4 className="text-lg font-bold">제출자료</h4><p className="mt-2 text-sm font-semibold text-slate-700">기록 없음</p><p className="mt-1 text-sm leading-6 text-slate-500">현재 연결된 운영 컬렉션에서 제출자료 원본을 확인할 수 없습니다. 확인되지 않은 자료를 임의 생성하거나 완료 처리하지 않습니다.</p></section> : null}
    {activeTab === "documents" ? <CrmMiniTable title="발급문서" rows={bundle.certificates} columns={[{ key: "certificateNo", label: "발급번호", render: (r) => verifiedValue(r.certificateNo || r.issueNumber) }, { key: "documentType", label: "문서종류", render: (r) => getAdminCertificateDocumentType(r.courseId, r.documentType) }, { key: "courseId", label: "과정명", render: (r) => verifiedValue(r.courseTitle || r.courseId) }, { key: "issuedAt", label: "최초 발급일", render: (r) => formatDate(r.issuedAt || r.createdAt) }, { key: "view", label: "문서", render: (r) => <Link href={getCertificateViewHref(r.id)} className="font-semibold text-[#173968] underline">보기/인쇄</Link> }]} /> : null}
    {activeTab === "support" ? <section className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5"><h4 className="text-lg font-bold">문의·고객응대</h4><p className="mt-2 text-sm font-semibold text-slate-700">기록 없음</p><p className="mt-1 text-sm leading-6 text-slate-500">현재 관리자 화면에 연결된 고객문의 원본 컬렉션이 없습니다. 이번 운영 범위 밖의 기능은 추가하지 않았습니다.</p></section> : null}
    {activeTab === "memo" ? <DetailPanel title="관리자 메모" memoTarget="users" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("users", selected.id, ctx.memo)} rows={[["구분", "내부 운영메모"], ["주의", "관리자 메모는 사실확인 자료가 아니라 내부 업무기록입니다."], ["현재 메모", ctx.memo || "기록 없음"]]} /> : null}
    {activeTab === "timeline" ? <CrmMiniTable title="활동 타임라인" rows={timeline.map((item) => ({ ...item, id: item.id }))} columns={[{ key: "at", label: "일시", render: (r) => formatDate(r.at) }, { key: "label", label: "활동" }, { key: "detail", label: "확인된 원본" }]} /> : null}
    {activeTab === "privacy" ? <CrmMiniTable title="개인정보 처리이력" rows={bundle.logs.filter((row: AnyRecord) => String(row.action || "").includes("privacy") || String(row.action || "").includes("profile") || String(row.action || "").includes("download"))} columns={[{ key: "createdAt", label: "일시", render: (r) => formatDate(r.createdAt) }, { key: "adminEmail", label: "처리 관리자", render: (r) => verifiedValue(r.adminEmail) }, { key: "action", label: "처리 종류" }, { key: "description", label: "내용", render: (r) => verifiedValue(r.description) }]} /> : null}
  </section>;
}

function PaymentsView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.payments.map((p: AnyRecord) => {
    const user = ctx.maps.userById.get(p.uid || p.userId);
    const enrollment = ctx.data.enrollments.find((e: AnyRecord) => e.orderId === p.orderId || e.paymentId === p.paymentId);
    const certificate = ctx.maps.certificateByUserCourse.get(`${p.uid || p.userId}_${p.courseId}`);
    return { ...p, userName: getUserName(user), email: p.customerEmail || user?.email || "", enrollmentGranted: Boolean(enrollment), certificateIssued: Boolean(certificate?.certificateNo || enrollment?.certificateIssued) };
  }).filter((row: AnyRecord) => textIncludes(row, ["orderId", "paymentId", "userName", "email", "courseTitle"], ctx.search)).filter((row: AnyRecord) => filterPayment(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.approvedAt || b.createdAt)?.getTime() || 0) - (toDate(a.approvedAt || a.createdAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><PaymentResyncPanel onRefresh={ctx.refresh} /><ManualEnrollmentGrantPanel users={ctx.data.users} onRefresh={ctx.refresh} /><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 결제", "결제 성공", "결제 실패", "결제 취소", "환불 요청", "환불 완료", "결제 검증 오류", "결제·수강권 불일치", "오늘 결제", "이번 달 결제"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-payments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "orderId", label: "주문번호" }, { key: "paymentId", label: "결제번호" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명" }, { key: "amount", label: "결제금액", align: "right", render: (r) => formatKrw(Number(r.amount || 0)) }, { key: "method", label: "결제수단" }, { key: "paymentStatus", label: "상태", render: (r) => r.paymentStatus || r.status || "-" }, { key: "createdAt", label: "결제일시", render: (r) => formatDate(r.createdAt || r.orderedAt) }, { key: "approvedAt", label: "승인일시", render: (r) => formatDate(r.approvedAt) }, { key: "enrollmentGranted", label: "수강권", render: (r) => r.enrollmentGranted ? "부여" : "없음" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <PaymentDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function filterPayment(row: AnyRecord, filter: string) { const status = String(row.paymentStatus || row.status || "").toLowerCase(); if (filter === "결제 성공") return isPaidRecord(row); if (filter === "결제 실패") return isFailedPayment(row); if (filter === "결제 취소") return status === "canceled" || status === "cancelled"; if (filter === "환불 요청") return Boolean(row.refundRequestedAt) || String(row.refundStatus || "").includes("request"); if (filter === "환불 완료") return status === "refunded" || String(row.refundStatus || "").includes("complete"); if (filter === "결제 검증 오류") return Boolean(row.verificationError || row.errorCode || row.errorMessage); if (filter === "결제·수강권 불일치") return isPaidRecord(row) && !row.enrollmentGranted; if (filter === "오늘 결제") return isToday(row.approvedAt || row.createdAt); if (filter === "이번 달 결제") return isThisMonth(row.approvedAt || row.createdAt); return true; }
function PaymentResyncPanel({ onRefresh }: { onRefresh: () => void }) {
  const [paymentId, setPaymentId] = useState("");
  const [uid, setUid] = useState("");
  const [productId, setProductId] = useState(defaultAdminGrantProduct?.id || "dui-documents");
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
  const [productId, setProductId] = useState(defaultAdminGrantProduct?.id || "dui-documents");
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
  const isAdvancedGrant = productId === "dui-cbt-advanced" || productId.endsWith("-advanced");

  const handleGrant = async () => {
    setStatus("");
    if (!uid.trim()) {
      setStatus("사용자 ID(uid)를 입력해 주세요.");
      return;
    }
    const confirmText = [
      "수강권을 직접 부여하시겠습니까?",
      "회원명: " + getUserName(selectedMember),
      "생년월일: " + getBirthDate(selectedMember),
      "이메일: " + (selectedMember?.email || "미입력"),
      "교육과정: " + (selectedProduct?.categoryTitle || "") + " - " + (selectedProduct?.title || ""),
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
      const selectedProduct = getAdminGrantProduct(productId);
      const response = await fetch(baseUrl + "/api/admin/enrollments/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ uid: uid.trim(), productId, courseId: selectedProduct?.courseId, categoryId: selectedProduct?.categoryId, amount: Number(amount) || undefined, note: note.trim() || undefined, adminMemo: note.trim() || undefined, duplicateResolution, startsAt, expiresAt, active }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "수강권 수동 지급에 실패했습니다.");
      setStatus((payload?.message || "수강권이 수동 지급되었습니다.") + (payload?.enrollmentId ? " (" + payload.enrollmentId + ")" : ""));
      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "수강권 수동 지급 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="mb-4 rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-bold">수강권 직접 부여</p><p className="mt-1 text-xs leading-5">회원과 교육과정, 수강기간을 확인한 뒤 관리자 권한으로 수강권을 직접 지급합니다.</p><p className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-blue-950">현재 선택: {selectedProduct?.categoryTitle} - {selectedProduct?.title} / 지급 결과: {isAdvancedGrant ? "기본과정 + 심화과정" : "기본과정만"}</p><div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_220px_120px_150px_150px_140px_auto]"><input value={memberSearch} onChange={(e) => { const value = e.target.value; setMemberSearch(value); const found = users.find((user) => [user.id, user.uid, user.userId, user.email, getUserName(user)].some((item) => String(item || "").includes(value))); if (found) setUid(getGrantTargetUid(found)); }} placeholder="회원 검색(이름/이메일/UID)" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="사용자 ID(uid)" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><select value={productId} onChange={(e) => { setProductId(e.target.value); setAmount(getAdminGrantProductAmount(e.target.value)); }} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500">{renderAdminGrantProductOptions()}</select><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><select value={active ? "active" : "pending"} onChange={(e) => setActive(e.target.value === "active")} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500"><option value="active">활성</option><option value="pending">비활성</option></select><button type="button" onClick={handleGrant} disabled={submitting} className="rounded-xl bg-[#173968] px-4 py-2 font-bold text-white disabled:bg-gray-300">{submitting ? "처리 중" : "확인 후 지급"}</button></div><div className="mt-2 grid gap-2 md:grid-cols-[170px_1fr]"><select value={duplicateResolution} onChange={(e) => setDuplicateResolution(e.target.value)} className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500"><option value="keep">중복 시 유지</option><option value="extend">중복 시 연장</option></select><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="지급 사유 또는 관리자 메모" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /></div>{selectedMember ? <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold">선택 회원: {getUserName(selectedMember)} / {getBirthDate(selectedMember)} / {selectedMember.email || "이메일 미입력"} / 지급 UID: {getGrantTargetUid(selectedMember)}</p> : null}{status ? <p className="mt-3 font-semibold">{status}</p> : null}</section>;
}

function PaymentDetail({ selected, ctx }: any) { const enrollment = ctx.data.enrollments.find((e: AnyRecord) => e.orderId === selected.orderId || e.paymentId === selected.paymentId); const certificate = ctx.maps.certificateByUserCourse.get(`${selected.uid || selected.userId}_${selected.courseId}`); const refund = getRefundInfo({ payment: selected, enrollment, certificate }); return <DetailPanel title="결제 상세" memoTarget="payments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("payments", selected.id, ctx.memo)} rows={[["주문번호", selected.orderId], ["결제번호", selected.paymentId || selected.paymentKey || "-"], ["PG 원본 응답", <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selected.rawResponse || {}, null, 2)}</pre>], ["연결 수강권", enrollment?.id || "수강권 없음"], ["연결 수료증", certificate ? <Link href={`/certificate?certificateId=${encodeURIComponent(certificate.id)}`} className="text-[#173968] underline">{certificate.certificateNo || "보기"}</Link> : "미발급"], ["예상 환불", `${formatKrw(refund.refundAmount)} / ${refund.reason}`]]} />; }

function EnrollmentsView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(e.uid || e.userId); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, progress, certificate, payment: ctx.maps.paymentByOrder.get(e.orderId || e.paymentId) }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", progressRate: getProgressRate(e, progress), completedLessons: getCompletedLessons(e, progress), leftDays: left, expired: left !== null && left < 0, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), refundAmount: refund.refundAmount, refundable: refund.refundable, refundReason: refund.reason }; }).filter((row: AnyRecord) => textIncludes(row, ["id", "userName", "email", "courseTitle"], ctx.search)).filter((row: AnyRecord) => filterEnrollment(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.purchasedAt || b.createdAt)?.getTime() || 0) - (toDate(a.purchasedAt || a.createdAt)?.getTime() || 0)); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><ManualEnrollmentGrantPanel users={ctx.data.users} onRefresh={ctx.refresh} /><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체 수강권", "활성 수강권", "만료 예정", "수동 부여", "수강권 복구", "결제 없는 수강권", "결제 후 미발급 수강권", "수료증 발급 완료", "수료증 미발급", "환불 가능", "환불 불가"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-enrollments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "id", label: "수강권 ID" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "과정명" }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "createdAt", label: "시작일", render: (r) => formatDate(r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "leftDays", label: "남은 수강일", render: (r) => r.leftDays === null ? "-" : `${r.leftDays}일` }, { key: "accessStatus", label: "상태" }, { key: "progressRate", label: "진행률", render: (r) => `${r.progressRate}%` }, { key: "completedLessons", label: "완료/전체", render: (r) => `${r.completedLessons}/${r.totalLessons || 5}` }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "refundAmount", label: "환불예상", align: "right", render: (r) => formatKrw(r.refundAmount) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <EnrollmentDetail selected={selected} ctx={ctx} /> : null}</section>;
}
function filterEnrollment(row: AnyRecord, filter: string) { if (filter === "활성 수강권") return isActiveEnrollment(row) && !row.expired; if (filter === "만료 예정") return row.leftDays !== null && row.leftDays >= 0 && row.leftDays <= 14; if (filter === "수동 부여") return isManualEnrollment(row); if (filter === "수강권 복구") return row.grantReason === "RESTORE" || row.restoredAt; if (filter === "결제 없는 수강권") return isActiveEnrollment(row) && !(row.orderId || row.paymentId); if (filter === "결제 후 미발급 수강권") return false; if (filter === "수료증 발급 완료") return row.certificateIssued; if (filter === "수료증 미발급") return !row.certificateIssued; if (filter === "환불 가능") return row.refundable; if (filter === "환불 불가") return !row.refundable; return true; }
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
        body: JSON.stringify({ uid: selected.uid || selected.userId, courseId: selected.courseId, action, reason: reason.trim(), extensionDays }),
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
  const courseModules = getAdminCourseModules(selected.courseId);
  const modules = courseModules.map((m, i) => `${i + 1}. ${m.title} ${progress?.moduleProgress?.[m.id]?.isCompleted ? "완료" : "미완료"}`).join(" / ");
  return <><DetailPanel title="수강권 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["사용자", `${selected.userName} / ${selected.email}`], ["결제", selected.orderId || selected.paymentId || "결제정보 없음"], ["교육과정", selected.courseTitle || getAdminCourseProduct(selected.courseId)?.title || "-"], ["강의별 완료", modules], ["진행률", `${selected.progressRate}%`], ["수강기간", `${formatDateOnly(selected.purchasedAt || selected.createdAt)} - ${formatDateOnly(selected.expiresAt)}`], ["만료 여부", selected.expired ? "만료" : "유효"], ["수료증", selected.certificateIssued ? selected.certificateNo || "발급" : "미발급"], ["출력 서류", <AdminDocumentLinks uid={uid} certificateId={certificate?.id} courseId={selected.courseId} />], ["환불", `${formatKrw(selected.refundAmount)} / ${selected.refundReason}`]]} /><EnrollmentActionPanel selected={selected} onRefresh={ctx.refresh} /></>;
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

  const issuedRows: AnyRecord[] = ctx.data.certificates.map((c: AnyRecord) => ({
    ...c,
    id: c.id,
    source: "certificate",
    userName: c.userName || getUserName(ctx.maps.userById.get(c.uid || c.userId)),
    birthDateText: c.birthDate || c.dateOfBirth || "미입력",
    certificateNoText: c.certificateNo || c.issueNumber || "-",
    documentType: c.documentType || "completion",
    documentTypeText: c.documentType === "attendance" ? "수강확인증" : getAdminCertificateDocumentType(c.courseId, c.documentType),
    issueStatusText: "발급완료",
  }));
  const issuedIds = new Set(issuedRows.map((row) => row.id));
  const pendingRows: AnyRecord[] = ctx.data.enrollments
    .flatMap((e: AnyRecord) => {
      const user = ctx.maps.userById.get(e.uid || e.userId);
      const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`);
      return getAdminCertificateDocumentOptions(e.courseId).map((option) => {
        const certificateId = option.type && option.type !== "completion" ? `${e.uid || e.userId}_${e.courseId}_${option.type}` : `${e.uid || e.userId}_${e.courseId}`;
        if (issuedIds.has(certificateId)) return null;
        return {
          ...e,
          id: certificateId,
          source: "enrollment",
          documentType: option.type,
          userName: getUserName(user),
          birthDateText: getBirthDate(user),
          email: user?.email || "",
          certificateNoText: "미발급",
          documentTypeText: option.title + " 발급 가능",
          issueStatusText: "미발급",
          issuedAt: null,
          completedAt: progress?.completedAt || e.completedAt || null,
        };
      }).filter(Boolean) as AnyRecord[];
    });
  const rows = [...issuedRows, ...pendingRows].filter((row: AnyRecord) => textIncludes(row, ["certificateNoText", "userName", "email", "birthDateText", "courseTitle"], ctx.search));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.issuedAt || b.createdAt || b.purchasedAt)?.getTime() || 0) - (toDate(a.issuedAt || a.createdAt || a.purchasedAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><ManualCertificateIssuePanel onRefresh={ctx.refresh} /><div className="mb-4 flex flex-wrap gap-2"><Link href="/certificate?adminPreview=attendance" className="rounded-full border-2 border-[#173968] bg-[#173968] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10213f] hover:text-white">수강확인증 샘플 보기</Link><Link href="/certificate?adminPreview=completion" className="rounded-full border-2 border-[#173968] bg-white px-4 py-2 text-sm font-semibold text-[#173968] transition hover:bg-slate-100 hover:text-[#10213f]">수료증 샘플 보기</Link><Link href="/certificate?courseId=dui-cbt-advanced&documentType=cbt-completion&adminPreview=completion" className="rounded-full border-2 border-emerald-800 bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950 hover:text-white">심화과정 이수증 샘플 보기</Link></div>{issueStatus ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">{issueStatus}</p> : null}<AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-certificates.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "certificateNoText", label: "발급번호" }, { key: "documentTypeText", label: "서류 종류" }, { key: "userName", label: "사용자명" }, { key: "birthDateText", label: "생년월일" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "교육과정명" }, { key: "completedAt", label: "수료/수강일", render: (r) => formatDate(r.completedAt) }, { key: "issuedAt", label: "발급일", render: (r) => formatDate(r.issuedAt) }, { key: "issueStatusText", label: "상태" }, { key: "view", label: "서류", render: (r) => r.source === "certificate" ? <div className="flex flex-wrap gap-2"><Link href={getCertificateViewHref(r.id)} target="_blank" className="font-semibold text-[#173968] underline">보기/인쇄</Link><Link href={getCertificateViewHref(r.id, "pdf")} target="_blank" className="font-semibold text-emerald-700 underline">PDF 저장</Link></div> : <button type="button" onClick={() => void issueFromRow(r)} disabled={issuingId === r.id} className="rounded-full border-2 border-[#173968] bg-[#173968] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#10213f] hover:text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{issuingId === r.id ? "발급 중" : "관리자 발급"}</button> }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">상세</button> }]} /><Pagination {...pager} />{selected ? <DetailPanel title="수강증/수료증 상세" memoTarget={selected.source === "certificate" ? "certificates" : "enrollments"} memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo(selected.source === "certificate" ? "certificates" : "enrollments", selected.id, ctx.memo)} rows={[["발급번호", selected.certificateNoText], ["서류 종류", selected.documentTypeText], ["수강자", `${selected.userName} / ${selected.birthDateText}`], ["이메일", selected.email || "-"], ["미리보기", selected.source === "certificate" ? <div className="flex flex-wrap gap-2"><Link href={getCertificateViewHref(selected.id)} target="_blank" className="text-[#173968] underline">서류 보기 및 인쇄</Link><Link href={getCertificateViewHref(selected.id, "pdf")} target="_blank" className="text-emerald-700 underline">PDF 저장</Link></div> : <button type="button" onClick={() => void issueFromRow(selected)} disabled={issuingId === selected.id} className="rounded-full border-2 border-[#173968] bg-[#173968] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#10213f] hover:text-white disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-800">{issuingId === selected.id ? "발급 중" : "관리자 발급 및 저장"}</button>], ["결제정보", selected.orderId || "결제정보 없음"], ["환불", selected.source === "certificate" ? "교육 이수 관련 서류가 발급되어 환불이 불가합니다." : "서류 발급 전 환불규정에 따라 계산됩니다."]]} /> : null}</section>;
}

function RefundsView(ctx: any) { const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(e.uid || e.userId); const payment = ctx.maps.paymentByOrder.get(e.orderId || e.paymentId); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, payment, progress, certificate }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", amount: Number(payment?.amount || duiPreventionCourseProduct.price), completedLessons: getCompletedLessons(e, progress), unusedLessons: refund.unusedLessons, refundAmount: refund.refundAmount, refundable: refund.refundable, reason: refund.reason, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), expired: left !== null && left < 0, paymentStatus: payment?.paymentStatus || e.paymentStatus }; }).filter((row: AnyRecord) => textIncludes(row, ["userName", "email", "courseTitle"], ctx.search)); const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => b.refundAmount - a.refundAmount); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]); return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-refunds.csv", sorted)} /><p className="mb-4 rounded-[1.25rem] border border-[#d7deea] bg-white p-4 text-sm text-slate-600">실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다.</p><DataTable rows={pager.paged} columns={[{ key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount) }, { key: "completedLessons", label: "수강 강의" }, { key: "unusedLessons", label: "미수강 강의" }, { key: "refundAmount", label: "예상 환불", render: (r) => formatKrw(r.refundAmount) }, { key: "refundable", label: "가능 여부", render: (r) => r.refundable ? "가능" : "불가" }, { key: "reason", label: "사유" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "expired", label: "만료", render: (r) => r.expired ? "만료" : "유효" }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <DetailPanel title="환불 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["refundable", String(selected.refundable)], ["refundAmount", formatKrw(selected.refundAmount)], ["unusedLessons", selected.unusedLessons], ["reason", selected.reason], ["안내", "실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다."]]} /> : null}</section>; }

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
  useEffect(() => { void runCheck(); }, []);
  const issues = (payload?.issues || []).map((issue: AnyRecord, index: number) => ({ ...issue, id: issue.type + index }));
  const counts = payload?.counts || payload?.health?.counts || {};
  const metadata = payload?.metadata || payload?.health?.metadata || {};
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">수강권·결제 데이터 점검</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void repairAllPaidEnrollments()} disabled={loading || repairing === "all"} className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-900 disabled:bg-slate-100">{repairing === "all" ? "복구 중" : "결제내역 기준 수강권 전체 복구"}</button><button type="button" onClick={() => void runHealth()} disabled={loading} className="rounded-full border border-[#d7deea] bg-white px-5 py-3 text-sm font-bold text-[#173968] disabled:bg-slate-100">Health check</button><button type="button" onClick={() => void runCheck()} disabled={loading} className="rounded-full bg-[#173968] px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300">{loading ? "점검 중" : "다시 점검"}</button></div></div><p className="mb-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">결제·수강권·진도·수료증 연결 상태를 서버 기준으로 확인합니다. 복구 버튼은 결제 완료 수강권 누락 또는 명확한 수동 수강권 상태 보정처럼 안전한 항목에만 표시됩니다.</p>{error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p> : null}{status ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{status}</p> : null}<div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-xl border border-[#d7deea] bg-white p-4"><p className="text-xs font-bold text-slate-500">Firebase project</p><p className="mt-1 break-all text-sm font-black">{metadata.firebaseProjectId || "-"}</p></div>{[["회원", counts.users], ["결제", counts.payments], ["수강권", counts.enrollments], ["활성 수강권", counts.activeEnrollments]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#d7deea] bg-white p-4"><p className="text-xs font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black">{Number(value || 0)}</p></div>)}</div><DataTable rows={issues} columns={[{ key: "severity", label: "중요도" }, { key: "type", label: "유형" }, { key: "uid", label: "회원 ID" }, { key: "courseId", label: "과정" }, { key: "paymentId", label: "결제번호" }, { key: "enrollmentId", label: "수강권" }, { key: "reason", label: "사유" }, { key: "safeRepair", label: "복구", render: (issue) => issue.safeRepair ? <button type="button" onClick={() => void repairIssue(issue)} disabled={repairing === issue.id} className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">{repairing === issue.id ? "복구 중" : "복구"}</button> : <span className="text-slate-500">관리자 확인</span> }]} emptyText="확인 필요한 데이터가 없습니다." /></section>;
}
function CoursesView() {
  const managedCourses = [
    { title: "음주운전 재범방지교육 기본 과정", product: getAdminCourseProduct(duiPreventionCourseProduct.courseId), courseId: duiPreventionCourseProduct.courseId, modules: duiBasicModules },
    { title: "인지행동기반 재발방지교육 심화과정", product: getAdminCourseProduct(DUI_CBT_ADVANCED_COURSE_ID), courseId: DUI_CBT_ADVANCED_COURSE_ID, modules: duiCbtAdvancedModules },
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
      <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">PAYMENT_SECRET_KEY, PG Secret Key, Firebase private key, 서버 비밀키, API Secret은 관리자 화면에 표시하지 않습니다. 관리자 권한은 현재 설정된 관리자 이메일과 사용자 role 필드 기준으로 확인합니다.</p>
    </section>
  );
}

function Pagination({ page, maxPage, setPage }: { page: number; maxPage: number; setPage: (v: number) => void }) { return <div className="mt-4 flex items-center justify-end gap-2"><button onClick={() => setPage(Math.max(1, page - 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">이전</button><span className="text-sm text-slate-600">{page}/{maxPage}</span><button onClick={() => setPage(Math.min(maxPage, page + 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">다음</button></div>; }
