import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/app/components/ui/button-styles";
import { formatApplicationKrw, basicApplicationProduct, duiDocumentsApplicationProduct } from "@/lib/course/application-products";

export const metadata: Metadata = {
  title: "온라인 재발방지교육·교육 수료증 과정 | Reset Edu Center",
  description: "음주운전 예방교육의 교육내용과 수료증, 재발방지 실천자료 제공 여부를 비교하고 준비 중인 교육과정도 확인해 보세요.",
  alternates: { canonical: "/courses/" },
};

const applyHref = "/courses/apply?category=dui";

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "car") return <svg {...common}><path d="M5 16l1.5-5A3 3 0 0 1 9.4 8h5.2a3 3 0 0 1 2.9 3L19 16" /><path d="M6.5 16h11" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "target") return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

const tabs = [
  ["음주운전 예방교육", "수강 가능", true],
  ["도박 예방교육", "준비중", false],
  ["마약 예방교육", "준비중", false],
  ["사기 예방교육", "준비중", false],
  ["성범죄 예방교육", "준비중", false],
] as const;

const infoCards = [
  ["수강 방식", "온라인"],
  ["과정 상태", "수강 가능"],
  ["수료 기준", "진도율 기준 충족"],
  ["출력 가능 자료", "수료증, 참고서식 등"],
];

const audience = [
  "교육 이수 기록을 준비하려는 분",
  "음주 습관과 재발 위험을 점검하려는 분",
  "재발방지계획서를 직접 정리하려는 분",
  "수료증과 참고서식을 함께 확인하고 싶은 분",
];

const areas = [
  "음주운전 위험성 이해",
  "음주와 판단력 저하 점검",
  "법적 책임과 사회적 결과 이해",
  "피해자 관점과 책임 의식 정리",
  "재발방지계획과 실천 방향 정리",
];

const goals = [
  "음주운전의 위험성과 사회적 피해를 이해한다.",
  "음주가 판단력과 충동조절에 미치는 영향을 이해한다.",
  "관련 법적 책임과 재발 시 위험성을 점검한다.",
  "피해자 관점에서 사고의 심각성을 돌아본다.",
  "재발방지를 위한 생활 변화 계획을 정리한다.",
];

const materials = ["수료증", "교육 이수 확인 자료", "재발방지계획서 참고서식", "음주예방실천계획서 참고서식", "서약서 참고서식"];

const comingSoon = [
  ["도박 예방교육", "도박 문제와 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다."],
  ["마약 예방교육", "마약류 문제의 위험성과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다."],
  ["사기 예방교육", "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다."],
  ["성범죄 예방교육", "성범죄 예방과 재발방지 계획을 다루는 온라인 예방교육을 준비하고 있습니다."],
];

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0"><h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>{body ? <p className="mt-4 text-base leading-relaxed text-slate-700">{body}</p> : null}</div>;
}

function ProductCard({ product }: { product: typeof basicApplicationProduct }) {
  return <article className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-xl font-black leading-snug text-slate-950">{product.title}</h3><p className="mt-3 text-3xl font-black text-slate-950">{formatApplicationKrw(product.price)}</p><p className="mt-3 text-sm leading-relaxed text-slate-700">{product.description}</p><ul className="mt-5 space-y-2">{product.includes.map((item) => <li key={item} className="flex min-w-0 gap-2 text-sm font-semibold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></li>)}</ul></article>;
}

export default function CoursesPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Curriculum</p><h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">강의 구성</h1><p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">현재 운영 중인 교육 과정과 준비중인 과정을 확인할 수 있습니다.</p><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">리셋 에듀센터는 사건 이후 필요한 교육 이수 기록과 재발방지 계획 정리를 돕기 위해 온라인 예방교육을 제공합니다. 현재는 음주운전 예방교육 과정을 운영 중입니다.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} style={{ backgroundColor: "#ffffff", color: "#0f172a" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>음주운전 교육 수강 신청</Link><Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 16px 32px rgba(250, 204, 21, 0.28)" }} className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 focus:ring-offset-[#10213f]")}>홈으로 이동</Link></div></div>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-1">{tabs.map(([title, status, active]) => <div key={title} className={active ? "min-w-[210px] rounded-2xl border-2 border-[#173968] bg-[#173968] p-4 text-white shadow-[0_14px_30px_rgba(23,57,104,0.16)]" : "min-w-[210px] rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-700 opacity-90"}><div className="flex items-center justify-between gap-3"><p className="text-sm font-black leading-snug">{title}</p><span className={active ? "rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#173968]" : "rounded-full bg-gray-300 px-2.5 py-1 text-xs font-black text-gray-700"}>{status}</span></div></div>)}</div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><div><span className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white">수강 가능</span><h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">음주운전 예방교육</h2><p className="mt-5 text-base leading-relaxed text-slate-700">음주운전의 위험성, 음주와 판단력 저하, 법적 책임, 피해자 관점, 재발방지계획 수립을 중심으로 구성된 온라인 예방교육입니다.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{infoCards.map(([title, body]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-600">{title}</p><p className="mt-2 text-base font-black text-slate-950">{body}</p></div>)}</div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-black text-slate-950">권장 수강 대상</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{audience.map((item) => <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" />{item}</div>)}</div></div></div></div></section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="주요 학습 영역" body="세부 차시명은 공개하지 않습니다. 학습 영역만 확인할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{areas.map((item) => <article key={item} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5"><Icon name="target" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{item}</h3></article>)}</div></div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><div><SectionTitle title="주요 학습 목표" /><div className="mt-6 space-y-3">{goals.map((item) => <p key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-relaxed text-slate-800">{item}</p>)}</div></div><div><SectionTitle title="수강 즉시 출력 자료" /><div className="mt-6 grid gap-3 sm:grid-cols-2">{materials.map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black leading-relaxed text-slate-900"><Icon name="file" className="h-5 w-5 shrink-0 text-indigo-700" />{item}</div>)}</div></div></div></section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="필요한 준비 범위에 따라 선택하세요" body="수료증과 반성문 가이드 중심의 기본과정인지, 재발방지 실천자료까지 포함한 과정인지 비교한 후 선택할 수 있습니다." /><div className="mt-8 grid gap-5 lg:grid-cols-2"><ProductCard product={basicApplicationProduct} /><ProductCard product={duiDocumentsApplicationProduct} /></div><div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} className={buttonClass("primary", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>기본과정 59,000원</Link><Link href="/courses/apply?category=dui&productId=dui-documents" className={buttonClass("secondary", "lg", "whitespace-nowrap rounded-full px-7 font-bold")}>교육·자료 포함 과정 109,000원</Link></div></div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="준비중인 과정" body="아래 과정은 콘텐츠를 준비하고 있습니다. 가격과 신청 버튼은 제공하지 않습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{comingSoon.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-slate-100 p-5"><div className="flex items-center justify-between gap-3"><Icon name="lock" className="h-7 w-7 text-slate-700" /><span className="rounded-full bg-gray-300 px-3 py-1 text-xs font-black text-gray-700">준비중</span></div><h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-700">{body}</p><p className="mt-4 text-sm leading-relaxed text-slate-700">해당 교육 과정은 현재 콘텐츠를 준비하고 있습니다. 과정 구성이 확정되면 안내됩니다.</p><button type="button" disabled className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-800")}>준비중</button></article>)}</div></div></section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-700 sm:text-sm"><p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p><p className="mt-2">본 센터는 개별 사건에 대한 법률상담, 법률문서 작성대행, 감형 또는 처벌 감경 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p></div></section>
    </main>
  );
}
