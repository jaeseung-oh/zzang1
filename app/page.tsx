import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct, formatApplicationKrw, type ApplicationProduct } from "@/lib/course/application-products";
import DocumentPreviewGallery, { type DocumentPreviewItem } from "@/app/components/document-preview-gallery";

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
const homePricingProducts: Array<{ product: ApplicationProduct; href: string; label: string }> = [
  { product: basicApplicationProduct, href: basicApplyHref, label: "수료증 중심으로 시작하기" },
  { product: duiDocumentsApplicationProduct, href: "/courses/apply?category=dui&productId=dui-documents", label: "교육과 자료 함께 준비하기" },
  { product: duiCbtAdvancedApplicationProduct, href: "/courses/apply?category=dui&productId=dui-cbt-advanced", label: "심화과정으로 준비하기" },
];

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

const homeDocumentSamples: DocumentPreviewItem[] = [
  {
    id: "home-dui-certificate",
    title: "음주운전 예방교육 수료증",
    products: ["음주운전", "수강 가능"],
    statusLabel: "수강 가능",
    description: "현재 운영 중인 음주운전 예방교육 수강자가 교육 이수 후 확인할 수 있는 기본 수료증 예시입니다.",
    imageSrc: "/images/document-samples/dui-certificate-sample.svg",
  },
  {
    id: "home-dui-plan",
    title: "음주운전 재발방지계획서",
    products: ["음주운전", "자료포함과정"],
    statusLabel: "자료 예시",
    description: "재발 원인, 음주 전후 위험상황, 이동수단 확보 계획을 본인 상황에 맞게 작성하는 서식 예시입니다.",
    imageSrc: "/images/document-samples/prevention-plan-sample.svg",
  },
  {
    id: "home-violence-certificate",
    title: "폭력 예방교육 이수증",
    products: ["폭력", "준비중"],
    statusLabel: "준비중 샘플",
    description: "갈등 상황, 감정 조절, 책임 인식 교육을 이수했음을 확인하는 문서 형태의 샘플입니다.",
    imageSrc: "/images/document-samples/violence-certificate-sample.svg",
  },
  {
    id: "home-fraud-certificate",
    title: "사기 예방교육 이수증",
    products: ["사기", "준비중"],
    statusLabel: "준비중 샘플",
    description: "거래 책임과 피해 회복 노력을 정리하는 예방교육 이수 문서 형태의 샘플입니다.",
    imageSrc: "/images/document-samples/fraud-certificate-sample.svg",
  },
  {
    id: "home-drug-certificate",
    title: "마약 예방교육 이수증",
    products: ["마약", "준비중"],
    statusLabel: "준비중 샘플",
    description: "약물 위험성, 생활 환경 관리, 회복 계획 교육을 이수했음을 보여주는 샘플입니다.",
    imageSrc: "/images/document-samples/drug-certificate-sample.svg",
  },
  {
    id: "home-gambling-certificate",
    title: "도박 예방교육 이수증",
    products: ["도박", "준비중"],
    statusLabel: "준비중 샘플",
    description: "도박 위험성, 충동 관리, 금전 관리 계획을 다루는 예방교육 이수 문서 샘플입니다.",
    imageSrc: "/images/document-samples/gambling-certificate-sample.svg",
  },
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
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\u003c") }} /><main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
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
            <div className="mt-8 flex flex-wrap gap-3"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("primary", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>지금 수강하고 자료 준비하기</Link><Link href="#materials" style={{ backgroundColor: "#ffffff", color: "#111827", borderColor: "#ffffff" }} className={buttonClass("secondary", "lg", "w-full rounded-full px-7 font-bold !text-black hover:!text-black sm:w-auto")}>제공 자료 확인하기</Link></div>
          </div>
          <div className="rounded-[1.5rem] border border-white/20 bg-white p-4 text-slate-950 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#06101b]">실제 출력자료 샘플</p>
              <Link href="#sample-documents" className="text-xs font-black text-[#173968] underline underline-offset-4">전체 보기</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {homeDocumentSamples.slice(0, 2).map((sample) => (
                <a key={sample.id} href="#sample-documents" className="group grid grid-cols-[116px_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#173968] hover:bg-white hover:shadow-lg">
                  <div className="h-32 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img src={sample.imageSrc} alt={sample.title + ' 샘플'} className="h-full w-full object-cover object-top transition group-hover:scale-[1.03]" />
                  </div>
                  <div className="min-w-0 self-center">
                    <span className="rounded-full bg-[#173968] px-2.5 py-1 text-[11px] font-black text-white">{sample.statusLabel}</span>
                    <h3 className="mt-3 break-keep text-base font-black leading-snug text-slate-950">{sample.title}</h3>
                    <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">개인정보는 마스킹된 실제 발급 양식 기반 예시입니다.</p>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-[#fff8e7] px-4 py-3 text-xs font-bold leading-5 text-[#5f4514]">수료증, 이수증, 재발방지계획서, 서약서까지 결제 전 샘플을 확인할 수 있습니다.</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Start Here" title="양형자료 준비는 교육 수료증과 재발방지 자료부터 시작하세요" body="음주운전 사건 이후 반성과 개선 노력을 말로만 설명하기보다, 교육 이수 기록과 재발방지 실천계획으로 정리하세요. Reset Edu Center는 수강, 수료증 발급, 자료 작성과 출력까지 바로 이어지는 구조로 제공합니다." />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            {categories.map(([title, status, body]) => <article key={title} className="rounded-xl border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_18px_42px_rgba(23,57,104,0.18)]"><div className="flex items-center justify-between gap-3"><Icon name="car" className="h-8 w-8 text-[#f7d9a0]" /><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]">{status}</span></div><h3 className="mt-5 text-2xl font-black leading-snug text-white">{title}</h3><p className="mt-3 text-base leading-8 text-slate-100">{body}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" style={{ backgroundColor: "#ffffff", color: "#111827", borderColor: "#ffffff" }} className={buttonClass("secondary", "md", "rounded-xl font-black !text-black hover:!text-black")}>지금 수강 신청하기</Link><Link href="#materials" style={{ backgroundColor: "#ffffff", color: "#111827", borderColor: "#ffffff" }} className={buttonClass("secondary", "md", "rounded-xl font-bold !text-black hover:!text-black")}>제공 자료 확인하기</Link></div></article>)}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-slate-700">추가 과정 준비 중</p><p className="mt-3 text-sm leading-7 text-slate-600">{upcomingCourses.join(" · ")} 관련 예방교육은 추후 안내 예정입니다. 현재는 음주운전 예방교육 수강과 양형자료 준비에 집중합니다.</p></div>
          </div>
        </div>
      </section>

      <section id="materials" className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 후 바로 확인하고 출력할 수 있는 자료" body="교육 수강과 함께 필요한 양형자료를 한곳에서 확인하고 PDF 저장 및 출력까지 진행할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div></div></section>

      <section id="sample-documents" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle eyebrow="Sample Documents" title="사이트에 들어오자마자 출력자료 샘플을 확인할 수 있습니다" body="수료증, 이수증, 재발방지 서식을 예시 문서로 먼저 확인하세요. 개인정보는 모두 마스킹되어 있으며, 현재 바로 신청 가능한 과정은 음주운전 예방교육입니다." />
            <Link href="/courses/dui-prevention" className={buttonClass("secondary", "md", "rounded-full px-6 font-black")}>음주운전 과정 상세보기</Link>
          </div>
          <div className="mt-8"><DocumentPreviewGallery documents={homeDocumentSamples} columnsClassName="sm:grid-cols-2 xl:grid-cols-3" /></div>
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">폭력, 사기, 마약, 도박 과정 샘플은 향후 과정 확장을 위한 예시입니다. 실제 신청 가능 여부와 제공 문서는 과정 오픈 시점의 안내를 기준으로 확인해주세요.</p>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]"><SectionTitle eyebrow="Why It Matters" title="반성과 재발방지 노력을 구체적인 자료로 정리하세요" body="교육 이수 자료, 재발방지계획서, 실천계획서, 서약서를 함께 준비하면 사건 이후 어떤 노력을 하고 있는지 더 분명하게 보여줄 수 있습니다. 반성문 외에 추가 자료를 준비하려는 분에게 필요한 흐름을 제공합니다." /><div className="grid gap-3 sm:grid-cols-2">{targetUsers.map((item) => <div key={item} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></div>)}</div></div></section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="필요한 준비 범위에 맞춰 수강권을 선택하세요" body="59,000원 기본 수강권, 109,000원 서식 포함 수강권, 290,000원 인지행동기반 재발방지교육 심화과정을 같은 화면에서 비교할 수 있습니다." /><div className="mt-8 grid gap-5 lg:grid-cols-3">{homePricingProducts.map(({ product, href, label }) => <article key={product.id} className={product.id === "dui-documents" ? "rounded-[1.5rem] border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_18px_42px_rgba(23,57,104,0.18)]" : "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6"}>{product.id === "dui-documents" ? <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]">양형자료 준비 추천</span> : product.id === "dui-cbt-advanced" ? <span className="rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">심화과정</span> : null}<h3 className={(product.id === "dui-documents" ? "mt-4 text-xl font-black text-white" : product.id === "dui-cbt-advanced" ? "mt-4 text-xl font-black text-slate-950" : "text-xl font-black text-slate-950")}>{product.title}</h3><p className={product.id === "dui-documents" ? "mt-3 text-3xl font-black text-white" : "mt-3 text-3xl font-black text-slate-950"}>{formatApplicationKrw(product.price)}</p><p className={product.id === "dui-documents" ? "mt-3 text-sm leading-7 text-slate-100" : "mt-3 text-sm leading-7 text-slate-700"}>{product.description}</p><ul className={product.id === "dui-documents" ? "mt-5 space-y-2 text-sm font-semibold leading-6 text-slate-100" : "mt-5 space-y-2 text-sm font-semibold leading-6 text-slate-800"}>{product.includes.map((item) => <li key={item} className="flex min-w-0 gap-2"><Icon name="check" className={product.id === "dui-documents" ? "h-5 w-5 shrink-0 text-[#f7d9a0]" : "h-5 w-5 shrink-0 text-indigo-700"} /><span className="min-w-0">{item}</span></li>)}</ul><Link href={href} data-ga-event="click_enroll" data-ga-item-id={product.id} data-ga-item-name="음주운전 예방교육" data-ga-location="home" style={product.id === "dui-documents" ? { backgroundColor: "#ffffff", color: "#111827", borderColor: "#ffffff" } : undefined} className={buttonClass(product.id === "dui-documents" ? "secondary" : "primary", "md", product.id === "dui-documents" ? "mt-6 w-full rounded-xl font-black !text-black hover:!text-black" : "mt-6 w-full rounded-xl font-black !text-white hover:!text-white")}>{label}</Link></article>)}</div><p className="mt-5 text-sm leading-7 text-slate-600">제출처에서 요구하는 자료는 사건과 절차에 따라 다를 수 있습니다. 별도 안내가 있다면 해당 안내를 먼저 확인하세요.</p></div></section>

      <section id="process" className="bg-slate-900 px-4 py-20 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">결제부터 수강, 수료증 발급, 자료 출력까지 한 번에 진행하세요</h2><p className="mt-4 text-base leading-relaxed text-slate-200">PC 또는 모바일로 바로 수강하고, 교육 이수 후 필요한 자료를 확인해 저장하거나 출력할 수 있습니다.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div><div className="mt-8"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("primary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-slate-900")}>지금 수강하고 자료 준비하기</Link></div></div></section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-black text-slate-950">수강권 선택, 결제, 출력자료 이용 문의</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">상담 가능 시간 안에 연락주시면 확인 후 안내드립니다.</p>
          </div>
          <a href="tel:010-7617-8619" className="inline-flex w-full items-center justify-center rounded-lg border border-[#173968] bg-[#173968] px-5 py-3 text-center text-base font-black leading-6 !text-white shadow-sm transition hover:bg-[#102a4d] hover:!text-white sm:w-auto sm:text-lg">
            고객센터 010-7617-8619 / 09:00~19:00까지 연락 가능
          </a>
        </div>
      </section>
    </main></>
  );
}
