import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";

export const metadata: Metadata = {
  title: "음주운전 양형자료 준비와 온라인 예방교육 | Reset Edu Center",
  description: "음주운전 사건 이후 온라인 예방교육 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서를 한 번에 준비하세요.",
  alternates: { canonical: "/about/" },
};

const applyHref = "/courses/apply?category=dui&productId=dui-documents";
const courseHref = "/courses/apply?category=dui";

type IconName = "check" | "file" | "screen" | "card" | "printer" | "pen" | "clock" | "shield" | "target";

function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "screen") return <svg {...common}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  if (name === "card") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>;
  if (name === "printer") return <svg {...common}><path d="M7 9V4h10v5" /><path d="M7 18H5a2 2 0 0 1-2-2v-5h18v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>;
  if (name === "pen") return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
}

const heroBadges: readonly [IconName, string][] = [
  ["screen", "100% 온라인 수강"],
  ["card", "결제 후 즉시 수강 가능"],
  ["file", "교육 이수 후 수료증 발급"],
  ["pen", "재발방지 자료 제공"],
  ["printer", "PDF 저장 및 출력 가능"],
];

const reasonCards = [
  ["교육 이수 자료", "온라인 교육 이수 후 수료증과 교육 이수 확인 자료를 발급할 수 있습니다."],
  ["재발방지 자료", "재발방지계획서와 음주예방실천계획서를 통해 앞으로의 실천 방향을 구체적으로 정리할 수 있습니다."],
  ["반성 및 실천 의지", "서약서를 통해 재발방지 의지와 향후 실천 계획을 문서로 정리할 수 있습니다."],
] as const;

const materials = [
  ["수료증", "음주운전 예방교육을 이수했다는 사실을 확인할 수 있는 자료"],
  ["교육 이수 확인 자료", "교육 수강 기록과 이수 여부를 정리한 확인 자료"],
  ["재발방지계획서", "음주운전이 반복되지 않도록 생활 변화와 구체적인 재발방지 계획을 작성하는 자료"],
  ["음주예방실천계획서", "음주 관리, 차량 이용 제한, 대리운전 이용 등 실제 행동계획을 정리하는 자료"],
  ["서약서", "앞으로 음주운전을 하지 않겠다는 의지와 실천 약속을 정리하는 자료"],
] as const;

const audience = [
  "음주운전 사건으로 경찰 또는 검찰 조사를 앞두고 있는 분",
  "검찰이나 법원에 제출할 양형자료를 준비하고 있는 분",
  "음주운전 예방교육 수료증이 필요한 분",
  "재발방지계획서와 실천계획서를 체계적으로 작성하고 싶은 분",
  "반성문 외에 추가적인 재발방지 자료를 준비하고 싶은 분",
  "사건 이후 본인의 반성과 개선 노력을 구체적인 자료로 정리하고 싶은 분",
] as const;

const process = [
  ["수강 신청", "음주운전 예방교육을 선택하고 결제합니다."],
  ["온라인 교육 수강", "PC 또는 모바일에서 편한 시간에 교육을 수강합니다."],
  ["수료증 발급", "교육 이수 후 수료증과 교육 이수 확인 자료를 발급합니다."],
  ["재발방지 자료 작성", "제공되는 참고서식을 활용해 재발방지계획서, 실천계획서, 서약서를 직접 작성합니다."],
  ["PDF 저장 및 출력", "완성한 자료는 필요에 따라 저장하거나 출력해 활용할 수 있습니다."],
] as const;

const courseBenefits = ["온라인 교육 수강", "교육 수료증 발급", "교육 이수 확인 자료", "재발방지계획서 참고서식", "음주예방실천계획서", "서약서", "PDF 저장 및 출력"] as const;

const trustCards = [
  ["온라인 간편 수강", "방문 없이 원하는 시간에 온라인으로 수강할 수 있습니다."],
  ["수료증 발급", "교육 이수 후 본인의 교육 수료증을 확인하고 출력할 수 있습니다."],
  ["실질적인 재발방지 자료", "단순한 수료증만이 아니라 재발방지계획서와 실천계획서까지 함께 준비할 수 있습니다."],
  ["자가 작성 방식", "본인의 상황과 반성 내용을 직접 작성할 수 있도록 참고서식을 제공합니다."],
] as const;

const upcoming = ["도박 예방교육", "마약 예방교육", "사기 예방교육", "성범죄 예방교육"] as const;

function SectionTitle({ eyebrow, title, body, light = false }: { eyebrow?: string; title: string; body?: string; light?: boolean }) {
  return <div className="keep-korean max-w-3xl min-w-0">{eyebrow ? <p className={light ? "text-xs font-bold uppercase tracking-[0.16em] text-amber-200" : "text-xs font-bold uppercase tracking-[0.16em] text-indigo-700"}>{eyebrow}</p> : null}<h2 className={light ? "mt-3 text-2xl font-black leading-tight text-white sm:text-4xl" : "mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl"}>{title}</h2>{body ? <p className={light ? "mt-4 whitespace-pre-line text-base leading-8 text-slate-200" : "mt-4 whitespace-pre-line text-base leading-8 text-slate-700"}>{body}</p> : null}</div>;
}

function CtaButton({ children, href = applyHref, variant = "warning" }: { children: React.ReactNode; href?: string; variant?: "warning" | "primary" | "secondary" }) {
  const analyticsProps = href.startsWith("/courses/apply") ? { "data-ga-event": "click_enroll", "data-ga-item-id": href.includes("dui-documents") ? "dui-documents" : "dui-prevention-basic", "data-ga-item-name": "음주운전 예방교육", "data-ga-location": "about" } : {};
  if (variant === "secondary") {
    return <Link href={href} {...analyticsProps} className={buttonClass("secondary", "lg", "w-full rounded-full px-7 text-center font-bold sm:w-auto")}>{children}</Link>;
  }
  return <Link href={href} {...analyticsProps} className={buttonClass(variant, "lg", "w-full whitespace-normal rounded-xl px-7 text-center font-black sm:w-auto sm:rounded-full")}>{children}</Link>;
}

export default function AboutPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 pb-20 text-slate-950 sm:pb-0">
      <section className="relative overflow-hidden bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="absolute inset-0 bg-[url('/images/prevention-education-hero.png')] bg-cover bg-center opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(15,23,42,0.82)_48%,rgba(15,23,42,0.48)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-amber-200/60 bg-amber-200 px-4 py-2 text-xs font-black text-slate-950">양형자료 준비 · 수료증 발급 · 재발방지 자료</p>
            <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">음주운전 사건 이후, 필요한 양형자료를 체계적으로 준비하세요</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-xl">온라인 예방교육 수강부터 수료증 발급, 재발방지계획서·음주예방실천계획서·서약서 작성까지 한 번에 준비할 수 있습니다.</p>
            <p className="mt-4 text-lg font-black text-amber-200 sm:text-2xl">교육 수료증과 재발방지 자료를 지금 준비하세요.</p>
            <div className="mt-8 flex flex-wrap gap-3"><CtaButton>지금 수강하고 자료 준비하기</CtaButton><CtaButton href="#materials" variant="secondary">제공 자료 확인하기</CtaButton></div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {heroBadges.map(([icon, label]) => <div key={label} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-3 text-sm font-black text-white backdrop-blur"><Icon name={icon} className="h-5 w-5 shrink-0 text-amber-200" /><span>{label}</span></div>)}
            </div>
          </div>
          <div className="rounded-lg border border-white/20 bg-white p-5 text-slate-950 shadow-2xl">
            <p className="text-sm font-black text-indigo-700">수강 후 준비 자료</p>
            <h2 className="mt-2 text-2xl font-black leading-tight">교육 이수와 재발방지 노력을 문서로 정리</h2>
            <div className="mt-5 space-y-3">{materials.map(([title]) => <div key={title} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-black"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" />{title}</div>)}</div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"><SectionTitle eyebrow="Why" title="양형자료는 반성의 내용을 구체적으로 보여주는 자료입니다" body={"음주운전 사건 이후에는 단순히 반성한다고 말하는 것보다, 교육을 이수하고 재발방지를 위해 어떤 노력을 했는지를 자료로 정리하는 것이 중요할 수 있습니다.\n\nReset Edu Center는 음주운전 예방교육 수료증과 함께 재발방지계획서, 음주예방실천계획서, 서약서 등 사건 이후 준비할 수 있는 자료를 체계적으로 제공합니다."} /><div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">{reasonCards.map(([title, body]) => <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

      <section id="materials" className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 후 바로 준비할 수 있는 양형자료" body="교육 수강과 함께 필요한 자료를 한곳에서 확인하고 출력할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-lg font-black leading-snug">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div><div className="mt-8"><CtaButton>지금 수강하고 양형자료 준비하기</CtaButton></div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr]"><SectionTitle eyebrow="For You" title="이런 분들에게 필요합니다" body="방문자의 상황에 맞춰 교육 수료증과 재발방지 자료를 빠르게 준비할 수 있도록 구성했습니다." /><div className="grid gap-3 sm:grid-cols-2">{audience.map((item) => <div key={item} className="flex gap-3 rounded-lg border border-indigo-100 bg-white p-4 text-sm font-bold leading-7 text-slate-800 shadow-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" /><span>{item}</span></div>)}</div></div></section>

      <section className="bg-slate-900 px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Process" title="결제부터 자료 출력까지 간단하게 진행됩니다" light /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{process.map(([title, body], index) => <article key={title} className="rounded-lg border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-200 text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-200">{body}</p></article>)}</div><div className="mt-10 rounded-lg border border-amber-200/40 bg-white p-6 text-slate-950"><h3 className="text-2xl font-black leading-tight">사건 이후 필요한 자료, 미루지 말고 지금 준비하세요</h3><p className="mt-3 text-base leading-7 text-slate-700">교육 수료증과 재발방지 자료를 한 번에 준비할 수 있습니다.</p><div className="mt-6"><CtaButton href={courseHref}>음주운전 예방교육 수강 신청</CtaButton></div></div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Available Course" title="현재 수강 가능한 과정" body="음주운전 사건 이후 필요한 교육 이수와 재발방지 자료 준비에 집중한 온라인 교육입니다." /><article className="mt-8 grid gap-6 rounded-lg border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_18px_42px_rgba(23,57,104,0.18)] lg:grid-cols-[0.9fr_1.1fr]"><div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]">수강 가능</span><h3 className="mt-4 text-3xl font-black leading-tight text-white">음주운전 예방교육</h3><p className="mt-4 text-base leading-8 text-slate-100">음주운전의 위험성, 법적 책임, 피해자 관점, 음주 문제 점검, 재발방지 실천계획 수립을 중심으로 구성된 온라인 교육입니다.</p><div className="mt-6"><CtaButton>지금 수강 신청하기</CtaButton></div></div><div className="grid gap-3 sm:grid-cols-2">{courseBenefits.map((item) => <div key={item} className="flex items-center gap-3 rounded-lg bg-white p-4 text-sm font-black text-slate-900"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" />{item}</div>)}</div></article><div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-slate-700">추가 과정 준비 중</p><p className="mt-2 text-sm leading-7 text-slate-600">{upcoming.join(" · ")} 과정은 추후 안내 예정입니다. 현재는 음주운전 예방교육을 중심으로 운영합니다.</p></div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Trust" title="자료 준비에 필요한 핵심만 제공합니다" /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{trustCards.map(([title, body]) => <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><Icon name="shield" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div><div className="mt-8"><CtaButton>지금 수강하고 준비하기</CtaButton></div></div></section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">본 교육은 음주운전 재발방지와 양형자료 준비를 돕기 위한 민간 온라인 교육입니다. 제공되는 수료증 및 참고자료의 제출 여부와 반영 여부는 개별 사건 및 판단기관에 따라 달라질 수 있으며, 특정한 수사·재판 결과를 보장하지 않습니다.</div></section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.16)] backdrop-blur sm:hidden"><Link href={applyHref} className={buttonClass("warning", "md", "w-full rounded-xl font-black")}>지금 수강 신청</Link></div>
    </main>
  );
}
