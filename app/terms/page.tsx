import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 리셋 에듀센터",
  description: "리셋 에듀센터 이용약관 안내",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Terms Of Service</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">이용약관</h1>
        <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
          <section><h2 className="text-lg font-bold text-slate-950">제1조 목적</h2><p className="mt-2">본 약관은 리셋 에듀센터가 제공하는 민간 온라인 교육 서비스의 이용조건, 권리와 의무, 책임 범위를 정하는 것을 목적으로 합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제2조 서비스 성격</h2><p className="mt-2">본 서비스는 범죄 예방 및 자기점검을 위한 민간 교육 서비스이며 법률 자문, 법률대리, 사건 수임 또는 행정사 업무를 제공하지 않습니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제3조 회원의 의무</h2><p className="mt-2">회원은 정확한 본인 정보를 제공해야 하며, 수강 즉시 출력 가능한 자료는 본인이 직접 확인하고 본인의 책임 아래 사용해야 합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제4조 결제 및 환불</h2><p className="mt-2">음주운전 예방교육의 상품제공기간은 결제 완료 즉시 제공이며 온라인상품 구매 후 바로 사용 가능합니다. 수강기간은 결제일로부터 90일입니다. 결제 완료 즉시 수강권이 부여되며, 환불은 실제 결제금액에서 미수강 교육 진행 비율을 기준으로 산정합니다. 전체 교육과정 수강 즉시 수료증 등 자료 출력이 가능하며, 출력 이후 환불 제한 조건은 별도 환불규정에 따릅니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제5조 책임 제한</h2><p className="mt-2">회사는 교육 자료의 참고적 활용을 전제로 하며, 특정 재판·수사·행정 절차에서의 결과나 법적 효력을 보장하지 않습니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제6조 운영자 정보 고지</h2><p className="mt-2">운영자 정보는 상호 보듬심리상담센터, 대표자 홍경자, 사업자등록번호 861-98-01454, 연락처 010-7617-8619입니다.</p></section>
        </div>
      </div>
    </main>
  );
}
