import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { basicApplicationProduct, duiDocumentsApplicationProduct, formatApplicationKrw } from "@/lib/course/application-products";

export const metadata: Metadata = {
  title: "범죄 예방과 재발방지를 위한 전문 온라인 교육 | Reset Edu Center",
  description: "음주운전 예방교육을 온라인으로 수강하고 수강 즉시 수료증을 출력하며 재발방지계획서 참고서식을 확인하세요.",
  alternates: { canonical: "/" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Reset Edu Center",
  url: "https://resetedu.kr/",
};

const applyHref = "/courses/apply?category=dui";

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "car") return <svg {...common}><path d="M5 16l1.5-5A3 3 0 0 1 9.4 8h5.2a3 3 0 0 1 2.9 3L19 16" /><path d="M6.5 16h11" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

const materials = [
  ["수료증", "교육 이수 사실을 확인합니다."],
  ["교육 이수 확인 자료", "수강 기록과 이수 여부를 정리합니다."],
  ["재발방지계획서", "생활 변화 계획을 직접 작성합니다."],
  ["음주예방실천계획서", "음주 관리와 실천 방향을 정리합니다."],
  ["서약서", "재발방지 의지를 문서로 정리합니다."],
];

const categories = [
  ["음주운전 예방교육", "수강 가능", "음주운전의 위험성, 법적 책임, 피해자 관점, 재발방지계획 수립을 중심으로 구성된 온라인 예방교육입니다.", true],
  ["도박 예방교육", "준비중", "도박 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["마약 예방교육", "준비중", "마약류 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["사기 예방교육", "준비중", "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["성범죄 예방교육", "준비중", "성범죄 예방과 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
] as const;

const targetUsers = [
  "양형자료 준비가 막막한 분",
  "수료증과 교육 이수 기록이 필요한 분",
  "재발방지계획서를 직접 작성하려는 분",
  "반성문 외에 실천자료를 준비하려는 분",
  "사건 이후 변화 의지를 정리하려는 분",
];

const steps = [
  ["과정 확인", "현재 운영 중인 음주운전 예방교육을 확인합니다."],
  ["상품 선택", "수강 즉시 수료증 출력 과정 또는 참고서식 포함 과정을 선택합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 온라인으로 수강합니다."],
  ["즉시 출력", "수강 즉시 수료증 등 자료를 출력합니다."],
];

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">{eyebrow}</p><h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

export default function HomePage() {
  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} /><main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[url('/images/prevention-education-hero.png')] bg-cover bg-center opacity-85" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(15,23,42,0.72)_42%,rgba(15,23,42,0.34)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(2,6,23,0.72),rgba(2,6,23,0))]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-24">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-slate-100">온라인 예방교육 · 수강 즉시 수료증 · 재발방지 실천자료</p>
            <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">사건 이후 필요한 예방교육과 재발방지 자료를 한곳에서 준비하세요</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">자신의 잘못과 위험상황을 돌아보고 같은 문제가 반복되지 않도록 교육 이수 기록과 구체적인 실천계획을 체계적으로 정리할 수 있도록 돕습니다.</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">현재는 음주운전 예방교육을 운영하며, 온라인 수강과 수강 즉시 수료증 출력, 반성문 작성 가이드, 재발방지계획서·실천계획서·서약서 참고서식을 제공합니다.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>과정 선택하기</Link><Link href="/courses" className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 font-bold focus:ring-offset-[#10213f]")}>교육과정 보기</Link></div>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-black text-white">수강 즉시 출력 자료</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {materials.slice(0, 4).map(([title, body]) => <div key={title} className="flex min-w-0 gap-3 rounded-2xl bg-white p-4 text-slate-950"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Icon name="file" /></span><span className="min-w-0"><span className="block text-base font-black leading-snug text-slate-950">{title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-700">{body}</span></span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Start Here" title="어떤 자료부터 준비해야 할지 막막하신가요?" body="형식적인 문서를 단순히 채우기보다 자신의 행동을 돌아보고 같은 문제가 반복되지 않도록 구체적인 계획을 세우는 과정이 중요합니다. 온라인 예방교육과 직접 작성할 수 있는 실천자료를 함께 확인하세요." />
          <div className="mt-10 flex gap-4 overflow-x-auto pb-2">
            {categories.map(([title, status, body, available]) => <article key={title} className="flex min-w-[260px] flex-col rounded-xl border border-slate-200 bg-slate-50 p-5 xl:min-w-0"><div className="flex items-center justify-between gap-3"><Icon name={available ? "car" : "lock"} className="h-7 w-7 text-indigo-700" /><span className={available ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white" : "rounded-full bg-gray-300 px-3 py-1 text-xs font-black text-gray-700"}>{status}</span></div><h3 className="mt-4 text-lg font-black leading-snug text-slate-950">{title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{body}</p>{available ? <Link href="/courses" className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold")}>강의 구성 보기</Link> : <button type="button" disabled className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-800")}>준비중</button>}</article>)}
          </div>
        </div>
      </section>

      <section id="materials" className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="교육부터 실천자료 준비까지 한곳에서 확인하세요" body="수강 즉시 발급되는 수료증과 본인이 직접 정리하는 참고서식을 확인하세요." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]"><SectionTitle eyebrow="Why It Matters" title="단순히 서류를 채우는 것보다 중요한 것은 구체적인 재발방지 계획입니다" body="교육을 통해 위험상황과 행동원인을 점검하고 앞으로의 행동을 구체적으로 작성하면 자료도 본인의 실제 상황에 맞게 정리할 수 있습니다." /><div className="grid gap-3 sm:grid-cols-2">{targetUsers.map((item) => <div key={item} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></div>)}</div></div></section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="필요한 준비 범위에 따라 선택하세요" body="두 과정 모두 온라인 예방교육, 수강 즉시 수료증, 3개월 수강기간과 반성문 작성 가이드를 제공합니다." /><div className="mt-8 grid gap-5 lg:grid-cols-2"><article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6"><h3 className="text-xl font-black">{basicApplicationProduct.title}</h3><p className="mt-3 text-3xl font-black">{formatApplicationKrw(basicApplicationProduct.price)}</p><p className="mt-3 text-sm leading-7 text-slate-700">{basicApplicationProduct.description}</p><Link href={applyHref} className={buttonClass("secondary", "md", "mt-6 w-full rounded-xl font-black")}>기본과정 선택하기</Link></article><article className="rounded-[1.5rem] border-2 border-indigo-600 bg-indigo-50 p-6"><span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">교육과 실천자료 포함</span><h3 className="mt-4 text-xl font-black">{duiDocumentsApplicationProduct.title}</h3><p className="mt-3 text-3xl font-black">{formatApplicationKrw(duiDocumentsApplicationProduct.price)}</p><p className="mt-3 text-sm leading-7 text-slate-700">{duiDocumentsApplicationProduct.description}</p><Link href="/courses/apply?category=dui&productId=dui-documents" className={buttonClass("primary", "md", "mt-6 w-full rounded-xl font-black")}>교육과 자료 함께 준비하기</Link></article></div><p className="mt-5 text-sm leading-7 text-slate-600">제출처에서 요구하는 자료는 사건과 절차에 따라 다를 수 있습니다. 별도 안내가 있다면 해당 안내를 먼저 확인하세요.</p></div></section>

      <section id="process" className="bg-slate-900 px-4 py-20 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">복잡하지 않게 확인하고 바로 시작하세요</h2><p className="mt-4 text-base leading-relaxed text-slate-200">과정 선택, 결제, 온라인 수강, 수료증과 자료 확인까지 한 흐름으로 이어집니다.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div><div className="mt-8"><Link href={applyHref} className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-slate-900")}>과정 선택하기</Link></div></div></section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-700 sm:text-sm"><p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p><p className="mt-2">본 센터는 개별 사건에 대한 법률상담, 법률문서 작성대행, 감형 또는 처벌 감경 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p></div></section>
    </main></>
  );
}
