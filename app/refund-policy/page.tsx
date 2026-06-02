import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불규정 | 리셋 에듀센터",
  description: "리셋 에듀센터 환불규정 안내",
};

const refundItems = [
  {
    title: "수강 유효기간",
    body: "수강 유효기간은 결제일로부터 3개월 이내입니다. 유효기간 내 수강하지 않은 경우에도 콘텐츠 제공 가능 상태, 실제 이용 내역, 관련 법령을 함께 확인해 환불 가능 여부를 판단합니다.",
  },
  {
    title: "수료 확인 자료 미발급 시 미수강 강의 환불 기준",
    body: "총 수강료 55,000원은 5개 강의 기준이며, 환불 산정 시 강의 1개당 11,000원으로 계산합니다. 수료 확인 자료를 발급받지 못했고 실제로 수강하지 않은 강의가 남아 있는 경우, 관련 법령과 소비자 보호 기준상 보장되어야 하는 범위를 하회하지 않도록 미수강 강의 수에 11,000원을 곱한 금액을 환불 기준액으로 검토합니다.",
  },
  {
    title: "이미 이용한 콘텐츠와 발급 자료",
    body: "재생을 시작했거나 수강 완료 처리된 강의, 다운로드 또는 발급 안내가 완료된 수료 확인 자료, 학습확인서, 서약서, 계획서 등은 실제 제공된 콘텐츠와 서비스로 보아 환불 산정에서 공제될 수 있습니다.",
  },
  {
    title: "법령 우선 적용",
    body: "전자상거래 등에서의 소비자보호에 관한 법률, 콘텐츠산업 관련 이용자 보호 기준 등 강행 법규가 본 규정보다 이용자에게 유리하게 적용되는 경우 해당 법령을 우선합니다. 본 규정은 일괄적인 환불 불가 선언이 아니며 개별 주문의 결제 내역, 콘텐츠 제공 상태, 학습 진도율, 발급 여부를 기준으로 판단합니다.",
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Refund Policy</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">환불규정</h1>
        <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
          <section className="rounded-[1.5rem] border border-[#d7b56c]/30 bg-[#fff7e5] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9c7b3b]">핵심 조항</p>
            <p className="mt-3 text-xl font-bold leading-9 text-[#15120b]">수강 유효기간은 결제일로부터 3개월 이내이며, 수료 확인 자료 미발급 및 미수강 강의가 있는 경우 55,000원 기준 강의별 금액으로 환불 가능 금액을 산정합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-950">환불 신청 방법</h2>
            <p className="mt-2">고객센터 010-7617-8619를 통해 주문자 정보, 결제일, 수강 과정, 환불 사유를 접수해 주세요. 회사는 결제 내역, 콘텐츠 제공 상태, 학습 진도율, 수료 확인 자료 발급 여부를 확인한 뒤 환불 가능 여부와 금액을 안내합니다.</p>
          </section>

          <div className="grid gap-4">
            {refundItems.map((item) => (
              <section key={item.title} className="rounded-[1.4rem] border border-[#d7dee8] bg-[#f8fafc] p-5">
                <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                <p className="mt-2">{item.body}</p>
              </section>
            ))}
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-950">처리 시점과 방법</h2>
            <p className="mt-2">환불이 가능한 경우 결제수단별 취소 가능 여부에 따라 원 결제수단 취소를 우선하며, 결제사 처리 정책에 따라 영업일 기준 순차적으로 처리됩니다. 결제수단 취소가 어려운 경우 고객 확인을 거쳐 별도 환급 방법을 안내할 수 있습니다.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
