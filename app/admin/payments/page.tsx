"use client";

import { useState } from "react";
import { formatKrw } from "@/lib/course/product";

type AdminPaymentItem = {
  orderId?: string;
  userId?: string;
  userName?: string;
  email?: string;
  courseTitle?: string;
  amount?: number;
  paymentStatus?: string;
  approvedAt?: string | null;
  expiresAt?: string | null;
  progress?: number;
  completedLessons?: number;
  unusedLessons?: number;
  certificateIssued?: boolean;
  estimatedRefundAmount?: number;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("ko-KR") : "-";
}

export default function AdminPaymentsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<AdminPaymentItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
    if (!apiBaseUrl) {
      setError("NEXT_PUBLIC_AUTH_API_BASE_URL이 설정되지 않았습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/payments`, { headers: { "x-admin-key": adminKey } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "관리자 결제 정보를 불러오지 못했습니다.");
      setItems(payload.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "관리자 결제 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[1.5rem] border border-[#d7deea] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Admin Payments</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0f172a]">결제 및 수강권 내부 확인</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">결제사 심사 및 운영 확인용 화면입니다. 관리자 키가 없으면 조회할 수 없습니다.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="ADMIN_API_KEY" className="min-h-12 flex-1 rounded-full border border-[#d7deea] px-4 text-sm outline-none focus:border-[#173968]" />
            <button type="button" onClick={() => void load()} disabled={!adminKey || loading} className="rounded-full bg-[#173968] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? "조회 중" : "결제내역 조회"}</button>
          </div>
          {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
        </header>

        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#d7deea] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">주문번호</th>
                  <th className="px-4 py-3">사용자</th>
                  <th className="px-4 py-3">상품명</th>
                  <th className="px-4 py-3 text-right">결제금액</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">결제일</th>
                  <th className="px-4 py-3">만료일</th>
                  <th className="px-4 py-3 text-right">진행률</th>
                  <th className="px-4 py-3 text-right">수강/미수강</th>
                  <th className="px-4 py-3">수료증</th>
                  <th className="px-4 py-3 text-right">예상 환불액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ebf3]">
                {items.map((item) => (
                  <tr key={item.orderId}>
                    <td className="px-4 py-3 font-semibold text-slate-950">{item.orderId}</td>
                    <td className="px-4 py-3 text-slate-700">{item.userName || item.email || item.userId || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.courseTitle || "음주운전 예방교육"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatKrw(item.amount || 0)}</td>
                    <td className="px-4 py-3">{item.paymentStatus || "-"}</td>
                    <td className="px-4 py-3">{formatDate(item.approvedAt)}</td>
                    <td className="px-4 py-3">{formatDate(item.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">{item.progress || 0}%</td>
                    <td className="px-4 py-3 text-right">{item.completedLessons || 0}/{item.unusedLessons || 0}</td>
                    <td className="px-4 py-3">{item.certificateIssued ? "발급" : "미발급"}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatKrw(item.estimatedRefundAmount || 0)}</td>
                  </tr>
                ))}
                {!items.length ? <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">조회된 결제내역이 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
