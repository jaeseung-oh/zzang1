import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불규정 | ResetEdu 재발방지교육센터",
  description: "음주운전 예방교육 환불규정 안내",
  alternates: { canonical: "/refund-policy/" },
};

const refundTable = [
  ["수강 전", "0강 수강 / 3강 미수강", "결제금액의 3/3"],
  ["1강 수강 후", "2강 미수강", "결제금액의 2/3"],
  ["2강 수강 후", "1강 미수강", "결제금액의 1/3"],
  ["3강 수강 즉시", "미수강 강의 없음", "환불 불가"],
  ["수료증 등 서류 발급·출력 후", "교육 이수 관련 서류 발급 또는 출력", "환불 불가"],
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Payment & Refund Policy</p>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">환불규정</h1>
          <p className="mt-5 text-base leading-8 text-slate-700">
            본 교육과정의 수강료 반환은 결제일, 수강 여부, 수강기간, 수료 여부 및 수료증 등 서류 출력 여부를 기준으로 아래와 같이 적용합니다.
          </p>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">1. 수강 시작 전</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>결제 후 강의를 수강하지 않은 경우: 이미 납부한 수강료 전액 환불</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">2. 수강 시작 후</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>일부 강의를 수강한 경우: 미수강 강의 수에 해당하는 금액 환불</li>
            <li>환불금액 산정 기준: 실제 결제금액 × 미수강 강의 수 / 전체 강의 수</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">3. 수강 즉시 서류 출력</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>총 3강을 모두 수강 완료한 경우: 환불 불가</li>
            <li>수료증이 발급 또는 출력된 경우: 환불 불가</li>
            <li>수료확인서, 이수확인서 등 교육 이수 관련 서류가 발급 또는 출력된 경우: 환불 불가</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">4. 수강기간 경과 후</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
            <li>본 교육과정의 수강기간은 결제일로부터 90일입니다.</li>
            <li>수강기간이 경과한 경우: 환불 불가</li>
          </ul>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#d7dee8] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e5ebf3] bg-[#fff7e5] px-6 py-5">
            <h2 className="text-xl font-bold text-[#15120b]">5. 환불 산정표</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">구분</th>
                  <th className="px-5 py-3">환불 기준</th>
                  <th className="px-5 py-3 text-right">환불금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ebf3]">
                {refundTable.map(([type, basis, amount]) => (
                  <tr key={type}>
                    <td className="px-5 py-4 font-semibold text-slate-950">{type}</td>
                    <td className="px-5 py-4 text-slate-700">{basis}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-950">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#d7dee8] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="space-y-2 text-sm leading-7 text-slate-700">
            <p>※ 음주운전 예방교육 기본 과정은 총 3강으로 구성되어 있으며, 상품별 실제 결제금액을 기준으로 환불금액을 산정합니다.</p>
            <p>※ 강의별 고정 금액이 아니라, 실제 결제금액에서 미수강 강의 수가 전체 강의 수에서 차지하는 비율을 기준으로 계산합니다.</p>
            <p>※ 수료증, 수료확인서, 이수확인서 등 교육 이수 관련 서류가 발급 또는 출력된 이후에는 환불이 불가합니다.</p>
            <p>※ 환불은 결제수단 및 결제대행사 처리 기준에 따라 영업일 기준 일정 기간이 소요될 수 있습니다.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
