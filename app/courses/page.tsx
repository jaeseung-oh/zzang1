import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/app/components/ui/button-styles";
import { CourseRecommendation } from "@/app/components/conversion-tools";
import { formatApplicationKrw, isCounselingProductId } from "@/lib/course/application-products";
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
  ["보이스피싱", "#voice-phishing-prevention"],
  ["디지털성범죄", "#digital-sexual-crime-prevention"],
  ["음주운전", "#dui"],
  ["폭력범죄", "#violence-prevention"],
  ["도박중독", "#gambling-relapse-prevention"],
  ["성범죄", "#sexual-offense-prevention"],
  ["성매매", "#prostitution-prevention"],
  ["마약중독", "#drug-rehab-prevention"],
  ["디지털범죄", "#digital-crime"],
  ["사기", "#fraud-prevention"],
  ["무면허운전", "#unlicensed-driving-prevention"],
  ["숙취운전", "#hangover-driving-prevention"],
  ["난폭·보복운전", "#reckless-retaliatory-driving-prevention"],
  ["악플·모욕·명예훼손", "#defamation-insult-prevention"],
  ["준법의식", "#legal-compliance-awareness"],
] as const;

function Icon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function ProductCard({ course, product }: { course: CourseCategory; product: ReturnType<typeof getPlatformCourseProducts>[number] }) {
  const isCounseling = isCounselingProductId(product.id);
  const isAdvanced = isCounseling || product.id === course.advancedProductId || product.id.endsWith("advanced");
  const label = product.id === course.basicProductId ? "기본 수료과정" : isCounseling ? "심리상담 종합과정" : isAdvanced ? "심화이수과정" : product.title;
  const description = isCounseling ? "교육 이수에서 끝나지 않고, 유선 심리상담으로도 개인의 상황과 변화 과정을 구체적으로 정리하는 종합 과정" : isAdvanced ? "기본 수료과정 전체에 CBT 이수자료와 교육이수 상세자료가 추가되는 과정" : "교육 이수와 기본 수료자료가 필요한 경우";
  const courseDocumentTitles = getPreventionDocumentsForCourse(product.courseId || course.basicProductId).map((document) => document.title);
  const fallbackIncludes = ["온라인 재범방지교육", "교육 수료증 PDF 발급", ...courseDocumentTitles, ...(isAdvanced ? ["인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서", "교육 소감문 작성자료"] : []), "인쇄 및 PDF 저장"];
  const displayIncludes = product.includes.length > 0 ? product.includes : fallbackIncludes;
  return (
    <Link href={getApplyHref(course, product.id)} className={isCounseling ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#d3b271] bg-white p-5 shadow-[0_18px_45px_rgba(211,178,113,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.18)] focus:outline-none focus:ring-4 focus:ring-[#d3b271]/30" : isAdvanced ? "group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20" : "group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20"} aria-label={course.title + " " + label + " 시작하기"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#176b68]">{label}</p>
          <h3 className="mt-2 break-keep text-2xl font-black leading-snug text-slate-950">{course.title} {label}</h3>
        </div>
        {isCounseling ? <span className="w-fit rounded-full bg-[#d3b271] px-3 py-1.5 text-sm font-black text-slate-950">상위 종합과정</span> : isAdvanced ? <span className="w-fit rounded-full bg-[#173968] px-3 py-1.5 text-sm font-black text-white">가장 많이 선택하는 과정</span> : <span className="w-fit rounded-full border border-[#176b68]/20 bg-slate-50 px-3 py-1.5 text-sm font-black text-[#176b68]">기본 수료자료 과정</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-700"><span className="rounded-full bg-slate-100 px-3 py-1.5">온라인 수강</span><span className="rounded-full bg-slate-100 px-3 py-1.5">수료자료 발급</span>{isCounseling ? <span className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-[#5f4514]">유선 상담 가능</span> : null}</div>
      <p className={isCounseling ? "mt-4 text-[34px] font-black tracking-tight leading-none text-[#5f4514] min-[380px]:text-[38px] sm:text-4xl" : isAdvanced ? "mt-4 text-[34px] font-black tracking-tight leading-none text-[#173968] min-[380px]:text-[38px] sm:text-4xl" : "mt-4 text-[34px] font-black tracking-tight leading-none text-slate-950 min-[380px]:text-[38px] sm:text-4xl"}>{formatApplicationKrw(product.price)}</p>
      <p className="mt-3 break-keep text-base font-bold leading-7 text-slate-700">{description}</p>
      <div className="mt-5 flex-1">
        <p className="text-lg font-black text-slate-950">{isCounseling ? "심화이수과정보다 추가되는 구성" : isAdvanced ? "기본 수료과정보다 추가되는 구성" : "포함 구성"}</p>
        <ul className="mt-3 space-y-2">
          {displayIncludes.map((item) => {
            const isCounselingExtra = isCounseling && (item.includes("심리상담") || item.includes("상담기관") || item.includes("종합 평가") || item.includes("유선 상담"));
            const isAdvancedExtra = isAdvanced && !isCounselingExtra && (item.includes("심화이수과정 전체 포함") || item.includes("충실 준비과정 전체 포함") || item.includes("충실준비과정 전체 포함") || item.includes("인지행동") || item.includes("CBT") || item.includes("상세") || item.includes("이수증") || item.includes("소감문"));
            return <li key={item} className="flex gap-2.5 text-base font-semibold leading-7 text-slate-800"><Icon className={isCounselingExtra ? "mt-1 h-5 w-5 shrink-0 text-[#b91c1c]" : isAdvancedExtra ? "mt-1 h-5 w-5 shrink-0 text-[#173968]" : "mt-1 h-5 w-5 shrink-0 text-[#176b68]"} /><span className={isCounselingExtra ? "font-black text-[#b91c1c]" : isAdvancedExtra ? "font-black text-[#173968]" : undefined}>{item}</span></li>;
          })}
        </ul>
        {isCounseling ? <div className="mt-4 rounded-xl border border-[#d3b271] bg-[#fffaf0] p-4">
          <p className="text-sm font-black text-slate-950">상담 진행 안내</p>
          <p className="mt-2 break-keep text-sm font-bold leading-6 text-[#5f4514]">결제 완료 후 <strong className="font-black text-[#b91c1c]">1영업일 이내 담당 심리상담사가 개별 연락드립니다.</strong></p>
          <p className="mt-2 break-keep text-sm font-bold leading-6 text-[#b91c1c]">상담은 별도 방문 없이 유선으로도 진행 가능합니다.</p>
          <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-700">상담을 통해 사건 경위, 현재 상황, 재발 위험요인, 생활환경 및 향후 실천계획 등을 확인하고, <strong className="font-black text-slate-950">심리상담의견서 및 상담기관 탄원서</strong>는 상담 및 종합평가 내용을 바탕으로 작성됩니다.</p>
        </div> : null}
      </div>
      <span className={buttonClass(isCounseling || isAdvanced ? "primary" : "warning", "md", isCounseling ? "mt-6 min-h-12 w-full rounded-xl bg-[#5f4514] px-3 text-center font-black leading-5 transition group-hover:bg-[#10213f]" : isAdvanced ? "mt-6 min-h-12 w-full rounded-xl px-3 text-center font-black leading-5 transition group-hover:bg-[#10213f]" : "mt-6 min-h-12 w-full rounded-xl px-3 text-center font-black !text-black leading-5 transition hover:!text-black group-hover:border-[#176b68]")}>수강과정 선택하기</span>
    </Link>
  );
}

export default function CoursesPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 pb-[calc(92px+env(safe-area-inset-bottom))] text-slate-950 lg:pb-0">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Curriculum</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">교육과정</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">사건 이후 필요한 재범방지교육과 실천자료 준비 범위에 맞는 과정을 선택할 수 있습니다.</p>
          <p className="mt-3 max-w-3xl break-keep text-base font-bold leading-relaxed text-[#9be0d5] sm:text-lg">심리상담사 1급 자격증을 보유한 전문자격사가 운영합니다.</p>
          <p className="mt-3 max-w-3xl break-keep text-base font-bold leading-relaxed text-slate-100 sm:text-lg">기본 수료과정은 <strong className="text-white">49,000원</strong>, 심화이수과정은 <strong className="text-white">99,000원</strong>, 심리상담 종합과정은 <strong className="text-white">199,000원</strong>입니다. 과정별 제공자료 차이를 확인한 뒤 선택할 수 있습니다.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#all" className={buttonClass("darkPrimary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f] sm:w-auto")}>교육 선택하고 결제하기</a>
            <CourseRecommendation triggerLabel="나에게 맞는 강의 찾기" />
            <Link href="/prevention-documents" className={buttonClass("darkSecondary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#10213f] sm:w-auto")}>실천자료 둘러보기</Link>
          </div>
          <div className="mt-5 grid gap-2 text-base font-bold text-white sm:grid-cols-4">
            {[["1", "사건 유형 선택"], ["2", "과정 선택"], ["3", "결제 후 수강"], ["4", "수료증 및 제출자료 발급"]].map(([number, label]) => <div key={number} className="flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm text-[#173968]">{number}</span><span>{label}</span></div>)}
          </div>
        </div>
      </section>

      <section className="sticky top-[61px] z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:top-[73px] lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {filters.map(([label, href]) => <Link key={label} href={href} className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2.5 text-base font-black text-slate-800 hover:border-[#173968] hover:bg-[#173968] hover:text-white">{label}</Link>)}
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
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-[#176b68]">{course.navTitle}</p>
                    <h2 className="mt-2 break-keep text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{course.title}</h2>
                    <p className="mt-3 break-keep text-base leading-8 text-slate-700 sm:text-lg">{course.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{course.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-200 px-3 py-1.5 text-sm font-black text-slate-700">{tag}</span>)}</div>
                  </div>
                  <Link href={"/courses/" + course.slug} className={buttonClass("secondary", "md", "rounded-full px-6 font-black")}>과정 자세히 보기</Link>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ProductCard key={product.id} course={course} product={product} />)}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur lg:hidden"><div className="mx-auto grid max-w-md grid-cols-[1fr_auto] items-center gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-600">교육 유형 선택 후 바로 결제</p><p className="mt-0.5 text-sm font-black text-[#10213f]">원하는 교육과정을 선택하세요</p></div><a href="#all" className={buttonClass("primary", "md", "min-h-12 shrink-0 rounded-xl px-5 font-black")}>교육 선택</a></div></div>
    </main>
  );
}
