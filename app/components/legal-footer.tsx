import Link from "next/link";
import { siteInfo } from "@/lib/site-info";

const quickLinks = [
  ["전체 교육과정", "/courses"],
  ["음주운전 재범방지교육", "/courses/dui-prevention"],
  ["폭력범죄 재범방지교육", "/courses/violence-prevention"],
  ["도박중독 재발방지교육", "/courses/gambling-relapse-prevention"],
  ["성범죄 재범방지교육", "/courses/sexual-offense-prevention"],
  ["재발방지계획 가이드", "/guides/prevention-plan"],
  ["이용약관", "/terms"],
  ["개인정보처리방침", "/privacy-policy"],
  ["환불규정", "/refund-policy"],
] as const;


export default function LegalFooter() {
  return (
    <footer className="border-t border-[#d7dee8] bg-[linear-gradient(180deg,#0a1322_0%,#101a2c_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d7b56c]">리셋 재범방지교육센터</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white">리셋 재범방지교육센터 운영 정보</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">사건 이후 온라인 재범방지교육, 재발방지 실천자료, 생활개선 기록 정리를 돕는 교육 플랫폼입니다.</p>
            <div className="mt-5 grid gap-2 text-sm leading-7 text-slate-300 sm:grid-cols-2">
              <p><span className="font-semibold text-white">상호</span> {siteInfo.businessName}</p>
              <p><span className="font-semibold text-white">대표자명</span> {siteInfo.representativeName}</p>
              <p><span className="font-semibold text-white">사업자등록번호</span> {siteInfo.businessNumber}</p>
              <p><span className="font-semibold text-white">고객센터</span> {siteInfo.supportPhone}</p>
              <p><span className="font-semibold text-white">상담 가능 시간</span> {siteInfo.supportHours}</p>
              <p className="sm:col-span-2"><span className="font-semibold text-white">사업장 주소</span> {siteInfo.address}</p>
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
          © 2026 리셋 재범방지교육센터. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
