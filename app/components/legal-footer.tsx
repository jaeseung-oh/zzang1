import Link from "next/link";

const quickLinks = [
  ["전체 교육과정", "/courses"],
  ["음주운전 예방교육", "/courses/dui-prevention"],
  ["폭력범죄 재범방지교육", "/courses/violence-prevention"],
  ["도박중독 재발방지교육", "/courses/gambling-relapse-prevention"],
  ["성범죄 재범방지교육", "/courses/sexual-offense-prevention"],
  ["반성문 작성 가이드", "/guides/reflection-letter"],
  ["재발방지계획 가이드", "/guides/prevention-plan"],
  ["이용약관", "/terms"],
  ["개인정보처리방침", "/privacy-policy"],
  ["환불규정", "/refund-policy"],
] as const;

const noticeLines = [
  "ResetEdu 재발방지교육센터는 민간 온라인 교육기관이며, 수료증·이수증·교육자료는 교육 참여와 재발방지 노력을 정리하기 위한 참고자료입니다.",
  "자료의 제출 가능 여부와 활용 결과는 개별 사건과 제출기관의 판단에 따라 달라질 수 있습니다.",
];

export default function LegalFooter() {
  return (
    <footer className="border-t border-[#d7dee8] bg-[linear-gradient(180deg,#0a1322_0%,#101a2c_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d7b56c]">ResetEdu Prevention Education Center</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white">ResetEdu 재발방지교육센터 운영 정보</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">사건 이후 온라인 예방교육, 재발방지 실천자료, 생활개선 기록 정리를 돕는 교육 플랫폼입니다.</p>
            <div className="mt-5 grid gap-2 text-sm leading-7 text-slate-300 sm:grid-cols-2">
              <p><span className="font-semibold text-white">상호</span> 보듬심리상담센터</p>
              <p><span className="font-semibold text-white">대표자명</span> 홍경자</p>
              <p><span className="font-semibold text-white">사업자등록번호</span> 861-98-01454</p>
              <p><span className="font-semibold text-white">통신판매업 신고번호</span> 준비 또는 확인 중</p>
              <p><span className="font-semibold text-white">고객센터</span> 010-7617-8619</p>
              <p><span className="font-semibold text-white">상담 가능 시간</span> 평일 10:00-18:00</p>
              <p className="sm:col-span-2"><span className="font-semibold text-white">사업장 주소</span> 경기도 수원시 영통구 센트럴타운로 106, 145호</p>
            </div>
            <div className="mt-5 space-y-1 text-xs leading-5 text-slate-500">
              {noticeLines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-[#f1d59c]">바로가기</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-sm font-bold text-white">
              {quickLinks.map(([label, href]) => (
                <Link key={href + label} href={href} className="transition hover:text-[#f1d59c]">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-sm text-slate-400">
          © 2026 ResetEdu Prevention Education Center. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
