import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/app/components/ui/button-styles";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { getApplyHref, getPlatformCourseProducts, platformCourseCategories, type CourseCategory } from "@/lib/course/platform-courses";
import { getPreventionDocumentsForCourse } from "@/lib/course/prevention-documents";

export const metadata: Metadata = {
  title: "교육과정 | 리셋 재범방지교육센터",
  description: "사건 이후 재범방지교육, 재발방지 실천자료, 생활개선 계획, 실천자료 정리를 과정별로 선택할 수 있습니다.",
  alternates: { canonical: "/courses/" },
  openGraph: {
    title: "교육과정 | 리셋 재범방지교육센터",
    description: "온라인 재범방지교육과 자기성찰 중심 실천자료 과정을 확인하세요.",
    url: "https://resetedu.kr/courses/",
    siteName: "리셋 재범방지교육센터",
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
  ["마약중독", "#drug-rehab-prevention"],
] as const;

function Icon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function ProductCard({ course, product }: { course: CourseCategory; product: ReturnType<typeof getPlatformCourseProducts>[number] }) {
  const isAdvanced = product.id === course.advancedProductId || product.id.endsWith("advanced");
  const label = product.id === course.basicProductId ? "기본과정" : isAdvanced ? "심화과정" : product.title;
  const previousPrice = isAdvanced ? "129,000원" : "69,000원";
  const description = isAdvanced ? "자기성찰과 재범방지 실천자료까지 함께 정리할 수 있는 심화 과정" : "재범방지교육 이수 및 기본 실천자료를 함께 정리할 수 있는 과정";
  const courseDocumentTitles = getPreventionDocumentsForCourse(product.courseId || course.basicProductId).map((document) => document.title);
  const displayIncludes = ["온라인 재범방지교육", "교육 수료증 PDF 발급", ...courseDocumentTitles, ...(isAdvanced ? ["반성문 작성자료", "인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서"] : []), "인쇄 및 PDF 저장"];
  return (
    <Link href={getApplyHref(course, product.id)} className={isAdvanced ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20" : "group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20"} aria-label={course.title + " " + label + " 시작하기"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{label}</p>
          <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">{course.title} {label}</h3>
        </div>
        {isAdvanced ? <span className="rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">가장 많이 선택하는 과정</span> : <span className="rounded-full border border-[#176b68]/20 bg-slate-50 px-3 py-1 text-xs font-black text-[#176b68]">부담 없이 시작</span>}
      </div>
      <p className="mt-4 text-sm font-bold text-slate-500 line-through">{previousPrice}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{formatApplicationKrw(product.price)}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
      <div className="mt-5 flex-1">
        <p className="text-sm font-black text-slate-950">포함 구성</p>
        <ul className="mt-3 space-y-2">
          {displayIncludes.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold leading-7 text-slate-800"><Icon className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" /><span>{item}</span></li>)}
        </ul>
      </div>
      <span className={buttonClass(isAdvanced ? "primary" : "warning", "md", isAdvanced ? "mt-6 w-full rounded-xl font-black transition group-hover:bg-[#10213f]" : "mt-6 w-full rounded-xl font-black !text-black transition hover:!text-black group-hover:border-[#176b68]")}>교육 신청하기</span>
    </Link>
  );
}

export default function CoursesPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Curriculum</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">교육과정</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">사건 이후 필요한 재범방지교육과 실천자료 준비 범위에 맞는 과정을 선택할 수 있습니다.</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">기본과정은 49,000원, 심화과정은 99,000원이며 교육 이수 내용과 실천자료를 직접 확인·작성·출력할 수 있습니다.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#all" className={buttonClass("darkPrimary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f] sm:w-auto")}>재범방지교육 시작하기</Link>
            <Link href="/prevention-documents" className={buttonClass("darkSecondary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#10213f] sm:w-auto")}>실천자료 둘러보기</Link>
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
        </div>
      </section>

    </main>
  );
}
