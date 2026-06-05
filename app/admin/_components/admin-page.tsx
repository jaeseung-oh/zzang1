"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { calculateRefundAmount } from "@/lib/payment/refund";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { adminSettings, getAdminEmails, isAdminEmail } from "@/lib/admin/config";

type AdminView = "dashboard" | "users" | "payments" | "enrollments" | "certificates" | "refunds" | "courses" | "settings";
type AdminMenuView = AdminView | "lectures";
type AnyRecord = Record<string, any> & { id: string };

type AdminDataset = {
  users: AnyRecord[];
  payments: AnyRecord[];
  enrollments: AnyRecord[];
  certificates: AnyRecord[];
  progress: AnyRecord[];
  refundPolicies: AnyRecord[];
};

const menu: Array<{ view: AdminMenuView; label: string; href: string }> = [
  { view: "dashboard", label: "대시보드", href: "/admin/dashboard" },
  { view: "users", label: "회원 관리", href: "/admin/users" },
  { view: "payments", label: "결제 관리", href: "/admin/payments" },
  { view: "enrollments", label: "수강권 관리", href: "/admin/enrollments" },
  { view: "certificates", label: "수료증 관리", href: "/admin/certificates" },
  { view: "refunds", label: "환불 관리", href: "/admin/refunds" },
  { view: "courses", label: "강의 관리", href: "/admin/courses" },
  { view: "lectures", label: "강의 영상 확인", href: "/admin/lectures" },
  { view: "settings", label: "시스템 설정", href: "/admin/settings" },
];

const emptyData: AdminDataset = { users: [], payments: [], enrollments: [], certificates: [], progress: [], refundPolicies: [] };

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

function getUserName(user?: AnyRecord) {
  return user?.realName || user?.fullName || user?.name || "미입력";
}

function getBirthDate(user?: AnyRecord) {
  return user?.dateOfBirth || user?.birthDate || user?.certificateIdentity?.dateOfBirth || "미입력";
}

function getCompletedLessons(enrollment?: AnyRecord, progress?: AnyRecord) {
  return Math.max(Number(enrollment?.completedLessons || 0), Number(progress?.completedModuleCount || 0));
}

function getProgressRate(enrollment?: AnyRecord, progress?: AnyRecord) {
  return Math.max(Number(enrollment?.progress || 0), Number(progress?.completionRate || 0));
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
        setAllowed(isAdminEmail(resolvedEmail));
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

  if (checking) return <AdminFrame email="확인 중" view={view}><p className="p-6 text-sm text-slate-600">관리자 데이터를 불러오는 중입니다.</p></AdminFrame>;
  if (!allowed) {
    return <AdminFrame email={email || "미로그인"} view={view}><div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-6 text-rose-800"><p className="font-bold">관리자 권한이 없습니다.</p><p className="mt-2 text-sm">관리자 계정으로 로그인한 경우에만 접근할 수 있습니다.</p></div></AdminFrame>;
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
              <Link key={item.view} href={item.href} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${view === item.view ? "bg-[#173968] text-white" : "bg-[#f8fafc] text-slate-700 hover:bg-[#eef4ff]"}`}>{item.label}</Link>
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
      <button type="button" onClick={onRefresh} className="rounded-full border border-[#d7deea] bg-[#f8fafc] px-4 py-2 text-sm font-semibold">새로고침</button>
      <button type="button" onClick={onCsv} className="rounded-full bg-[#173968] px-4 py-2 text-sm font-bold text-white">CSV 다운로드</button>
    </div>
  );
}

function DataTable({ columns, rows, emptyText = "표시할 데이터가 없습니다." }: { columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => React.ReactNode; align?: "right" }>; rows: AnyRecord[]; emptyText?: string }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#d7deea] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
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
      const names = ["users", "payments", "enrollments", "certificates", "courseProgress", "refundPolicies"] as const;
      const snapshots = await Promise.all(names.map((name) => getDocs(collection(db, name)).catch(() => null)));
      const next = Object.fromEntries(names.map((name, index) => [name === "courseProgress" ? "progress" : name, snapshots[index]?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) ?? []])) as AdminDataset;
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
  return <SettingsView />;
}

async function createAdminDemoData(refresh: () => void) {
  const ok = window.confirm("관리자 계정에 시범 결제/수강완료 데이터를 생성하시겠습니까?");
  if (!ok) return;
  const user = await requireAuthenticatedUser();
  const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
  if (!apiBaseUrl) {
    window.alert("관리자 API 설정이 없습니다.");
    return;
  }
  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}/api/admin/demo-seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ courseId: duiPreventionCourseProduct.courseId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    window.alert(payload?.message || "시범 데이터 생성에 실패했습니다.");
    return;
  }
  window.alert("시범 데이터가 준비되었습니다. 수료증 페이지에서 발급/인쇄를 진행할 수 있습니다.");
  refresh();
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
    ["전체 회원 수", data.users.length, "/admin/users"], ["전체 결제 건수", data.payments.length, "/admin/payments"], ["총 결제금액", formatKrw(totalAmount), "/admin/payments"], ["오늘 결제금액", formatKrw(todayAmount), "/admin/payments"], ["이번 달 결제금액", formatKrw(monthAmount), "/admin/payments"], ["음주운전 예방교육 구매자 수", new Set(payments.filter((p: AnyRecord) => p.courseId === duiPreventionCourseProduct.courseId).map((p: AnyRecord) => p.uid || p.userId)).size, "/admin/enrollments"], ["수강 중인 회원 수", data.enrollments.filter((e: AnyRecord) => e.accessStatus === "active").length, "/admin/enrollments"], ["수강 완료 회원 수", completed.length, "/admin/enrollments"], ["수료증 발급 건수", data.certificates.length, "/admin/certificates"], ["수강기간 만료 건수", expired.length, "/admin/enrollments"], ["환불 가능 대상 건수", refundable.length, "/admin/refunds"],
  ];
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold tracking-[-0.04em]">운영 대시보드</h2><button type="button" onClick={() => void createAdminDemoData(refresh)} className="rounded-full bg-[#173968] px-5 py-3 text-sm font-bold text-white">내 계정 시범 수강완료 만들기</button></div><div className="mb-4 rounded-[1.25rem] border border-[#d7deea] bg-white p-4 text-sm leading-7 text-slate-600">시범 버튼은 관리자 이메일 계정에서만 동작합니다. 생성 후 <Link href="/certificate" className="font-semibold text-[#173968] underline">/certificate</Link>에서 수료증을 발급하고 인쇄할 수 있습니다.</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, href]) => <Link key={String(label)} href={String(href)} className="rounded-[1.25rem] border border-[#d7deea] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-slate-950">{String(value)}</p></Link>)}</div></section>;
}

function UsersView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.users.map((user: AnyRecord) => {
    const enrollments = ctx.data.enrollments.filter((e: AnyRecord) => (e.uid || e.userId) === user.id);
    const certificates = ctx.data.certificates.filter((c: AnyRecord) => (c.uid || c.userId) === user.id);
    return { ...user, userId: user.id, userName: getUserName(user), birthDateText: getBirthDate(user), enrollmentCount: enrollments.length, paid: enrollments.some((e: AnyRecord) => e.paymentStatus === "paid"), certificateIssued: certificates.length > 0, admin: isAdminEmail(user.email) };
  }).filter((row: AnyRecord) => textIncludes(row, ["userId", "userName", "email", "phoneNumber"], ctx.search));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-users.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "userId", label: "사용자 ID" }, { key: "userName", label: "성명" }, { key: "email", label: "이메일" }, { key: "birthDateText", label: "생년월일" }, { key: "phoneNumber", label: "휴대전화" }, { key: "createdAt", label: "가입일", render: (r) => formatDate(r.createdAt) }, { key: "lastLoginAt", label: "최근 로그인", render: (r) => formatDate(r.lastLoginAt) }, { key: "enrollmentCount", label: "수강권" }, { key: "paid", label: "결제", render: (r) => r.paid ? "결제 있음" : "없음" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "admin", label: "관리자", render: (r) => r.admin ? "관리자" : "일반" }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <UserDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function UserDetail({ selected, ctx }: any) {
  const payments = ctx.data.payments.filter((p: AnyRecord) => (p.uid || p.userId) === selected.id);
  const enrollments = ctx.data.enrollments.filter((e: AnyRecord) => (e.uid || e.userId) === selected.id);
  const certificates = ctx.data.certificates.filter((c: AnyRecord) => (c.uid || c.userId) === selected.id);
  const refund = enrollments[0] ? getRefundInfo({ enrollment: enrollments[0], payment: payments[0], progress: ctx.maps.progressByUserCourse.get(`${selected.id}_${enrollments[0].courseId}`), certificate: certificates[0] }) : null;
  return <DetailPanel title="회원 상세" memoTarget="users" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("users", selected.id, ctx.memo)} rows={[["성명", selected.userName], ["이메일", selected.email || "미입력"], ["생년월일", selected.birthDateText], ["결제내역", `${payments.length}건`], ["수강권", `${enrollments.length}건`], ["수료증", certificates[0] ? <Link href={`/certificate?certificateId=${encodeURIComponent(certificates[0].id)}`} className="text-[#173968] underline">보기</Link> : "미발급"], ["예상 환불", refund ? `${formatKrw(refund.refundAmount)} / ${refund.reason}` : "계산 불가"]]} />;
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
  return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체", "결제완료", "결제실패", "결제취소", "환불완료", "오늘 결제", "이번 달 결제"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-payments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "orderId", label: "주문번호" }, { key: "paymentId", label: "결제번호" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명" }, { key: "amount", label: "결제금액", align: "right", render: (r) => formatKrw(Number(r.amount || 0)) }, { key: "method", label: "결제수단" }, { key: "paymentStatus", label: "상태", render: (r) => r.paymentStatus || r.status || "-" }, { key: "createdAt", label: "결제일시", render: (r) => formatDate(r.createdAt || r.orderedAt) }, { key: "approvedAt", label: "승인일시", render: (r) => formatDate(r.approvedAt) }, { key: "enrollmentGranted", label: "수강권", render: (r) => r.enrollmentGranted ? "부여" : "없음" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <PaymentDetail selected={selected} ctx={ctx} /> : null}</section>;
}

function filterPayment(row: AnyRecord, filter: string) { const status = row.paymentStatus || row.status; if (filter === "결제완료") return status === "paid"; if (filter === "결제실패") return status === "failed"; if (filter === "결제취소") return status === "canceled" || status === "cancelled"; if (filter === "환불완료") return status === "refunded"; if (filter === "오늘 결제") return isToday(row.approvedAt || row.createdAt); if (filter === "이번 달 결제") return isThisMonth(row.approvedAt || row.createdAt); return true; }
function PaymentDetail({ selected, ctx }: any) { const enrollment = ctx.data.enrollments.find((e: AnyRecord) => e.orderId === selected.orderId || e.paymentId === selected.paymentId); const certificate = ctx.maps.certificateByUserCourse.get(`${selected.uid || selected.userId}_${selected.courseId}`); const refund = getRefundInfo({ payment: selected, enrollment, certificate }); return <DetailPanel title="결제 상세" memoTarget="payments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("payments", selected.id, ctx.memo)} rows={[["주문번호", selected.orderId], ["결제번호", selected.paymentId || selected.paymentKey || "-"], ["PG 원본 응답", <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selected.rawResponse || {}, null, 2)}</pre>], ["연결 수강권", enrollment?.id || "수강권 없음"], ["연결 수료증", certificate ? <Link href={`/certificate?certificateId=${encodeURIComponent(certificate.id)}`} className="text-[#173968] underline">{certificate.certificateNo || "보기"}</Link> : "미발급"], ["예상 환불", `${formatKrw(refund.refundAmount)} / ${refund.reason}`]]} />; }

function EnrollmentsView(ctx: any) {
  const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(e.uid || e.userId); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, progress, certificate, payment: ctx.maps.paymentByOrder.get(e.orderId || e.paymentId) }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", progressRate: getProgressRate(e, progress), completedLessons: getCompletedLessons(e, progress), leftDays: left, expired: left !== null && left < 0, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), refundAmount: refund.refundAmount, refundable: refund.refundable, refundReason: refund.reason }; }).filter((row: AnyRecord) => textIncludes(row, ["id", "userName", "email", "courseTitle"], ctx.search)).filter((row: AnyRecord) => filterEnrollment(row, ctx.filter));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.purchasedAt || b.createdAt)?.getTime() || 0) - (toDate(a.purchasedAt || a.createdAt)?.getTime() || 0)); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체", "수강 중 active", "수강 완료 completed", "수강기간 만료 expired", "수료증 발급 완료", "수료증 미발급", "환불 가능", "환불 불가"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-enrollments.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "id", label: "수강권 ID" }, { key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "과정명" }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "createdAt", label: "시작일", render: (r) => formatDate(r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "leftDays", label: "남은 수강일", render: (r) => r.leftDays === null ? "-" : `${r.leftDays}일` }, { key: "accessStatus", label: "상태" }, { key: "progressRate", label: "진행률", render: (r) => `${r.progressRate}%` }, { key: "completedLessons", label: "완료/전체", render: (r) => `${r.completedLessons}/${r.totalLessons || 5}` }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "refundAmount", label: "환불예상", align: "right", render: (r) => formatKrw(r.refundAmount) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <EnrollmentDetail selected={selected} ctx={ctx} /> : null}</section>;
}
function filterEnrollment(row: AnyRecord, filter: string) { if (filter === "수강 중 active") return row.accessStatus === "active" && !row.expired; if (filter === "수강 완료 completed") return row.completedLessons >= 5 || row.progressRate >= 100; if (filter === "수강기간 만료 expired") return row.expired; if (filter === "수료증 발급 완료") return row.certificateIssued; if (filter === "수료증 미발급") return !row.certificateIssued; if (filter === "환불 가능") return row.refundable; if (filter === "환불 불가") return !row.refundable; return true; }
function EnrollmentDetail({ selected, ctx }: any) { const progress = ctx.maps.progressByUserCourse.get(`${selected.uid || selected.userId}_${selected.courseId}`); const modules = defaultCourse.modules.map((m, i) => `${i + 1}강 ${progress?.moduleProgress?.[m.id]?.isCompleted ? "완료" : "미완료"}`).join(" / "); return <DetailPanel title="수강권 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["사용자", `${selected.userName} / ${selected.email}`], ["결제", selected.orderId || selected.paymentId || "결제정보 없음"], ["강의별 완료", modules], ["진행률", `${selected.progressRate}%`], ["수강기간", `${formatDateOnly(selected.purchasedAt || selected.createdAt)} - ${formatDateOnly(selected.expiresAt)}`], ["만료 여부", selected.expired ? "만료" : "유효"], ["수료증", selected.certificateIssued ? selected.certificateNo || "발급" : "미발급"], ["환불", `${formatKrw(selected.refundAmount)} / ${selected.refundReason}`]]} />; }

function CertificatesView(ctx: any) {
  const issuedRows: AnyRecord[] = ctx.data.certificates.map((c: AnyRecord) => ({
    ...c,
    id: c.id,
    source: "certificate",
    userName: c.userName || getUserName(ctx.maps.userById.get(c.uid || c.userId)),
    birthDateText: c.birthDate || c.dateOfBirth || "미입력",
    certificateNoText: c.certificateNo || c.issueNumber || "-",
    documentTypeText: c.documentType === "attendance" ? "수강확인증" : "수료증",
    issueStatusText: "발급완료",
  }));
  const issuedIds = new Set(issuedRows.map((row) => row.id));
  const pendingRows: AnyRecord[] = ctx.data.enrollments
    .filter((e: AnyRecord) => !issuedIds.has(e.id) && !issuedIds.has(`${e.uid || e.userId}_${e.courseId}`))
    .map((e: AnyRecord) => {
      const user = ctx.maps.userById.get(e.uid || e.userId);
      const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`);
      return {
        ...e,
        id: e.id,
        source: "enrollment",
        userName: getUserName(user),
        birthDateText: getBirthDate(user),
        email: user?.email || "",
        certificateNoText: "미발급",
        documentTypeText: getCompletedLessons(e, progress) >= duiPreventionCourseProduct.totalLessons ? "수료증 발급 가능" : "수강확인증 발급 가능",
        issueStatusText: "미발급",
        issuedAt: null,
        completedAt: progress?.completedAt || e.completedAt || null,
      };
    });
  const rows = [...issuedRows, ...pendingRows].filter((row: AnyRecord) => textIncludes(row, ["certificateNoText", "userName", "email", "birthDateText"], ctx.search));
  const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => (toDate(b.issuedAt || b.createdAt || b.purchasedAt)?.getTime() || 0) - (toDate(a.issuedAt || a.createdAt || a.purchasedAt)?.getTime() || 0));
  const pager = usePagination(sorted);
  const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId);
  useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]);
  return <section><div className="mb-4 flex flex-wrap gap-2"><Link href="/certificate?adminPreview=attendance" className="rounded-full bg-[#173968] px-4 py-2 text-sm font-semibold text-white">수강확인증 샘플 보기</Link><Link href="/certificate?adminPreview=completion" className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold text-[#173968]">수료증 샘플 보기</Link></div><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-certificates.csv", sorted)} /><DataTable rows={pager.paged} columns={[{ key: "certificateNoText", label: "발급번호" }, { key: "documentTypeText", label: "서류 종류" }, { key: "userName", label: "사용자명" }, { key: "birthDateText", label: "생년월일" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "교육과정명" }, { key: "completedAt", label: "수료/수강일", render: (r) => formatDate(r.completedAt) }, { key: "issuedAt", label: "발급일", render: (r) => formatDate(r.issuedAt) }, { key: "issueStatusText", label: "상태" }, { key: "view", label: "서류", render: (r) => r.source === "certificate" ? <Link href={`/certificate?certificateId=${encodeURIComponent(r.id)}`} className="font-semibold text-[#173968] underline">보기/인쇄</Link> : <span className="text-slate-500">사용자 발급 전</span> }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">상세</button> }]} /><Pagination {...pager} />{selected ? <DetailPanel title="수강증/수료증 상세" memoTarget={selected.source === "certificate" ? "certificates" : "enrollments"} memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo(selected.source === "certificate" ? "certificates" : "enrollments", selected.id, ctx.memo)} rows={[["발급번호", selected.certificateNoText], ["서류 종류", selected.documentTypeText], ["수강자", `${selected.userName} / ${selected.birthDateText}`], ["이메일", selected.email || "-"], ["미리보기", selected.source === "certificate" ? <Link href={`/certificate?certificateId=${encodeURIComponent(selected.id)}`} className="text-[#173968] underline">서류 보기 및 인쇄</Link> : "아직 사용자가 발급하지 않았습니다."], ["결제정보", selected.orderId || "결제정보 없음"], ["환불", selected.source === "certificate" ? "교육 이수 관련 서류가 발급되어 환불이 불가합니다." : "서류 발급 전 환불규정에 따라 계산됩니다."]]} /> : null}</section>;
}

function RefundsView(ctx: any) { const rows: AnyRecord[] = ctx.data.enrollments.map((e: AnyRecord) => { const user = ctx.maps.userById.get(e.uid || e.userId); const payment = ctx.maps.paymentByOrder.get(e.orderId || e.paymentId); const progress = ctx.maps.progressByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const certificate = ctx.maps.certificateByUserCourse.get(`${e.uid || e.userId}_${e.courseId}`); const refund = getRefundInfo({ enrollment: e, payment, progress, certificate }); const left = daysLeft(e.expiresAt); return { ...e, userName: getUserName(user), email: user?.email || "", amount: Number(payment?.amount || duiPreventionCourseProduct.price), completedLessons: getCompletedLessons(e, progress), unusedLessons: refund.unusedLessons, refundAmount: refund.refundAmount, refundable: refund.refundable, reason: refund.reason, certificateIssued: Boolean(e.certificateIssued || certificate?.certificateNo), expired: left !== null && left < 0, paymentStatus: payment?.paymentStatus || e.paymentStatus }; }).filter((row: AnyRecord) => textIncludes(row, ["userName", "email", "courseTitle"], ctx.search)); const sorted = rows.sort((a: AnyRecord, b: AnyRecord) => b.refundAmount - a.refundAmount); const pager = usePagination(sorted); const selected = sorted.find((row: AnyRecord) => row.id === ctx.selectedId); useEffect(() => { ctx.setMemo(selected?.adminMemo || ""); }, [selected?.id]); return <section><AdminToolbar search={ctx.search} setSearch={ctx.setSearch} filter={ctx.filter} setFilter={ctx.setFilter} filters={["전체"]} onRefresh={ctx.refresh} onCsv={() => downloadCsv("admin-refunds.csv", sorted)} /><p className="mb-4 rounded-[1.25rem] border border-[#d7deea] bg-white p-4 text-sm text-slate-600">실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다.</p><DataTable rows={pager.paged} columns={[{ key: "userName", label: "사용자명" }, { key: "email", label: "이메일" }, { key: "courseTitle", label: "상품명" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount) }, { key: "completedLessons", label: "수강 강의" }, { key: "unusedLessons", label: "미수강 강의" }, { key: "refundAmount", label: "예상 환불", render: (r) => formatKrw(r.refundAmount) }, { key: "refundable", label: "가능 여부", render: (r) => r.refundable ? "가능" : "불가" }, { key: "reason", label: "사유" }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }, { key: "expired", label: "만료", render: (r) => r.expired ? "만료" : "유효" }, { key: "purchasedAt", label: "결제일", render: (r) => formatDate(r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "detail", label: "상세", render: (r) => <button onClick={() => ctx.setSelectedId(r.id)} className="font-semibold text-[#173968] underline">보기</button> }]} /><Pagination {...pager} />{selected ? <DetailPanel title="환불 상세" memoTarget="enrollments" memo={ctx.memo} setMemo={ctx.setMemo} onSaveMemo={() => ctx.saveMemo("enrollments", selected.id, ctx.memo)} rows={[["refundable", String(selected.refundable)], ["refundAmount", formatKrw(selected.refundAmount)], ["unusedLessons", selected.unusedLessons], ["reason", selected.reason], ["안내", "실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다."]]} /> : null}</section>; }

function CoursesView() { return <section><h2 className="mb-4 text-3xl font-semibold tracking-[-0.04em]">강의 관리</h2><DetailPanel title="음주운전 예방교육" rows={[["courseId", duiPreventionCourseProduct.courseId], ["courseTitle", duiPreventionCourseProduct.courseTitle], ["결제금액", formatKrw(duiPreventionCourseProduct.price)], ["총 강의 수", `${duiPreventionCourseProduct.totalLessons}강`], ["수강기간", `${duiPreventionCourseProduct.durationDays}일`], ["환불 산정 금액", formatKrw(duiPreventionCourseProduct.pricePerLesson)], ["수료증 발급", duiPreventionCourseProduct.certificateAvailable ? "가능" : "불가"], ["공개 여부", "공개"], ["설명", duiPreventionCourseProduct.description]]} /><div className="mt-5 grid gap-3">{defaultCourse.modules.map((m, i) => <div key={m.id} className="rounded-[1.25rem] border border-[#d7deea] bg-white p-4"><p className="font-bold">{i + 1}강. {m.title}</p><p className="mt-2 text-sm text-slate-600">lessonId: {m.id} / videoId: {m.cloudflareStreamUid || m.secureVideoPath || "미설정"} / 재생시간: {m.minutes}분 / 공개 여부: 공개 / 완료 기준: 100% 시청</p></div>)}</div></section>; }

function SettingsView() { const settings = [["사이트명", adminSettings.siteName], ["운영자명", adminSettings.operatorName], ["사업자명", adminSettings.businessName], ["대표자명", adminSettings.representativeName], ["고객센터 이메일", adminSettings.supportEmail], ["고객센터 연락처", adminSettings.supportPhone], ["사업자등록번호", adminSettings.businessNumber], ["통신판매업 신고번호", adminSettings.commerceRegistrationNumber], ["수료증 발급기관명", adminSettings.certificateIssuerName], ["관리자 이메일 목록", getAdminEmails().join(", ")], ["결제사 이름", adminSettings.paymentProviderName], ["결제 환경", adminSettings.paymentEnvironment]]; return <section><h2 className="mb-4 text-3xl font-semibold tracking-[-0.04em]">시스템 설정</h2><DetailPanel title="운영 설정" rows={settings as Array<[string, React.ReactNode]>} /><p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">PAYMENT_SECRET_KEY, PG Secret Key, Firebase private key, 서버 비밀키, API Secret은 관리자 화면에 표시하지 않습니다. 향후 Firebase Custom Claims 또는 admin role 필드로 확장할 수 있습니다.</p></section>; }

function Pagination({ page, maxPage, setPage }: { page: number; maxPage: number; setPage: (v: number) => void }) { return <div className="mt-4 flex items-center justify-end gap-2"><button onClick={() => setPage(Math.max(1, page - 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold">이전</button><span className="text-sm text-slate-600">{page}/{maxPage}</span><button onClick={() => setPage(Math.min(maxPage, page + 1))} className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-sm font-semibold">다음</button></div>; }
