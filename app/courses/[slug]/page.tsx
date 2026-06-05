import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIntroCourse, introCourses } from "@/lib/course/intro-courses";

export function generateStaticParams() {
  return introCourses.map((course) => ({ slug: course.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const course = getIntroCourse(params.slug);

  if (!course) {
    return { title: "교육과정 | 리셋에듀센터" };
  }

  return {
    title: `${course.title} | 리셋에듀센터`,
    description: course.summary,
  };
}

export default function CourseIntroPage({ params }: { params: { slug: string } }) {
  const course = getIntroCourse(params.slug);

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <section className="relative overflow-hidden bg-[#06101b] text-white">
        <div className="absolute inset-0">
          <img src={course.image} alt="" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,16,27,0.94),rgba(6,16,27,0.58))]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-32">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
            홈으로 돌아가기
          </Link>
          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f6deb0]">Reset Edu Center</p>
            <h1 className="mt-4 break-keep text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">{course.headline}</h1>
            <p className="mt-6 max-w-3xl break-keep text-base leading-8 text-slate-200 sm:text-lg">{course.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/course-application" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-6 py-3 text-sm font-black text-[#161109] shadow-[0_18px_32px_rgba(164,126,54,0.24)] transition hover:-translate-y-0.5 hover:brightness-105">
                수강신청하기
              </Link>
              <Link href="/course-room" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white px-6 py-3 text-sm font-bold text-[#10213f] transition hover:-translate-y-0.5 hover:bg-[#f8fbff]">
                수강실 바로가기
              </Link>
            </div>
          </div>
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
              <h2 className="text-2xl font-black tracking-[-0.03em] text-[#06101b]">준비 가능한 자료</h2>
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
            {["과정 선택", "결제 후 수강실 입장", "자료 확인 및 출력"].map((item, index) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-black text-[#f6deb0]">0{index + 1}</p>
                <p className="mt-2 text-xl font-bold">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            본 서비스는 민간 온라인 교육 서비스이며 법률 자문이나 사건 결과 보장을 제공하지 않습니다. 자료 제출 필요성, 제출 방식, 반영 여부는 제출처 또는 담당 전문가 기준을 확인해 주세요.
          </div>
        </div>
      </section>
    </main>
  );
}
