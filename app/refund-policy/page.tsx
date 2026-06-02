import type { Metadata } from "next";
import { buildRefundRows, duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";

export const metadata: Metadata = {
  title: "환불규정 | 리셋 에듀센터",
  description: "음주운전 예방교육 결제사 심사용 환불규정 안내",
};

const refundRows = buildRefundRows(duiPreventionCourseProduct);
const sellerInfo = [
  ["서비스명", "리셋 에듀센터"],
  ["판매자", "보듬심리상담센터"],
  ["대표자", "홍경자"],
  ["사업자등록번호", "861-98-01454"],
  ["고객문의", "010-7617-8619"],
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Payment & Refund Policy</p>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">환불규정</h1>
          <p className="mt-5 text-base leading-8 text-slate-700">
            본 교육과정은 총 5강으로 구성된 온라인 유료교육 과정이며, 총 결제금액은 55,000원입니다. 수강기간은 결제일로부터 90일이며, 결제 완료 즉시 수강권이 부여됩니다.
          </p>
          <p className="mt-3 text-base leading-8 text-slate-700">
            환불 가능 금액은 실제 수강한 강의를 제외한 미수강 강의 수를 기준으로 산정합니다. 1강당 환불 산정 금액은 11,000원입니다.
          </p>
        </section>

        <section className="grid gap-4 rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:grid-cols-2">
          {sellerInfo.map(([label, value]) => (
            <div key={label} className="rounded-[1.2rem] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-2 font-semibold text-slate-950">{value}</p>
            </div>
          ))}
          <div className="rounded-[1.2rem] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">유료교육 상품명</p>
            <p className="mt-2 font-semibold text-slate-950">{duiPreventionCourseProduct.courseTitle}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">수강권 부여 시점</p>
            <p className="mt-2 font-semibold text-slate-950">결제 완료 즉시</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#d7dee8] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e5ebf3] bg-[#fff7e5] px-6 py-5">
            <h2 className="text-xl font-bold text-[#15120b]">미수강 강의별 환불 가능 금액표</h2>
            <p className="mt-2 text-sm leading-7 text-[#5b4211]">환불 산정 기준: 총 결제금액 55,000원 ÷ 총 5강 = 1강당 11,000원</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">수강한 강의 수</th>
                  <th className="px-5 py-3 text-right">미수강 강의 수</th>
                  <th className="px-5 py-3 text-right">환불 가능 금액</th>
                  <th className="px-5 py-3">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ebf3]">
                {refundRows.map((row) => (
                  <tr key={row.completedLessons}>
                    <td className="px-5 py-4 font-semibold text-slate-950">{row.completedLessons}강</td>
                    <td className="px-5 py-4 text-right text-slate-700">{row.unusedLessons}강</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-950">{formatKrw(row.refundAmount)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">환불 불가 또는 제한 조건</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>결제일로부터 90일의 수강기간이 경과한 경우</li>
            <li>전체 5강을 모두 수강 완료한 경우</li>
            <li>수료증이 발급된 경우</li>
            <li>미수강 강의가 없는 경우</li>
          </ol>
          <p className="mt-5 text-sm leading-7 text-slate-600">환불 신청은 고객문의 연락처로 주문번호, 결제자 정보, 수강 진행 상태를 전달해 접수할 수 있습니다. 결제수단 취소 가능 여부에 따라 원 결제수단 취소를 우선 처리합니다.</p>
        </section>
      </div>
    </main>
  );
}
