import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { basicApplicationProduct, duiDocumentsApplicationProduct, formatApplicationKrw } from "@/lib/course/application-products";

export const metadata: Metadata = {
  title: "양형자료 준비를 돕는 온라인 예방교육 | Reset Edu Center",
  description: "음주운전 사건 이후 필요한 온라인 예방교육 수료증, 교육 이수 확인 자료, 재발방지계획서, 실천계획서, 서약서를 한 번에 준비하세요.",
  alternates: { canonical: "/" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Reset Edu Center",
  url: "https://resetedu.kr/",
};

const applyHref = "/courses/apply?category=dui&productId=dui-documents";
const basicApplyHref = "/courses/apply?category=dui";
const materialsButtonClass = "inline-flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-slate-950 bg-white px-7 py-4 text-center text-base font-black text-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.26)] ring-4 ring-[#facc15] transition hover:-translate-y-0.5 hover:bg-[#fff7cc] hover:shadow-[0_22px_46px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] sm:w-auto sm:rounded-full";

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
  ["수료증", "교육 이수 사실을 바로 확인할 수 있습니다."],
  ["교육 이수 확인 자료", "수강 기록과 이수 여부를 체계적으로 정리합니다."],
  ["재발방지계획서", "생활 변화 계획을 직접 작성할 수 있습니다."],
  ["음주예방실천계획서", "음주 관리와 실천 방향을 구체화합니다."],
  ["서약서", "재발방지 의지를 문서로 남길 수 있습니다."],
];

const categories = [
  ["음주운전 예방교육", "수강 가능", "음주운전의 위험성, 법적 책임, 피해자 관점, 음주 문제 점검, 재발방지 실천계획 수립을 중심으로 구성된 온라인 교육입니다.", true],
] as const;

const upcomingCourses = ["도박", "마약", "사기", "성범죄"] as const;

const targetUsers = [
  "양형자료 준비를 어디서 시작해야 할지 막막한 분",
  "교육 수료증과 이수 기록을 빠르게 갖추고 싶은 분",
  "재발방지계획서를 본인 상황에 맞게 직접 작성하려는 분",
  "반성문 외에 실제 실천자료까지 준비하려는 분",
  "사건 이후 변화 의지를 정리해 보여주고 싶은 분",
];

const steps = [
  ["과정 확인", "현재 운영 중인 음주운전 예방교육과 제공 자료를 확인합니다."],
  ["상품 선택", "수료증 중심 과정 또는 재발방지 서식 포함 과정을 선택합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 바로 온라인 수강을 시작합니다."],
  ["자료 정리", "수료증과 참고자료를 확인하고 필요한 자료를 출력합니다."],
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
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-slate-100">양형자료 준비 · 온라인 예방교육 · 수강 즉시 수료증</p>
            <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">음주운전 사건 이후 필요한 양형자료, 지금 수강하고 바로 준비하세요</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">온라인 예방교육 수강부터 수료증 발급, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서까지 결제 후 한 흐름으로 준비하세요.</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">음주운전 사건 이후 경찰·검찰·법원 제출 자료를 준비하고 있다면, 교육 이수와 재발방지 노력을 구체적인 자료로 정리하는 것이 먼저입니다. 지금 수강하고 필요한 자료를 바로 확인하세요.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>지금 수강하고 자료 준비하기</Link><Link href="#materials" className={materialsButtonClass}>제공 자료 확인하기</Link></div>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-black text-white">지금 준비할 수 있는 핵심 자료</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {materials.slice(0, 4).map(([title, body]) => <div key={title} className="flex min-w-0 gap-3 rounded-2xl bg-white p-4 text-slate-950"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Icon name="file" /></span><span className="min-w-0"><span className="block text-base font-black leading-snug text-slate-950">{title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-700">{body}</span></span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Start Here" title="양형자료 준비는 교육 수료증과 재발방지 자료부터 시작하세요" body="음주운전 사건 이후 반성과 개선 노력을 말로만 설명하기보다, 교육 이수 기록과 재발방지 실천계획으로 정리하세요. Reset Edu Center는 수강, 수료증 발급, 자료 작성과 출력까지 바로 이어지는 구조로 제공합니다." />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            {categories.map(([title, status, body]) => <article key={title} className="rounded-xl border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_18px_42px_rgba(23,57,104,0.18)]"><div className="flex items-center justify-between gap-3"><Icon name="car" className="h-8 w-8 text-[#f7d9a0]" /><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]">{status}</span></div><h3 className="mt-5 text-2xl font-black leading-snug text-white">{title}</h3><p className="mt-3 text-base leading-8 text-slate-100">{body}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("warning", "md", "rounded-xl font-black")}>지금 수강 신청하기</Link><Link href="#materials" className={materialsButtonClass}>제공 자료 확인하기</Link></div></article>)}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-slate-700">추가 과정 준비 중</p><p className="mt-3 text-sm leading-7 text-slate-600">{upcomingCourses.join(" · ")} 관련 예방교육은 추후 안내 예정입니다. 현재는 음주운전 예방교육 수강과 양형자료 준비에 집중합니다.</p></div>
          </div>
        </div>
      </section>

      <section id="materials" className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 후 바로 확인하고 출력할 수 있는 자료" body="교육 수강과 함께 필요한 양형자료를 한곳에서 확인하고 PDF 저장 및 출력까지 진행할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]"><SectionTitle eyebrow="Why It Matters" title="반성과 재발방지 노력을 구체적인 자료로 정리하세요" body="교육 이수 자료, 재발방지계획서, 실천계획서, 서약서를 함께 준비하면 사건 이후 어떤 노력을 하고 있는지 더 분명하게 보여줄 수 있습니다. 반성문 외에 추가 자료를 준비하려는 분에게 필요한 흐름을 제공합니다." /><div className="grid gap-3 sm:grid-cols-2">{targetUsers.map((item) => <div key={item} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></div>)}</div></div></section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="수료증만 준비할지, 재발방지 자료까지 함께 준비할지 선택하세요" body="빠른 수강과 수료증 발급이 필요하면 기본 수강권을, 재발방지계획서·음주예방실천계획서·서약서까지 준비하려면 서식 포함 수강권을 선택하세요." /><div className="mt-8 grid gap-5 lg:grid-cols-2"><article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6"><h3 className="text-xl font-black">{basicApplicationProduct.title}</h3><p className="mt-3 text-3xl font-black">{formatApplicationKrw(basicApplicationProduct.price)}</p><p className="mt-3 text-sm leading-7 text-slate-700">{basicApplicationProduct.description}</p><Link href={basicApplyHref} className={buttonClass("secondary", "md", "mt-6 w-full rounded-xl font-black")}>수료증 중심으로 시작하기</Link></article><article className="rounded-[1.5rem] border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_18px_42px_rgba(23,57,104,0.18)]"><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]">양형자료 준비 추천</span><h3 className="mt-4 text-xl font-black text-white">{duiDocumentsApplicationProduct.title}</h3><p className="mt-3 text-3xl font-black text-white">{formatApplicationKrw(duiDocumentsApplicationProduct.price)}</p><p className="mt-3 text-sm leading-7 text-slate-100">{duiDocumentsApplicationProduct.description}</p><Link href="/courses/apply?category=dui&productId=dui-documents" data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("warning", "md", "mt-6 w-full rounded-xl font-black")}>교육과 자료 함께 준비하기</Link></article></div><p className="mt-5 text-sm leading-7 text-slate-600">제출처에서 요구하는 자료는 사건과 절차에 따라 다를 수 있습니다. 별도 안내가 있다면 해당 안내를 먼저 확인하세요.</p></div></section>

      <section id="process" className="bg-slate-900 px-4 py-20 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">결제부터 수강, 수료증 발급, 자료 출력까지 한 번에 진행하세요</h2><p className="mt-4 text-base leading-relaxed text-slate-200">PC 또는 모바일로 바로 수강하고, 교육 이수 후 필요한 자료를 확인해 저장하거나 출력할 수 있습니다.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div><div className="mt-8"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-slate-900")}>지금 수강하고 자료 준비하기</Link></div></div></section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-700 sm:text-sm"><p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p><p className="mt-2">본 센터는 개별 사건에 대한 법률상담, 법률문서 작성대행, 감형 또는 처벌 감경 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p></div></section>
    </main></>
  );
}
