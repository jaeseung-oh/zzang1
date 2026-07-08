import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import DocumentPreviewGallery, { type DocumentPreviewItem } from "@/app/components/document-preview-gallery";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { getApplyHref, getMainProductPair, platformCourseCategories, processSteps } from "@/lib/course/platform-courses";

export const metadata: Metadata = {
  title: "ResetEdu 재발방지교육센터 | 온라인 예방교육과 양형자료 준비",
  description: "사건 이후 온라인 예방교육을 수강하고 재발방지 실천계획, 생활개선 자료, 교육 이수 자료를 체계적으로 정리하세요.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ResetEdu 재발방지교육센터 | 온라인 예방교육과 양형자료 준비",
    description: "온라인 예방교육부터 양형자료 준비를 위한 실천자료까지 한 번에 확인하세요.",
    url: "https://resetedu.kr/",
    siteName: "ResetEdu 재발방지교육센터",
    locale: "ko_KR",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ResetEdu Prevention Education Center",
  alternateName: "ResetEdu 재발방지교육센터",
  url: "https://resetedu.kr/",
};

const practiceKeywords = ["양형자료 준비", "재발방지", "생활개선", "예방교육", "실천기록", "자기점검", "교육 이수 및 실천자료 관리"];

const homeCertificateSamples: DocumentPreviewItem[] = [
  {
    id: "home-basic-certificate",
    title: "교육이수증",
    products: ["기본과정", "심화과정"],
    statusLabel: "샘플",
    description: "온라인 예방교육 이수 내용을 확인할 수 있는 기본 수료증 샘플입니다.",
    imageSrc: "/images/document-samples/basic-certificate-capture.jpg",
  },
  {
    id: "home-advanced-certificate",
    title: "인지행동기반 재발방지교육 이수증(심화과정)",
    products: ["심화과정"],
    statusLabel: "샘플",
    description: "심화과정에서 제공되는 인지행동기반 재발방지교육 이수증 샘플입니다.",
    imageSrc: "/images/document-samples/advanced-certificate-capture.jpg",
  },
];


function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>;
  if (name === "list") return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13" /><path d="m3 6 .6.6L5 5.2M3 12l.6.6L5 11.2M3 18l.6.6L5 17.2" /></svg>;
  if (name === "chart") return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0">{eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

export default function HomePage() {
  const duiCourse = platformCourseCategories.find((course) => course.id === "dui") || platformCourseCategories[0];
  const { basic, advanced } = getMainProductPair(duiCourse);

  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} /><main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#edf4f8]">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8 lg:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-black text-[#176b68]">사건 이후의 반성과 재발방지 노력을 체계적으로 준비하세요</p>
            <h1 className="mt-5 max-w-3xl text-[2rem] font-black leading-tight text-slate-950 sm:text-5xl lg:text-[52px]">온라인 예방교육부터<br />양형자료 준비를 위한 실천자료까지 한 번에</h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-700 sm:text-lg sm:leading-8">음주운전 사건 이후 필요한 예방교육을 온라인으로 수강하고, 재발방지 실천계획과 생활개선 자료를 체계적으로 정리할 수 있습니다. 교육 이수 내용과 실천자료를 직접 확인·작성·출력해보세요.</p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <Link href="/courses" className={buttonClass("primary", "lg", "w-full whitespace-nowrap rounded-full px-7 font-black sm:w-auto")}>예방교육 시작하기</Link>
              <Link href="/prevention-documents" className={buttonClass("secondary", "lg", "w-full rounded-full px-7 font-bold sm:w-auto")}>실천자료 둘러보기</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {practiceKeywords.map((item) => <span key={item} className="rounded-full border border-[#176b68]/15 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">{item}</span>)}
            </div>
          </div>

          <div className="grid content-center gap-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.15)]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><p className="text-sm font-black text-slate-900">빠른 양형자료 준비</p><p className="mt-1 text-xs font-bold text-slate-500">결제 후 바로 수강·출력 가능</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">49,000원부터</span></div>
              <div className="mt-5 rounded-xl bg-slate-950 p-4 text-white"><div className="rounded-lg bg-[linear-gradient(135deg,#173968,#176b68)] p-4"><div className="flex items-center gap-3"><Icon name="file" className="h-9 w-9 text-white" /><div><p className="text-sm font-black">교육 수료증 + 3종 서식</p><p className="mt-1 text-xs text-white/75">수강 완료 후 PDF 저장 및 인쇄</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{["과정 선택", "온라인 결제", "강의 수강", "서류 출력"].map((item, index) => <div key={item} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#173968]">{index + 1}</span>{item}</div>)}</div></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Icon name="list" className="h-7 w-7 text-[#176b68]" /><p className="mt-3 text-sm font-black text-slate-900">기본과정</p><p className="mt-1 text-xs leading-5 text-slate-600">예방교육, 수료증, 재발방지계획서·실천계획서·서약서 서식 제공</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Icon name="chart" className="h-7 w-7 text-[#173968]" /><p className="mt-3 text-sm font-black text-slate-900">심화과정</p><p className="mt-1 text-xs leading-5 text-slate-600">기본 구성에 반성문 작성 서식, 이수증, 상세 내역서까지 제공</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="예방교육과 실천자료를 함께 준비해보세요" body="사건 이후 스스로를 돌아보고 재발방지를 위해 노력하는 과정을 체계적으로 정리할 수 있도록 구성하였습니다." />
          <div className="mt-8 grid items-center gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Link href={getApplyHref(duiCourse, basic?.id)} className="group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20" aria-label="기본과정 시작하기">
              <p className="w-fit rounded-full border border-[#176b68]/20 bg-white px-3 py-1 text-xs font-black text-[#176b68]">부담 없이 시작하는 기본 과정</p>
              <h3 className="mt-4 text-2xl font-black">기본과정</h3>
              <p className="mt-4 text-sm font-bold text-slate-500 line-through">69,000원</p>
              <p className="mt-1 text-4xl font-black text-slate-950">{formatApplicationKrw(basic?.price || 49000)}</p>
              <p className="mt-4 text-sm leading-7 text-slate-700">예방교육 이수 및 기본 실천자료를 함께 정리할 수 있는 과정</p>
              <ul className="mt-6 flex-1 space-y-2">{["온라인 예방교육", "교육 수료증 PDF 발급", "재발방지계획서 서식", "음주예방실천계획서 서식", "음주운전 재발방지 서약서 서식", "인쇄 및 PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" />{item}</li>)}</ul>
              <span className={buttonClass("secondary", "md", "mt-6 rounded-full px-6 font-black transition group-hover:border-[#176b68] group-hover:bg-white")}>기본과정 시작하기</span>
              <p className="mt-4 text-xs font-bold leading-5 text-slate-500">자료 구성 개편에 따라 현재 가격이 적용되고 있습니다.</p>
            </Link>
            <Link href={getApplyHref(duiCourse, advanced?.id)} className="group relative flex min-h-full scale-[1.01] flex-col overflow-hidden rounded-[1.25rem] border-2 border-[#173968] bg-white p-6 shadow-[0_28px_80px_rgba(23,57,104,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_32px_88px_rgba(23,57,104,0.3)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20 lg:p-7" aria-label="심화과정 시작하기">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[#173968]" />
              <p className="w-fit rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">가장 많이 선택하는 과정</p>
              <h3 className="mt-4 text-2xl font-black">심화과정</h3>
              <p className="mt-4 text-sm font-bold text-slate-500 line-through">129,000원</p>
              <p className="mt-1 text-5xl font-black text-slate-950">{formatApplicationKrw(advanced?.price || 99000)}</p>
              <p className="mt-4 text-sm leading-7 text-slate-700">양형자료 준비를 위한 실천자료까지 함께 정리할 수 있는 심화 과정</p>
              <ul className="mt-6 flex-1 space-y-2">{["온라인 예방교육", "교육 수료증 PDF 발급", "재발방지계획서 서식", "음주예방실천계획서 서식", "음주운전 재발방지 서약서 서식", "반성문 작성 서식", "인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서", "인쇄 및 PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-[#173968]" />{item}</li>)}</ul>
              <span className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black transition group-hover:bg-[#10213f]")}>심화과정 시작하기</span>
              <p className="mt-4 text-xs font-bold leading-5 text-slate-500">예방교육 이수와 함께 재발방지 실천자료를 체계적으로 정리할 수 있습니다.</p>
            </Link>
          </div>
          <div className="mt-6 grid gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">{["온라인 즉시 수강 가능", "PDF 저장 및 출력 지원", "모바일·PC 이용 가능", "실천자료 직접 작성 가능"].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-black text-slate-800"><Icon name="check" className="h-4 w-4 shrink-0 text-[#176b68]" />{item}</div>)}</div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Education" title="교육·기록·생활개선을 한 흐름으로 정리합니다" body="사건 이후 어떤 자료를 준비해야 할지 막막한 상황에서, 예방교육 수강부터 자기점검과 실천자료 정리까지 단계적으로 확인할 수 있습니다." /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[
          ["예방교육", "사건 유형별 위험요인과 책임 인식을 차분히 학습합니다."],
          ["자기점검", "반복될 수 있는 상황, 습관, 감정 반응을 직접 점검합니다."],
          ["실천계획", "재발방지계획서 서식과 실천계획서 서식을 실행 가능한 문장으로 정리합니다."],
          ["자료 관리", "수료증과 실천자료를 확인하고 PDF 저장 및 출력을 진행합니다."],
        ].map(([title, body]) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="shield" className="h-8 w-8 text-[#176b68]" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle title="발급 문서 샘플을 확인하세요" body="교육이수증과 인지행동기반 재발방지교육 이수증(심화과정) 샘플을 전체 문서 형태로 확인할 수 있습니다. 실제 발급 문서는 수강자 정보와 이수 기록에 맞춰 생성됩니다." />
          <div className="mt-8">
            <DocumentPreviewGallery documents={homeCertificateSamples} columnsClassName="sm:grid-cols-2" showPreviewButton={false} />
          </div>
        </div>
      </section>

      <section id="process" className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="예방교육 시작부터 실천자료 출력까지" /><div className="mt-8 grid gap-4 md:grid-cols-4">{processSteps.map(([title, body], index) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-[#176b68]">0{index + 1}</p><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="사건 유형별 예방교육" body="현재 운영 중인 온라인 예방교육을 확인하고, 필요한 경우 심화과정을 선택해 실천자료를 함께 정리할 수 있습니다." /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{platformCourseCategories.map((course) => <Link key={course.slug} href={"/courses/" + course.slug} className="group flex min-h-full flex-col rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"><h3 className="text-xl font-black leading-snug text-slate-950">{course.title}</h3><p className="mt-4 flex-1 text-sm leading-7 text-slate-700">{course.summary}</p><span className="mt-5 text-sm font-black text-[#173968] group-hover:underline">과정 자세히 보기</span></Link>)}</div></div></section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.25rem] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.24)] sm:p-8"><h2 className="text-2xl font-black sm:text-3xl">ResetEdu 재발방지교육센터</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">온라인 예방교육과 실천자료 관리를 통해 사건 이후의 생활개선과 재발방지 노력을 체계적으로 정리하세요.</p><Link href="/courses" className={buttonClass("darkSecondary", "lg", "mt-6 rounded-full px-7 font-black focus:ring-offset-[#07111f]")}>예방교육 시작하기</Link></div></section>
    </main></>
  );
}
