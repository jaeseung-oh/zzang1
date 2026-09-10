"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";

type AnyRecord = Record<string, any>;

const filterOptions = ["전체", "결제완료", "미결제", "수강권 없음", "결제완료 + 수강권 없음", "수강중", "수료완료", "문서 생성됨", "문서 없음"];
const sortOptions = [
  { value: "joined_desc", label: "가입일 최신순" },
  { value: "joined_asc", label: "가입일 오래된순" },
  { value: "payment_desc", label: "결제일 최신순" },
  { value: "name_asc", label: "이름 가나다순" },
];

function toDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value: any) {
  const date = toDate(value);
  if (!date) return "-";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return parts.replace("T", " ");
}

function formatKrw(value: any) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

function shortUid(value: any) {
  const text = String(value || "");
  return text.length > 10 ? text.slice(0, 10) + "..." : text || "-";
}

function getLedgerBirthDate(member: AnyRecord) {
  return member.birth_date || member.birthDate || member.dateOfBirth || member.date_of_birth || "미입력";
}

function getLedgerPhone(member: AnyRecord) {
  return member.phone || member.phoneNumber || member.phone_number || member.mobile || member.tel || "미입력";
}

async function copyText(value: any) {
  const text = String(value || "");
  if (!text) return;
  await navigator.clipboard?.writeText(text).catch(() => undefined);
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
  if (!response.ok || payload?.ok === false) throw new Error(payload?.message || "Supabase 원장 API 요청에 실패했습니다.");
  return payload;
}

function Badge({ label }: { label: string }) {
  const tone = label === "결제완료" || label === "생성됨" || label === "수료완료"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : label === "환불" || label === "만료" || label === "결제완료 + 수강권 없음"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : label === "결제실패" || label === "취소"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{label || "-"}</span>;
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
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column.key} className="border-b border-slate-100 px-3 py-2 align-top text-slate-800">{column.render ? column.render(row) : String(row[column.key] ?? "-")}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-sm font-semibold text-slate-500">기록 없음</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}

export function SupabaseLedgerAdminView() {
  const [members, setMembers] = useState<AnyRecord[]>([]);
  const [detail, setDetail] = useState<AnyRecord | null>(null);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("조회 전");
  const [recovering, setRecovering] = useState(false);
  const [recoveryLog, setRecoveryLog] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("전체");
  const [sort, setSort] = useState("joined_desc");

  const params = useMemo(() => ({ search: search.trim(), filter, sort }), [search, filter, sort]);

  const loadMembers = async (next = 0) => {
    setLoading(true);
    setError("");
    setDetail(null);
    try {
      const query = new URLSearchParams({ limit: "50", offset: String(next), sort: params.sort });
      if (params.search) query.set("search", params.search);
      if (params.filter !== "전체") query.set("filter", params.filter);
      const payload = await fetchAdminJson("/api/admin/supabase/members?" + query.toString());
      setMembers(payload.members || []);
      setOffset(next);
      setNextOffset(payload.nextOffset ?? null);
      setStatus(`회원 ${payload.members?.length || 0}명 조회 / ${sortOptions.find((item) => item.value === params.sort)?.label || "가입일 최신순"}`);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers(0);
  }, []);

  const runRecovery = async () => {
    const ok = window.confirm("Firebase 기존 결제/수강/문서 이력 중 Supabase에 없는 누락분만 5건 단위로 복구합니다. 기존 Supabase/Firebase 데이터는 삭제하거나 초기화하지 않습니다. 실행할까요?");
    if (!ok) return;
    setRecovering(true);
    setError("");
    setRecoveryLog("복구 시작: payments 단계부터 확인 중");
    try {
      let phase = "payments";
      let cursor = "";
      let batches = 0;
      const totals = { memberCount: 0, paymentCount: 0, enrollmentCount: 0, documentCount: 0, skippedCount: 0, failedCount: 0, processedCount: 0 };
      while (phase && batches < 300) {
        const payload = await fetchAdminJson("/api/admin/supabase/migration/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: "COPY_FIREBASE_TO_SUPABASE", phase, cursor, batchSize: 5 }),
        });
        batches += 1;
        totals.memberCount += Number(payload.memberCount || 0);
        totals.paymentCount += Number(payload.paymentCount || 0);
        totals.enrollmentCount += Number(payload.enrollmentCount || 0);
        totals.documentCount += Number(payload.documentCount || 0);
        totals.skippedCount += Number(payload.skippedCount || 0);
        totals.failedCount += Number(payload.failedCount || 0);
        totals.processedCount += Number(payload.processedCount || 0);
        setRecoveryLog(`복구 진행: ${payload.phase} / 배치 ${batches}회 / 결제 ${totals.paymentCount}건 / 수강 ${totals.enrollmentCount}건 / 문서 ${totals.documentCount}건 / 건너뜀 ${totals.skippedCount}건 / 실패 ${totals.failedCount}건`);
        if (payload.done || !payload.nextPhase) break;
        phase = payload.nextPhase;
        cursor = payload.nextCursor || "";
      }
      setRecoveryLog(`복구 완료: 처리 ${totals.processedCount}건 / 결제 ${totals.paymentCount}건 / 수강 ${totals.enrollmentCount}건 / 문서 ${totals.documentCount}건 / 건너뜀 ${totals.skippedCount}건 / 실패 ${totals.failedCount}건`);
      await loadMembers(0);
    } catch (recoverError) {
      console.error(recoverError);
      setError(recoverError instanceof Error ? recoverError.message : String(recoverError));
    } finally {
      setRecovering(false);
    }
  };

  const loadDetail = async (firebaseUid: string) => {
    setDetailLoading(true);
    setError("");
    try {
      const payload = await fetchAdminJson("/api/admin/supabase/member-detail?firebase_uid=" + encodeURIComponent(firebaseUid));
      setDetail(payload);
    } catch (detailError) {
      console.error(detailError);
      setError(detailError instanceof Error ? detailError.message : String(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const detailMember = detail?.member;

  return <section className="min-w-0 space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">회원 전체 원장</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Supabase members 기준 50명씩 조회하고, 같은 페이지 UID의 결제·수강권·문서 상태만 묶음으로 합산합니다.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => void runRecovery()} disabled={recovering || loading} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 disabled:bg-slate-100 disabled:text-slate-400 sm:px-4">{recovering ? "복구 중" : "누락 원장 복구"}</button>
        <button type="button" onClick={() => void loadMembers(0)} disabled={loading || recovering} className="rounded-lg bg-[#173968] px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:px-4">{loading ? "조회 중" : "새로고침"}</button>
      </div>
    </div>

    <div className="grid gap-2 rounded-lg border border-[#d7deea] bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px_110px]">
      <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadMembers(0); }} placeholder="회원 ID, 이메일, 이름, 과정명, 주문번호 검색" className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#173968]" />
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#173968]">{filterOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#173968]">{sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <button type="button" onClick={() => void loadMembers(0)} disabled={loading} className="min-h-10 rounded-lg bg-[#173968] px-4 text-sm font-black text-white disabled:bg-slate-300">검색</button>
    </div>

    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">{status}</div>
    {recoveryLog ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{recoveryLog}</div> : null}
    {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div> : null}

    <div className="grid gap-3 md:hidden">
      {members.length ? members.map((member) => <article key={member.firebase_uid} onClick={() => void loadDetail(member.firebase_uid)} className={`cursor-pointer rounded-lg border border-[#d7deea] bg-white p-4 shadow-sm ${member.ledger_warning ? "ring-2 ring-amber-200" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <MobileField label="회원 ID"><span className="font-mono text-xs" title={member.firebase_uid}>{shortUid(member.firebase_uid)}</span></MobileField>
          <button type="button" onClick={(event) => { event.stopPropagation(); void copyText(member.firebase_uid); }} className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">UID 복사</button>
        </div>
        <div className="mt-3 grid gap-3">
          <MobileField label="가입 이메일"><span title={member.login_id || member.email || ""}>{member.login_id || member.email || "-"}</span><button type="button" onClick={(event) => { event.stopPropagation(); void copyText(member.login_id || member.email); }} className="ml-2 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">복사</button></MobileField>
          <MobileField label="가입자명">{member.name || "미입력"}</MobileField>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="생년월일">{getLedgerBirthDate(member)}</MobileField>
            <MobileField label="연락처">{getLedgerPhone(member)}</MobileField>
            <MobileField label="결제 여부"><Badge label={member.ledger_payment_status || "미결제"} /></MobileField>
            <MobileField label="수강권"><div className="flex flex-wrap gap-1.5"><Badge label={member.ledger_enrollment_status || "없음"} />{member.ledger_warning ? <Badge label={member.ledger_warning} /> : null}</div></MobileField>
            <MobileField label="문서"><Badge label={member.ledger_document_status || "없음"} /></MobileField>
            <MobileField label="가입일">{formatDate(member.joined_at || member.created_at)}</MobileField>
          </div>
          <MobileField label="결제한 과정명"><span title={member.ledger_course_summary || member.last_course_name || ""}>{member.ledger_course_summary || member.last_course_name || "-"}</span></MobileField>
          <MobileField label="생성한 문서명"><span title={(member.ledger_document_names || []).join(", ")}>{member.ledger_document_summary || "-"}</span></MobileField>
        </div>
      </article>) : <div className="rounded-lg border border-[#d7deea] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">조회된 회원이 없습니다.</div>}
    </div>

    <div className="hidden overflow-x-auto rounded-lg border border-[#d7deea] bg-white md:block">
      <table className="min-w-[1320px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <thead><tr>{["회원 ID", "가입 이메일", "가입자명", "생년월일", "연락처", "결제 여부", "수강권 생성 여부", "결제한 과정명", "문서 생성 여부", "생성한 문서명", "가입일"].map((label) => <th key={label} className="border-b border-slate-200 px-3 py-3 text-xs font-black text-slate-500">{label}</th>)}</tr></thead>
        <tbody>{members.length ? members.map((member) => <tr key={member.firebase_uid} onClick={() => void loadDetail(member.firebase_uid)} className={`cursor-pointer hover:bg-slate-50 ${member.ledger_warning ? "bg-amber-50/70" : ""}`}>
          <td className="border-b border-slate-100 px-3 py-3 font-mono text-xs" title={member.firebase_uid}><span>{shortUid(member.firebase_uid)}</span><button type="button" onClick={(event) => { event.stopPropagation(); void copyText(member.firebase_uid); }} className="ml-2 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">복사</button></td>
          <td className="truncate border-b border-slate-100 px-3 py-3 font-bold text-slate-950" title={member.login_id || member.email || ""}>{member.login_id || member.email || "-"}<button type="button" onClick={(event) => { event.stopPropagation(); void copyText(member.login_id || member.email); }} className="ml-2 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">복사</button></td>
          <td className="truncate border-b border-slate-100 px-3 py-3" title={member.name || "미입력"}>{member.name || "미입력"}</td>
          <td className="truncate border-b border-slate-100 px-3 py-3" title={getLedgerBirthDate(member)}>{getLedgerBirthDate(member)}</td>
          <td className="truncate border-b border-slate-100 px-3 py-3" title={getLedgerPhone(member)}>{getLedgerPhone(member)}</td>
          <td className="border-b border-slate-100 px-3 py-3"><Badge label={member.ledger_payment_status || "미결제"} /></td>
          <td className="border-b border-slate-100 px-3 py-3"><div className="flex items-center gap-2"><Badge label={member.ledger_enrollment_status || "없음"} />{member.ledger_warning ? <Badge label={member.ledger_warning} /> : null}</div></td>
          <td className="truncate border-b border-slate-100 px-3 py-3" title={member.ledger_course_summary || member.last_course_name || ""}>{member.ledger_course_summary || member.last_course_name || "-"}</td>
          <td className="border-b border-slate-100 px-3 py-3"><Badge label={member.ledger_document_status || "없음"} /></td>
          <td className="truncate border-b border-slate-100 px-3 py-3" title={(member.ledger_document_names || []).join(", ")}>{member.ledger_document_summary || "-"}</td>
          <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-700">{formatDate(member.joined_at || member.created_at)}</td>
        </tr>) : <tr><td colSpan={11} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">조회된 회원이 없습니다.</td></tr>}</tbody>
      </table>
    </div>

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button type="button" onClick={() => void loadMembers(Math.max(0, offset - 50))} disabled={loading || offset === 0} className="rounded-lg border border-[#d7deea] bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:text-slate-300 sm:px-4">이전 50명</button>
      <span className="text-xs font-bold text-slate-500">{offset + 1} - {offset + members.length}</span>
      <button type="button" onClick={() => void loadMembers(nextOffset || 0)} disabled={loading || nextOffset === null} className="rounded-lg border border-[#d7deea] bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:text-slate-300 sm:px-4">다음 50명</button>
    </div>

    {detailLoading ? <div className="rounded-lg border border-[#d7deea] bg-white p-5 text-sm font-bold text-slate-600">상세 원장을 불러오는 중입니다.</div> : null}
    {detail && detailMember ? <aside className="min-w-0 space-y-4 rounded-lg border border-[#d7deea] bg-[#f8fafc] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 rounded-lg border border-[#d7deea] bg-white p-4">
        <div><h2 className="text-xl font-black text-slate-950">{detailMember.name || "미입력"}</h2><p className="mt-1 break-all text-sm text-slate-600">{detailMember.firebase_uid}</p></div>
        <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">닫기</button>
      </div>
      <MiniTable title="기본정보" rows={[detailMember]} columns={[{ key: "firebase_uid", label: "전체 UID" }, { key: "email", label: "이메일", render: (r) => r.login_id || r.email || "-" }, { key: "name", label: "이름", render: (r) => r.name || "미입력" }, { key: "birth_date", label: "생년월일", render: (r) => r.birth_date || "-" }, { key: "phone", label: "전화번호" }, { key: "joined_at", label: "가입일", render: (r) => formatDate(r.joined_at || r.created_at) }]} />
      <MiniTable title="결제정보" rows={detail.payments || []} columns={[{ key: "course_name", label: "과정명" }, { key: "amount", label: "결제금액", render: (r) => formatKrw(r.amount) }, { key: "paid_at", label: "결제일", render: (r) => formatDate(r.paid_at) }, { key: "payment_status", label: "결제상태" }, { key: "refund_status", label: "환불여부" }, { key: "order_id", label: "주문번호" }]} />
      <MiniTable title="수강정보" rows={detail.enrollments || []} columns={[{ key: "course_name", label: "과정명" }, { key: "enrollment_status", label: "수강권 상태" }, { key: "progress", label: "진도율", render: (r) => String(r.progress ?? 0) + "%" }, { key: "completion_status", label: "수료여부" }, { key: "completion_date", label: "수료일", render: (r) => formatDate(r.completion_date) }]} />
      <MiniTable title="문서정보" rows={detail.documents || []} columns={[{ key: "document_name", label: "문서명" }, { key: "document_type", label: "문서유형" }, { key: "first_issued_at", label: "최초 발급일", render: (r) => formatDate(r.first_issued_at || r.generated_at) }, { key: "downloaded_at", label: "최근 다운로드일", render: (r) => formatDate(r.downloaded_at) }, { key: "printed_at", label: "인쇄 요청일", render: (r) => formatDate(r.printed_at) }, { key: "issue_count", label: "재발급 횟수" }]} />
    </aside> : null}
  </section>;
}
