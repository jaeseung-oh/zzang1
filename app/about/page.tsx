import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "양형자료 준비 안내 | 리셋 에듀센터",
  description: "음주운전, 도박, 마약, 사기, 성범죄 등 사건 이후 양형자료 준비를 위한 온라인 예방교육과 수료증, 참고서식 안내",
};

const coreValues = [
  { title: "체계적인 온라인 예방교육", body: "음주운전, 도박, 마약, 사기, 성범죄 등 유형별 사건 특성에 맞춘 예방교육을 제공합니다. 수강자는 교육을 통해 자신의 행동을 돌아보고, 재발 방지를 위한 실천 방향을 정리할 수 있습니다." },
  { title: "수료증 및 교육 이수 확인 자료", body: "교육을 정상적으로 수강한 후에는 수료증 또는 교육 이수 확인 자료를 발급받을 수 있습니다. 이는 수강자가 교육 이수 사실을 정리하고, 필요한 경우 양형자료의 일부로 활용할 수 있는 참고자료입니다." },
  { title: "재발방지계획서 참고서식", body: "재발방지계획서는 단순한 다짐이 아니라, 앞으로 같은 문제가 반복되지 않도록 구체적인 생활 변화 계획을 정리하는 자료입니다. 리셋 에듀센터는 수강자가 직접 작성할 수 있도록 참고서식과 작성 방향을 제공합니다." },
  { title: "실천계획서 및 서약서 참고서식", body: "사건 이후 생활습관 개선, 상담·치료 계획, 음주 관리, 대인관계 정리, 재발 위험 상황 대처방안 등을 스스로 정리할 수 있도록 실천계획서와 서약서 참고서식을 제공합니다." },
];

const targetUsers = [
  "양형자료를 준비해야 하는데 어디서부터 시작할지 막막한 분",
  "수료증과 교육 이수 기록이 필요한 분",
  "재발방지계획서를 직접 작성하려는 분",
  "반성문 외에 구체적인 실천자료를 함께 준비하고 싶은 분",
  "사건 이후 변화 의지와 재발방지 노력을 자료로 정리하고 싶은 분",
  "음주운전, 도박, 마약, 사기, 성범죄 관련 예방교육을 수강하고 싶은 분",
];

const productCards = [
  {
    title: "기본 수료형 교육",
    price: "55,000원",
    description: "수료증 중심으로 교육 이수 사실을 준비하려는 분들에게 적합합니다.",
    items: ["온라인 강의 수강", "진도율 확인", "수료증 발급", "교육 이수 기록 정리"],
    href: "/courses/apply?categoryId=dui&productId=basic",
    button: "기본 교육 신청하기",
    featured: false,
  },
  {
    title: "자료 포함형 교육",
    price: "89,000원",
    description: "수료증뿐만 아니라 재발방지계획서, 실천계획서 등 양형자료 준비에 필요한 참고서식을 함께 준비하려는 분들에게 적합합니다.",
    items: ["온라인 강의 수강", "진도율 확인", "수료증 발급", "재발방지계획서 참고서식", "실천계획서 참고서식", "서약서 참고서식", "자가 작성 가이드 제공"],
    href: "/courses/apply?categoryId=dui&productId=dui-documents",
    button: "자료 포함형 신청하기",
    featured: true,
  },
];

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 19 6.8v5.4c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.8L12 3Z" />
      <path d="m8.8 12.4 2 2 4.4-4.7" />
    </svg>
  );
}

const primaryButtonClass = "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#06101b] px-6 py-3.5 text-sm font-extrabold text-[#e9c98d] shadow-[0_16px_32px_rgba(6,16,27,0.24)] transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";
const secondaryButtonClass = "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d8e1ef] bg-white px-6 py-3.5 text-sm font-bold text-[#06101b] shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#9fb5d1] hover:bg-[#f8fbff] hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

export default function AboutPage() {
  return (
    <main className="min-h-screen break-keep bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] text-slate-950">
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-6 py-12 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#a7c7ff]">Reset Edu Center</p>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">양형자료 준비, 막막하게 시작하지 마세요.</h1>
              <p className="mt-6 max-w-4xl text-base leading-8 text-slate-100 sm:text-lg">리셋 에듀센터는 음주운전, 도박, 마약, 사기, 성범죄 등 사건 이후 반성문, 재발방지계획서, 실천계획서, 수료증 등 양형자료를 준비하려는 분들을 위한 민간 온라인 교육 플랫폼입니다.</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-[15px]">단순히 강의만 듣는 것이 아니라, 교육 수강부터 수료증 발급, 재발방지계획 정리, 양형자료 참고서식 확인까지 한 번에 준비할 수 있도록 구성했습니다.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/courses/apply?categoryId=dui&productId=dui-documents" className={primaryButtonClass + " focus:ring-offset-[#173968]"}>지금 수강 신청하기 <ArrowIcon /></Link>
                <a href="#course-packages" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/16 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-[#173968]">양형자료 구성 살펴보기</a>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-5 shadow-[0_22px_55px_rgba(2,6,23,0.18)] backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#173968]"><ShieldIcon /></div>
              <h2 className="mt-5 text-2xl font-black">자료 포함형 추천</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">수료증과 함께 재발방지계획서, 실천계획서, 서약서 참고서식을 확인할 수 있는 89,000원 과정입니다.</p>
              <div className="mt-5 rounded-[1rem] border border-[#e9c98d]/35 bg-[#e9c98d]/12 p-4 text-sm font-semibold leading-7 text-[#f8e7c4]">양형자료를 처음 준비한다면 교육 이수 기록과 자가 작성용 참고서식을 함께 준비하는 흐름이 더 실용적입니다.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Mission</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-4xl">사건 이후 중요한 것은 진심을 구체적인 자료로 정리하는 일입니다.</h2>
          </div>
          <div className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-6 text-sm leading-8 text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-8 sm:text-base">
            <p>반성의 마음이 있더라도 이를 어떻게 정리해야 할지 모르면 자료 준비가 막막할 수 있습니다. 특히 음주운전, 도박, 마약, 사기, 성범죄 등 사건 이후에는 본인의 문제를 돌아보고, 같은 일이 반복되지 않도록 어떤 노력을 하고 있는지 구체적으로 정리하는 과정이 필요할 수 있습니다.</p>
            <p className="mt-5">리셋 에듀센터는 유형별 예방교육과 수료증, 재발방지계획서 참고서식, 실천계획서 참고서식 등을 제공하여 수강자가 자신의 반성, 변화 의지, 재발방지 노력을 직접 정리할 수 있도록 돕습니다.</p>
            <div className="mt-6 rounded-[1rem] border border-[#d8e2ee] bg-[#f3f7ff] p-5 text-base font-bold leading-8 text-[#0f2f5f]">혼자 고민하지 마세요. 교육을 듣고, 수료 기록을 남기고, 양형자료로 활용할 수 있는 참고자료를 체계적으로 준비하세요.</div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Core Value</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">양형자료 준비에 필요한 핵심 구성을 제공합니다.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {coreValues.map((card, index) => (
              <article key={card.title} className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#173968]"><span className="text-sm font-black">{index + 1}</span></div>
                <h3 className="mt-5 text-xl font-black leading-tight text-[#06101b]">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Recommended For</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">이런 분들에게 필요합니다.</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses/apply?categoryId=dui&productId=dui-documents" className={primaryButtonClass}>지금 수강 신청하기 <ArrowIcon /></Link>
              <a href="#course-packages" className={secondaryButtonClass}>교육 과정 보기</a>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {targetUsers.map((item) => (
                <li key={item} className="flex gap-3 rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm font-semibold leading-7 text-slate-700">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="course-packages" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Course Packages</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">교육 과정 안내</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">수료증 중심 준비부터 참고서식 포함 과정까지, 필요한 자료 구성에 맞춰 선택할 수 있습니다.</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {productCards.map((product) => (
              <article key={product.title} className={product.featured ? "relative rounded-[1.5rem] border-2 border-[#173968] bg-[linear-gradient(180deg,#f3f7ff_0%,#ffffff_100%)] p-6 shadow-[0_24px_60px_rgba(23,57,104,0.18)]" : "rounded-[1.5rem] border border-[#dbe4ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)]"}>
                {product.featured ? <span className="absolute right-5 top-5 rounded-full bg-[#173968] px-4 py-1.5 text-xs font-black text-white">추천 과정</span> : null}
                <h3 className="pr-28 text-2xl font-black text-[#06101b]">{product.title}</h3>
                <p className={product.featured ? "mt-4 text-4xl font-black text-[#0f2f5f]" : "mt-4 text-4xl font-black text-slate-950"}>{product.price}</p>
                <p className="mt-4 min-h-[56px] text-sm leading-7 text-slate-600">{product.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {product.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href={product.href} className={(product.featured ? primaryButtonClass : secondaryButtonClass) + " mt-6 w-full rounded-[1rem]"}>{product.button} <ArrowIcon /></Link>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#cfdceb] bg-[#06101b] p-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e9c98d]">Recommended</p>
            <h3 className="mt-3 text-2xl font-black">양형자료를 처음 준비한다면 자료 포함형 교육을 권장합니다.</h3>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200">교육 이수 기록과 함께 재발방지계획서, 실천계획서 등 참고서식을 확인할 수 있어 보다 체계적으로 자료를 정리할 수 있습니다.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] p-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a7c7ff]">Start Now</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">지금 필요한 양형자료를 차분히 준비하세요.</h2>
              <p className="mt-5 text-sm leading-8 text-slate-200 sm:text-base">사건 이후의 대응은 막연한 후회에서 끝나서는 안 됩니다. 본인의 반성, 변화 의지, 재발방지 노력을 구체적인 자료로 정리하는 과정이 필요합니다.</p>
              <p className="mt-4 text-sm leading-8 text-slate-200 sm:text-base">리셋 에듀센터는 교육 수강부터 수료증 발급, 재발방지계획서 참고서식 제공까지 양형자료 준비에 필요한 흐름을 제공합니다.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/courses/apply?categoryId=dui&productId=dui-documents" className={primaryButtonClass + " bg-white text-[#06101b] hover:bg-[#f8fbff] focus:ring-offset-[#173968]"}>지금 수강 신청하기 <ArrowIcon /></Link>
              <Link href="/login?next=/course-room" className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/16 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-[#173968]">로그인 후 이어서 보기</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.25rem] border border-[#dbe4ef] bg-white/80 p-5 text-xs leading-6 text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p>
          <p className="mt-3">본 센터는 개별 사건에 대한 법률상담, 문서 작성이나 제출을 대신하는 서비스, 특정 결과 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p>
        </div>
      </section>
    </main>
  );
}
