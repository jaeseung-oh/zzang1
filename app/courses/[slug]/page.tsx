import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, type ButtonVariant } from "@/app/components/ui/button-styles";
import CourseViewEvent from "@/app/components/analytics/course-view-event";
import { formatApplicationKrw, isCounselingProductId, type ApplicationProduct } from "@/lib/course/application-products";
import { commonFaqs, getApplyHref, getMainProductPair, getPlatformCourseBySlug, getPlatformCourseProducts, platformCourseCategories, processSteps, type CourseCategory } from "@/lib/course/platform-courses";

export function generateStaticParams() {
  return platformCourseCategories.map((course) => ({ slug: course.slug }));
}

type CourseIntroPageProps = { params: Promise<{ slug: string }> };
type ComparisonRow = readonly [string, boolean, boolean, boolean];

function Icon({ included = true, className = "h-5 w-5" }: { included?: boolean; className?: string }) {
  if (!included) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400">-</span>;
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function getProductIncludeClass(item: string, isAdvanced: boolean, isCounseling: boolean) {
  const isCounselingOnly = isCounseling && (item.includes("심리상담") || item.includes("상담기관") || item.includes("종합 평가"));
  const isAdvancedOnly = isAdvanced && !isCounselingOnly && (item.includes("심화이수과정 전체 포함") || item.includes("충실 준비과정 전체 포함") || item.includes("충실준비과정 전체 포함") || item.includes("인지행동") || item.includes("CBT") || item.includes("상세 내역서") || item.includes("상세내역서") || item.includes("이수증") || item.includes("소감문"));
  if (isCounselingOnly) return "font-black text-[#b91c1c]";
  if (isAdvancedOnly) return "font-black text-[#173968]";
  return undefined;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="max-w-3xl">{eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

function getCounselingProduct(products: ApplicationProduct[]) {
  return products.find((product) => product.planId === "counseling" || isCounselingProductId(product.id)) || null;
}

function getHeroProducts(course: CourseCategory) {
  const products = getPlatformCourseProducts(course);
  const { basic, advanced } = getMainProductPair(course);
  const counseling = getCounselingProduct(products);
  return [counseling, advanced, basic].filter(Boolean) as ApplicationProduct[];
}

function getCtaVariant(product: ApplicationProduct, advanced: ApplicationProduct | null | undefined): ButtonVariant {
  if (product.planId === "counseling" || isCounselingProductId(product.id)) return "warning";
  if (advanced && product.id === advanced.id) return "darkPrimary";
  return "darkSecondary";
}

function buildComparisonRows(course: CourseCategory): ComparisonRow[] {
  if (course.id === "dui") {
    return [
      ["음주운전 재범방지교육", true, true, true],
      ["음주운전 재범방지교육 수료증", true, true, true],
      ["음주운전 전용 작성자료", true, true, true],
      ["인지행동 개선교육", false, true, true],
      ["인지행동기반 재발방지교육 이수증", false, true, true],
      ["교육 소감문 작성자료", false, true, true],
      ["유선 상담 가능(방문 없이 진행)", false, false, true],
      ["심리상담 의견서", false, false, true],
      ["상담기관 탄원서", false, false, true],
      ["심리상담 및 종합 평가 후 발급", false, false, true],
    ];
  }

  return [
    [course.title, true, true, true],
    [course.certificateTitle, true, true, true],
    [course.shortTitle + " 전용 작성자료", true, true, true],
    ["인지행동 개선교육", false, true, true],
    ["인지행동기반 재발방지교육 이수증", false, true, true],
    ["교육 소감문 작성자료", false, true, true],
    ["유선 상담 가능(방문 없이 진행)", false, false, true],
    ["심리상담 의견서", false, false, true],
    ["상담기관 탄원서", false, false, true],
    ["심리상담 및 종합 평가 후 발급", false, false, true],
  ];
}

function CourseCtaLinks({ course, products, advanced, focusOffsetClass }: { course: CourseCategory; products: ApplicationProduct[]; advanced?: ApplicationProduct | null; focusOffsetClass: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      {products.map((product) => {
        const variant = getCtaVariant(product, advanced);
        const isCounseling = variant === "warning";
        return (
          <Link key={product.id} href={getApplyHref(course, product.id)} className={buttonClass(variant, "lg", `w-full whitespace-normal break-keep rounded-full px-5 text-center font-black sm:w-auto sm:px-7 ${isCounseling ? "!text-black hover:!text-black" : focusOffsetClass}`)}>
            {product.title} {formatApplicationKrw(product.price)} 신청
          </Link>
        );
      })}
    </div>
  );
}

function ProductComparison({ course }: { course: CourseCategory }) {
  const products = getPlatformCourseProducts(course);
  const pair = getMainProductPair(course);
  const counseling = getCounselingProduct(products);
  const rows = buildComparisonRows(course);

  return (
    <section id="products" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionTitle eyebrow="Products" title="교육과정 상품 선택" body="기본 수료과정, 심화이수과정, 심리상담 종합과정 중 필요한 범위에 맞게 신청할 수 있습니다." />
        <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const isCounseling = isCounselingProductId(product.id);
            const isAdvanced = isCounseling || product.id === course.advancedProductId || product.id.endsWith("advanced");
            return (
              <Link key={product.id} href={getApplyHref(course, product.id)} className={isCounseling ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#d3b271] bg-white p-5 shadow-[0_20px_50px_rgba(211,178,113,0.18)] transition sm:p-6 hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.18)] focus:outline-none focus:ring-4 focus:ring-[#d3b271]/30" : isAdvanced ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition sm:p-6 hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20" : "group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 shadow-sm transition sm:p-6 hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20"} aria-label={product.title + " 신청하기"}>
                <div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black leading-snug text-slate-950">{product.title}</h3>{isCounseling ? <span className="rounded-full bg-[#d3b271] px-3 py-1 text-xs font-black text-slate-950">상위 과정</span> : isAdvanced ? <span className="rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">통합 과정</span> : null}</div>
                <p className="mt-3 text-[30px] font-black leading-none text-slate-950 sm:text-3xl">{formatApplicationKrw(product.price)}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{isCounseling ? "교육 이수에서 끝나지 않고, 유선 심리상담으로도 개인의 상황과 변화 과정을 구체적으로 정리해드립니다." : product.description}</p>
                <ul className="mt-5 flex-1 space-y-2">{product.includes.map((item) => { const isCounselingOnly = isCounseling && (item.includes("심리상담") || item.includes("상담기관") || item.includes("종합 평가") || item.includes("유선 상담")); const isAdvancedOnly = isAdvanced && !isCounselingOnly && (item.includes("심화이수과정 전체 포함") || item.includes("충실 준비과정 전체 포함") || item.includes("충실준비과정 전체 포함") || item.includes("인지행동") || item.includes("CBT") || item.includes("상세 내역서") || item.includes("상세내역서") || item.includes("이수증") || item.includes("소감문")); return <li key={item} className="flex gap-2 text-sm font-semibold leading-7 text-slate-800"><Icon className={isCounselingOnly ? "mt-1 h-4 w-4 shrink-0 text-[#b91c1c]" : isAdvancedOnly ? "mt-1 h-4 w-4 shrink-0 text-[#173968]" : "mt-1 h-4 w-4 shrink-0 text-[#176b68]"} /><span className={getProductIncludeClass(item, isAdvanced, isCounseling)}>{item}</span></li>; })}</ul>{isCounseling ? <div className="mt-4 rounded-xl border border-[#d3b271] bg-[#fffaf0] p-4 text-sm leading-6"><p className="font-black text-slate-950">상담 진행 안내</p><p className="mt-2 break-keep font-bold text-[#5f4514]">결제 완료 후 <strong className="font-black text-[#b91c1c]">1영업일 이내 담당 심리상담사가 개별 연락드립니다.</strong></p><p className="mt-2 break-keep font-bold text-[#b91c1c]">상담은 별도 방문 없이 유선으로도 진행 가능합니다.</p><p className="mt-2 break-keep font-semibold text-slate-700">사건 경위, 현재 상황, 재발 위험요인, 생활환경 및 향후 실천계획 등을 확인하며, <strong className="font-black text-slate-950">심리상담의견서 및 상담기관 탄원서</strong>는 상담 및 종합평가 내용을 바탕으로 작성됩니다.</p></div> : null}
                <span className={buttonClass(isAdvanced ? "primary" : "warning", "md", isAdvanced ? "mt-6 min-h-12 w-full rounded-xl px-3 text-center font-black leading-5 transition group-hover:bg-[#10213f]" : "mt-6 min-h-12 w-full rounded-xl px-3 text-center font-black !text-black leading-5 transition hover:!text-black group-hover:border-[#176b68]")}>교육 신청하기</span>
              </Link>
            );
          })}
        </div>
        {pair.basic && pair.advanced && counseling ? <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"><div className="grid grid-cols-[minmax(96px,1fr)_58px_58px_76px] bg-slate-950 text-xs font-black text-white sm:grid-cols-[minmax(0,1fr)_160px_160px_190px] sm:text-sm"><div className="p-3 sm:p-4">제공 항목</div><div className="p-3 text-center sm:p-4">기본 수료</div><div className="p-3 text-center sm:p-4">심화이수</div><div className="break-keep p-3 text-center sm:p-4">심리상담 종합</div></div>{rows.map(([label, basicIncluded, advancedIncluded, counselingIncluded]) => <div key={label} className="grid grid-cols-[minmax(96px,1fr)_58px_58px_76px] border-t border-slate-200 text-xs sm:grid-cols-[minmax(0,1fr)_160px_160px_190px] sm:text-sm"><div className="break-keep p-3 font-bold text-slate-900 sm:p-4">{label}</div><div className="flex items-center justify-center p-3 sm:p-4"><Icon included={basicIncluded} className="h-5 w-5 text-[#176b68]" /></div><div className="flex items-center justify-center p-3 sm:p-4"><Icon included={advancedIncluded} className="h-5 w-5 text-[#173968]" /></div><div className="flex items-center justify-center p-3 sm:p-4"><Icon included={counselingIncluded} className="h-5 w-5 text-[#b91c1c]" /></div></div>)}</div> : null}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: CourseIntroPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getPlatformCourseBySlug(slug);
  if (!course) return { title: "교육과정 | 리셋 재범방지교육센터" };
  return {
    title: course.seo.title,
    description: course.seo.description,
    alternates: { canonical: "/courses/" + course.slug + "/" },
    openGraph: { title: course.seo.title, description: course.seo.description, url: "https://resetedu.kr/courses/" + course.slug + "/", siteName: "리셋 재범방지교육센터", locale: "ko_KR", type: "website" },
  };
}

export default async function CourseIntroPage({ params }: CourseIntroPageProps) {
  const { slug } = await params;
  const course = getPlatformCourseBySlug(slug);
  if (!course) notFound();
  const { basic, advanced } = getMainProductPair(course);
  const heroProducts = getHeroProducts(course);
  const primaryMobileProduct = advanced || basic;

  return (
    <main className="keep-korean min-h-screen bg-slate-50 pb-[calc(108px+env(safe-area-inset-bottom))] text-slate-950 lg:pb-0"><CourseViewEvent courseId={course.id} courseName={course.title} />
      <section className="relative overflow-hidden bg-[#06101b] text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(23,107,104,0.38),transparent_36%),linear-gradient(135deg,#06101b,#10213f)]" /><div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-20 lg:pt-24"><div><Link href="/courses" className={buttonClass("darkSecondary", "sm", "rounded-full px-4 focus:ring-offset-[#06101b]")}>교육과정으로 이동</Link><p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-[#9be0d5]">{course.heroLabel}</p><h1 className="mt-4 break-keep text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{course.title}</h1><p className="mt-6 max-w-3xl break-keep text-base leading-8 text-slate-200 sm:text-lg">{course.summary}</p><div className="mt-8"><CourseCtaLinks course={course} products={heroProducts} advanced={advanced} focusOffsetClass="focus:ring-offset-[#06101b]" /></div></div><div className="grid content-center gap-4"><div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur"><p className="text-sm font-black text-[#9be0d5]">교육 및 수료자료 준비 흐름</p><div className="mt-4 grid gap-3">{["온라인 교육 수강", course.certificateTitle, advanced ? "인지행동기반 재발방지교육 이수증" : "교육 이수 확인", "출력 및 PDF 저장"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm font-bold text-white"><Icon className="h-5 w-5 shrink-0 text-[#9be0d5]" />{item}</div>)}</div></div></div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"><SectionTitle eyebrow="Why" title="이 교육이 필요한 이유" body={course.description} /><div className="grid gap-3 sm:grid-cols-2">{course.whyNeeded.map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold leading-7 text-slate-800 shadow-sm">{item}</div>)}</div></div></section>
      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Learning" title="주요 학습 내용" /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{course.learningPoints.map((item) => <article key={item} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5"><Icon className="h-5 w-5 text-[#176b68]" /><h3 className="mt-3 text-base font-black leading-snug text-slate-950">{item}</h3></article>)}</div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><SectionTitle title="교육 대상" body={course.targetAudience} /></div><div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"><SectionTitle title="제공 문서" /><div className="mt-5 grid gap-3">{Array.from(new Set([...course.availableDocuments, "교육 소감문 작성자료: 심화이수과정에 한함"])).map((item) => <div key={item} className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-800"><Icon className="h-5 w-5 shrink-0 text-[#173968]" />{item}</div>)}</div></div></div></section>
      <ProductComparison course={course} />
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="수강 방법" body="수료 처리 기준과 진도율 판정은 기존 사이트의 정상 운영 로직을 그대로 사용합니다." /><div className="mt-8 grid gap-4 md:grid-cols-4">{processSteps.map(([title, body], index) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-black text-[#176b68]">0{index + 1}</p><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>
      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="자주 묻는 질문" /><div className="mt-8 grid gap-4 lg:grid-cols-2">{commonFaqs.map(([q, a]) => <details key={q} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-base font-black text-slate-950">{q}</summary><p className="mt-3 text-sm leading-7 text-slate-700">{a}</p></details>)}</div></div></section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.5rem] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.24)] sm:p-8"><h2 className="text-2xl font-black sm:text-3xl">{course.title} 과정을 확인하세요</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">기본 수료과정, 심화이수과정, 심리상담 종합과정 중 필요한 교육 범위에 맞게 신청할 수 있습니다.</p><div className="mt-6"><CourseCtaLinks course={course} products={heroProducts} advanced={advanced} focusOffsetClass="focus:ring-offset-[#07111f]" /></div></div></section>
      {primaryMobileProduct ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.16)] backdrop-blur lg:hidden"><div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-600">{course.shortTitle} {primaryMobileProduct.title}</p><p className="mt-0.5 text-lg font-black text-[#10213f]">{formatApplicationKrw(primaryMobileProduct.price)}</p></div><Link href={getApplyHref(course, primaryMobileProduct.id)} className={buttonClass("primary", "md", "min-h-12 shrink-0 rounded-xl px-5 font-black")}>바로 결제</Link></div></div> : null}
    </main>
  );
}
