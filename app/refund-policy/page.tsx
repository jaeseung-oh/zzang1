import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불규정 | 리셋 에듀센터",
  description: "리셋 에듀센터 환불규정 안내",
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Refund Policy</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">환불규정</h1>
        <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
          <section className="rounded-[1.5rem] border border-[#d7b56c]/30 bg-[#fff7e5] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9c7b3b]">핵심 조항</p>
            <p className="mt-3 text-xl font-bold leading-9 text-[#15120b]">디지털 콘텐츠 특성상 학습 진도율 10% 미만 시 전액 환불, 10% 이상 진행 시 환불 불가</p>
          </section>
          <section><h2 className="text-lg font-bold text-slate-950">환불 신청 방법</h2><p className="mt-2">고객센터 또는 이메일을 통해 주문자 정보와 환불 사유를 접수해 주세요. 회사는 진도율 및 결제 내역을 확인한 뒤 환불 여부를 안내합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">처리 기준</h2><p className="mt-2">환불 가능 대상인 경우 결제 수단에 따라 영업일 기준 순차적으로 환불됩니다. 자세한 처리 일정은 고객센터를 통해 안내합니다.</p></section>
        </div>
      </div>
    </main>
  );
}
