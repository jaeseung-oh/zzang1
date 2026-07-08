import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { platformCourseCategories } from "@/lib/course/platform-courses";

export const metadata: Metadata = {
  title: "센터소개 | ResetEdu 재발방지교육센터",
  description: "ResetEdu 재발방지교육센터는 사건 이후 교육 수료증 등 양형자료 준비와 재발 방지 노력을 정리할 수 있도록 돕는 민간 온라인 교육기관입니다.",
  alternates: { canonical: "/about/" },
};

const values = [
  ["사건 유형별 교육", "음주운전, 폭력범죄, 도박중독, 성범죄 등 사건 유형에 맞는 예방교육을 제공합니다."],
  ["양형자료 준비", "교육 수료증, 이수증, 재발방지 자료를 온라인으로 확인하고 출력할 수 있도록 돕습니다."],
  ["행동 변화 중심", "단순한 다짐보다 원인 이해, 위험 신호 확인, 대처 행동 학습, 생활 구조 변경에 초점을 둡니다."],
  ["민간 온라인 교육", "국가기관이나 법률사무소가 아닌 민간 교육기관으로서 교육 콘텐츠와 수강 기록을 제공합니다."],
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
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-[#9be0d5]">민간 온라인 예방교육기관</p>
          <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">사건 이후 교육 수료증 등 양형자료 준비를 체계적으로 돕습니다</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">ResetEdu 재발방지교육센터는 사건 이후 자신의 행동을 돌아보고, 재발 위험을 낮추기 위한 구체적인 방법을 학습할 수 있도록 온라인 예방교육을 제공합니다.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/courses" className={buttonClass("darkPrimary", "lg", "rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>교육과정 보기</Link><Link href="/certificate" className={buttonClass("darkSecondary", "lg", "rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>수료증 안내</Link></div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"><SectionTitle eyebrow="About" title="행동 변화를 위한 온라인 예방교육" body="교육은 사건 유형별 위험 요인과 행동 패턴을 이해하고, 실제 생활에서 적용할 수 있는 대처 행동과 생활 관리 방법을 익히는 데 중점을 둡니다. 교육 수강 후에는 과정에 맞는 수료증 또는 이수증을 확인하고 출력할 수 있습니다." /><div className="grid gap-4 sm:grid-cols-2">{values.map(([title, body]) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-[#176b68]" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Courses" title="운영 교육과정" body="음주운전 수료증과 양형자료 준비를 중심으로 운영해 온 구조를 유지하면서, 폭력범죄·도박중독·성범죄 예방교육까지 확장했습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{platformCourseCategories.map((course) => <Link key={course.slug} href={"/courses/" + course.slug} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-[#176b68] hover:bg-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)]"><h3 className="text-lg font-black text-slate-950">{course.title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{course.description}</p></Link>)}</div></div></section>

      <section id="support" className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]"><SectionTitle eyebrow="Support" title="상담 및 운영 정보" body="교육과정 선택, 결제, 수강 및 서류 출력과 관련한 문의를 안내합니다." /><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-2 text-sm leading-7 text-slate-800 sm:grid-cols-2"><p><span className="font-black">고객센터</span> 010-7617-8619</p><p><span className="font-black">상담 가능 시간</span> 평일 10:00-18:00</p><p><span className="font-black">상호</span> 보듬심리상담센터</p><p><span className="font-black">사업자등록번호</span> 861-98-01454</p></div></div></div></section>
    </main>
  );
}
