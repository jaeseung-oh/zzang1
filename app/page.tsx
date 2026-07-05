import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import DocumentPreviewGallery, { type DocumentPreviewItem } from "@/app/components/document-preview-gallery";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { changeLearningAreas, commonFaqs, getApplyHref, getMainProductPair, getPlatformCourseProducts, platformCourseCategories, processSteps } from "@/lib/course/platform-courses";

export const metadata: Metadata = {
  title: "온라인 재발·재범 방지 예방교육 | 리셋에듀센터",
  description: "음주운전, 폭력범죄, 성범죄, 도박중독 등 사건 유형별 온라인 예방교육과 인지행동 개선교육을 제공합니다.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "온라인 재발·재범 방지 예방교육 | 리셋에듀센터",
    description: "사건 유형별 온라인 예방교육과 교육 수료증 등 양형자료 준비를 한곳에서 확인하세요.",
    url: "https://resetedu.kr/",
    siteName: "리셋에듀센터",
    locale: "ko_KR",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Reset Edu Center",
  url: "https://resetedu.kr/",
};

const documentCards = [
  "폭력범죄 재범방지교육 수료증",
  "도박중독 재발방지교육 수료증",
  "성범죄 재범방지교육 수료증",
  "인지행동 개선교육 이수증",
];

const homeCertificateSamples: DocumentPreviewItem[] = [
  {
    id: "home-basic-certificate",
    title: "교육수료증",
    products: ["기본과정", "자료포함과정", "심화과정"],
    statusLabel: "샘플",
    description: "기존 메인 화면에서 안내하던 기본 수료증 샘플입니다.",
    imageSrc: "/images/document-samples/basic-certificate-sample.jpg",
  },
  {
    id: "home-advanced-certificate",
    title: "인지행동기반 재발방지교육 수료증",
    products: ["심화과정"],
    statusLabel: "샘플",
    description: "기존 메인 화면에서 안내하던 인지행동 기반 재발방지교육 이수 문서 샘플입니다.",
    imageSrc: "/images/document-samples/cognitive-prevention-certificate-sample.jpg",
  },
];

const finderOptions = [
  ["음주운전 관련 교육", "/courses/dui-prevention"],
  ["폭력 사건 관련 교육", "/courses/violence-prevention"],
  ["도박 문제 관련 교육", "/courses/gambling-relapse-prevention"],
  ["성범죄 관련 교육", "/courses/sexual-offense-prevention"],
  ["인지행동 개선교육", "/courses#cbt"],
] as const;

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "play") return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></svg>;
  if (name === "route") return <svg {...common}><path d="M5 19c5-9 9 1 14-8" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="11" r="2" /><path d="M12 3v6" /><path d="M9 6h6" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0">{eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

export default function HomePage() {
  const newCourse = platformCourseCategories.find((course) => course.id !== "dui")!;
  const { basic, advanced } = getMainProductPair(newCourse);

  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} /><main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#eef4f8]">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:px-8 lg:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="inline-flex w-fit rounded-full border border-[#176b68]/20 bg-white px-4 py-2 text-xs font-black text-[#176b68]">온라인 재발·재범 방지 예방교육</p>
            <h1 className="mt-5 max-w-3xl text-[2rem] font-black leading-tight text-slate-950 sm:text-5xl lg:text-[52px]">사건 이후의 변화,<br />교육과 양형자료 준비에서 시작됩니다</h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-700 sm:text-lg sm:leading-8">음주운전, 폭력범죄, 성범죄, 도박중독 등 사건 유형에 맞는 예방교육을 온라인으로 수강하고, 각 기관 제출 준비에 활용할 수 있는 교육 수료증과 인지행동 개선교육 이수증을 확인·출력할 수 있습니다.</p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <Link href="/courses" className={buttonClass("primary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-black sm:w-auto")}>교육과정 확인하기</Link>
              <Link href="#course-finder" className={buttonClass("secondary", "lg", "w-full rounded-full px-7 font-bold sm:w-auto")}>내게 맞는 과정 찾기</Link>
            </div>
            <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {["PC·모바일 온라인 수강", "과정별 교육 수료증 제공", "기본·심화과정 선택", "민간 온라인 교육기관"].map((item) => (
                <div key={item} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-6 text-slate-800 shadow-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-[#176b68]" /><span>{item}</span></div>
              ))}
            </div>
          </div>

          <div className="grid content-center gap-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.15)]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3"><p className="text-sm font-black text-slate-900">내 강의실</p><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">온라인 수강</span></div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl bg-slate-950 p-4 text-white"><div className="flex aspect-video items-center justify-center rounded-lg bg-[linear-gradient(135deg,#173968,#176b68)]"><Icon name="play" className="h-14 w-14 text-white" /></div><p className="mt-3 text-sm font-black">사건 유형별 예방교육</p><div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 w-3/4 rounded-full bg-emerald-400" /></div></div>
                <div className="grid gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">교육과정</p><p className="mt-2 text-sm font-black leading-6 text-slate-900">음주운전 · 폭력범죄 · 도박중독 · 성범죄</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">제공 문서</p><p className="mt-2 text-sm font-black leading-6 text-slate-900">수료증 · 이수증 · 재발방지 자료</p></div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-8 w-8 text-[#173968]" /><p className="mt-3 text-base font-black">수료증 미리보기</p><p className="mt-2 text-sm leading-6 text-slate-600">교육명과 수강자 정보를 기존 양식으로 표시합니다.</p></div>
              <div className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="route" className="h-8 w-8 text-[#176b68]" /><p className="mt-3 text-base font-black">행동 변화 계획</p><p className="mt-2 text-sm leading-6 text-slate-600">위험 신호와 대처 행동을 과정별로 정리합니다.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="course-finder" className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle title="어떤 교육을 찾고 계신가요?" body="사건 유형에 맞는 교육 상세페이지로 바로 이동할 수 있습니다." /><div className="mt-6 flex flex-wrap gap-3">{finderOptions.map(([label, href]) => <Link key={label} href={href} className={buttonClass("outline", "md", "rounded-full px-5 font-black")}>{label}</Link>)}</div></div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Courses" title="사건 유형에 맞는 교육과정을 선택하세요" body="각 과정은 사건의 특성과 재발·재범 위험 요인을 이해하고, 실제 생활에서 적용할 수 있는 예방 행동을 학습하도록 구성되어 있습니다." /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{platformCourseCategories.map((course) => (<Link key={course.slug} href={"/courses/" + course.slug} className="group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black leading-snug text-slate-950">{course.title}</h3><Icon name="shield" className="h-7 w-7 shrink-0 text-[#176b68]" /></div><p className="mt-4 flex-1 text-sm leading-7 text-slate-700">{course.summary}</p><div className="mt-5 flex flex-wrap gap-2">{course.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{tag}</span>)}</div><span className="mt-6 text-sm font-black text-[#173968] group-hover:underline">과정 자세히 보기</span></Link>))}</div></div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Programs" title="필요한 교육 범위에 맞게 선택하세요" body="신규 예방교육은 기본과정과 인지행동 개선교육이 포함된 심화과정으로 구성됩니다. 음주운전 과정은 기존 운영 상품 구성을 유지합니다." /><div className="mt-8 grid gap-5 lg:grid-cols-2">{basic && <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-6"><p className="text-sm font-black text-[#176b68]">기본과정</p><h3 className="mt-2 text-3xl font-black">{formatApplicationKrw(basic.price)}</h3><p className="mt-3 text-sm leading-7 text-slate-700">사건 유형별 핵심 예방교육을 수강하는 과정입니다.</p><ul className="mt-5 space-y-2">{["선택한 사건 유형의 예방교육", "해당 교육 수료증", "PC·모바일 온라인 수강", "수료증 인쇄 및 PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-[#176b68]" />{item}</li>)}</ul><Link href="/courses" className={buttonClass("secondary", "md", "mt-6 rounded-full px-6 font-black")}>기본과정 보기</Link></article>}{advanced && <article className="rounded-[1.25rem] border-2 border-[#173968] bg-white p-6 shadow-[0_18px_45px_rgba(23,57,104,0.12)]"><p className="inline-flex rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">통합 과정</p><h3 className="mt-3 text-3xl font-black">{formatApplicationKrw(advanced.price)}</h3><p className="mt-3 text-sm leading-7 text-slate-700">사건 유형별 예방교육과 인지행동 개선교육을 함께 수강하는 통합 과정입니다.</p><ul className="mt-5 space-y-2">{["선택한 사건 유형의 예방교육", "인지행동 개선교육", "해당 교육 수료증", "인지행동 개선교육 이수증", "PC·모바일 온라인 수강", "수료증 및 이수증 인쇄·PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-[#173968]" />{item}</li>)}</ul><Link href="/courses" className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black")}>심화과정 보기</Link></article>}</div></div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="단순한 다짐보다 구체적인 변화가 필요합니다" /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{changeLearningAreas.map(([title, body]) => <article key={title} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="route" className="h-8 w-8 text-[#176b68]" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

      <section id="process" className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="과정 선택부터 교육자료 확인까지 간편하게" /><div className="mt-8 grid gap-4 md:grid-cols-4">{processSteps.map(([title, body], index) => <article key={title} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-[#176b68]">0{index + 1}</p><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="과정에 맞는 교육 문서를 확인하세요" body="기존 메인 화면에서 보여주던 수료증과 이수증 샘플을 그대로 유지하면서, 음주운전 예방교육 수료증을 가장 먼저 안내합니다." /><div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><article className="rounded-[1.25rem] border-2 border-[#173968] bg-white p-6 shadow-[0_22px_60px_rgba(23,57,104,0.16)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">Main Certificate</p><h3 className="mt-2 text-2xl font-black leading-snug text-slate-950">음주운전 예방교육 수료증</h3></div><span className="w-fit rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">대표 수료증</span></div><p className="mt-4 text-sm leading-7 text-slate-700">음주운전 예방교육 이수 사실을 기존 수료증 양식으로 확인하고 출력할 수 있습니다. 자료포함과정과 심화과정에서는 음주운전 재발방지계획서, 음주예방실천계획서, 음주운전 재발방지 서약서 등 음주운전 전용 자료도 함께 확인할 수 있습니다.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{["음주운전 예방교육 수료증", "재발방지계획서", "음주예방실천계획서", "음주운전 재발방지 서약서"].map((item) => <div key={item} className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-800"><Icon name="file" className="h-5 w-5 shrink-0 text-[#173968]" />{item}</div>)}</div><Link href="/courses/dui-prevention" className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black")}>음주운전 수료증 안내 보기</Link></article><DocumentPreviewGallery documents={homeCertificateSamples} columnsClassName="sm:grid-cols-2" /></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{documentCards.map((item) => <article key={item} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-[#173968]" /><h3 className="mt-4 text-base font-black leading-snug">{item}</h3><p className="mt-2 text-sm leading-6 text-slate-600">과정별 상세페이지와 내 강의실에서 확인할 수 있습니다.</p></article>)}</div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"><SectionTitle title="행동 변화를 위한 온라인 예방교육" body="본 센터는 사건 이후 자신의 행동을 돌아보고, 재발·재범 위험을 낮추기 위한 구체적인 방법을 학습할 수 있도록 온라인 예방교육을 제공합니다. 교육은 사건 유형별 위험 요인과 행동 패턴을 이해하고, 실제 생활에서 적용할 수 있는 대처 행동과 생활 관리 방법을 익히는 데 중점을 둡니다." /><div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">본 센터는 국가기관, 법원, 검찰, 경찰, 보호관찰기관 또는 법률사무소가 운영하거나 지정한 기관이 아닌 민간 온라인 교육기관입니다. 수료증과 이수증은 교육 참여와 재발·재범 방지 노력을 정리하기 위한 민간 교육자료이며, 제출 여부와 활용 가능성은 개별 사건과 제출기관의 판단에 따라 달라질 수 있습니다.</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="자주 묻는 질문" /><div className="mt-8 grid gap-4 lg:grid-cols-2">{commonFaqs.map(([q, a]) => <details key={q} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-base font-black text-slate-950">{q}</summary><p className="mt-3 text-sm leading-7 text-slate-700">{a}</p></details>)}</div></div></section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.5rem] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.24)] sm:p-8"><h2 className="text-2xl font-black sm:text-3xl">사건 유형에 맞는 교육과 자료를 확인하세요</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">교육 수강, 수료증 확인, 인지행동 개선교육 이수증까지 기존 수강 구조 안에서 이어집니다.</p><Link href="/courses" className={buttonClass("darkSecondary", "lg", "mt-6 rounded-full px-7 font-black focus:ring-offset-[#07111f]")}>전체 교육과정 보기</Link></div></section>
    </main></>
  );
}
