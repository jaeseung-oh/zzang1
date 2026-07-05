import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/app/components/ui/button-styles";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { getApplyHref, getPlatformCourseProducts, platformCourseCategories, type CourseCategory } from "@/lib/course/platform-courses";

export const metadata: Metadata = {
  title: "교육과정 | 리셋에듀센터",
  description: "사건 유형과 필요한 교육 범위에 맞는 온라인 예방교육, 수료증, 인지행동 개선교육 과정을 선택할 수 있습니다.",
  alternates: { canonical: "/courses/" },
  openGraph: {
    title: "교육과정 | 리셋에듀센터",
    description: "음주운전, 폭력범죄, 도박중독, 성범죄 예방교육과 심화과정을 확인하세요.",
    url: "https://resetedu.kr/courses/",
    siteName: "리셋에듀센터",
    locale: "ko_KR",
    type: "website",
  },
};

const filters = [
  ["전체", "#all"],
  ["음주운전", "#dui"],
  ["폭력범죄", "#violence-prevention"],
  ["도박중독", "#gambling-relapse-prevention"],
  ["성범죄", "#sexual-offense-prevention"],
  ["인지행동 개선", "#cbt"],
] as const;

function Icon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function ProductCard({ course, product }: { course: CourseCategory; product: ReturnType<typeof getPlatformCourseProducts>[number] }) {
  const isAdvanced = product.id === course.advancedProductId || product.id.endsWith("advanced");
  const label = product.id === course.basicProductId ? "기본과정" : isAdvanced ? "심화과정" : product.title;
  return (
    <article className={isAdvanced ? "flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)]" : "flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{label}</p>
          <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">{course.title} {label}</h3>
        </div>
        {isAdvanced ? <span className="rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">통합 과정</span> : null}
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{formatApplicationKrw(product.price)}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{product.description}</p>
      <div className="mt-5 flex-1">
        <p className="text-sm font-black text-slate-950">제공 강의 및 문서</p>
        <ul className="mt-3 space-y-2">
          {product.includes.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold leading-7 text-slate-800"><Icon className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" /><span>{item}</span></li>)}
        </ul>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link href={"/courses/" + course.slug} className={buttonClass("secondary", "md", "rounded-xl font-black")}>자세히 보기</Link>
        <Link href={getApplyHref(course, product.id)} className={buttonClass(isAdvanced ? "primary" : "warning", "md", isAdvanced ? "rounded-xl font-black" : "rounded-xl font-black !text-black hover:!text-black")}>신청하기</Link>
      </div>
    </article>
  );
}

export default function CoursesPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Curriculum</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">교육과정</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">사건 유형과 필요한 교육 범위에 맞는 과정을 선택할 수 있습니다.</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">각 과정은 온라인 수강, 교육 수료증 확인, PDF 저장과 인쇄 기능을 기존 사이트 구조로 제공합니다.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#all" className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>전체 과정 보기</Link>
            <Link href="/#course-finder" className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#10213f]")}>과정 선택 도움</Link>
          </div>
        </div>
      </section>

      <section className="sticky top-[84px] z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:top-[73px] lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-1">
          {filters.map(([label, href]) => <Link key={label} href={href} className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:border-[#173968] hover:bg-[#173968] hover:text-white">{label}</Link>)}
        </div>
      </section>

      <section id="all" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          {platformCourseCategories.map((course) => {
            const products = getPlatformCourseProducts(course);
            return (
              <section key={course.id} id={course.id} className="scroll-mt-36">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{course.navTitle}</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{course.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{course.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{course.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{tag}</span>)}</div>
                  </div>
                  <Link href={"/courses/" + course.slug} className={buttonClass("secondary", "md", "rounded-full px-6 font-black")}>상세페이지 보기</Link>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ProductCard key={product.id} course={course} product={product} />)}
                </div>
              </section>
            );
          })}

          <section id="cbt" className="scroll-mt-36 rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">Cognitive Behavior Education</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">인지행동 개선교육</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">인지행동 개선교육은 신규 심화과정과 기존 음주운전 심화과정에서 기존 강의와 기존 이수증 양식을 그대로 재사용합니다. 기본과정에는 포함되지 않습니다.</p>
          </section>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-950 sm:text-sm">
          리셋에듀센터는 민간 온라인 교육기관입니다. 수료증, 이수증 및 교육자료는 교육 참여와 재발·재범 방지 노력을 정리하기 위한 양형자료 준비에 활용할 수 있으나, 제출 가능 여부와 활용 결과는 개별 사건과 제출기관의 판단에 따라 달라질 수 있습니다.
        </div>
      </section>
    </main>
  );
}
