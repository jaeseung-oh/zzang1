import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { notFound } from "next/navigation";
import { getIntroCourse, introCourses } from "@/lib/course/intro-courses";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct, type ApplicationProduct } from "@/lib/course/application-products";
import DocumentPreviewGallery, { type DocumentPreviewItem } from "@/app/components/document-preview-gallery";
import CourseViewEvent from "@/app/components/analytics/course-view-event";

export function generateStaticParams() {
  return introCourses.map((course) => ({ slug: course.slug }));
}

type CourseIntroPageProps = {
  params: Promise<{ slug: string }>;
};

type DuiProductColumn = {
  id: ApplicationProduct["id"];
  label: string;
  badge?: string;
  summary: string;
  cta: string;
  product: ApplicationProduct;
};

const duiProductColumns: DuiProductColumn[] = [
  {
    id: basicApplicationProduct.id,
    label: "기본과정",
    summary: "온라인 예방교육을 수강하고 기본 교육 수료증을 발급받는 과정입니다.",
    cta: "기본과정 신청",
    product: basicApplicationProduct,
  },
  {
    id: duiDocumentsApplicationProduct.id,
    label: "자료포함과정",
    badge: "자료 준비 추천",
    summary: "온라인 예방교육과 기본 교육 수료증에 더해 재발방지계획서, 음주예방실천계획서, 음주운전 재발방지 서약서 및 작성 가이드를 함께 제공받는 과정입니다.",
    cta: "자료포함과정 신청",
    product: duiDocumentsApplicationProduct,
  },
  {
    id: duiCbtAdvancedApplicationProduct.id,
    label: "심화과정",
    badge: "심화교육 포함",
    summary: "온라인 예방교육과 제출용 자료에 더해 인지행동 원리를 활용한 심화 재범방지교육을 추가로 이수하는 종합과정입니다.",
    cta: "심화과정 신청",
    product: duiCbtAdvancedApplicationProduct,
  },
];

type ComparisonRow = { label: string; note?: string; included: readonly [boolean, boolean, boolean] };

const comparisonRows: ComparisonRow[] = [
  { label: "온라인 예방교육 3강", included: [true, true, true] },
  { label: "기본 교육 수료증", included: [true, true, true] },
  { label: "반성문 작성 가이드 및 예시", included: [true, true, true] },
  { label: "재발방지계획서", included: [false, true, true] },
  { label: "음주예방실천계획서", note: "위험상황 대처계획 포함", included: [false, true, true] },
  { label: "음주운전 재발방지 서약서", included: [false, true, true] },
  { label: "인지행동기반 재발방지교육", included: [false, false, true] },
  { label: "심화 온라인 교육과정", included: [false, false, true] },
  { label: "인지행동기반 재발방지교육 이수증", included: [false, false, true] },
  { label: "재범방지교육 상세내역서", included: [false, false, true] },
];

const documentPreviewItems: DocumentPreviewItem[] = [
  {
    id: "certificate-sample",
    title: "기본 교육 수료증",
    products: ["기본과정", "자료포함과정", "심화과정"],
    description: "온라인 예방교육 3강 이수 후 발급되는 기본 교육 수료 확인 문서입니다.",
    imageSrc: "/images/document-samples/basic-certificate-sample.jpg",
  },
  {
    id: "prevention-plan-sample",
    title: "재발방지계획서 1페이지 예시",
    products: ["자료포함과정", "심화과정"],
    description: "재발 원인, 음주 전후 위험요인, 향후 실천계획을 본인 상황에 맞게 정리하는 서식입니다.",
    imageSrc: "/images/document-samples/prevention-plan-sample.jpg",
  },
  {
    id: "sobriety-pledge-sample",
    title: "음주운전 재발방지 서약서",
    products: ["자료포함과정", "심화과정"],
    description: "음주 후 운전하지 않겠다는 원칙과 가족·주변인 확인 내용을 문서로 정리합니다.",
    imageSrc: "/images/document-samples/sobriety-pledge-sample.jpg",
  },
  {
    id: "risk-response-plan-sample",
    title: "음주예방실천계획서",
    products: ["자료포함과정", "심화과정"],
    description: "회식, 지인 모임, 숙취 상태 등 위험상황별 대처계획과 귀가수단 확보 기준을 정리합니다.",
    imageSrc: "/images/document-samples/risk-response-plan-sample.jpg",
  },
  {
    id: "cognitive-prevention-certificate-sample",
    title: "인지행동 기반 재범방지교육 이수증",
    products: ["심화과정"],
    description: "심화과정 수강자가 인지행동기반 재발방지교육을 이수했음을 확인하는 문서입니다.",
    imageSrc: "/images/document-samples/cognitive-prevention-certificate-sample.jpg",
  },
  {
    id: "course-detail-sample",
    title: "재범방지교육 상세내역서",
    products: ["심화과정"],
    description: "심화과정에서 다룬 주요 교육내용과 이수 상태를 상세히 확인하는 문서입니다.",
    imageSrc: "/images/document-samples/course-detail-sample.svg",
  },
];

function IncludedIcon({ included }: { included: boolean }) {
  if (!included) {
    return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-base font-black text-slate-400">-</span>;
  }

  return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#173968] text-white"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></span>;
}

function productHref(product: ApplicationProduct) {
  return "/courses/apply?category=dui&productId=" + product.id;
}

export async function generateMetadata({ params }: CourseIntroPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getIntroCourse(slug);

  if (!course) {
    return { title: "교육과정 | 리셋에듀센터" };
  }

  return {
    title: course.slug === "dui-prevention" ? "음주운전 예방교육·재발방지 수료증 과정 | Reset Edu Center" : `${course.title} | Reset Edu Center`,
    description: course.slug === "dui-prevention" ? "음주운전 사건 이후 행동원인과 위험상황을 점검하고 재발방지 실천계획을 세우는 온라인 예방교육 과정입니다." : course.summary,
    alternates: { canonical: `/courses/${course.slug}/` },
    robots: course.slug === "dui-prevention" ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CourseIntroPage({ params }: CourseIntroPageProps) {
  const { slug } = await params;
  const course = getIntroCourse(slug);

  if (!course) {
    notFound();
  }

  if (course.slug !== "dui-prevention") {
    return (
      <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
        <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Link href="/courses" className={buttonClass("darkSecondary", "sm", "rounded-full px-4 focus:ring-offset-[#10213f]")}>강의 구성으로 이동</Link>
            <span className="mt-8 inline-flex rounded-full bg-gray-300 px-4 py-2 text-xs font-black text-gray-700">준비중</span>
            <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-5xl">{course.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">준비중인 과정입니다.</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">해당 교육 과정은 현재 콘텐츠를 준비하고 있습니다. 과정 구성과 제공 자료가 확정되면 순차적으로 안내될 예정입니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className={buttonClass("darkPrimary", "md", "rounded-full px-6 font-black focus:ring-offset-[#10213f]")}>강의 구성 보기</Link>
              <button type="button" disabled className={buttonClass("secondary", "md", "rounded-full px-6 font-bold disabled:bg-gray-300 disabled:text-gray-800")}>준비중</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    url: "https://resetedu.kr/courses/dui-prevention/",
    provider: { "@type": "Organization", name: "Reset Edu Center", url: "https://resetedu.kr/" },
    offers: duiProductColumns.map(({ product }) => ({
      "@type": "Offer",
      name: product.title,
      price: product.price,
      priceCurrency: "KRW",
      url: "https://resetedu.kr/courses/apply/?category=dui&productId=" + product.id,
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd).replace(/</g, "\\u003c") }} /><main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <section className="relative overflow-hidden bg-[#06101b] text-white">
        <div className="absolute inset-0">
          <img src={course.image} alt="" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,16,27,0.94),rgba(6,16,27,0.58))]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-32">
          <Link href="/" className={buttonClass("darkSecondary", "sm", "rounded-full px-4 focus:ring-offset-[#06101b]")}>
            홈으로 돌아가기
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f6deb0]">Reset Edu Center</p>
            <h1 className="mt-4 break-keep text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">{course.headline}</h1>
            <p className="mt-6 max-w-3xl break-keep text-base leading-8 text-slate-200 sm:text-lg">{course.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses/apply?category=dui" data-ga-event="click_enroll" data-ga-item-id={duiPreventionCourseProduct.courseId} data-ga-item-name={duiPreventionCourseProduct.courseTitle} data-ga-location="course_detail" style={{ backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", boxShadow: "0 18px 36px rgba(250,204,21,0.28)" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black !text-black hover:!text-black focus:ring-offset-[#06101b]")}>
                음주운전 교육 수강 신청
              </Link>
              <Link href="/courses/apply?category=dui&productId=dui-documents" data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name={duiPreventionCourseProduct.courseTitle} data-ga-location="course_detail" className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#06101b]")}>
                3종 서식 포함 과정 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8b6a33]">Product Detail</p>
            <h2 className="mt-3 text-2xl font-black text-[#06101b]">{duiPreventionCourseProduct.courseTitle} 수강권</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">{duiPreventionCourseProduct.description}입니다. 결제 완료 즉시 온라인 수강권이 부여되며, 수강기간은 결제일로부터 {duiPreventionCourseProduct.durationDays}일입니다.</p>
            <ul className="mt-5 grid gap-2 text-sm font-semibold leading-7 text-slate-800 sm:grid-cols-2">
              <li>총 {duiPreventionCourseProduct.totalLessons}강 온라인 교육</li>
              <li>수강 즉시 수료증 출력</li>
              <li>재발방지 계획 정리를 위한 학습 구성</li>
              <li>결제 완료 즉시 제공</li>
            </ul>
          </div>
          <aside className="rounded-[1.5rem] border border-[#173968]/20 bg-[#f8fafc] p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-600">실판매 금액</p>
            <p className="mt-2 text-4xl font-black text-[#0f2f5f]">{formatKrw(duiPreventionCourseProduct.price)}</p>
            <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">기본과정 59,000원과 교육·자료 포함 과정 109,000원 중 필요한 준비 범위에 따라 선택할 수 있습니다.</p>
            <Link href="/courses/apply?category=dui" data-ga-event="click_enroll" data-ga-item-id={duiPreventionCourseProduct.courseId} data-ga-item-name={duiPreventionCourseProduct.courseTitle} data-ga-location="course_detail" className={buttonClass("primary", "lg", "mt-5 w-full rounded-[1rem] font-black !text-black hover:!text-black")}>
              음주운전 교육 수강 신청
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8b6a33]">Course Comparison</p>
              <h2 className="mt-3 break-keep text-3xl font-black tracking-[-0.03em] text-[#06101b]">필요한 준비 범위에 맞춰 3가지 수강과정을 비교하세요</h2>
              <p className="mt-4 break-keep text-sm leading-7 text-slate-700">가격과 구성은 실제 등록된 상품 데이터를 기준으로 표시합니다. 자료포함과정은 제출용 서식 준비가 필요한 분에게 적합하고, 심화과정은 인지행동기반 재발방지교육과 심화 이수 서류까지 포함합니다.</p>
            </div>
            <Link href="/courses/apply?category=dui" className={buttonClass("primary", "md", "rounded-full px-6 font-black !text-black hover:!text-black")}>과정 선택하기</Link>
          </div>

          <div className="mt-8 hidden overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.08)] md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#06101b] text-white">
                  <th className="w-[28%] px-5 py-4 text-left font-black">구분</th>
                  {duiProductColumns.map((column) => (
                    <th key={column.id} className="px-4 py-4 text-center align-top">
                      <span className="block text-base font-black text-white">{column.label}</span>
                      {column.badge ? <span className="mt-2 inline-flex rounded-full bg-[#f6deb0] px-3 py-1 text-xs font-black text-[#06101b]">{column.badge}</span> : null}
                      <span className="mt-2 block text-lg font-black text-[#f6deb0]">{formatKrw(column.product.price)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
                    <th className="bg-slate-50 px-5 py-4 text-left font-black text-slate-900"><span>{row.label}</span>{row.note ? <span className="ml-2 text-xs font-bold text-slate-500">{row.note}</span> : null}</th>
                    {row.included.map((included, index) => <td key={duiProductColumns[index].id} className="px-4 py-4 text-center"><IncludedIcon included={included} /></td>)}
                  </tr>
                ))}
                <tr className="bg-[#fff8e7]">
                  <th className="px-5 py-4 text-left text-base font-black text-[#5f4514]">가격</th>
                  {duiProductColumns.map((column) => <td key={column.id} className="px-4 py-4 text-center text-lg font-black text-[#5f4514]">{formatKrw(column.product.price)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:hidden">
            {duiProductColumns.map((column) => (
              <article key={column.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-xl font-black text-[#06101b]">{column.label}</h3><p className="mt-1 text-2xl font-black text-[#173968]">{formatKrw(column.product.price)}</p></div>
                  {column.badge ? <span className="rounded-full bg-[#f6deb0] px-3 py-1 text-xs font-black text-[#5f4514]">{column.badge}</span> : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{column.summary}</p>
                <ul className="mt-4 space-y-2.5">
                  {comparisonRows.map((row) => <li key={row.label} className="flex items-start gap-2 text-sm leading-6 text-slate-800"><IncludedIcon included={row.included[duiProductColumns.findIndex((item) => item.id === column.id)]} /><span className={row.included[duiProductColumns.findIndex((item) => item.id === column.id)] ? "font-semibold" : "text-slate-400"}>{row.label}{row.note ? <span className="block text-xs font-medium text-slate-500">{row.note}</span> : null}</span></li>)}
                </ul>
                <Link href={productHref(column.product)} data-ga-event="click_enroll" data-ga-item-id={column.product.id} data-ga-item-name={column.product.title} data-ga-location="course_detail_comparison" className={buttonClass(column.id === "dui-documents" ? "warning" : "primary", "md", column.id === "dui-documents" ? "mt-5 w-full rounded-xl font-black !text-black hover:!text-black" : "mt-5 w-full rounded-xl font-black !text-white hover:!text-white")}>{column.cta}</Link>
              </article>
            ))}
          </div>

          <div className="mt-6 hidden grid-cols-3 gap-4 md:grid">
            {duiProductColumns.map((column) => (
              <article key={column.id} className={column.id === "dui-documents" ? "rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)]" : "rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"}>
                <div className="flex min-h-[34px] flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[#06101b]">{column.label}</h3>{column.badge ? <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-black text-[#173968]">{column.badge}</span> : null}</div>
                <p className="mt-2 text-2xl font-black text-[#173968]">{formatKrw(column.product.price)}</p>
                <p className="mt-3 min-h-[72px] break-keep text-sm leading-6 text-slate-700">{column.summary}</p>
                <Link href={productHref(column.product)} data-ga-event="click_enroll" data-ga-item-id={column.product.id} data-ga-item-name={column.product.title} data-ga-location="course_detail_comparison" className={buttonClass(column.id === "dui-documents" ? "warning" : "primary", "md", column.id === "dui-documents" ? "mt-4 w-full rounded-xl font-black !text-black hover:!text-black" : "mt-4 w-full rounded-xl font-black !text-white hover:!text-white")}>{column.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8b6a33]">Document Preview</p>
            <h2 className="mt-3 break-keep text-3xl font-black tracking-[-0.03em] text-[#06101b]">실제 발급 문서를 결제 전에 확인해보세요</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">모든 예시는 개인정보를 마스킹한 샘플입니다. 전체 문서가 아닌 일부 구성만 보여주며, 실제 발급 문서는 수강자 정보와 이수 상태에 맞춰 생성됩니다.</p>
          </div>
          <div className="mt-8"><DocumentPreviewGallery documents={documentPreviewItems} /></div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(3,10,20,0.10)]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8b6a33]">Course Overview</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#06101b]">이런 분에게 적합합니다</h2>
            <div className="mt-6 space-y-3">
              {course.audience.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d8b36a]" />
                  <span className="break-keep">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(3,10,20,0.10)]">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-[#06101b]">교육에서 정리하는 내용</h2>
              <div className="mt-5 space-y-3">
                {course.outcomes.map((item) => (
                  <p key={item} className="break-keep rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-700">{item}</p>
                ))}
              </div>
            </section>
            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(3,10,20,0.10)]">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-[#06101b]">수강 즉시 출력 자료</h2>
              <div className="mt-5 space-y-3">
                {course.documents.map((item) => (
                  <p key={item} className="break-keep rounded-2xl bg-[#f7f0e2] px-4 py-3 text-sm font-bold leading-7 text-[#6f531b]">{item}</p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-[2rem] bg-[#06101b] p-6 text-white shadow-[0_20px_70px_rgba(6,16,27,0.22)] md:grid-cols-3 lg:p-8">
            {["과정 선택", "결제 후 수강실 입장", "수강 즉시 출력"].map((item, index) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-black text-[#f6deb0]">0{index + 1}</p>
                <p className="mt-2 text-xl font-bold">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            본 교육과 자료는 예방교육, 자기점검 및 재발방지 계획 수립을 지원하기 위한 콘텐츠입니다. 교육 수강이나 자료 제출만으로 개별 사건의 선처, 감형 또는 특정한 법률적 결과가 보장되지는 않습니다.
          </div>
        </div>
      </section>
    </main></>
  );
}
