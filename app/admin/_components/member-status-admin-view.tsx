
"use client";

import { useMemo, useRef, useState } from "react";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";

type AnyRecord = Record<string, any> & { id?: string };

type MemberListResponse = {
  ok: boolean;
  members: AnyRecord[];
  nextCursor: string;
  readCount: number;
  warnings?: string[];
};

type MemberDetailResponse = {
  ok: boolean;
  member: AnyRecord | null;
  payments: AnyRecord[];
  enrollments: AnyRecord[];
  progress: AnyRecord[];
  certificates: AnyRecord[];
  refunds: AnyRecord[];
  timeline: AnyRecord[];
  readCount: number;
  warnings?: string[];
};

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
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(/\. /g, "-").replace(/\./g, "");
}

function formatKrw(value: any) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

function getName(row: AnyRecord) {
  return row.name || row.realName || row.fullName || row.displayName || row.email?.split("@")[0] || "이름 없음";
}

function getBirthDateText(row: AnyRecord) {
  return row.birthDate || row.dateOfBirth || row.date_of_birth || row.birth_date || row.birthday || row.certificateBirthDate || row.certificate_birth_date || row.certificateIdentity?.dateOfBirth || row.certificateIdentity?.birthDate || "-";
}

function getPhoneText(row: AnyRecord) {
  return row.phoneNumber || row.phone_number || row.phone || row.mobile || row.tel || row.telephone || row.contactPhone || row.contactNumber || row.customerPhone || row.buyerPhone || row.profile?.phoneNumber || row.profile?.phone || "-";
}

function getCompletionText(row: AnyRecord) {
  if (row.completionStatus === true || row.completionStatus === "completed" || row.certificateIssued) return "수료완료";
  return row.completionStatus || "미수료";
}

function getPaymentSummary(row: AnyRecord) {
  return row.adminPaymentSummary || row.paymentSummary || {};
}

function getPaymentText(row: AnyRecord) {
  const summary = getPaymentSummary(row);
  if ((row.refundStatus && row.refundStatus !== "none") || (summary.refundStatus && summary.refundStatus !== "none")) return "환불";
  const status = String(row.paymentStatus || summary.paymentStatus || summary.paymentState || "").toLowerCase();
  if (row.hasPayment || summary.paymentState === "결제완료" || ["paid", "done", "completed", "complete", "success", "approved"].includes(status)) return "결제이력 있음";
  if (status.includes("fail") || status.includes("실패")) return "결제실패";
  return "미결제";
}

function getLastCourseName(row: AnyRecord) {
  const summary = getPaymentSummary(row);
  return row.lastCourseName || row.lastCourseId || summary.courseTitle || summary.productTitle || summary.courseId || "-";
}

function getLastPaymentDate(row: AnyRecord) {
  const summary = getPaymentSummary(row);
  return row.lastPaymentDate || summary.paidAt || summary.lastPaymentAt || null;
}

function getLastPaymentAmount(row: AnyRecord) {
  const summary = getPaymentSummary(row);
  return row.lastPaymentAmount || summary.amount || 0;
}

async function fetchAdminJson(path: string, init?: RequestInit) {
  const user = await requireAuthenticatedUser();
  const idToken = await user.getIdToken();
  const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
  if (!baseUrl) throw new Error("관리자 API URL이 설정되지 않았습니다.");
  const response = await fetch(baseUrl + path, {
    ...init,
    headers: { Authorization: "Bearer " + idToken, "Cache-Control": "no-store", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.message || "관리자 회원 API 조회에 실패했습니다.");
  return payload;
}

function StatusBadge({ children }: { children: string }) {
  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">{children}</span>;
}


function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><p className="text-[11px] font-black text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">{children}</div></div>;
}

function MiniTable({ title, rows, columns }: { title: string; rows: AnyRecord[]; columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => React.ReactNode }> }) {
  return <section className="rounded-lg border border-[#d7deea] bg-white p-4">
    <h3 className="text-base font-black text-slate-950">{title}</h3>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead><tr>{columns.map((column) => <th key={column.key} className="border-b border-slate-200 px-3 py-2 text-xs font-black text-slate-500">{column.label}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || row.paymentId || row.enrollmentId || index}>{columns.map((column) => <td key={column.key} className="border-b border-slate-100 px-3 py-2 align-top text-slate-800">{column.render ? column.render(row) : String(row[column.key] ?? "-")}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-sm font-semibold text-slate-500">기록 없음</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}

export function MemberStatusAdminView() {
  const [members, setMembers] = useState<AnyRecord[]>([]);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState("");
  const [currentCursor, setCurrentCursor] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [readLog, setReadLog] = useState("조회 전");
  const [selected, setSelected] = useState<MemberDetailResponse | null>(null);
  const inFlightKey = useRef("");

  const loadPage = async (cursor = "", direction: "first" | "next" | "prev" = "first") => {
    const key = "members:" + cursor;
    if (inFlightKey.current === key) return;
    inFlightKey.current = key;
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const payload = await fetchAdminJson("/api/admin/members?" + params.toString()) as MemberListResponse;
      setMembers(payload.members || []);
      setNextCursor(payload.nextCursor || "");
      setCurrentCursor(cursor);
      setCursorStack((stack) => direction === "first" ? [] : direction === "next" ? [...stack, currentCursor] : stack.slice(0, -1));
      const message = `목록 ${payload.readCount || 0} reads / ${payload.members?.length || 0}명`;
      setReadLog(message);
      console.info("[admin-member-status:reads]", { type: "list", readCount: payload.readCount, count: payload.members?.length || 0, cursor });
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
      inFlightKey.current = "";
    }
  };

  const loadDetail = async (member: AnyRecord) => {
    const uid = member.uid || member.userId || member.id || "";
    if (!uid) return;
    setDetailLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ uid });
      if (member.email) params.set("email", member.email);
      const payload = await fetchAdminJson("/api/admin/member-detail?" + params.toString()) as MemberDetailResponse;
      setSelected(payload);
      const message = `상세 ${payload.readCount || 0} reads / UID ${uid}`;
      setReadLog(message);
      console.info("[admin-member-status:reads]", { type: "detail", uid, readCount: payload.readCount });
    } catch (detailError) {
      console.error(detailError);
      setError(detailError instanceof Error ? detailError.message : String(detailError));
    } finally {
      setDetailLoading(false);
    }
  };



  const detailMember = selected?.member;
  const refundRows = useMemo(() => selected?.refunds || [], [selected]);

  return <section className="min-w-0 space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">최근 60일 Firebase CRM</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">가입일 기준 최근 60일 users 문서만 50명 단위로 조회합니다. 결제·수강 요약은 users 문서의 관리자 요약 필드만 사용하고 상세 이력은 회원 선택 후 별도 조회합니다.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => void loadPage("", "first")} disabled={loading} className="rounded-lg bg-[#173968] px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">{loading ? "조회 중" : "조회"}</button>
      </div>
    </div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">Firestore 읽기 로그: {readLog}</div>
    {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div> : null}
    <div className="grid gap-3 md:hidden">
      {members.length ? members.map((member) => <article key={member.uid || member.id} className="rounded-lg border border-[#d7deea] bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <MobileField label="가입자명">{getName(member)}</MobileField>
          <MobileField label="가입 아이디/이메일">{member.loginId || member.email || "-"}</MobileField>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="생년월일">{getBirthDateText(member)}</MobileField>
            <MobileField label="연락처">{getPhoneText(member)}</MobileField>
            <MobileField label="가입일">{formatDate(member.crmJoinedAt || member.joinedAt || member.createdAt)}</MobileField>
            <MobileField label="최근 로그인">{formatDate(member.lastLoginAt)}</MobileField>
            <MobileField label="결제 여부"><StatusBadge>{getPaymentText(member)}</StatusBadge></MobileField>
          </div>
          <MobileField label="최근 결제과정">{getLastCourseName(member)}</MobileField>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="최근 결제금액">{formatKrw(getLastPaymentAmount(member))}</MobileField>
            <MobileField label="수강상태"><StatusBadge>{member.enrollmentStatus || "수강권 없음"}</StatusBadge></MobileField>
            <MobileField label="수료여부">{getCompletionText(member)}</MobileField>
            <MobileField label="수료일">{formatDate(member.completionDate)}</MobileField>
          </div>
          <button type="button" onClick={() => void loadDetail(member)} className="min-h-10 rounded-lg bg-[#173968] px-3 py-2 text-xs font-black text-white">상세보기</button>
        </div>
      </article>) : <div className="rounded-lg border border-[#d7deea] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">조회 버튼을 누르면 50명 단위로 표시됩니다.</div>}
    </div>

    <div className="hidden overflow-x-auto rounded-lg border border-[#d7deea] bg-white md:block">
      <table className="min-w-[1600px] border-separate border-spacing-0 text-left text-sm">
        <thead><tr>{["가입자명", "가입 아이디/이메일", "생년월일", "연락처", "가입일", "최근 로그인", "결제 여부", "최근 결제과정", "최근 결제금액", "수강상태", "수료여부", "수료일", "회원 상태", "상세"].map((label) => <th key={label} className="border-b border-slate-200 px-3 py-3 text-xs font-black text-slate-500">{label}</th>)}</tr></thead>
        <tbody>{members.length ? members.map((member) => <tr key={member.uid || member.id} className="hover:bg-slate-50">
          <td className="border-b border-slate-100 px-3 py-3 font-bold text-slate-950">{getName(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{member.loginId || member.email || "-"}</td>
          <td className="border-b border-slate-100 px-3 py-3">{getBirthDateText(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{getPhoneText(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{formatDate(member.crmJoinedAt || member.joinedAt || member.createdAt)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{formatDate(member.lastLoginAt)}</td>
          <td className="border-b border-slate-100 px-3 py-3"><StatusBadge>{getPaymentText(member)}</StatusBadge></td>
          <td className="border-b border-slate-100 px-3 py-3">{getLastCourseName(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3 text-right">{formatKrw(getLastPaymentAmount(member))}</td>
          <td className="border-b border-slate-100 px-3 py-3"><StatusBadge>{member.enrollmentStatus || "수강권 없음"}</StatusBadge></td>
          <td className="border-b border-slate-100 px-3 py-3">{getCompletionText(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{formatDate(member.completionDate)}</td>
          <td className="border-b border-slate-100 px-3 py-3">{member.memberStatus || member.status || "정상"}</td>
          <td className="border-b border-slate-100 px-3 py-3"><button type="button" onClick={() => void loadDetail(member)} className="rounded-lg bg-[#173968] px-3 py-1.5 text-xs font-black text-white">상세보기</button></td>
        </tr>) : <tr><td colSpan={14} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">조회 버튼을 누르면 50명 단위로 표시됩니다.</td></tr>}</tbody>
      </table>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button type="button" onClick={() => void loadPage(cursorStack[cursorStack.length - 1] || "", "prev")} disabled={loading || cursorStack.length === 0} className="rounded-lg border border-[#d7deea] bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:text-slate-300 sm:px-4">이전 50명</button>
      <span className="max-w-[120px] truncate text-center text-xs font-bold text-slate-500 sm:max-w-none">{currentCursor || "처음"}</span>
      <button type="button" onClick={() => void loadPage(nextCursor, "next")} disabled={loading || !nextCursor} className="rounded-lg border border-[#d7deea] bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:text-slate-300 sm:px-4">다음 50명</button>
    </div>
    {detailLoading ? <div className="rounded-lg border border-[#d7deea] bg-white p-5 text-sm font-bold text-slate-600">회원 상세를 불러오는 중입니다.</div> : null}
    {selected && detailMember ? <section className="min-w-0 space-y-4 rounded-lg border border-[#d7deea] bg-[#f8fafc] p-3 sm:p-4">
      <div className="rounded-lg border border-[#d7deea] bg-white p-4">
        <h2 className="text-xl font-black text-slate-950">{getName(detailMember)} 상세</h2>
        <p className="mt-1 text-sm text-slate-600">{detailMember.uid || detailMember.id} / {detailMember.email || "이메일 없음"}</p>
      </div>
      <MiniTable title="전체 결제 이력" rows={selected.payments || []} columns={[{ key: "orderId", label: "주문번호" }, { key: "paymentMethod", label: "결제수단", render: (r) => r.paymentMethod || r.method || r.payMethod || "-" }, { key: "courseName", label: "과정명", render: (r) => r.courseName || r.courseTitle || r.productTitle || "-" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount || r.paidAmount) }, { key: "paymentStatus", label: "상태", render: (r) => r.paymentStatus || r.status || "-" }, { key: "paidAt", label: "결제일", render: (r) => formatDate(r.paidAt || r.approvedAt || r.createdAt) }, { key: "refundStatus", label: "환불", render: (r) => r.refundStatus || (r.refundedAt ? "refunded" : "none") }]} />
      <MiniTable title="전체 수강 이력" rows={selected.enrollments || []} columns={[{ key: "courseName", label: "과정명", render: (r) => r.courseName || r.courseTitle || r.courseId || "-" }, { key: "paymentId", label: "paymentId", render: (r) => r.paymentId || r.orderId || "-" }, { key: "startedAt", label: "수강 시작", render: (r) => formatDate(r.startedAt || r.createdAt || r.purchasedAt) }, { key: "expiresAt", label: "만료일", render: (r) => formatDate(r.expiresAt) }, { key: "progress", label: "진도율", render: (r) => String(r.progress ?? r.progressRate ?? 0) + "%" }, { key: "completionStatus", label: "수료", render: (r) => getCompletionText(r) }, { key: "completionDate", label: "수료일", render: (r) => formatDate(r.completionDate || r.completedAt) }, { key: "certificateIssued", label: "수료증", render: (r) => r.certificateIssued ? "발급" : "미발급" }]} />
      <MiniTable title="수료증 발급 이력" rows={selected.certificates || []} columns={[{ key: "certificateNo", label: "발급번호" }, { key: "courseId", label: "과정" }, { key: "issuedAt", label: "발급일", render: (r) => formatDate(r.issuedAt || r.createdAt) }, { key: "certificateIssuedAt", label: "최초 발급일", render: (r) => formatDate(r.certificateIssuedAt || r.firstIssuedAt) }]} />
      <MiniTable title="환불 이력" rows={refundRows} columns={[{ key: "orderId", label: "주문번호" }, { key: "courseName", label: "과정명", render: (r) => r.courseName || r.courseTitle || "-" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount || r.paidAmount) }, { key: "refundStatus", label: "환불상태" }, { key: "refundedAt", label: "환불일", render: (r) => formatDate(r.refundedAt || r.cancelledAt || r.canceledAt) }]} />
      <MiniTable title="회원 타임라인" rows={selected.timeline || []} columns={[{ key: "at", label: "일시", render: (r) => formatDate(r.at) }, { key: "label", label: "활동" }, { key: "detail", label: "내용" }]} />
    </section> : null}
  </section>;
}
