import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 리셋 에듀센터",
  description: "리셋 에듀센터 개인정보처리방침 안내",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d7dee8] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9c7b3b]">Privacy Policy</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">개인정보처리방침</h1>
        <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
          <section><h2 className="text-lg font-bold text-slate-950">수집 항목</h2><p className="mt-2">이름, 생년월일, 이메일, 수강 이력, 결제 정보 및 서비스 이용기록을 수집합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">민감정보 관련 고지</h2><p className="mt-2">수강 이력 자체로 범죄·수사 이력이 유추될 가능성이 있으므로, 회사는 이를 민감하게 취급하고 별도 동의를 받습니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">이용 목적</h2><p className="mt-2">회원 식별, 교육 서비스 제공, 수료 확인, 고객 응대, 환불 처리, 법령상 의무 이행을 위해 개인정보를 이용합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">보유 기간</h2><p className="mt-2">관련 법령 및 서비스 운영 목적 범위 내에서 필요한 기간 동안 보관하며, 보유 목적 달성 시 지체 없이 파기합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">제3자 제공 및 처리위탁</h2><p className="mt-2">회사는 원칙적으로 이용자의 개인정보를 외부에 판매하지 않습니다. 다만 결제 처리, 인증, 클라우드 인프라, 저장소 운영 등 서비스 제공에 필요한 범위에서 관련 수탁사 또는 서비스 제공자에게 처리 업무를 위탁할 수 있으며, 구체적인 항목은 실제 운영 구조에 맞춰 별도로 고지합니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">이용자 권리</h2><p className="mt-2">이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지 등을 요청할 수 있으며, 관련 문의는 운영자 연락처 공개 후 해당 창구를 통해 접수할 수 있습니다.</p></section>
          <section><h2 className="text-lg font-bold text-slate-950">개인정보 보호책임자 및 문의</h2><p className="mt-2">개인정보 보호책임자 및 민원처리 담당자의 성명, 연락처는 정식 오픈 시 실제 정보로 업데이트됩니다. 실제 정보 등록 전에는 예시 연락처를 기재하지 않습니다.</p></section>
        </div>
      </div>
    </main>
  );
}
