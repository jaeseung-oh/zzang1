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
            <p className="mt-3 text-xl font-bold leading-9 text-[#15120b]">디지털 콘텐츠 이용 여부와 학습 진도율 등을 기준으로 환불 가능 여부를 개별 확인합니다.</p>
          </section>
          <section><h2 className="text-lg font-bold text-slate-950">환불 신청 방법</h2><p className="mt-2">고객센터 또는 이메일을 통해 주문자 정보와 환불 사유를 접수해 주세요. 회사는 결제 내역, 콘텐츠 제공 상태, 학습 진도율 등을 확인한 뒤 환불 가능 여부와 금액을 안내합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">처리 기준</h2><p className="mt-2">환불 기준은 전자상거래 관련 법령, 디지털 콘텐츠 제공 여부, 실제 이용 내역을 종합해 판단합니다. 환불이 가능한 경우 결제 수단에 따라 영업일 기준 순차적으로 처리됩니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">유의사항</h2><p className="mt-2">일괄적으로 '환불 불가'를 선언하지 않으며, 개별 주문의 이용 상태를 기준으로 검토합니다. 상세 기준은 결제 전 안내 화면 또는 고객센터를 통해 다시 확인해 주세요.</p></section>
        </div>
      </div>
    </main>
  );
}
