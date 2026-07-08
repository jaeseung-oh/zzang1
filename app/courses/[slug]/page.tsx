import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/app/components/ui/button-styles";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { commonFaqs, getApplyHref, getMainProductPair, getPlatformCourseBySlug, getPlatformCourseProducts, platformCourseCategories, processSteps, type CourseCategory } from "@/lib/course/platform-courses";

export function generateStaticParams() {
  return platformCourseCategories.map((course) => ({ slug: course.slug }));
}

type CourseIntroPageProps = { params: Promise<{ slug: string }> };

function Icon({ included = true, className = "h-5 w-5" }: { included?: boolean; className?: string }) {
  if (!included) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400">-</span>;
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="max-w-3xl">{eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

function ProductComparison({ course }: { course: CourseCategory }) {
  const products = getPlatformCourseProducts(course);
  const pair = getMainProductPair(course);
  const rows = course.id === "dui" ? [
    ["음주운전 예방교육", true, true],
    ["음주운전 예방교육 수료증", true, true],
    ["음주운전 전용 작성자료", false, true],
    ["인지행동 개선교육", false, true],
    ["인지행동기반 재발방지교육 이수증", false, true],
  ] as const : [
    [course.title, true, true],
    [course.certificateTitle, true, true],
    ["인지행동 개선교육", false, true],
    ["인지행동기반 재발방지교육 이수증", false, true],
    ["온라인 인쇄 및 PDF 저장", true, true],
  ] as const;

  return (
    <section id="products" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionTitle eyebrow="Products" title="기본과정·심화과정 비교" body={course.id === "dui" ? "음주운전 과정은 기존 운영 상품 가격과 제공 내용을 유지합니다." : "기본과정은 해당 교육 1강만 제공하고, 심화과정은 기존 인지행동 개선교육과 기존 이수증 발급 권한을 함께 제공합니다."} />
        <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const isAdvanced = product.id === course.advancedProductId || product.id.endsWith("advanced");
            return (
              <Link key={product.id} href={getApplyHref(course, product.id)} className={isAdvanced ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-6 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20" : "group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20"} aria-label={product.title + " 신청하기"}>
                <div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black leading-snug text-slate-950">{product.title}</h3>{isAdvanced ? <span className="rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">통합 과정</span> : null}</div>
                <p className="mt-3 text-3xl font-black text-slate-950">{formatApplicationKrw(product.price)}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{product.description}</p>
                <ul className="mt-5 flex-1 space-y-2">{product.includes.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold leading-7 text-slate-800"><Icon className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" />{item}</li>)}</ul>
                <span className={buttonClass(isAdvanced ? "primary" : "warning", "md", isAdvanced ? "mt-6 w-full rounded-xl font-black transition group-hover:bg-[#10213f]" : "mt-6 w-full rounded-xl font-black !text-black transition hover:!text-black group-hover:border-[#176b68]")}>{product.title} 신청하기</span>
              </Link>
            );
          })}
        </div>
        {pair.basic && pair.advanced ? <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"><div className="grid grid-cols-[minmax(0,1fr)_120px_120px] bg-slate-950 text-sm font-black text-white sm:grid-cols-[minmax(0,1fr)_180px_180px]"><div className="p-4">제공 항목</div><div className="p-4 text-center">기본과정</div><div className="p-4 text-center">심화과정</div></div>{rows.map(([label, basicIncluded, advancedIncluded]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-t border-slate-200 text-sm sm:grid-cols-[minmax(0,1fr)_180px_180px]"><div className="p-4 font-bold text-slate-900">{label}</div><div className="flex items-center justify-center p-4"><Icon included={basicIncluded} className="h-5 w-5 text-[#176b68]" /></div><div className="flex items-center justify-center p-4"><Icon included={advancedIncluded} className="h-5 w-5 text-[#173968]" /></div></div>)}</div> : null}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: CourseIntroPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getPlatformCourseBySlug(slug);
  if (!course) return { title: "교육과정 | ResetEdu 재발방지교육센터" };
  return {
    title: course.seo.title,
    description: course.seo.description,
    alternates: { canonical: "/courses/" + course.slug + "/" },
    openGraph: { title: course.seo.title, description: course.seo.description, url: "https://resetedu.kr/courses/" + course.slug + "/", siteName: "ResetEdu 재발방지교육센터", locale: "ko_KR", type: "website" },
  };
}

export default async function CourseIntroPage({ params }: CourseIntroPageProps) {
  const { slug } = await params;
  const course = getPlatformCourseBySlug(slug);
  if (!course) notFound();
  const { basic, advanced } = getMainProductPair(course);

  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#06101b] text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(23,107,104,0.38),transparent_36%),linear-gradient(135deg,#06101b,#10213f)]" /><div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-20 lg:pt-24"><div><Link href="/courses" className={buttonClass("darkSecondary", "sm", "rounded-full px-4 focus:ring-offset-[#06101b]")}>교육과정으로 이동</Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-[#9be0d5]">{course.heroLabel}</p><h1 className="mt-4 break-keep text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{course.title}</h1><p className="mt-6 max-w-3xl break-keep text-base leading-8 text-slate-200 sm:text-lg">{course.summary}</p><div className="mt-8 flex flex-wrap gap-3">{basic ? <Link href={getApplyHref(course, basic.id)} className={buttonClass("darkPrimary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#06101b] sm:w-auto")}>기본과정 신청하기</Link> : null}{advanced ? <Link href={getApplyHref(course, advanced.id)} className={buttonClass("darkSecondary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#06101b] sm:w-auto")}>심화과정 신청하기</Link> : null}</div></div><div className="grid content-center gap-4"><div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur"><p className="text-sm font-black text-[#9be0d5]">교육 및 양형자료 준비 흐름</p><div className="mt-4 grid gap-3">{["온라인 교육 수강", course.certificateTitle, advanced ? "인지행동기반 재발방지교육 이수증" : "교육 이수 확인", "출력 및 PDF 저장"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm font-bold text-white"><Icon className="h-5 w-5 shrink-0 text-[#9be0d5]" />{item}</div>)}</div></div></div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"><SectionTitle eyebrow="Why" title="이 교육이 필요한 이유" body={course.description} /><div className="grid gap-3 sm:grid-cols-2">{course.whyNeeded.map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold leading-7 text-slate-800 shadow-sm">{item}</div>)}</div></div></section>
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Learning" title="주요 학습 내용" /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{course.learningPoints.map((item) => <article key={item} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5"><Icon className="h-5 w-5 text-[#176b68]" /><h3 className="mt-3 text-base font-black leading-snug text-slate-950">{item}</h3></article>)}</div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><SectionTitle title="교육 대상" body={course.targetAudience} /></div><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><SectionTitle title="제공 문서" /><div className="mt-5 grid gap-3">{course.availableDocuments.map((item) => <div key={item} className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-800"><Icon className="h-5 w-5 shrink-0 text-[#173968]" />{item}</div>)}</div></div></div></section>
      <ProductComparison course={course} />
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="수강 방법" body="수료 처리 기준과 진도율 판정은 기존 사이트의 정상 운영 로직을 그대로 사용합니다." /><div className="mt-8 grid gap-4 md:grid-cols-4">{processSteps.map(([title, body], index) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-black text-[#176b68]">0{index + 1}</p><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="자주 묻는 질문" /><div className="mt-8 grid gap-4 lg:grid-cols-2">{commonFaqs.map(([q, a]) => <details key={q} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-base font-black text-slate-950">{q}</summary><p className="mt-3 text-sm leading-7 text-slate-700">{a}</p></details>)}</div></div></section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.5rem] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.24)] sm:p-8"><h2 className="text-2xl font-black sm:text-3xl">{course.title} 과정을 확인하세요</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">기본과정과 심화과정 중 필요한 교육 범위에 맞게 신청할 수 있습니다.</p><div className="mt-6 flex flex-wrap gap-3">{basic ? <Link href={getApplyHref(course, basic.id)} className={buttonClass("darkPrimary", "lg", "w-full rounded-full px-7 font-black focus:ring-offset-[#07111f] sm:w-auto")}>기본과정 신청하기</Link> : null}{advanced ? <Link href={getApplyHref(course, advanced.id)} className={buttonClass("darkSecondary", "lg", "w-full rounded-full px-7 font-black focus:ring-offset-[#07111f] sm:w-auto")}>심화과정 신청하기</Link> : null}</div></div></section>
    </main>
  );
}
