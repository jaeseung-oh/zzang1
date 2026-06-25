import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { notFound } from "next/navigation";
import { getIntroCourse, introCourses } from "@/lib/course/intro-courses";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { basicApplicationProduct, duiDocumentsApplicationProduct } from "@/lib/course/application-products";
import CourseViewEvent from "@/app/components/analytics/course-view-event";

export function generateStaticParams() {
  return introCourses.map((course) => ({ slug: course.slug }));
}

type CourseIntroPageProps = {
  params: Promise<{ slug: string }>;
};

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
    offers: [basicApplicationProduct, duiDocumentsApplicationProduct].map((product) => ({
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
              <Link href="/courses/apply?category=dui" data-ga-event="click_enroll" data-ga-item-id={duiPreventionCourseProduct.courseId} data-ga-item-name={duiPreventionCourseProduct.courseTitle} data-ga-location="course_detail" style={{ backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", boxShadow: "0 18px 36px rgba(250,204,21,0.28)" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#06101b]")}>
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
            <Link href="/courses/apply?category=dui" data-ga-event="click_enroll" data-ga-item-id={duiPreventionCourseProduct.courseId} data-ga-item-name={duiPreventionCourseProduct.courseTitle} data-ga-location="course_detail" className={buttonClass("primary", "lg", "mt-5 w-full rounded-[1rem] font-black")}>
              음주운전 교육 수강 신청
            </Link>
          </aside>
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
