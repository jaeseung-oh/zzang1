import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { platformCourseCategories } from "@/lib/course/platform-courses";
import { siteInfo } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "센터소개 | 리셋 재범방지교육센터",
  description: "리셋 재범방지교육센터는 사건 이후 교육 수료증 등 관련 자료와 재발 방지 노력을 정리할 수 있도록 돕는 민간 온라인 교육기관입니다.",
  alternates: { canonical: "/about/" },
};

const values = [
  ["사건 유형 선택", "음주운전, 폭력범죄, 성범죄, 마약, 도박, 사기, 무면허운전 등 사건 유형별 교육을 선택할 수 있습니다."],
  ["기본 수료·심화이수·상담 과정", "기본 수료과정은 수료증과 기본 실천자료를, 심화이수과정은 이수증·상세내역서·교육 소감문 작성자료를 추가로 제공합니다. 심리상담 종합과정은 심화이수과정 구성에 유선 심리상담과 심리상담 의견서·상담기관 탄원서를 더해 제공합니다."],
  ["온라인 수강", "결제 후 PC와 모바일에서 교육을 수강하고, 수강 완료 후 제공자료를 확인할 수 있습니다."],
  ["운영 전문성", siteInfo.businessName + "가 운영하며, 심리상담사 1급 자격을 보유한 운영진이 교육 운영에 참여합니다."],
  ["민간 교육기관", "국가기관·법률사무소가 아닌 민간 온라인 교육기관입니다. 제출 및 활용 결과는 제출기관 판단에 따라 달라질 수 있습니다."],
] as const;

function Icon({ className = "h-6 w-6" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="max-w-3xl">{eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

export default function AboutPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-[#9be0d5]">민간 온라인 재범방지교육기관</p>
          <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">사건 유형에 맞는 재범방지교육을 온라인으로 수강하세요</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">교육 선택, 결제, 온라인 수강, 수료증과 재범방지 실천자료 확인까지 한 흐름으로 이용할 수 있는 민간 온라인 교육기관입니다.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/courses" className={buttonClass("darkPrimary", "lg", "rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>수강 신청하기</Link><Link href="/certificate" className={buttonClass("darkSecondary", "lg", "rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>수료증 안내</Link></div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><SectionTitle eyebrow="About" title="무엇을 받을 수 있나요?" body="리셋 재범방지교육센터는 사건 유형별 온라인 교육과 수료자료를 제공합니다. 회원은 필요한 교육을 선택하고, 기본 또는 심화이수과정을 결제한 뒤 강의실에서 수강을 시작할 수 있습니다." /><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/courses" className={buttonClass("primary", "lg", "rounded-xl px-6 font-black")}>교육과정 선택</Link><Link href="/certificate" className={buttonClass("secondary", "lg", "rounded-xl px-6 font-black")}>제공자료 보기</Link></div></div><div className="grid gap-3 sm:grid-cols-2">{values.map(([title, body]) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f0] text-[#176b68]"><Icon className="h-5 w-5" /></span><div><h3 className="text-base font-black text-slate-950 sm:text-lg">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-700">{body}</p></div></div></article>)}</div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Courses" title="운영 교육과정" body="현재 신청 가능한 사건 유형별 교육입니다. 필요한 과정을 선택하면 교육내용과 기본 수료·심화이수 제공자료를 확인할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{platformCourseCategories.map((course) => <Link key={course.slug} href={"/courses/" + course.slug} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-[#176b68] hover:bg-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)]"><h3 className="text-lg font-black text-slate-950">{course.title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{course.description}</p></Link>)}</div></div></section>

      <section id="support" className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]"><SectionTitle eyebrow="Support" title="문의 및 운영 정보" body="교육 선택, 결제, 수강, 자료 출력 과정에서 문제가 있으면 고객센터로 문의해 주세요." /><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-2 text-sm leading-7 text-slate-800 sm:grid-cols-2"><p><span className="font-black">고객센터</span> {siteInfo.supportPhone}</p><p><span className="font-black">상담 가능 시간</span> {siteInfo.supportHours}</p><p><span className="font-black">상호</span> {siteInfo.businessName}</p><p><span className="font-black">사업자등록번호</span> {siteInfo.businessNumber}</p></div></div></div></section>
    </main>
  );
}
