import Link from "next/link";

const disclaimerLines = [
  "본 센터의 수료확인서, 서약서 및 기타 자료는 수강생의 자발적인 교육 이수와 재발 방지 의지를 정리·확인하기 위한 순수 민간 교육 자료입니다.",
  "특정 재판, 수사 또는 행정절차에서의 유리한 결과나 법적 효력을 보장하지 않으며, 법률 자문이나 법률사무를 제공하지 않습니다.",
];

export default function LegalFooter() {
  return (
    <footer className="border-t border-[#d7dee8] bg-[linear-gradient(180deg,#0a1322_0%,#101a2c_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d7b56c]">Reset Edu Center</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white">리셋 에듀센터 운영 정보</h2>
            <div className="mt-5 space-y-2 text-sm leading-7 text-slate-300">
              <p>상호명, 대표자명, 사업장 소재지, 사업자등록번호, 통신판매업 신고번호는 정식 등록 후 실제 정보로 공개됩니다.</p>
              <p>정식 오픈 전에는 임시 또는 예시 사업자 정보를 기재하지 않습니다.</p>
              <p>문의 이메일: contact@resetedu-center.kr</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-bold text-[#f1d59c]">바로가기</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-white">
              <Link href="/terms" className="transition hover:text-[#f1d59c]">이용약관</Link>
              <Link href="/privacy-policy" className="transition hover:text-[#f1d59c]">개인정보처리방침</Link>
              <Link href="/refund-policy" className="transition hover:text-[#f1d59c]">환불규정</Link>
            </div>
            <div className="mt-5 text-sm leading-7 text-slate-300">
              {disclaimerLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-sm text-slate-400">
          © 2026 Reset Edu Center. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
