import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";

export const metadata: Metadata = {
  title: "센터소개 | 리셋 에듀센터",
  description: "양형자료 준비를 위한 민간 온라인 예방교육 플랫폼 소개",
};

const applyHref = "/courses/apply?category=dui";

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "car") return <svg {...common}><path d="M5 16l1.5-5A3 3 0 0 1 9.4 8h5.2a3 3 0 0 1 2.9 3L19 16" /><path d="M6.5 16h11" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>;
  if (name === "target") return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

const values = [
  ["민간 온라인 교육", "방문 없이 온라인으로 예방교육을 수강하고 이수 기록을 확인할 수 있도록 운영합니다."],
  ["자가 작성 중심", "재발방지계획서와 실천계획서는 수강자가 직접 정리할 수 있도록 참고서식 형태로 제공합니다."],
  ["자료 흐름 정리", "수료증, 교육 이수 확인 자료, 참고서식을 한 화면에서 이해할 수 있도록 안내합니다."],
  ["결과 보장 없음", "개별 사건 결과를 보장하지 않고, 자료 준비에 필요한 교육과 참고자료만 제공합니다."],
];

const materials = [
  ["수료증", "교육 이수 사실을 확인하는 자료입니다."],
  ["교육 이수 확인 자료", "수강 기록과 이수 여부를 정리합니다."],
  ["재발방지계획서", "생활 변화 계획을 직접 작성합니다."],
  ["음주예방실천계획서", "음주 관리와 실천 방향을 정리합니다."],
  ["서약서", "재발방지 의지를 문서로 정리합니다."],
];

const currentCourses = [
  ["음주운전 예방교육", "수강 가능", "음주운전의 위험성, 법적 책임, 피해자 관점, 재발방지계획 수립을 중심으로 구성된 온라인 예방교육입니다.", true],
  ["도박 예방교육", "준비중", "도박 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["마약 예방교육", "준비중", "마약류 문제와 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["사기 예방교육", "준비중", "사기 사건 이후 책임 인식과 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
  ["성범죄 예방교육", "준비중", "성범죄 예방과 재발방지 계획을 다루는 교육 과정은 준비중입니다.", false],
] as const;

const process = [
  ["과정 확인", "현재 운영 중인 음주운전 예방교육의 구성을 확인합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 온라인으로 수강합니다."],
  ["수료 기준 충족", "진도율 기준을 충족하면 이수 자료를 확인합니다."],
  ["참고서식 정리", "필요한 경우 자가 작성용 참고서식을 직접 작성합니다."],
];

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{eyebrow}</p><h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>{body ? <p className="mt-4 text-base leading-relaxed text-slate-700">{body}</p> : null}</div>;
}

export default function AboutPage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_58%,#173968_100%)] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-slate-100">Reset Edu Center</p>
            <h1 className="mt-6 text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">센터소개</h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-xl">리셋 에듀센터는 양형자료 준비를 돕는 민간 온라인 예방교육 플랫폼입니다.</p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">현재는 음주운전 예방교육을 운영하고 있습니다. 온라인 수강, 수강 즉시 수료증 출력, 재발방지계획서 참고서식 확인을 중심으로 구성되어 있습니다.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} style={{ backgroundColor: "#ffffff", color: "#0f172a" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>수강 신청하기</Link><Link href="/courses" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 16px 32px rgba(250, 204, 21, 0.28)" }} className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 focus:ring-offset-[#10213f]")}>강의 구성 보기</Link></div>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#173968]"><Icon name="shield" /></div>
            <h2 className="mt-5 text-2xl font-black text-white">운영 방향</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100">교육 이수 기록과 자가 작성용 참고서식을 통해 사건 이후 필요한 자료 준비 흐름을 정리합니다.</p>
            <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm font-bold leading-relaxed text-white">세부 강의 목차는 공개하지 않습니다. 과정 개요와 제공 자료만 안내합니다.</div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionTitle eyebrow="Mission" title="반성의 마음을 구체적인 자료로 정리하도록 돕습니다." body="사건 이후에는 본인이 무엇을 돌아보고 있는지, 같은 일이 반복되지 않도록 어떤 실천 계획을 세우는지 정리하는 과정이 필요할 수 있습니다." />
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="check" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-lg font-black leading-snug text-slate-950">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-700">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Courses" title="현재 운영 현황" body="실제 수강 가능한 과정과 준비중인 과정을 구분해 안내합니다." />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {currentCourses.map(([title, status, body, available]) => <article key={title} className="flex min-w-0 flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between gap-3"><Icon name={available ? "car" : "lock"} className="h-7 w-7 text-indigo-700" /><span className={available ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white" : "rounded-full bg-gray-300 px-3 py-1 text-xs font-black text-gray-700"}>{status}</span></div><h3 className="mt-4 text-lg font-black leading-snug text-slate-950">{title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{body}</p>{available ? <Link href="/courses" className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold")}>강의 구성 보기</Link> : <button type="button" disabled className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-600")}>준비중</button>}</article>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 즉시 출력 가능한 자료" body="수료증과 참고서식 등 수강 즉시 출력 가능한 자료를 안내합니다." />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div>
        </div>
      </section>

      <section className="bg-slate-900 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">자료 준비 흐름</h2><p className="mt-4 text-base leading-relaxed text-slate-200">교육 확인부터 수강 즉시 출력까지 순서대로 진행됩니다.</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{process.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/courses" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 16px 32px rgba(250, 204, 21, 0.28)" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 focus:ring-offset-slate-900")}>강의 구성 보기</Link><Link href={applyHref} style={{ backgroundColor: "transparent", color: "#ffffff", borderColor: "rgba(255,255,255,0.85)" }} className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 focus:ring-offset-slate-900")}>수강 신청하기</Link></div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-700 sm:text-sm"><p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p><p className="mt-2">본 센터는 개별 사건에 대한 법률상담, 법률문서 작성대행, 법원 제출대행, 감형 또는 처벌 감경 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p></div></section>
    </main>
  );
}
