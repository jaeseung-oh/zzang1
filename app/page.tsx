import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";

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
  ["상품 선택", "수료증 중심 과정 또는 참고서식 포함 과정을 선택합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 온라인으로 수강합니다."],
  ["즉시 출력", "수강 즉시 수료증 등 자료를 출력합니다."],
];

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{eyebrow}</p><h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>{body ? <p className="mt-4 text-base leading-relaxed text-slate-700">{body}</p> : null}</div>;
}

export default function HomePage() {
  return (
    <main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"><Icon name="shield" className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-black text-slate-950">Reset Edu Center</span><span className="block text-xs font-semibold text-slate-700">온라인 예방교육</span></span></Link>
          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-700 lg:flex"><Link href="/about" className="hover:text-slate-950">센터소개</Link><Link href="/courses" className="hover:text-slate-950">강의 구성</Link><a href="#materials" className="hover:text-slate-950">자료 구성</a><a href="#process" className="hover:text-slate-950">수강 절차</a></nav>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:flex-nowrap"><Link href="/login" className={buttonClass("secondary", "sm", "whitespace-nowrap rounded-full px-4 font-bold")}>로그인</Link><Link href="/signup" className={buttonClass("primary", "sm", "whitespace-nowrap rounded-full px-4 font-bold")}>회원가입</Link><Link href={applyHref} className={buttonClass("warning", "sm", "whitespace-nowrap rounded-full px-4 font-black")}>수강 신청하기</Link></div>
        </div>
      </header>

      <section className="bg-[linear-gradient(135deg,#07111f_0%,#10213f_60%,#173968_100%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-20">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-slate-100">수료증 발급 · 참고서식 · 온라인 수강</p>
            <h1 className="mt-6 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">양형자료 준비를 위한 온라인 예방교육</h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-xl">사건 이후 필요한 교육 이수 기록과 재발방지 계획을 체계적으로 정리할 수 있도록 돕습니다.</p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">현재는 음주운전 예방교육 과정을 중심으로 온라인 수강, 수료증 발급, 재발방지계획서 참고서식 확인을 제공합니다.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} style={{ backgroundColor: "#ffffff", color: "#0f172a" }} className={buttonClass("darkPrimary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-[#10213f]")}>수강 신청하기</Link><Link href="/courses" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 16px 32px rgba(250, 204, 21, 0.28)" }} className={buttonClass("darkSecondary", "lg", "whitespace-nowrap rounded-full px-7 focus:ring-offset-[#10213f]")}>강의 구성 보기</Link></div>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-black text-white">수강 즉시 출력 자료</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {materials.slice(0, 4).map(([title, body]) => <div key={title} className="flex min-w-0 gap-3 rounded-2xl bg-white p-4 text-slate-950"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Icon name="file" /></span><span className="min-w-0"><span className="block text-base font-black leading-snug text-slate-950">{title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-700">{body}</span></span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Courses" title="운영 중인 교육 과정" body="현재 수강 가능한 과정과 준비중인 과정을 확인할 수 있습니다." />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {categories.map(([title, status, body, available]) => <article key={title} className="flex min-w-0 flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between gap-3"><Icon name={available ? "car" : "lock"} className="h-7 w-7 text-indigo-700" /><span className={available ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white" : "rounded-full bg-gray-300 px-3 py-1 text-xs font-black text-gray-700"}>{status}</span></div><h3 className="mt-4 text-lg font-black leading-snug text-slate-950">{title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{body}</p>{available ? <Link href="/courses" className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold")}>강의 구성 보기</Link> : <button type="button" disabled className={buttonClass("secondary", "sm", "mt-5 w-full whitespace-nowrap rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-600")}>준비중</button>}</article>)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 18px 36px rgba(250, 204, 21, 0.32)", outline: "2px solid rgba(254, 240, 138, 0.70)", outlineOffset: "2px" }} className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>수강 신청하기</Link><Link href="/courses" className={buttonClass("secondary", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>강의 구성 보기</Link></div>
        </div>
      </section>

      <section id="materials" className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 즉시 출력 가능한 자료" body="수료증과 참고서식 등 출력 가능한 자료를 확인하세요." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]"><SectionTitle eyebrow="For You" title="이런 분들에게 필요합니다." body="긴 설명보다 필요한 상황을 짧게 확인할 수 있도록 정리했습니다." /><div className="grid gap-3 sm:grid-cols-2">{targetUsers.map((item) => <div key={item} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></div>)}</div></div></section>

      <section id="process" className="bg-slate-900 px-4 py-14 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">수강 절차</h2><p className="mt-4 text-base leading-relaxed text-slate-200">강의 구성 확인부터 수강 즉시 출력까지 이어집니다.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div><div className="mt-8 flex flex-wrap gap-3"><Link href="/courses" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 18px 36px rgba(250, 204, 21, 0.34)", outline: "2px solid rgba(254, 240, 138, 0.72)", outlineOffset: "2px" }} className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black shadow-[0_18px_36px_rgba(250,204,21,0.34)] focus:ring-offset-slate-900")}>강의 구성 보기</Link><Link href={applyHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "56px", padding: "0 28px", borderRadius: "9999px", backgroundColor: "#facc15", color: "#111827", border: "2px solid #fde047", fontWeight: 900, boxShadow: "0 18px 36px rgba(250, 204, 21, 0.34)", outline: "2px solid rgba(254, 240, 138, 0.72)", outlineOffset: "2px" }} className={buttonClass("warning", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-slate-900")}>수강 신청하기</Link></div></div></section>

      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-700 sm:text-sm"><p>리셋 에듀센터는 민간 온라인 교육 플랫폼입니다. 본 사이트에서 제공하는 수료증, 교육 이수 확인 자료, 재발방지계획서, 음주예방실천계획서, 서약서 등은 수강자가 양형자료 준비 과정에서 참고할 수 있는 자가 작성용 자료입니다.</p><p className="mt-2">본 센터는 개별 사건에 대한 법률상담, 법률문서 작성대행, 법원 제출대행, 감형 또는 처벌 감경 보장 서비스를 제공하지 않습니다. 자료의 제출 가능 여부, 반영 여부, 법적 평가는 제출처 또는 관련 전문가의 판단에 따라 달라질 수 있습니다.</p></div></section>
    </main>
  );
}
